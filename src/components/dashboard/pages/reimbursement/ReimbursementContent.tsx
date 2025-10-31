import { useState, useEffect } from 'react';
import { Search, Plus, DollarSign, Receipt, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../../../firebase/client';
import ReimbursementWizardModal from './ReimbursementWizardModal';
import ReimbursementDetailModal from './ReimbursementDetailModal';
import { ReimbursementListSkeleton, MetricCardSkeleton } from '../../../ui/loading';

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
    const [user] = useAuthState(auth);
    const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
    const [loading, setLoading] = useState(false); // Start false to show cached data immediately
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [viewReimbursement, setViewReimbursement] = useState<Reimbursement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

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
        return subtotal + (receipt.tax || 0) + (receipt.tip || 0) + (receipt.shipping || 0);
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

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'reimbursements'),
            where('submittedBy', '==', user.uid),
            orderBy('submittedAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const reimbursementData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Reimbursement[];

                setReimbursements(reimbursementData);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching reimbursements:', error);
                setLoading(false);
                // Keep existing data on error
            }
        );

        return () => unsubscribe();
    }, [user]);

    const handleSubmitReimbursement = async (data: any) => {
        if (!user) return;

        try {
            // Handle both old format (expenses) and new format (receipts)
            let processedExpenses = null;
            let processedReceipts = null;

            if (data.expenses) {
                // Old format - process expenses
                processedExpenses = data.expenses.map((expense: any) => ({
                    ...expense,
                    receipt: expense.receipt || null
                }));
            }

            if (data.receipts) {
                // New format - process receipts with AI-parsed data
                processedReceipts = data.receipts.map((receipt: any) => ({
                    id: receipt.id,
                    vendorName: receipt.vendorName,
                    location: receipt.location,
                    dateOfPurchase: receipt.dateOfPurchase,
                    lineItems: receipt.lineItems,
                    receiptFile: receipt.receiptFile,
                    notes: receipt.notes,
                    subtotal: receipt.subtotal,
                    tax: receipt.tax || 0,
                    tip: receipt.tip || 0,
                    shipping: receipt.shipping || 0,
                    total: receipt.total
                }));
            }

            console.log('Processing reimbursement submission:', { processedExpenses, processedReceipts });

            const docRef = await addDoc(collection(db, 'reimbursements'), {
                title: data.title,
                totalAmount: data.totalAmount,
                dateOfPurchase: data.dateOfPurchase,
                paymentMethod: data.paymentMethod,
                status: 'submitted',
                submittedBy: user.uid,
                department: data.department,
                businessPurpose: data.businessPurpose,
                ...(data.location && { location: data.location }),
                ...(data.vendor && { vendor: data.vendor }),
                ...(processedExpenses && { expenses: processedExpenses }),
                ...(processedReceipts && { receipts: processedReceipts }),
                additionalInfo: data.additionalInfo,
                submittedAt: Timestamp.now(),
                auditNotes: [],
                auditLogs: [{
                    action: 'Request submitted',
                    createdBy: user.uid,
                    timestamp: Timestamp.now()
                }]
            });

            // Send notification emails
            try {
                await fetch('/api/email/send-reimbursement-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'reimbursement_submission',
                        reimbursementId: docRef.id
                    }),
                });
            } catch (emailError) {
                console.error('Failed to send notification emails:', emailError);
                // Don't fail the submission if email fails
            }
        } catch (error) {
            console.error('Error submitting reimbursement:', error);
        }
    };

    const filteredReimbursements = reimbursements.filter(reimbursement => {
        const matchesSearch = reimbursement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reimbursement.department.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || reimbursement.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStats = () => {
        const totalSubmitted = reimbursements.reduce((sum, r) => sum + calculateTotalAmount(r), 0);
        const approved = reimbursements.filter(r => r.status === 'approved' || r.status === 'paid').reduce((sum, r) => sum + calculateTotalAmount(r), 0);
        const pending = reimbursements.filter(r => r.status === 'submitted').reduce((sum, r) => sum + calculateTotalAmount(r), 0);
        const thisMonth = reimbursements.filter(r => {
            const submittedDate = new Date(r.submittedAt);
            const now = new Date();
            return submittedDate.getMonth() === now.getMonth() && submittedDate.getFullYear() === now.getFullYear();
        }).length;

        return { totalSubmitted, approved, pending, thisMonth };
    };

    const stats = getStats();

    return (
        <div className="flex-1 overflow-auto">
            {/* Reimbursement Content */}
            <main className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                    {/* Search and Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search reimbursements..."
                                aria-label="Search reimbursements"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px]"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            aria-label="Filter reimbursements by status"
                            className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] text-sm md:text-base"
                        >
                            <option value="all">All Status</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                            <option value="paid">Paid</option>
                            <option value="declined">Declined</option>
                        </select>
                    </div>

                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors shadow-md hover:shadow-lg min-h-[44px] text-sm md:text-base"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New Reimbursement Request</span>
                            <span className="sm:hidden">New Request</span>
                        </button>
                    </div>

                    {/* Reimbursement Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
                        {loading ? (
                            <>
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                            </>
                        ) : (
                            <>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600">Total Submitted</p>
                                            <p className="text-lg md:text-2xl font-bold text-gray-900">${stats.totalSubmitted.toFixed(2)}</p>
                                        </div>
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600">Approved</p>
                                            <p className="text-lg md:text-2xl font-bold text-green-600">${stats.approved.toFixed(2)}</p>
                                        </div>
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600">Pending</p>
                                            <p className="text-lg md:text-2xl font-bold text-yellow-600">${stats.pending.toFixed(2)}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                            <Clock className="w-6 h-6 text-yellow-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">This Month</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                            <Receipt className="w-6 h-6 text-purple-600" />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Reimbursement Requests */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Requests</h2>
                        {loading ? (
                            <ReimbursementListSkeleton items={4} />
                        ) : filteredReimbursements.length === 0 ? (
                            <div className="text-center py-8">
                                <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <p className="text-gray-500">No reimbursement requests found</p>
                                <button
                                    onClick={() => setIsWizardOpen(true)}
                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    Submit Your First Request
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredReimbursements.map((reimbursement) => (
                                    <div key={reimbursement.id} className="border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                        {/* Mobile Layout */}
                                        <div className="block md:hidden p-4">
                                            <div className="flex items-start space-x-3 mb-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Receipt className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-medium text-gray-900 break-words pr-2">{reimbursement.title}</h3>
                                                    <div className="text-lg font-bold text-gray-900 mt-1">${calculateTotalAmount(reimbursement).toFixed(2)}</div>
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <p className="text-sm text-gray-500 break-words leading-relaxed">{reimbursement.businessPurpose}</p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 text-sm text-gray-500 mb-4">
                                                <div className="break-words">Submitted: {reimbursement.submittedAt?.toDate ? reimbursement.submittedAt.toDate().toLocaleDateString() : new Date(reimbursement.submittedAt).toLocaleDateString()}</div>
                                                <div className="capitalize break-words">Department: {reimbursement.department}</div>
                                                <div>
                                                    {reimbursement.receipts
                                                        ? `${reimbursement.receipts.length} receipt${reimbursement.receipts.length > 1 ? 's' : ''}`
                                                        : `${reimbursement.expenses?.length || 0} expense${(reimbursement.expenses?.length || 0) > 1 ? 's' : ''}`
                                                    }
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(reimbursement.status)}`}>
                                                    {getStatusIcon(reimbursement.status)}
                                                    <span className="break-words">{getStatusDisplayName(reimbursement.status)}</span>
                                                </div>
                                                <button
                                                    onClick={() => setViewReimbursement(reimbursement)}
                                                    className="p-3 text-gray-400 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-gray-100"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Desktop Layout */}
                                        <div className="hidden md:flex items-center justify-between p-4">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <Receipt className="w-6 h-6 text-green-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{reimbursement.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">{reimbursement.businessPurpose}</p>
                                                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                                        <span>Submitted: {reimbursement.submittedAt?.toDate ? reimbursement.submittedAt.toDate().toLocaleDateString() : new Date(reimbursement.submittedAt).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className="capitalize">{reimbursement.department}</span>
                                                        <span>•</span>
                                                        <span>
                                                            {reimbursement.receipts
                                                                ? `${reimbursement.receipts.length} receipt${reimbursement.receipts.length > 1 ? 's' : ''}`
                                                                : `${reimbursement.expenses?.length || 0} expense${(reimbursement.expenses?.length || 0) > 1 ? 's' : ''}`
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-gray-900">${calculateTotalAmount(reimbursement).toFixed(2)}</p>
                                                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reimbursement.status)}`}>
                                                        {getStatusIcon(reimbursement.status)}
                                                        <span>{getStatusDisplayName(reimbursement.status)}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setViewReimbursement(reimbursement)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>


                </div>
            </main>

            {/* Modals */}
            <ReimbursementWizardModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSubmit={handleSubmitReimbursement}
            />

            {viewReimbursement && (
                <ReimbursementDetailModal
                    reimbursement={viewReimbursement}
                    onClose={() => setViewReimbursement(null)}
                />
            )}
        </div>
    );
}
