import { useState } from 'react';
import { X, Calendar, Building, CreditCard, FileText, MapPin, Download, Eye, File, Image, CheckCircle, Trash2 } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tabs, Tab, Chip } from '@heroui/react';
import type { UserRole } from '../../shared/types/firestore';
import { showToast } from '../../shared/utils/toast';

interface ReimbursementDetailModalProps {
    reimbursement: any;
    onClose: () => void;
    userRole?: UserRole;
    onDeleteReimbursement?: (reimbursementId: string) => Promise<void>;
}

export default function ReimbursementDetailModal({ reimbursement, onClose, userRole, onDeleteReimbursement }: ReimbursementDetailModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isAdmin = userRole === 'Administrator';

    // Calculate subtotal from line items if needed
    const calculateReceiptSubtotal = (receipt: any) => {
        let subtotal = receipt.subtotal || 0;
        if (subtotal === 0 && receipt.lineItems && receipt.lineItems.length > 0) {
            subtotal = receipt.lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        }
        return subtotal;
    };

    // Calculate total if it's 0 or missing in Firestore
    const calculateReceiptTotal = (receipt: any) => {
        if (receipt.total && receipt.total > 0) {
            return receipt.total;
        }
        // Fallback: calculate from components
        const subtotal = calculateReceiptSubtotal(receipt);
        return subtotal + (receipt.tax || 0) + (receipt.tip || 0) + (receipt.shipping || 0) + (receipt.otherCharges || 0);
    };

    // Calculate total amount for all receipts
    const calculateTotalAmount = () => {
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

    const getStatusColor = (status: string): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
        switch (status) {
            case 'submitted':
                return 'warning';
            case 'under_review':
                return 'primary';
            case 'approved':
                return 'success';
            case 'paid':
                return 'primary';
            case 'declined':
                return 'danger';
            default:
                return 'default';
        }
    };

    const getStatusDisplayName = (status: string) => {
        switch (status) {
            case 'submitted':
                return 'Submitted';
            case 'under_review':
                return 'Under Review';
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

    const handleDeleteReimbursement = async () => {
        if (!onDeleteReimbursement) return;

        setIsDeleting(true);
        try {
            await onDeleteReimbursement(reimbursement.id);
            onClose(); // Close modal after successful deletion
        } catch (error) {
            console.error('Error deleting reimbursement:', error);
            showToast.error('Failed to delete reimbursement. Please try again.');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            size="4xl"
            scrollBehavior="inside"
            classNames={{
                base: "max-h-[90vh]",
                body: "py-6",
                header: "border-b border-divider",
            }}
        >
            <ModalContent>
                {(onModalClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <div className="flex items-center justify-between w-full">
                                <h2 className="text-xl font-semibold">Reimbursement Details</h2>
                                {/* Delete button for administrators */}
                                {isAdmin && onDeleteReimbursement && (
                                    showDeleteConfirm ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-danger">Delete this reimbursement?</span>
                                            <Button
                                                size="sm"
                                                color="danger"
                                                onPress={handleDeleteReimbursement}
                                                isLoading={isDeleting}
                                            >
                                                Yes
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                onPress={() => setShowDeleteConfirm(false)}
                                                isDisabled={isDeleting}
                                            >
                                                No
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            color="danger"
                                            onPress={() => setShowDeleteConfirm(true)}
                                            aria-label="Delete reimbursement"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    )
                                )}
                            </div>
                        </ModalHeader>

                        <ModalBody>
                            {/* Header Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">{reimbursement.title}</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <Building className="w-5 h-5 text-gray-400" />
                                            <span className="text-sm text-gray-600">Department: <span className="font-medium capitalize">{reimbursement.department}</span></span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="w-5 h-5 text-gray-400" />
                                            <span className="text-sm text-gray-600">Date of Purchase: <span className="font-medium">{reimbursement.dateOfPurchase}</span></span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <CreditCard className="w-5 h-5 text-gray-400" />
                                            <span className="text-sm text-gray-600">Payment Method: <span className="font-medium">{reimbursement.paymentMethod}</span></span>
                                        </div>
                                        {reimbursement.location && (
                                            <div className="flex items-center space-x-3">
                                                <MapPin className="w-5 h-5 text-gray-400" />
                                                <span className="text-sm text-gray-600">Location: <span className="font-medium">{reimbursement.location}</span></span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-right mb-4">
                                        <p className="text-3xl font-bold text-gray-900">${calculateTotalAmount().toFixed(2)}</p>
                                        <Chip
                                            color={getStatusColor(reimbursement.status)}
                                            variant="flat"
                                            size="md"
                                        >
                                            {getStatusDisplayName(reimbursement.status)}
                                        </Chip>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <p>Submitted: {reimbursement.submittedAt?.toDate ? reimbursement.submittedAt.toDate().toLocaleDateString() : new Date(reimbursement.submittedAt).toLocaleDateString()}</p>
                                        {reimbursement.vendor && <p>Vendor: {reimbursement.vendor}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Organization Purpose */}
                            <div>
                                <h4 className="text-md font-medium text-gray-900 mb-2">Organization Purpose</h4>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{reimbursement.businessPurpose}</p>
                            </div>

                            {/* Expenses/Reimbursements Tabs */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3">
                                    {reimbursement.receipts ? 'Receipts' : 'Itemized Expenses'}
                                </h4>
                                <div>
                                    {reimbursement.receipts ? (
                                        <Tabs
                                            aria-label="Receipts"
                                            variant="underlined"
                                            color="primary"
                                            classNames={{
                                                tabList: "gap-6 w-full relative rounded-none p-0 border-b border-gray-100",
                                                cursor: "w-full bg-blue-600",
                                                tab: "max-w-fit px-0 h-12",
                                                tabContent: "group-data-[selected=true]:text-blue-600 font-medium text-gray-500"
                                            }}
                                        >
                                            {reimbursement.receipts.map((receipt: any, receiptIndex: number) => (
                                                <Tab
                                                    key={receipt.id || receiptIndex}
                                                    title={
                                                        <div className="flex items-center space-x-2">
                                                            <span>{receipt.vendorName || `Receipt ${receiptIndex + 1}`}</span>
                                                            <span className="bg-gray-100 text-xs py-0.5 px-1.5 rounded-md group-data-[selected=true]:bg-blue-50 group-data-[selected=true]:text-blue-600">
                                                                ${receipt.total?.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    }
                                                >
                                                    <div className="pt-4 animate-appearance-in">
                                                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                                            <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4 border-b border-gray-100 pb-6">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <h5 className="font-bold text-gray-900 text-xl">{receipt.vendorName}</h5>
                                                                        <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                                                            {receipt.dateOfPurchase ? new Date(receipt.dateOfPurchase).toLocaleDateString() : 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                                                        <MapPin className="w-4 h-4" />
                                                                        {receipt.location || 'No location specified'}
                                                                    </p>
                                                                </div>
                                                                <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100/50 self-start">
                                                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">Total Amount</p>
                                                                    <p className="text-2xl font-bold text-blue-900">${receipt.total?.toFixed(2)}</p>
                                                                </div>
                                                            </div>

                                                            {/* Line Items */}
                                                            <div className="mb-6 bg-gray-50/50 rounded-xl border border-gray-100 overflow-hidden">
                                                                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200/60 flex justify-between">
                                                                    <h6 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Item Description</h6>
                                                                    <h6 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Amount</h6>
                                                                </div>
                                                                <div className="divide-y divide-gray-100">
                                                                    {receipt.lineItems?.map((item: any, itemIndex: number) => (
                                                                        <div key={item.id || itemIndex} className="flex justify-between text-sm p-4 hover:bg-white transition-colors">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-semibold text-gray-900">{item.description}</span>
                                                                                <span className="text-xs text-gray-400 font-medium">{item.category}</span>
                                                                            </div>
                                                                            <span className="text-gray-900 font-bold font-mono">${item.amount?.toFixed(2)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Receipt totals */}
                                                            <div className="flex flex-col gap-2 pt-2">
                                                                <div className="self-end w-full max-w-xs space-y-2">
                                                                    <div className="flex justify-between text-sm text-gray-600">
                                                                        <span>Subtotal</span>
                                                                        <span className="font-medium">${calculateReceiptSubtotal(receipt).toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm text-gray-600">
                                                                        <span>Tax</span>
                                                                        <span className="font-medium">${(receipt.tax || 0).toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm text-gray-600">
                                                                        <span>Tip</span>
                                                                        <span className="font-medium">${(receipt.tip || 0).toFixed(2)}</span>
                                                                    </div>
                                                                    {(receipt.shipping > 0) && (
                                                                        <div className="flex justify-between text-sm text-gray-600">
                                                                            <span>Shipping</span>
                                                                            <span className="font-medium">${receipt.shipping?.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                    {(receipt.otherCharges > 0) && (
                                                                        <div className="flex justify-between text-sm text-gray-600">
                                                                            <span>Other Charges</span>
                                                                            <span className="font-medium">${receipt.otherCharges?.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-base font-bold text-gray-900">
                                                                        <span>Total</span>
                                                                        <span>${receipt.total?.toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Receipt Image */}
                                                            {receipt.receiptFile && (
                                                                <div className="mt-8 pt-6 border-t border-gray-100">
                                                                    <h6 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Attachments</h6>
                                                                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                                                        <div className="flex items-center space-x-4">
                                                                            <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
                                                                                <FileText className="w-6 h-6" />
                                                                            </div>
                                                                            <div>
                                                                                <span className="block text-sm font-bold text-indigo-950">Original Receipt</span>
                                                                                <span className="text-xs text-indigo-500 font-medium">Click view to open file</span>
                                                                            </div>
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            color="primary"
                                                                            variant="flat"
                                                                            onPress={() => window.open(receipt.receiptFile, '_blank')}
                                                                            startContent={<Eye className="w-3.5 h-3.5" />}
                                                                            className="font-semibold bg-indigo-100/50 text-indigo-700 hover:bg-indigo-100"
                                                                        >
                                                                            View File
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Notes */}
                                                            {receipt.notes && (
                                                                <div className="mt-6">
                                                                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                                                        <h6 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                            Additional Notes
                                                                        </h6>
                                                                        <p className="text-sm text-amber-900/80 leading-relaxed">{receipt.notes}</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Tab>
                                            ))}
                                        </Tabs>
                                    ) : (
                                        <Tabs
                                            aria-label="Expenses"
                                            variant="underlined"
                                            color="primary"
                                        >
                                            {reimbursement.expenses?.map((expense: any, index: number) => (
                                                <Tab
                                                    key={expense.id || index}
                                                    title={
                                                        <div className="flex items-center space-x-2">
                                                            <span>Expense {index + 1}</span>
                                                            <span className="bg-gray-100 text-xs py-0.5 px-1.5 rounded-md group-data-[selected=true]:bg-blue-50 group-data-[selected=true]:text-blue-600">
                                                                ${expense.amount?.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    }
                                                >
                                                    <div className="pt-4 animate-appearance-in">
                                                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                                            <div className="flex items-start justify-between mb-2 gap-4">
                                                                <div className="flex-1">
                                                                    <h5 className="font-bold text-gray-900 text-lg">{expense.description}</h5>
                                                                    <p className="text-sm text-gray-500 font-medium">Category: {expense.category}</p>
                                                                </div>
                                                                <span className="text-xl font-bold text-gray-900">${expense.amount?.toFixed(2)}</span>
                                                            </div>

                                                            {expense.receipt && (
                                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                                    {(expense.receipt.url || expense.receipt.downloadURL || (typeof expense.receipt === 'string' && expense.receipt.startsWith('http')) || expense.receipt) ? (
                                                                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                                            <div className="flex items-center space-x-3">
                                                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                                                    <File className="w-5 h-5" />
                                                                                </div>
                                                                                <div>
                                                                                    <span className="block text-sm font-semibold text-indigo-900">Receipt Available</span>
                                                                                    {expense.receipt.name && (
                                                                                        <span className="text-xs text-indigo-600 truncate max-w-[200px] block">({expense.receipt.name})</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        try {
                                                                                            let url = expense.receipt.url ||
                                                                                                expense.receipt.downloadURL ||
                                                                                                (typeof expense.receipt === 'string' && expense.receipt.startsWith('http') ? expense.receipt : null);

                                                                                            if (!url && expense.receipt) {
                                                                                                const filename = expense.receipt.name || expense.receipt;
                                                                                                if (filename && typeof filename === 'string' && !filename.startsWith('http')) {
                                                                                                    const { ref, getDownloadURL } = await import('firebase/storage');
                                                                                                    const { storage } = await import('../../../../firebase/client');
                                                                                                    const possiblePaths = [
                                                                                                        `receipts/${reimbursement.submittedBy}/${filename}`,
                                                                                                        `reimbursements/${reimbursement.submittedBy}/${filename}`,
                                                                                                        `reimbursements/${reimbursement.submittedBy}/${Date.now()}_${filename}`,
                                                                                                        filename
                                                                                                    ];
                                                                                                    for (const path of possiblePaths) {
                                                                                                        try {
                                                                                                            const storageRef = ref(storage, path);
                                                                                                            url = await getDownloadURL(storageRef);
                                                                                                            break;
                                                                                                        } catch (e) { }
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                            if (url && typeof url === 'string' && url.startsWith('http')) window.open(url, '_blank');
                                                                                            else showToast.error('Unable to open receipt.');
                                                                                        } catch (error) { showToast.error('Error opening receipt.'); }
                                                                                    }}
                                                                                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                                                                                >
                                                                                    <Eye className="w-4 h-4" />
                                                                                    <span>View</span>
                                                                                </button>
                                                                                <a
                                                                                    href={expense.receipt.url || expense.receipt.downloadURL || (typeof expense.receipt === 'string' && expense.receipt.startsWith('http') ? expense.receipt : null) || expense.receipt}
                                                                                    download={expense.receipt.name || 'receipt'}
                                                                                    className="flex items-center space-x-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-all"
                                                                                >
                                                                                    <Download className="w-4 h-4" />
                                                                                    <span>Download</span>
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center space-x-2">
                                                                            <FileText className="w-4 h-4 text-gray-400" />
                                                                            <span className="text-sm text-gray-500">No receipt attached</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Tab>
                                            ))}
                                        </Tabs>
                                    )}
                                </div>
                            </div>

                            {/* Additional Information */}
                            {reimbursement.additionalInfo && (
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-2">Additional Information</h4>
                                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{reimbursement.additionalInfo}</p>
                                </div>
                            )}

                            {/* Payment Confirmation Details */}
                            {reimbursement.status === 'paid' && reimbursement.paymentConfirmation && (
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-4">Payment Confirmation</h4>
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                <span className="text-sm font-medium text-green-900">Payment Confirmed</span>
                                            </div>
                                            {reimbursement.paymentConfirmation.confirmationNumber && (
                                                <div className="text-sm">
                                                    <span className="text-gray-600">Confirmation Number: </span>
                                                    <span className="font-mono text-gray-900">{reimbursement.paymentConfirmation.confirmationNumber}</span>
                                                </div>
                                            )}
                                            {reimbursement.paymentConfirmation.paidByName && reimbursement.paymentConfirmation.paidAt && (
                                                <div className="text-sm">
                                                    <span className="text-gray-600">Paid by: </span>
                                                    <span className="text-gray-900">{reimbursement.paymentConfirmation.paidByName}</span>
                                                    <span className="text-gray-500 ml-2">on {new Date(reimbursement.paymentConfirmation.paidAt?.toDate ? reimbursement.paymentConfirmation.paidAt.toDate() : reimbursement.paymentConfirmation.paidAt).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {reimbursement.paymentConfirmation.photoAttachment && (
                                                <div className="mt-3">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                // Always use getDownloadURL to get a fresh URL with proper authentication token
                                                                const { ref, getDownloadURL } = await import('firebase/storage');
                                                                const { storage } = await import('../../../../firebase/client');

                                                                let storagePath = reimbursement.paymentConfirmation.storagePath;

                                                                // If we don't have a storage path, try to extract it from the photoAttachment URL
                                                                if (!storagePath && reimbursement.paymentConfirmation.photoAttachment) {
                                                                    try {
                                                                        // Extract path from Firebase Storage URL
                                                                        // URL format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path?alt=media
                                                                        const urlObj = new URL(reimbursement.paymentConfirmation.photoAttachment);
                                                                        if (urlObj.hostname === 'firebasestorage.googleapis.com') {
                                                                            storagePath = decodeURIComponent(urlObj.pathname.split('/o/')[1].split('?')[0]);
                                                                        }
                                                                    } catch (e) {
                                                                        console.warn('Could not extract path from photoAttachment URL');
                                                                    }
                                                                }

                                                                if (!storagePath) {
                                                                    console.error('No storage path available for payment confirmation');
                                                                    showToast.error('Unable to find the payment confirmation file path.');
                                                                    return;
                                                                }

                                                                let storageRef = ref(storage, storagePath);
                                                                let url;

                                                                try {
                                                                    url = await getDownloadURL(storageRef);
                                                                } catch (error) {
                                                                    // If file not found in new location, try the old location for backward compatibility
                                                                    if (storagePath.startsWith('payment-confirmations/')) {
                                                                        const oldPath = storagePath.replace('payment-confirmations/', 'reimbursements/paymentConfirmations/');
                                                                        console.log('File not found in new location, trying old location:', oldPath);
                                                                        storageRef = ref(storage, oldPath);
                                                                        url = await getDownloadURL(storageRef);
                                                                    } else {
                                                                        throw error;
                                                                    }
                                                                }

                                                                if (url && typeof url === 'string' && url.startsWith('http')) {
                                                                    window.open(url, '_blank');
                                                                } else {
                                                                    console.error('Unable to resolve payment confirmation URL');
                                                                    showToast.error('Unable to open payment confirmation. There may be an issue with the file storage.');
                                                                }
                                                            } catch (error) {
                                                                console.error('Error opening payment confirmation:', error);
                                                                showToast.error(`An error occurred while trying to open the payment confirmation: ${error instanceof Error ? error.message : String(error)}`);
                                                            }
                                                        }}
                                                        className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                                    >
                                                        <Image className="w-4 h-4" />
                                                        <span>View Payment Confirmation</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Declined Reason */}
                            {reimbursement.status === 'declined' && reimbursement.auditNotes && reimbursement.auditNotes.length > 0 && (
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-4">Reason for Decline</h4>
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <X className="w-5 h-5 text-red-600" />
                                                <span className="text-sm font-medium text-red-900">Request Declined</span>
                                            </div>
                                            <div className="text-sm text-red-800">
                                                {reimbursement.auditNotes[reimbursement.auditNotes.length - 1]?.note}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Audit Notes */}
                            {reimbursement.auditNotes && reimbursement.auditNotes.length > 0 && (
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-4">Audit Notes</h4>
                                    <div className="space-y-3">
                                        {reimbursement.auditNotes.map((note: any, index: number) => (
                                            <div key={index} className="border border-gray-200 rounded-xl p-3">
                                                <p className="text-gray-700">{note.note}</p>
                                                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                                    <span>By: {note.createdByName || note.createdBy}</span>
                                                    <span>{new Date(note.timestamp?.toDate ? note.timestamp.toDate() : note.timestamp).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Audit Logs */}
                            {reimbursement.auditLogs && reimbursement.auditLogs.length > 0 && (
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-4">Activity Log</h4>
                                    <div className="space-y-2">
                                        {reimbursement.auditLogs.map((log: any, index: number) => (
                                            <div key={index} className="border-l-4 border-blue-200 bg-blue-50 p-3 rounded">
                                                <p className="text-sm text-blue-800">{log.action}</p>
                                                <div className="flex items-center justify-between mt-1 text-xs text-blue-600">
                                                    <span>By: {log.createdByName || log.createdBy}</span>
                                                    <span>{new Date(log.timestamp?.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </ModalBody>

                        <ModalFooter>
                            <Button
                                variant="light"
                                onPress={onModalClose}
                            >
                                Close
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
