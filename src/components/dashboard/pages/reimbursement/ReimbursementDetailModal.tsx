import { useState } from 'react';
import { X, Calendar, Building, CreditCard, FileText, MapPin, Download, Eye, File, Image, CheckCircle, Trash2 } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Chip } from '@heroui/react';
import type { UserRole } from '../../shared/types/firestore';

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
        return subtotal + (receipt.tax || 0) + (receipt.tip || 0) + (receipt.shipping || 0);
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
            alert('Failed to delete reimbursement. Please try again.');
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

                            {/* Expenses/Reimbursements */}
                            <div>
                                <h4 className="text-md font-medium text-gray-900 mb-4">
                                    {reimbursement.receipts ? 'Receipts' : 'Itemized Expenses'}
                                </h4>
                                <div className="space-y-3">
                                    {reimbursement.receipts ? (
                                        // New multi-receipt format
                                        reimbursement.receipts.map((receipt: any, receiptIndex: number) => (
                                            <div key={receipt.id || receiptIndex} className="border border-gray-200 rounded-xl p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h5 className="font-medium text-gray-900">{receipt.vendorName}</h5>
                                                        <div className="text-sm text-gray-600 space-y-1">
                                                            <p><strong>Location:</strong> {receipt.location || 'N/A'}</p>
                                                            <p><strong>Date:</strong> {receipt.dateOfPurchase ? new Date(receipt.dateOfPurchase).toLocaleDateString() : 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-lg font-bold text-gray-900">${receipt.total?.toFixed(2)}</span>
                                                </div>

                                                {/* Line Items */}
                                                <div className="mb-3">
                                                    <h6 className="text-sm font-medium text-gray-700 mb-2">Line Items:</h6>
                                                    <div className="space-y-1">
                                                        {receipt.lineItems?.map((item: any, itemIndex: number) => (
                                                            <div key={item.id || itemIndex} className="flex justify-between text-sm">
                                                                <span>{item.description} ({item.category})</span>
                                                                <span>${item.amount?.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Receipt totals */}
                                                <div className="text-sm text-gray-600 border-t pt-2">
                                                    <div className="flex justify-between">
                                                        <span>Subtotal:</span>
                                                        <span>${calculateReceiptSubtotal(receipt).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Tax:</span>
                                                        <span>${(receipt.tax || 0).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Tip:</span>
                                                        <span>${(receipt.tip || 0).toFixed(2)}</span>
                                                    </div>
                                                    {receipt.shipping > 0 && (
                                                        <div className="flex justify-between">
                                                            <span>Shipping:</span>
                                                            <span>${receipt.shipping?.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between font-medium">
                                                        <span>Total:</span>
                                                        <span>${calculateReceiptTotal(receipt).toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                {/* Receipt Image */}
                                                {receipt.receiptFile && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                                            <div className="flex items-center space-x-2">
                                                                <FileText className="w-4 h-4 text-blue-600" />
                                                                <span className="text-sm font-medium text-blue-900">Receipt Image Available</span>
                                                            </div>
                                                            <button
                                                                onClick={() => window.open(receipt.receiptFile, '_blank')}
                                                                className="mt-2 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                <span>View Receipt</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                {receipt.notes && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <p className="text-sm text-gray-600">{receipt.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        // Legacy single-expense format
                                        reimbursement.expenses?.map((expense: any, index: number) => (
                                            <div key={expense.id || index} className="border border-gray-200 rounded-xl p-4">
                                                <div className="flex items-start justify-between mb-2 gap-4">
                                                    <h5 className="font-medium text-gray-900 break-words flex-1 min-w-0">{expense.description}</h5>
                                                    <span className="text-lg font-bold text-gray-900 flex-shrink-0">${expense.amount?.toFixed(2)}</span>
                                                </div>
                                                <div className="text-sm text-gray-600 mb-3">
                                                    <span>Category: {expense.category}</span>
                                                </div>
                                                {expense.receipt && (
                                                    // Support multiple receipt data formats
                                                    expense.receipt.url ||
                                                    expense.receipt.downloadURL ||
                                                    (typeof expense.receipt === 'string' && expense.receipt.startsWith('http')) ||
                                                    expense.receipt
                                                ) && (
                                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                                                    <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                                    <span className="text-sm font-medium text-blue-900">Receipt Available</span>
                                                                    {expense.receipt.name && (
                                                                        <span className="text-xs text-blue-600 truncate">({expense.receipt.name})</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                // Support multiple receipt data formats
                                                                                let url = expense.receipt.url ||
                                                                                    expense.receipt.downloadURL ||
                                                                                    (typeof expense.receipt === 'string' && expense.receipt.startsWith('http') ? expense.receipt : null);

                                                                                console.log('Receipt data:', expense.receipt);
                                                                                console.log('Initial URL:', url);

                                                                                // If we don't have a URL but have a filename, try to construct Firebase URL
                                                                                if (!url && expense.receipt) {
                                                                                    const filename = expense.receipt.name || expense.receipt;
                                                                                    if (filename && typeof filename === 'string' && !filename.startsWith('http')) {
                                                                                        console.log('Attempting to construct Firebase URL from filename:', filename);

                                                                                        // Try to construct Firebase Storage URL
                                                                                        // This requires getting a new download URL from Firebase
                                                                                        try {
                                                                                            const { ref, getDownloadURL } = await import('firebase/storage');
                                                                                            const { storage } = await import('../../../../firebase/client');

                                                                                            // Try different possible paths where the file might be stored
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
                                                                                                    console.log('Successfully constructed URL:', url);
                                                                                                    break;
                                                                                                } catch (e) {
                                                                                                    console.log(`Failed to get URL for path: ${path}`);
                                                                                                }
                                                                                            }
                                                                                        } catch (storageError) {
                                                                                            console.error('Error constructing Firebase URL:', storageError);
                                                                                        }
                                                                                    }
                                                                                }

                                                                                if (url && typeof url === 'string' && url.startsWith('http')) {
                                                                                    window.open(url, '_blank');
                                                                                } else {
                                                                                    console.error('Unable to resolve receipt URL');
                                                                                    alert(`Unable to open receipt. The receipt may have been uploaded with an older system or there may be an issue with the file storage. Receipt data: ${JSON.stringify(expense.receipt)}`);
                                                                                }
                                                                            } catch (error) {
                                                                                console.error('Error opening receipt:', error);
                                                                                alert('An error occurred while trying to open the receipt. Please try again.');
                                                                            }
                                                                        }}
                                                                        className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors min-h-[44px] flex-1 sm:flex-initial"
                                                                        title="View receipt"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                        <span>View</span>
                                                                    </button>
                                                                    <a
                                                                        href={expense.receipt.url ||
                                                                            expense.receipt.downloadURL ||
                                                                            (typeof expense.receipt === 'string' && expense.receipt.startsWith('http') ? expense.receipt : null) ||
                                                                            expense.receipt}
                                                                        download={expense.receipt.name || 'receipt'}
                                                                        className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors min-h-[44px] flex-1 sm:flex-initial"
                                                                        title="Download receipt"
                                                                    >
                                                                        <Download className="w-4 h-4" />
                                                                        <span>Download</span>
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                {(!expense.receipt || (
                                                    !expense.receipt.url &&
                                                    !expense.receipt.downloadURL &&
                                                    !(typeof expense.receipt === 'string' && expense.receipt.startsWith('http')) &&
                                                    !expense.receipt
                                                )) && (
                                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                                                            <div className="flex items-center space-x-2">
                                                                <FileText className="w-4 h-4 text-gray-400" />
                                                                <span className="text-sm text-gray-500">No receipt attached</span>
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        )))}
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
                                                                    alert('Unable to find the payment confirmation file path.');
                                                                    return;
                                                                }

                                                                console.log('Payment confirmation access attempt:', {
                                                                    reimbursementId: reimbursement.id,
                                                                    reimbursementData: {
                                                                        submittedBy: reimbursement.submittedBy,
                                                                        status: reimbursement.status
                                                                    },
                                                                    storagePath,
                                                                    paymentConfirmation: reimbursement.paymentConfirmation
                                                                });

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
                                                                    alert('Unable to open payment confirmation. There may be an issue with the file storage.');
                                                                }
                                                            } catch (error) {
                                                                console.error('Error opening payment confirmation:', error);
                                                                alert(`An error occurred while trying to open the payment confirmation: ${error instanceof Error ? error.message : String(error)}`);
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