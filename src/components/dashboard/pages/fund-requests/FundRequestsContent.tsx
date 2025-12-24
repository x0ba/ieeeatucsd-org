import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Plus,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye,
    FileText,
    Edit,
    Trash2,
    RefreshCw,
    TrendingUp,
    Users,
} from 'lucide-react';
import {
    Card,
    CardBody,
    Button,
    Chip,
    Input,
    Tabs,
    Tab,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Spinner,
    Tooltip,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Progress,
} from '@heroui/react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { FundRequest, FundRequestStatus, FundRequestDepartment, BudgetConfig } from '../../shared/types/fund-requests';
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, DEPARTMENT_LABELS } from '../../shared/types/fund-requests';
import FundRequestFormModal from './components/FundRequestFormModal';
import FundRequestDetailModal from './components/FundRequestDetailModal';
import BudgetLogModal from './components/BudgetLogModal';
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

type FilterTab = 'all' | FundRequestStatus;

export default function FundRequestsContent() {
    const [user] = useAuthState(auth);
    const [requests, setRequests] = useState<FundRequest[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<FundRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<FilterTab>('all');

    // Modals
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<FundRequest | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Delete confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<FundRequest | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Budget tracking
    const [budgetConfigs, setBudgetConfigs] = useState<Record<FundRequestDepartment, BudgetConfig | null>>({
        events: null,
        projects: null,
        internal: null,
        other: null,
    });
    const [allRequests, setAllRequests] = useState<FundRequest[]>([]);
    const [isBudgetLogOpen, setIsBudgetLogOpen] = useState(false);
    const [selectedBudgetDepartment, setSelectedBudgetDepartment] = useState<FundRequestDepartment>('events');

    // Fetch user's fund requests
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const requestsRef = collection(db, 'fundRequests');
        const q = query(
            requestsRef,
            where('submittedBy', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const requestsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as FundRequest[];
                setRequests(requestsData);
                setIsLoading(false);
            },
            (error) => {
                console.error('Error fetching fund requests:', error);
                showToast.error('Failed to load fund requests');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    // Fetch budget configurations and all requests for budget tracking
    useEffect(() => {
        const fetchBudgetData = async () => {
            try {
                // Fetch budget configurations
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
        };

        fetchBudgetData();

        // Subscribe to all fund requests for budget calculations
        const requestsRef = collection(db, 'fundRequests');
        const q = query(requestsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requestsData = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            })) as FundRequest[];
            setAllRequests(requestsData.filter(r => r.status !== 'draft'));
        });

        return () => unsubscribe();
    }, []);

    // Filter requests based on tab and search
    useEffect(() => {
        let filtered = [...requests];

        // Filter by status tab
        if (selectedTab !== 'all') {
            filtered = filtered.filter((r) => r.status === selectedTab);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.title.toLowerCase().includes(query) ||
                    r.purpose.toLowerCase().includes(query) ||
                    CATEGORY_LABELS[r.category].toLowerCase().includes(query)
            );
        }

        setFilteredRequests(filtered);
    }, [requests, selectedTab, searchQuery]);

    const handleNewRequest = () => {
        setSelectedRequest(null);
        setIsEditMode(false);
        setIsFormModalOpen(true);
    };

    const handleEditRequest = (request: FundRequest) => {
        setSelectedRequest(request);
        setIsEditMode(true);
        setIsFormModalOpen(true);
    };

    const handleViewRequest = (request: FundRequest) => {
        setSelectedRequest(request);
        setIsDetailModalOpen(true);
    };

    const handleDeleteClick = (request: FundRequest) => {
        setRequestToDelete(request);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!requestToDelete) return;

        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'fundRequests', requestToDelete.id));
            showToast.success('Fund request deleted successfully');
            setIsDeleteModalOpen(false);
            setRequestToDelete(null);
        } catch (error) {
            console.error('Error deleting fund request:', error);
            showToast.error('Failed to delete fund request');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFormClose = () => {
        setIsFormModalOpen(false);
        setSelectedRequest(null);
        setIsEditMode(false);
    };

    const handleFormSuccess = () => {
        handleFormClose();
        showToast.success(
            isEditMode ? 'Fund request updated successfully' : 'Fund request created successfully'
        );
    };

    const getStats = () => {
        return {
            total: requests.length,
            draft: requests.filter((r) => r.status === 'draft').length,
            submitted: requests.filter((r) => r.status === 'submitted').length,
            needsInfo: requests.filter((r) => r.status === 'needs_info').length,
            approved: requests.filter((r) => r.status === 'approved').length,
            denied: requests.filter((r) => r.status === 'denied').length,
            totalAmount: requests
                .filter((r) => r.status === 'approved' || r.status === 'completed')
                .reduce((sum, r) => sum + r.amount, 0),
        };
    };

    // Calculate budget stats for a department
    const getBudgetStats = (department: FundRequestDepartment) => {
        const config = budgetConfigs[department];
        const totalBudget = config?.totalBudget || 0;
        const startDate = config?.startDate?.toDate ? config.startDate.toDate() : null;

        // Filter requests by department and start date
        let deptRequests = allRequests.filter((r) => r.department === department);
        if (startDate) {
            deptRequests = deptRequests.filter((r) => {
                const requestDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt as any);
                return requestDate >= startDate;
            });
        }

        const usedBudget = deptRequests
            .filter((r) => r.status === 'approved' || r.status === 'completed')
            .reduce((sum, r) => sum + r.amount, 0);

        const pendingBudget = deptRequests
            .filter((r) => r.status === 'submitted' || r.status === 'needs_info')
            .reduce((sum, r) => sum + r.amount, 0);

        const remainingBudget = totalBudget - usedBudget - pendingBudget;
        const percentUsed = totalBudget > 0 ? ((usedBudget + pendingBudget) / totalBudget) * 100 : 0;

        return {
            totalBudget,
            usedBudget,
            pendingBudget,
            remainingBudget,
            percentUsed,
            startDate,
        };
    };

    const handleBudgetCardClick = (department: FundRequestDepartment) => {
        setSelectedBudgetDepartment(department);
        setIsBudgetLogOpen(true);
    };

    const stats = getStats();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Fund Requests</h1>
                    <p className="text-sm text-default-500 mt-1">
                        Request funding for events, equipment, travel, and more
                    </p>
                </div>
                <Button
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={handleNewRequest}
                >
                    New Fund Request
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border border-default-200">
                    <CardBody className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary-100">
                                <FileText className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-sm text-default-500">Total Requests</p>
                                <p className="text-xl font-semibold">{stats.total}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
                <Card className="border border-default-200">
                    <CardBody className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-warning-100">
                                <Clock className="w-5 h-5 text-warning-600" />
                            </div>
                            <div>
                                <p className="text-sm text-default-500">Pending</p>
                                <p className="text-xl font-semibold">{stats.submitted + stats.needsInfo}</p>
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
                                <p className="text-xl font-semibold">{formatCurrency(stats.totalAmount)}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Budget Tracking Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Team Budgets</h2>
                    <span className="text-sm text-default-400">(Click for details)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['events', 'projects', 'internal'] as FundRequestDepartment[]).map((dept) => {
                        const budgetStats = getBudgetStats(dept);
                        const hasConfig = budgetConfigs[dept] !== null;

                        return (
                            <Card
                                key={dept}
                                isPressable={hasConfig}
                                className={`border border-default-200 ${hasConfig ? 'hover:border-primary-400 cursor-pointer' : 'opacity-60'}`}
                                onPress={() => hasConfig && handleBudgetCardClick(dept)}
                            >
                                <CardBody className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-default-400" />
                                            <span className="font-medium">{DEPARTMENT_LABELS[dept]}</span>
                                        </div>
                                        {!hasConfig && (
                                            <Chip size="sm" variant="flat">Not Configured</Chip>
                                        )}
                                    </div>

                                    {hasConfig ? (
                                        <>
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-2xl font-bold text-success-600">
                                                        {formatCurrency(budgetStats.remainingBudget)}
                                                    </p>
                                                    <p className="text-xs text-default-400">
                                                        of {formatCurrency(budgetStats.totalBudget)} remaining
                                                    </p>
                                                </div>
                                                {budgetStats.pendingBudget > 0 && (
                                                    <div className="text-right">
                                                        <p className="text-sm text-warning-600">
                                                            {formatCurrency(budgetStats.pendingBudget)}
                                                        </p>
                                                        <p className="text-xs text-default-400">pending</p>
                                                    </div>
                                                )}
                                            </div>
                                            <Progress
                                                value={Math.min(budgetStats.percentUsed, 100)}
                                                size="sm"
                                                color={budgetStats.percentUsed > 90 ? 'danger' : budgetStats.percentUsed > 70 ? 'warning' : 'success'}
                                                className="max-w-full"
                                            />
                                        </>
                                    ) : (
                                        <p className="text-sm text-default-400">
                                            Budget not configured by admin
                                        </p>
                                    )}
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
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
                    <Tab key="draft" title={`Draft (${stats.draft})`} />
                    <Tab key="submitted" title={`Submitted (${stats.submitted})`} />
                    <Tab key="needs_info" title={`Needs Info (${stats.needsInfo})`} />
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

            {/* Request List */}
            {filteredRequests.length === 0 ? (
                <Card className="border border-default-200">
                    <CardBody className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto text-default-300 mb-4" />
                        <h3 className="text-lg font-medium text-default-700 mb-2">
                            {requests.length === 0 ? 'No fund requests yet' : 'No matching requests'}
                        </h3>
                        <p className="text-sm text-default-500 mb-4">
                            {requests.length === 0
                                ? 'Create your first fund request to get started.'
                                : 'Try adjusting your filters or search query.'}
                        </p>
                        {requests.length === 0 && (
                            <Button
                                color="primary"
                                startContent={<Plus className="w-4 h-4" />}
                                onPress={handleNewRequest}
                            >
                                New Fund Request
                            </Button>
                        )}
                    </CardBody>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredRequests.map((request) => (
                        <Card
                            key={request.id}
                            className="border border-default-200 hover:border-default-300 transition-colors"
                            isPressable
                            onPress={() => handleViewRequest(request)}
                        >
                            <CardBody className="p-4">
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-foreground truncate">{request.title}</h3>
                                            <Chip
                                                size="sm"
                                                color={STATUS_COLORS[request.status]}
                                                variant="flat"
                                                startContent={getStatusIcon(request.status)}
                                            >
                                                {STATUS_LABELS[request.status]}
                                            </Chip>
                                        </div>
                                        <p className="text-sm text-default-500 line-clamp-2 mb-2">{request.purpose}</p>
                                        <div className="flex flex-wrap gap-3 text-xs text-default-400">
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" />
                                                {formatCurrency(request.amount)}
                                            </span>
                                            <span>Category: {CATEGORY_LABELS[request.category]}</span>
                                            <span>Created: {formatDate(request.createdAt)}</span>
                                        </div>
                                        {request.status === 'needs_info' && request.infoRequestNotes && (
                                            <div className="mt-2 p-2 bg-warning-50 rounded-lg border border-warning-200">
                                                <p className="text-xs text-warning-700">
                                                    <strong>Info Requested:</strong> {request.infoRequestNotes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Tooltip content="View Details">
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="light"
                                                onPress={() => handleViewRequest(request)}
                                                aria-label="View request details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </Tooltip>
                                        {(request.status === 'draft' || request.status === 'needs_info') && (
                                            <Tooltip content="Edit">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    onPress={() => handleEditRequest(request)}
                                                    aria-label="Edit request"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </Tooltip>
                                        )}
                                        {request.status === 'draft' && (
                                            <Tooltip content="Delete">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="danger"
                                                    onPress={() => handleDeleteClick(request)}
                                                    aria-label="Delete request"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            <FundRequestFormModal
                isOpen={isFormModalOpen}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
                request={selectedRequest}
                isEditMode={isEditMode}
            />

            {/* Detail Modal */}
            <FundRequestDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedRequest(null);
                }}
                request={selectedRequest}
                onEdit={() => {
                    setIsDetailModalOpen(false);
                    if (selectedRequest) {
                        handleEditRequest(selectedRequest);
                    }
                }}
            />

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
                <ModalContent>
                    <ModalHeader>Delete Fund Request</ModalHeader>
                    <ModalBody>
                        <p>
                            Are you sure you want to delete the fund request "{requestToDelete?.title}"? This
                            action cannot be undone.
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => setIsDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="danger"
                            onPress={handleConfirmDelete}
                            isLoading={isDeleting}
                        >
                            Delete
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Budget Log Modal */}
            <BudgetLogModal
                isOpen={isBudgetLogOpen}
                onClose={() => setIsBudgetLogOpen(false)}
                department={selectedBudgetDepartment}
                budgetStartDate={budgetConfigs[selectedBudgetDepartment]?.startDate?.toDate?.() || undefined}
            />
        </div>
    );
}
