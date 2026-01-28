import { useState, useEffect } from 'react';
import { Search, Plus, DollarSign, Receipt, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from "#convex/_generated/api";
import { useAuth } from "../../../../hooks/useConvexAuth";

import ReimbursementDetailsPage from './ReimbursementDetailsPage';
import ReimbursementCreationPage from './ReimbursementCreationPage';
import { ReimbursementListSkeleton, MetricCardSkeleton } from '../../../ui/loading';
import { showToast } from '../../shared/utils/toast';

interface Reimbursement {
    id: string;
    title: string;
    totalAmount: number;
    dateOfPurchase: string;
    status: 'submitted' | 'declined' | 'approved' | 'paid';
    submittedBy: string;
    department: string;
    businessPurpose: string;
    expenses?: any[];
    receipts?: any[];
    submittedAt: any;
    additionalInfo?: string;
    approvedAmount?: number;
    partialReason?: string;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'submitted':
            return 'bg-yellow-100 text-yellow-800';

        case 'approved':
            return 'bg-green-100 text-green-800';
        case 'paid':
            return 'bg-emerald-100 text-emerald-800';
        case 'declined':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'submitted':
            return <AlertCircle className="w-4 h-4" />;

        case 'approved':
            return <CheckCircle className="w-4 h-4" />;
        case 'paid':
            return <CheckCircle className="w-4 h-4" />;
        case 'declined':
            return <XCircle className="w-4 h-4" />;
        default:
            return <AlertCircle className="w-4 h-4" />;
    }
};

const getStatusDisplayName = (status: string) => {
    switch (status) {
        case 'submitted':
            return 'Submitted';

        case 'approved':
            return 'Approved (Not Paid)';
        case 'paid':
            return 'Approved (Paid)';
        case 'declined':
            return 'Declined';
        default:
            return status;
    }
};

export default function ReimbursementContent() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    
    const { user } = useAuth();
    const reimbursements = useQuery(api.reimbursements.getUserReimbursements, mounted && user ? { authUserId: user._id } : "skip");
    const currentUser = useQuery(api.users.getUserByAuthId, mounted && user ? { authUserId: user._id } : "skip");
    const [isCreating, setIsCreating] = useState(false);
    const [viewReimbursement, setViewReimbursement] = useState<Reimbursement | null>(null);
    const [editReimbursement, setEditReimbursement] = useState<Reimbursement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const loading = reimbursements === undefined;

    // Calculate receipt total if it's 0 or missing
    const calculateReceiptTotal = (receipt: any) => {
        if (receipt.total && receipt.total > 0) {
            return receipt.total;
        }
        // Calculate subtotal from line items if needed
        let subtotal = receipt.subtotal || 0;
        if (subtotal === 0 && receipt.lineItems && receipt.lineItems.length > 0) {
            subtotal = receipt.lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        }
        return subtotal + (receipt.tax || 0) + (receipt.tip || 0) + (receipt.shipping || 0) + (receipt.otherCharges || 0);
    };

    // Calculate total amount for a reimbursement
    const calculateTotalAmount = (reimbursement: Reimbursement) => {
        // Handle new multi-receipt structure
        if (reimbursement.receipts && reimbursement.receipts.length > 0) {
            return reimbursement.receipts.reduce((sum: number, receipt: any) => {
                return sum + calculateReceiptTotal(receipt);
            }, 0);
        }
        // Handle legacy expenses structure
        if (reimbursement.expenses && reimbursement.expenses.length > 0) {
            return reimbursement.expenses.reduce((sum: number, expense: any) => {
                return sum + (expense.amount || 0);
            }, 0);
        }
        return 0;
    };

    const userProfile = user;

    const handleNewRequest = () => {
        if (!userProfile?.zelleInformation) {
            showToast.error(
                'Zelle Information Missing',
                'Please add your Zelle information in Settings > Profile before submitting a reimbursement request.'
            );
            return;
        }
        setIsCreating(true);
        setEditReimbursement(null);
    };

    const handleEditRequest = (reimbursement: Reimbursement) => {
        setEditReimbursement(reimbursement);
        setIsCreating(true);
    };

    const handleSubmitReimbursement = async (data: any) => {
        // This is now mainly handled inside ReimbursementCreationPage,
        // but kept here if we need to refresh or handle closing
        setIsCreating(false);
        setEditReimbursement(null);
    };

    const filteredReimbursements = (reimbursements || []).filter(reimbursement => {
        const matchesSearch = reimbursement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reimbursement.department.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || reimbursement.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStats = () => {
        const reimbList = reimbursements || [];
        const totalSubmitted = reimbList.reduce((sum, r) => sum + calculateTotalAmount(r as any), 0);
        const approved = reimbList.filter(r => r.status === 'approved' || r.status === 'paid').reduce((sum, r) => sum + calculateTotalAmount(r as any), 0);
        const pending = reimbList.filter(r => r.status === 'submitted').reduce((sum, r) => sum + calculateTotalAmount(r as any), 0);
        const thisMonth = reimbList.filter(r => {
            const submittedDate = new Date(r._creationTime);
            const now = new Date();
            return submittedDate.getMonth() === now.getMonth() && submittedDate.getFullYear() === now.getFullYear();
        }).length;

        return { totalSubmitted, approved, pending, thisMonth };
    };

    const stats = getStats();

    // Block access if Zelle information is not configured
    if (userProfile !== null && !userProfile?.zelleInformation) {
        return (
            <div className="flex-1 h-full overflow-y-auto bg-gray-50/50">
                <main className="max-w-7xl mx-auto p-4 md:p-8">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-10 h-10 text-amber-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">Zelle Information Required</h1>
                        <p className="text-gray-600 max-w-md mb-6">
                            Before you can submit reimbursement requests, you need to add your Zelle information to your profile. This is required so we can process your payments.
                        </p>
                        <a
                            href="/settings"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-lg shadow-blue-600/20"
                        >
                            Go to Settings
                        </a>
                    </div>
                </main>
            </div>
        );
    }

    if (isCreating) {
        return (
            <ReimbursementCreationPage
                onBack={() => {
                    setIsCreating(false);
                    setEditReimbursement(null);
                }}
                onSubmitSuccess={() => {
                    setIsCreating(false);
                    setEditReimbursement(null);
                }}
                initialData={editReimbursement}
            />
        );
    }

    // Render Details Page if a reimbursement is selected
    if (viewReimbursement) {
        return (
            <ReimbursementDetailsPage
                reimbursement={viewReimbursement}
                onBack={() => setViewReimbursement(null)}
            // Pass other props as needed if you implement editing/updating
            />
        );
    }

    return (
        <div className="flex-1 h-full overflow-y-auto bg-gray-50/50">
            {/* Reimbursement Content */}
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reimbursements</h1>
                    <p className="text-gray-500 mt-1">Manage and track your reimbursement requests</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:gap-8">
                    {/* Reimbursement Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {loading ? (
                            <>
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                            </>
                        ) : (
                            <>
                                {/* Total Submitted */}
                                <div className="group relative overflow-hidden bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 border border-gray-100">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110" />
                                    <div className="relative flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Submitted</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">${stats.totalSubmitted.toFixed(2)}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-100">
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>

                                {/* Approved */}
                                <div className="group relative overflow-hidden bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 border border-gray-100">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110" />
                                    <div className="relative flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Approved</p>
                                            <p className="text-2xl font-bold text-green-600 mt-1">${stats.approved.toFixed(2)}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 transition-colors group-hover:bg-green-100">
                                            <CheckCircle className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>

                                {/* Pending */}
                                <div className="group relative overflow-hidden bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 border border-gray-100">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110" />
                                    <div className="relative flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pending</p>
                                            <p className="text-2xl font-bold text-amber-600 mt-1">${stats.pending.toFixed(2)}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 transition-colors group-hover:bg-amber-100">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>

                                {/* This Month */}
                                <div className="group relative overflow-hidden bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 border border-gray-100">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110" />
                                    <div className="relative flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">This Month</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.thisMonth}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 transition-colors group-hover:bg-purple-100">
                                            <Receipt className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Controls & List Section */}
                    <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                        {/* Search, Filter, and Action Bar */}
                        <div className="p-5 border-b border-gray-100 bg-gray-50/30">
                            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                                <div className="flex flex-col md:flex-row gap-3 flex-1">
                                    {/* Search Bar */}
                                    <div className="relative flex-1 max-w-lg">
                                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            placeholder="Search by title or department..."
                                            aria-label="Search reimbursements"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium placeholder:font-normal"
                                        />
                                    </div>

                                    {/* Status Filter */}
                                    <div className="relative min-w-[160px]">
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            aria-label="Filter reimbursements by status"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="submitted">Submitted</option>
                                            <option value="approved">Approved</option>
                                            <option value="paid">Paid</option>
                                            <option value="declined">Declined</option>
                                        </select>
                                        <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* New Reimbursement Button */}
                                <button
                                    onClick={handleNewRequest}
                                    className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl transition-all duration-200 shadow-lg shadow-gray-900/10 hover:shadow-gray-900/20 text-sm font-semibold shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>New Request</span>
                                </button>
                            </div>
                        </div>

                        {/* Reimbursement Requests List */}
                        <div className="p-0">
                            {loading ? (
                                <div className="p-6">
                                    <ReimbursementListSkeleton />
                                </div>
                            ) : filteredReimbursements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <Receipt className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No requests found</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto mb-6">
                                        {searchTerm || statusFilter !== 'all'
                                            ? "Try adjusting your search or filters to find what you're looking for."
                                            : "Create your first reimbursement request to get started."}
                                    </p>
                                    <button
                                        onClick={handleNewRequest}
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm shadow-md shadow-blue-600/10"
                                    >
                                        Create Request
                                    </button>
                                </div>
                            ) : (
                                <div className="max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-gray-100">
                                    {filteredReimbursements.map((reimbursement) => (
                                        <div
                                            key={reimbursement._id}
                                            className="group hover:bg-blue-50/30 transition-colors p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer"
                                            onClick={() => setViewReimbursement(reimbursement as any)}
                                        >
                                            {/* Icon & Title */}
                                            <div className="flex items-start md:items-center space-x-4 flex-1">
                                                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-gray-200">
                                                    <Receipt className="w-5 h-5 md:w-6 md:h-6 text-gray-500 group-hover:text-blue-600 transition-colors" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-sm md:text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                                                        {reimbursement.title}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                            {reimbursement.department}
                                                        </span>
                                                        <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                                                        <span className="text-xs text-gray-500 truncate max-w-[200px]">
                                                            {(reimbursement as any).businessPurpose || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Meta & Status */}
                                            <div className="flex items-center justify-between md:justify-end gap-6 md:w-auto mt-2 md:mt-0 pl-14 md:pl-0">
                                                <div className="flex flex-col md:items-end">
                                                    <span className="text-sm font-bold text-gray-900">
                                                        ${calculateTotalAmount(reimbursement as any).toFixed(2)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(reimbursement._creationTime).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(reimbursement.status).replace('bg-', 'bg-opacity-10 border-').replace('text-', 'text-')}`}>
                                                    {getStatusIcon(reimbursement.status)}
                                                    <span className="capitalize">{getStatusDisplayName(reimbursement.status)}</span>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewReimbursement(reimbursement as any);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors md:block hidden"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                {reimbursement.status === 'submitted' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditRequest(reimbursement as any);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors md:block hidden"
                                                        title="Edit Request"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil w-5 h-5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>


        </div>
    );
}

