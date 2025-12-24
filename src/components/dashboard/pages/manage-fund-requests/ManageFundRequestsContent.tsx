import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye,
    FileText,
    Filter,
    ChevronDown,
    User,
    Settings,
} from 'lucide-react';
import {
    Card,
    CardBody,
    Button,
    Chip,
    Input,
    Tabs,
    Tab,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Spinner,
    Tooltip,
    User as HeroUser,
} from '@heroui/react';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { FundRequest, FundRequestStatus, FundRequestDepartment, BudgetConfig } from '../../shared/types/fund-requests';
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, DEPARTMENT_LABELS } from '../../shared/types/fund-requests';
import FundRequestActionModal from './components/FundRequestActionModal';
import BudgetManagementModal from './components/BudgetManagementModal';
import { showToast } from '../../shared/utils/toast';

const getStatusIcon = (status: FundRequestStatus) => {
    switch (status) {
        case 'draft':
            return <FileText className="w-4 h-4" />;
        case 'submitted':
            return <Clock className="w-4 h-4" />;
        case 'needs_info':
            return <AlertCircle className="w-4 h-4" />;
        case 'approved':
            return <CheckCircle className="w-4 h-4" />;
        case 'denied':
            return <XCircle className="w-4 h-4" />;
        case 'completed':
            return <CheckCircle className="w-4 h-4" />;
        default:
            return <FileText className="w-4 h-4" />;
    }
};

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

type FilterTab = 'all' | 'pending' | 'approved' | 'denied';

export default function ManageFundRequestsContent() {
    const [user] = useAuthState(auth);
    const [requests, setRequests] = useState<FundRequest[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<FundRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<FilterTab>('pending');
    const [userRole, setUserRole] = useState<string | null>(null);

    // Modal state
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<FundRequest | null>(null);

    // Budget management state
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [budgetConfigs, setBudgetConfigs] = useState<Record<FundRequestDepartment, BudgetConfig | null>>({
        events: null,
        projects: null,
        internal: null,
        other: null,
    });
    const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);

    // Check user role
    useEffect(() => {
        const checkUserRole = async () => {
            if (!user) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role);
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
            }
        };

        checkUserRole();
    }, [user]);

    // Fetch all fund requests
    useEffect(() => {
        if (!user || !userRole) {
            return;
        }

        // Only Executive Officers and Administrators can access this page
        if (!['Executive Officer', 'Administrator'].includes(userRole)) {
            setIsLoading(false);
            return;
        }

        const requestsRef = collection(db, 'fundRequests');
        const q = query(requestsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const requestsData = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data(),
                })) as FundRequest[];

                // Filter out drafts - executives shouldn't see drafts
                const nonDraftRequests = requestsData.filter((r) => r.status !== 'draft');
                setRequests(nonDraftRequests);
                setIsLoading(false);
            },
            (error) => {
                console.error('Error fetching fund requests:', error);
                showToast.error('Failed to load fund requests');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user, userRole]);

    // Fetch budget configurations
    const fetchBudgetConfigs = useCallback(async () => {
        try {
            const departments: FundRequestDepartment[] = ['events', 'projects', 'internal', 'other'];
            const configPromises = departments.map(async (dept) => {
                const configDoc = await getDoc(doc(db, 'budgetConfig', dept));
                if (configDoc.exists()) {
                    return { dept, config: configDoc.data() as BudgetConfig };
                }
                return { dept, config: null };
            });

            const configs = await Promise.all(configPromises);
            const configMap: Record<FundRequestDepartment, BudgetConfig | null> = {
                events: null,
                projects: null,
                internal: null,
                other: null,
            };
            configs.forEach(({ dept, config }) => {
                configMap[dept] = config;
            });
            setBudgetConfigs(configMap);
        } catch (error) {
            console.error('Error fetching budget configs:', error);
        }
    }, []);

    useEffect(() => {
        fetchBudgetConfigs();
    }, [fetchBudgetConfigs, budgetRefreshKey]);

    // Filter requests based on tab and search
    useEffect(() => {
        let filtered = [...requests];

        // Filter by status tab
        switch (selectedTab) {
            case 'pending':
                filtered = filtered.filter((r) => r.status === 'submitted' || r.status === 'needs_info');
                break;
            case 'approved':
                filtered = filtered.filter((r) => r.status === 'approved' || r.status === 'completed');
                break;
            case 'denied':
                filtered = filtered.filter((r) => r.status === 'denied');
                break;
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.title.toLowerCase().includes(query) ||
                    r.purpose.toLowerCase().includes(query) ||
                    r.submittedByName?.toLowerCase().includes(query) ||
                    r.submittedByEmail?.toLowerCase().includes(query) ||
                    CATEGORY_LABELS[r.category].toLowerCase().includes(query)
            );
        }

        setFilteredRequests(filtered);
    }, [requests, selectedTab, searchQuery]);

    const handleViewRequest = (request: FundRequest) => {
        setSelectedRequest(request);
        setIsActionModalOpen(true);
    };

    const handleActionComplete = () => {
        setIsActionModalOpen(false);
        setSelectedRequest(null);
    };

    const getStats = () => {
        return {
            total: requests.length,
            pending: requests.filter((r) => r.status === 'submitted' || r.status === 'needs_info').length,
            submitted: requests.filter((r) => r.status === 'submitted').length,
            needsInfo: requests.filter((r) => r.status === 'needs_info').length,
            approved: requests.filter((r) => r.status === 'approved' || r.status === 'completed').length,
            denied: requests.filter((r) => r.status === 'denied').length,
            totalApprovedAmount: requests
                .filter((r) => r.status === 'approved' || r.status === 'completed')
                .reduce((sum, r) => sum + r.amount, 0),
            totalPendingAmount: requests
                .filter((r) => r.status === 'submitted' || r.status === 'needs_info')
                .reduce((sum, r) => sum + r.amount, 0),
        };
    };

    const stats = getStats();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!['Executive Officer', 'Administrator'].includes(userRole || '')) {
        return (
            <div className="p-6">
                <Card className="border border-default-200">
                    <CardBody className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto text-danger-400 mb-4" />
                        <h3 className="text-lg font-medium text-default-700 mb-2">Access Denied</h3>
                        <p className="text-sm text-default-500">
                            You don't have permission to access this page. Only Executive Officers and
                            Administrators can manage fund requests.
                        </p>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Manage Fund Requests</h1>
                    <p className="text-sm text-default-500 mt-1">
                        Review and manage fund requests from officers
                    </p>
                </div>
                {/* Admin-only budget management button */}
                {userRole === 'Administrator' && (
                    <Button
                        variant="flat"
                        startContent={<Settings className="w-4 h-4" />}
                        onPress={() => setIsBudgetModalOpen(true)}
                    >
                        Update Budget
                    </Button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border border-default-200">
                    <CardBody className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-warning-100">
                                <Clock className="w-5 h-5 text-warning-600" />
                            </div>
                            <div>
                                <p className="text-sm text-default-500">Pending Review</p>
                                <p className="text-xl font-semibold">{stats.pending}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
                <Card className="border border-default-200">
                    <CardBody className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary-100">
                                <DollarSign className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-sm text-default-500">Pending Amount</p>
                                <p className="text-xl font-semibold">{formatCurrency(stats.totalPendingAmount)}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
                <Card className="border border-default-200">
                    <CardBody className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-success-100">
                                <CheckCircle className="w-5 h-5 text-success-600" />
                            </div>
                            <div>
                                <p className="text-sm text-default-500">Approved</p>
                                <p className="text-xl font-semibold">{stats.approved}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
                <Card className="border border-default-200">
                    <CardBody className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-success-100">
                                <DollarSign className="w-5 h-5 text-success-600" />
                            </div>
                            <div>
                                <p className="text-sm text-default-500">Total Approved</p>
                                <p className="text-xl font-semibold">{formatCurrency(stats.totalApprovedAmount)}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <Tabs
                    selectedKey={selectedTab}
                    onSelectionChange={(key) => setSelectedTab(key as FilterTab)}
                    aria-label="Filter by status"
                    size="sm"
                >
                    <Tab key="all" title={`All (${stats.total})`} />
                    <Tab key="pending" title={`Pending (${stats.pending})`} />
                    <Tab key="approved" title={`Approved (${stats.approved})`} />
                    <Tab key="denied" title={`Denied (${stats.denied})`} />
                </Tabs>
                <Input
                    placeholder="Search requests..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    startContent={<Search className="w-4 h-4 text-default-400" />}
                    className="max-w-xs"
                    size="sm"
                />
            </div>

            {/* Request Table */}
            {filteredRequests.length === 0 ? (
                <Card className="border border-default-200">
                    <CardBody className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto text-default-300 mb-4" />
                        <h3 className="text-lg font-medium text-default-700 mb-2">
                            {requests.length === 0 ? 'No fund requests yet' : 'No matching requests'}
                        </h3>
                        <p className="text-sm text-default-500">
                            {requests.length === 0
                                ? 'Fund requests from officers will appear here.'
                                : 'Try adjusting your filters or search query.'}
                        </p>
                    </CardBody>
                </Card>
            ) : (
                <Card className="border border-default-200">
                    <CardBody className="p-0 overflow-x-auto">
                        <Table
                            aria-label="Fund requests table"
                            removeWrapper
                            classNames={{
                                th: 'bg-default-100 text-default-600 text-xs uppercase',
                                td: 'py-3',
                            }}
                        >
                            <TableHeader>
                                <TableColumn>Requester</TableColumn>
                                <TableColumn>Title</TableColumn>
                                <TableColumn>Category</TableColumn>
                                <TableColumn>Amount</TableColumn>
                                <TableColumn>Status</TableColumn>
                                <TableColumn>Submitted</TableColumn>
                                <TableColumn>Actions</TableColumn>
                            </TableHeader>
                            <TableBody>
                                {filteredRequests.map((request) => (
                                    <TableRow key={request.id} className="hover:bg-default-50">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-default-200 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-default-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {request.submittedByName || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-default-400">
                                                        {request.submittedByEmail}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-sm max-w-[200px] truncate">{request.title}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="sm" variant="flat">
                                                {CATEGORY_LABELS[request.category]}
                                            </Chip>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-success-600">
                                                {formatCurrency(request.amount)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="sm"
                                                color={STATUS_COLORS[request.status]}
                                                variant="flat"
                                                startContent={getStatusIcon(request.status)}
                                            >
                                                {STATUS_LABELS[request.status]}
                                            </Chip>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-default-500">
                                                {formatDate(request.submittedAt || request.createdAt)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                color="primary"
                                                startContent={<Eye className="w-4 h-4" />}
                                                onPress={() => handleViewRequest(request)}
                                            >
                                                {request.status === 'submitted' ? 'Review' : 'View'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardBody>
                </Card>
            )}

            {/* Action Modal */}
            <FundRequestActionModal
                isOpen={isActionModalOpen}
                onClose={() => {
                    setIsActionModalOpen(false);
                    setSelectedRequest(null);
                }}
                request={selectedRequest}
                onActionComplete={handleActionComplete}
            />

            {/* Budget Management Modal (Admin Only) */}
            {userRole === 'Administrator' && (
                <BudgetManagementModal
                    isOpen={isBudgetModalOpen}
                    onClose={() => setIsBudgetModalOpen(false)}
                    budgetConfigs={budgetConfigs}
                    onBudgetUpdate={() => setBudgetRefreshKey((k) => k + 1)}
                    currentUserId={user?.uid || ''}
                    currentUserName={user?.displayName || user?.email || 'Unknown'}
                />
            )}
        </div>
    );
}
