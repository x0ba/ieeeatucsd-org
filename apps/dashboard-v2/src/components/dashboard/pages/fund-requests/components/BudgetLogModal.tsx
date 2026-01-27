import { useState, useEffect, useMemo } from 'react';
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
    Card,
    CardBody,
} from '@heroui/react';
import { DollarSign, Calendar, User, ExternalLink, TrendingUp, Clock, CheckCircle, Wrench } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import type { FundRequest, FundRequestDepartment, BudgetAdjustment } from '../../../shared/types/fund-requests';
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

const formatDate = (timestamp: number | any): string => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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
    const [selectedTab, setSelectedTab] = useState<'all' | 'approved' | 'pending' | 'adjustments'>('all');
    
    // Fetch fund requests using Convex
    const allRequests = useQuery(api.fundRequests.list, { department }) || [];
    
    // Fetch budget adjustments using Convex
    const adjustments = useQuery(api.fundRequests.getBudgetAdjustments, { department }) || [];
    
    // Filter requests based on budget start date and status
    const requests = useMemo(() => {
        let filtered = allRequests.filter((r) => r.status !== 'draft');
        
        if (budgetStartDate) {
            filtered = filtered.filter((r) => {
                const requestDate = typeof r.createdAt === 'number' ? new Date(r.createdAt) : new Date();
                return requestDate >= budgetStartDate;
            });
        }
        
        return filtered;
    }, [allRequests, budgetStartDate]);
    
    const isLoading = false;

    const getFilteredRequests = () => {
        switch (selectedTab) {
            case 'approved':
                return requests.filter((r) => r.status === 'approved' || r.status === 'completed');
            case 'pending':
                return requests.filter((r) => r.status === 'submitted' || r.status === 'needs_info');
            case 'adjustments':
                return []; // Handled separately
            default:
                return requests;
        }
    };

    const filteredRequests = getFilteredRequests();

    const adjustmentsTotal = adjustments.reduce((sum, a) => sum + a.amount, 0);

    const stats = {
        approved: requests
            .filter((r) => r.status === 'approved' || r.status === 'completed')
            .reduce((sum, r) => sum + r.amount, 0) + adjustmentsTotal,
        pending: requests
            .filter((r) => r.status === 'submitted' || r.status === 'needs_info')
            .reduce((sum, r) => sum + r.amount, 0),
        total: requests.reduce((sum, r) => sum + r.amount, 0) + adjustmentsTotal,
        adjustmentsTotal,
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="bg-default-50/50 p-6 border-b border-default-100 flex flex-col gap-1">
                    <h2 className="text-xl font-bold">{DEPARTMENT_LABELS[department]} Budget Log</h2>
                    {budgetStartDate && (
                        <div className="flex items-center gap-1 text-sm text-default-500 font-normal">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Since {budgetStartDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    )}
                </ModalHeader>

                <ModalBody className="p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                            <Spinner size="lg" color="primary" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card className="border-none shadow-sm bg-success-50/50">
                                    <CardBody className="p-4">
                                        <div className="flex items-center gap-2 mb-2 text-success-600">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wide">Approved</span>
                                        </div>
                                        <p className="text-2xl font-bold text-success-700">{formatCurrency(stats.approved)}</p>
                                    </CardBody>
                                </Card>
                                <Card className="border-none shadow-sm bg-warning-50/50">
                                    <CardBody className="p-4">
                                        <div className="flex items-center gap-2 mb-2 text-warning-600">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wide">Pending</span>
                                        </div>
                                        <p className="text-2xl font-bold text-warning-700">{formatCurrency(stats.pending)}</p>
                                    </CardBody>
                                </Card>
                                <Card className="border-none shadow-sm bg-default-50">
                                    <CardBody className="p-4">
                                        <div className="flex items-center gap-2 mb-2 text-default-600">
                                            <TrendingUp className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wide">Total</span>
                                        </div>
                                        <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.total)}</p>
                                    </CardBody>
                                </Card>
                            </div>

                            <div className="space-y-4">
                                <Tabs
                                    selectedKey={selectedTab}
                                    onSelectionChange={(key) => setSelectedTab(key as typeof selectedTab)}
                                    color="primary"
                                    variant="underlined"
                                    classNames={{
                                        tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                                        cursor: "w-full bg-primary",
                                        tab: "max-w-fit px-0 h-12",
                                        tabContent: "group-data-[selected=true]:text-primary font-medium"
                                    }}
                                >
                                    <Tab key="all" title={`All (${requests.length + adjustments.length})`} />
                                    <Tab key="approved" title={`Approved (${requests.filter(r => r.status === 'approved' || r.status === 'completed').length})`} />
                                    <Tab key="pending" title={`Pending (${requests.filter(r => r.status === 'submitted' || r.status === 'needs_info').length})`} />
                                    <Tab key="adjustments" title={`Adjustments (${adjustments.length})`} />
                                </Tabs>

                                {/* Requests Table or Adjustments Table */}
                                <div className="space-y-4">
                                    {/* Show requests table for all, approved, pending tabs */}
                                    {selectedTab !== 'adjustments' && (
                                        <div className="border border-default-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            {filteredRequests.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-default-400">
                                                    <div className="p-4 bg-default-50 rounded-full mb-3">
                                                        <DollarSign className="w-6 h-6" />
                                                    </div>
                                                    <p>No requests found for this period.</p>
                                                </div>
                                            ) : (
                                                <Table
                                                    aria-label="Budget log table"
                                                    removeWrapper
                                                    classNames={{
                                                        th: 'bg-default-50 text-default-500 font-medium py-3',
                                                        td: 'py-3 border-b border-default-100 last:border-0',
                                                    }}
                                                >
                                                    <TableHeader>
                                                        <TableColumn>REQUEST</TableColumn>
                                                        <TableColumn>REQUESTER</TableColumn>
                                                        <TableColumn>AMOUNT</TableColumn>
                                                        <TableColumn>STATUS</TableColumn>
                                                        <TableColumn>DATE</TableColumn>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredRequests.map((request) => (
                                                            <TableRow key={request.id} className="hover:bg-default-50/50 transition-colors">
                                                                <TableCell>
                                                                    <p className="font-semibold text-sm truncate max-w-[200px] text-foreground">
                                                                        {request.title}
                                                                    </p>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-full bg-default-100 flex items-center justify-center text-default-500">
                                                                            <User className="w-3 h-3" />
                                                                        </div>
                                                                        <p className="text-sm text-default-600">
                                                                            {request.submittedByName || 'Unknown'}
                                                                        </p>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span className="font-bold text-success-600">
                                                                        {formatCurrency(request.amount)}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        size="sm"
                                                                        color={STATUS_COLORS[request.status]}
                                                                        variant="flat"
                                                                        className="border-none capitalize"
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

                                    {/* Show adjustments section for 'all' and 'adjustments' tabs */}
                                    {(selectedTab === 'all' || selectedTab === 'adjustments') && adjustments.length > 0 && (
                                        <div className="border border-default-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            {selectedTab === 'all' && (
                                                <div className="bg-default-50 px-4 py-2 border-b border-default-200 flex items-center gap-2">
                                                    <Wrench className="w-4 h-4 text-warning-600" />
                                                    <span className="text-sm font-semibold text-default-700">Manual Adjustments</span>
                                                </div>
                                            )}
                                            <Table
                                                aria-label="Adjustments table"
                                                removeWrapper
                                                classNames={{
                                                    th: 'bg-default-50 text-default-500 font-medium py-3',
                                                    td: 'py-3 border-b border-default-100 last:border-0',
                                                }}
                                            >
                                                <TableHeader>
                                                    <TableColumn>DESCRIPTION</TableColumn>
                                                    <TableColumn>ADDED BY</TableColumn>
                                                    <TableColumn>AMOUNT</TableColumn>
                                                    <TableColumn>DATE</TableColumn>
                                                </TableHeader>
                                                <TableBody>
                                                    {adjustments.map((adjustment) => (
                                                        <TableRow key={adjustment.id} className="hover:bg-default-50/50 transition-colors">
                                                            <TableCell>
                                                                <p className="font-semibold text-sm text-foreground">
                                                                    {adjustment.description}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-default-100 flex items-center justify-center text-default-500">
                                                                        <User className="w-3 h-3" />
                                                                    </div>
                                                                    <p className="text-sm text-default-600">
                                                                        {adjustment.createdByName || 'Unknown'}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-bold text-warning-600">
                                                                    {formatCurrency(adjustment.amount)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm text-default-500">
                                                                    {formatDate(adjustment.createdAt)}
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}

                                    {/* Empty state for adjustments tab when no adjustments */}
                                    {selectedTab === 'adjustments' && adjustments.length === 0 && (
                                        <div className="border border-default-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            <div className="flex flex-col items-center justify-center py-12 text-default-400">
                                                <div className="p-4 bg-default-50 rounded-full mb-3">
                                                    <Wrench className="w-6 h-6" />
                                                </div>
                                                <p>No manual adjustments for this period.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter className="border-t border-default-100 bg-default-50/50">
                    <Button variant="light" onPress={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
