import { useState, useEffect } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Chip,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Spinner,
    Tabs,
    Tab,
} from '@heroui/react';
import { DollarSign, Calendar, User, ExternalLink } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../../firebase/client';
import type { FundRequest, FundRequestDepartment } from '../../../shared/types/fund-requests';
import { STATUS_LABELS, STATUS_COLORS, DEPARTMENT_LABELS } from '../../../shared/types/fund-requests';

interface BudgetLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: FundRequestDepartment;
    budgetStartDate?: Date;
}

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

export default function BudgetLogModal({
    isOpen,
    onClose,
    department,
    budgetStartDate,
}: BudgetLogModalProps) {
    const [requests, setRequests] = useState<FundRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'all' | 'approved' | 'pending'>('all');

    useEffect(() => {
        if (!isOpen) return;

        const fetchRequests = async () => {
            setIsLoading(true);
            try {
                const requestsRef = collection(db, 'fundRequests');
                let q = query(
                    requestsRef,
                    where('department', '==', department),
                    orderBy('createdAt', 'desc')
                );

                const snapshot = await getDocs(q);
                let requestsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as FundRequest[];

                // Filter by budget start date if provided
                if (budgetStartDate) {
                    requestsData = requestsData.filter((r) => {
                        const requestDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt as any);
                        return requestDate >= budgetStartDate;
                    });
                }

                // Filter out drafts
                requestsData = requestsData.filter((r) => r.status !== 'draft');

                setRequests(requestsData);
            } catch (error) {
                console.error('Error fetching budget log:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRequests();
    }, [isOpen, department, budgetStartDate]);

    const getFilteredRequests = () => {
        switch (selectedTab) {
            case 'approved':
                return requests.filter((r) => r.status === 'approved' || r.status === 'completed');
            case 'pending':
                return requests.filter((r) => r.status === 'submitted' || r.status === 'needs_info');
            default:
                return requests;
        }
    };

    const filteredRequests = getFilteredRequests();

    const stats = {
        approved: requests
            .filter((r) => r.status === 'approved' || r.status === 'completed')
            .reduce((sum, r) => sum + r.amount, 0),
        pending: requests
            .filter((r) => r.status === 'submitted' || r.status === 'needs_info')
            .reduce((sum, r) => sum + r.amount, 0),
        total: requests.reduce((sum, r) => sum + r.amount, 0),
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <span>{DEPARTMENT_LABELS[department]} Budget Log</span>
                    {budgetStartDate && (
                        <p className="text-sm text-default-500 font-normal">
                            From {budgetStartDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    )}
                </ModalHeader>

                <ModalBody>
                    {isLoading ? (
                        <div className="flex items-center justify-center min-h-[200px]">
                            <Spinner size="lg" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-success-50 rounded-lg border border-success-200">
                                    <p className="text-xs text-success-600 uppercase tracking-wide">Approved</p>
                                    <p className="text-lg font-semibold text-success-700">{formatCurrency(stats.approved)}</p>
                                </div>
                                <div className="p-3 bg-warning-50 rounded-lg border border-warning-200">
                                    <p className="text-xs text-warning-600 uppercase tracking-wide">Pending</p>
                                    <p className="text-lg font-semibold text-warning-700">{formatCurrency(stats.pending)}</p>
                                </div>
                                <div className="p-3 bg-default-50 rounded-lg border border-default-200">
                                    <p className="text-xs text-default-600 uppercase tracking-wide">Total</p>
                                    <p className="text-lg font-semibold">{formatCurrency(stats.total)}</p>
                                </div>
                            </div>

                            {/* Tabs */}
                            <Tabs
                                selectedKey={selectedTab}
                                onSelectionChange={(key) => setSelectedTab(key as typeof selectedTab)}
                                size="sm"
                            >
                                <Tab key="all" title={`All (${requests.length})`} />
                                <Tab key="approved" title={`Approved (${requests.filter(r => r.status === 'approved' || r.status === 'completed').length})`} />
                                <Tab key="pending" title={`Pending (${requests.filter(r => r.status === 'submitted' || r.status === 'needs_info').length})`} />
                            </Tabs>

                            {/* Requests Table */}
                            {filteredRequests.length === 0 ? (
                                <div className="text-center py-8 text-default-500">
                                    No requests found for this period.
                                </div>
                            ) : (
                                <Table
                                    aria-label="Budget log table"
                                    removeWrapper
                                    classNames={{
                                        th: 'bg-default-100 text-default-600 text-xs uppercase',
                                        td: 'py-2',
                                    }}
                                >
                                    <TableHeader>
                                        <TableColumn>Request</TableColumn>
                                        <TableColumn>Requester</TableColumn>
                                        <TableColumn>Amount</TableColumn>
                                        <TableColumn>Status</TableColumn>
                                        <TableColumn>Date</TableColumn>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRequests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell>
                                                    <p className="font-medium text-sm truncate max-w-[200px]">
                                                        {request.title}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm text-default-500">
                                                        {request.submittedByName || 'Unknown'}
                                                    </p>
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
                                                    >
                                                        {STATUS_LABELS[request.status]}
                                                    </Chip>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-default-500">
                                                        {formatDate(request.submittedAt || request.createdAt)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    )}
                </ModalBody>

                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
