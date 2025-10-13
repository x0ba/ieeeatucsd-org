import { useState, useEffect, useRef } from 'react';
import { Calendar, Building, CreditCard, MapPin, Eye, CheckCircle, MessageCircle, Upload, UserCheck, User as UserIcon, XCircle, Receipt } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Chip, Input, Textarea, Select, SelectItem, Spacer, Divider, Card, CardHeader, CardBody, Tabs, Tab } from '@heroui/react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { UserRole } from '../../shared/types/firestore';
import { useGlobalImagePaste } from '../../shared/hooks/useGlobalImagePaste';
import { useModalRegistration } from '../../shared/contexts/ModalContext';
import { usePasteNotification } from '../../shared/components/PasteNotification';

interface ReimbursementModalProps {
    reimbursement: any;
    onClose: () => void;
    userRole?: UserRole;
    onUpdate?: (id: string, status: string, auditNote?: string, paymentInfo?: any) => void;
    canPerformOfficerActions?: boolean;
}

export default function ReimbursementModal({
    reimbursement,
    onClose,
    userRole,
    onUpdate,
    canPerformOfficerActions = false
}: ReimbursementModalProps) {
    const [user] = useAuthState(auth);

    // Audit/Action states
    const [action, setAction] = useState<'review' | 'approve' | 'approve_paid' | 'decline' | 'request_audit'>('review');
    const [auditNote, setAuditNote] = useState('');
    const [paymentInfo, setPaymentInfo] = useState({
        confirmationNumber: '',
        photoAttachment: null as File | null
    });
    const [executives, setExecutives] = useState<any[]>([]);
    const [selectedAuditor, setSelectedAuditor] = useState('');
    const [currentUserName, setCurrentUserName] = useState('');
    const [submitterName, setSubmitterName] = useState<string>('');
    const [submitterZelle, setSubmitterZelle] = useState<string>('');
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [activeReceiptTab, setActiveReceiptTab] = useState<string>('0');

    // Determine available actions based on status
    const availableActions = getAvailableActions(reimbursement.status);

    function getAvailableActions(status: string) {
        const actions = ['review']; // Always available

        if (status === 'submitted') {
            actions.push('approve', 'decline', 'request_audit');
        } else if (status === 'approved') {
            actions.push('approve_paid');
        }

        return actions;
    }

    const getStatusColor = (status: string): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
        switch (status) {
            case 'submitted':
                return 'warning';
            case 'under_review':
                return 'primary';
            case 'approved':
                return 'success';
            case 'paid':
                return 'success';
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

    // Paste notification
    const { showPasteNotification, PasteNotificationComponent } = usePasteNotification('Payment confirmation image pasted');

    // Register modal with global context
    useModalRegistration('reimbursement-management', true);

    // Global image paste handler
    useGlobalImagePaste({
        modalType: 'reimbursement-management',
        enabled: action === 'approve_paid', // Only enable when in "Mark as Paid" mode
        onImagePaste: (file) => {
            handleFileSelect(file);
        },
        onPasteSuccess: () => {
            showPasteNotification();
        }
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch current user's name
                if (user?.uid) {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setCurrentUserName(userData.name || userData.email || 'Unknown User');
                    }
                }

                // Fetch submitter's name and Zelle info
                if (reimbursement?.submittedBy) {
                    try {
                        const submitterDoc = await getDoc(doc(db, 'users', reimbursement.submittedBy));
                        if (submitterDoc.exists()) {
                            const submitterData: any = submitterDoc.data();
                            setSubmitterName(submitterData.name || submitterData.email || reimbursement.submittedBy);
                            setSubmitterZelle(submitterData.zelleInformation || '');
                        }
                    } catch (error) {
                        console.error('Error fetching submitter data:', error);
                    }
                }

                // Fetch executives for audit request
                if (canPerformOfficerActions) {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('role', '==', 'Executive Officer'));
                    const querySnapshot = await getDocs(q);
                    const executivesList = querySnapshot.docs
                        .map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }))
                        .filter((exec: any) => exec.id !== user?.uid);
                    setExecutives(executivesList);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [user, reimbursement, canPerformOfficerActions]);



    const handleFileSelect = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            setPaymentInfo(prev => ({ ...prev, photoAttachment: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select an image file');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    handleFileSelect(file);
                    e.preventDefault();
                }
                break;
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onUpdate) return;

        let newStatus = reimbursement.status;
        let note = auditNote.trim();
        let payment = null;

        setIsUploading(true);

        try {
            switch (action) {
                case 'approve':
                    newStatus = 'approved';
                    if (!note) note = `Approved by ${currentUserName}`;
                    break;
                case 'decline':
                    if (!note) {
                        alert('Please provide a reason for declining this request.');
                        setIsUploading(false);
                        return;
                    }
                    newStatus = 'declined';
                    break;
                case 'approve_paid':
                    if (!paymentInfo.confirmationNumber.trim()) {
                        alert('Please provide a payment confirmation number.');
                        setIsUploading(false);
                        return;
                    }

                    let photoUrl = '';
                    let storagePath = '';
                    if (paymentInfo.photoAttachment) {
                        try {
                            // Ensure user is authenticated before upload
                            if (!user || !user.uid) {
                                throw new Error('User not authenticated');
                            }

                            // Get fresh auth token
                            const idToken = await user.getIdToken();

                            const file = paymentInfo.photoAttachment;

                            // Create FormData for multipart upload
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('reimbursementId', reimbursement.id);

                            // Upload using server-side API endpoint with Admin SDK
                            const response = await fetch('/api/upload-payment-confirmation', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${idToken}`,
                                },
                                body: formData,
                            });

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || `Upload failed: ${response.status} ${response.statusText}`);
                            }

                            const result = await response.json();
                            photoUrl = result.downloadUrl;
                            storagePath = result.storagePath;

                            console.log('Payment confirmation uploaded successfully:', { photoUrl, storagePath });
                        } catch (err) {
                            console.error('Failed to upload confirmation file:', err);
                            alert(`Failed to upload the payment confirmation file: ${err instanceof Error ? err.message : 'Unknown error'}`);
                            setIsUploading(false);
                            return;
                        }
                    }

                    payment = {
                        confirmationNumber: paymentInfo.confirmationNumber,
                        photoAttachment: photoUrl,
                        storagePath,
                        paidAt: new Date(),
                        paidBy: user?.uid,
                        paidByName: currentUserName
                    };

                    newStatus = 'paid';
                    if (!note) note = `Marked as paid by ${currentUserName}`;
                    break;
                case 'request_audit':
                    if (!selectedAuditor) {
                        alert('Please select an executive to request audit from.');
                        setIsUploading(false);
                        return;
                    }
                    newStatus = 'under_review';
                    if (!note) note = 'Audit requested from another executive';
                    break;
                case 'review':
                    // Just adding a note
                    break;
            }

            onUpdate(reimbursement.id, newStatus, note || undefined, payment);
            onClose();
        } catch (error) {
            console.error('Error submitting action:', error);
            alert('Failed to submit action. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            {PasteNotificationComponent}
            <Modal
                isOpen={true}
                onClose={onClose}
                size="4xl"
                scrollBehavior="inside"
                hideCloseButton={true}
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
                                <h2 className="text-xl font-semibold">Reimbursement Details</h2>
                            </ModalHeader>

                            <ModalBody>
                                {/* Header Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                                            {submitterName && (
                                                <div className="flex items-center space-x-3">
                                                    <UserIcon className="w-5 h-5 text-gray-400" />
                                                    <span className="text-sm text-gray-600">Submitted By: <span className="font-medium">{submitterName}</span></span>
                                                </div>
                                            )}
                                            {submitterZelle && (
                                                <div className="flex items-center space-x-3">
                                                    <CreditCard className="w-5 h-5 text-gray-400" />
                                                    <span className="text-sm text-gray-600">Zelle: <span className="font-medium">{submitterZelle}</span></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-right mb-4">
                                            <p className="text-3xl font-bold text-gray-900">${reimbursement.totalAmount?.toFixed(2)}</p>
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
                                <div className="mb-6">
                                    <h4 className="text-md font-medium text-gray-900 mb-2">Organization Purpose</h4>
                                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{reimbursement.businessPurpose}</p>
                                </div>

                                {/* Payment Confirmation - Visible to all users when status is paid */}
                                {reimbursement.status === 'paid' && reimbursement.paymentConfirmation && (
                                    <div className="mb-6">
                                        <h4 className="text-md font-medium text-gray-900 mb-3">Payment Information</h4>
                                        <Card shadow="sm" className="border border-green-200 bg-green-50">
                                            <CardBody className="gap-3">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                    <span className="text-sm font-semibold text-green-900">Payment Confirmed</span>
                                                </div>

                                                {reimbursement.paymentConfirmation.confirmationNumber && (
                                                    <div className="text-sm">
                                                        <span className="text-gray-700 font-medium">Confirmation Number: </span>
                                                        <span className="font-mono text-gray-900 bg-white px-2 py-1 rounded">
                                                            {reimbursement.paymentConfirmation.confirmationNumber}
                                                        </span>
                                                    </div>
                                                )}

                                                {reimbursement.paymentConfirmation.paidByName && reimbursement.paymentConfirmation.paidAt && (
                                                    <div className="text-sm text-gray-700">
                                                        <span className="font-medium">Paid by: </span>
                                                        <span className="text-gray-900">{reimbursement.paymentConfirmation.paidByName}</span>
                                                        <span className="text-gray-600 ml-2">
                                                            on {new Date(
                                                                reimbursement.paymentConfirmation.paidAt?.toDate
                                                                    ? reimbursement.paymentConfirmation.paidAt.toDate()
                                                                    : reimbursement.paymentConfirmation.paidAt
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                )}

                                                {reimbursement.paymentConfirmation.photoAttachment && (
                                                    <div className="pt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="success"
                                                            startContent={<Eye className="w-4 h-4" />}
                                                            onPress={() => window.open(reimbursement.paymentConfirmation.photoAttachment, '_blank')}
                                                        >
                                                            View Confirmation Photo
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardBody>
                                        </Card>
                                    </div>
                                )}

                                <Divider className="my-6" />

                                {/* Receipts/Expenses Section with Tabs */}
                                <div className="mb-6">
                                    <h4 className="text-md font-medium text-gray-900 mb-4">
                                        {reimbursement.receipts ? 'Receipts' : 'Itemized Expenses'}
                                    </h4>

                                    {reimbursement.receipts && reimbursement.receipts.length > 0 ? (
                                        // New multi-receipt format with tabs
                                        <Tabs
                                            selectedKey={activeReceiptTab}
                                            onSelectionChange={(key) => setActiveReceiptTab(key as string)}
                                            variant="underlined"
                                            color="primary"
                                            className="w-full"
                                        >
                                            {reimbursement.receipts.map((receipt: any, receiptIndex: number) => (
                                                <Tab
                                                    key={receiptIndex.toString()}
                                                    title={
                                                        <div className="flex items-center gap-2">
                                                            <Receipt className="w-4 h-4" />
                                                            <span className="font-medium">
                                                                {receipt.vendorName || `Receipt ${receiptIndex + 1}`}
                                                            </span>
                                                        </div>
                                                    }
                                                >
                                                    <Card shadow="sm" className="mt-4">
                                                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                                            <div className="flex items-start justify-between w-full">
                                                                <div className="flex-1">
                                                                    <h5 className="text-lg font-semibold text-gray-900 mb-2">{receipt.vendorName}</h5>
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                                                        {receipt.location && (
                                                                            <div className="flex items-center gap-1">
                                                                                <MapPin className="w-3.5 h-3.5" />
                                                                                <span>{receipt.location}</span>
                                                                            </div>
                                                                        )}
                                                                        {receipt.dateOfPurchase && (
                                                                            <div className="flex items-center gap-1">
                                                                                <Calendar className="w-3.5 h-3.5" />
                                                                                <span>{new Date(receipt.dateOfPurchase).toLocaleDateString()}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right ml-4">
                                                                    <p className="text-2xl font-bold text-gray-900">${receipt.total?.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                        </CardHeader>

                                                        <CardBody className="gap-4">
                                                            {/* Line Items */}
                                                            {receipt.lineItems && receipt.lineItems.length > 0 && (
                                                                <div>
                                                                    <h6 className="text-sm font-semibold text-gray-700 mb-3">Line Items</h6>
                                                                    <div className="space-y-2">
                                                                        {receipt.lineItems.map((item: any, itemIndex: number) => (
                                                                            <div key={item.id || itemIndex} className="flex justify-between items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                    <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                                                                                    <Chip size="sm" variant="flat" color="default" className="flex-shrink-0">
                                                                                        {item.category}
                                                                                    </Chip>
                                                                                </div>
                                                                                <span className="text-sm font-semibold text-gray-900 flex-shrink-0">${item.amount?.toFixed(2)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {/* Subtotal breakdown */}
                                                                    {(receipt.tax || receipt.tip || receipt.shipping) && (
                                                                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                                                                            <div className="flex justify-between text-sm text-gray-600">
                                                                                <span>Subtotal</span>
                                                                                <span className="font-medium">${receipt.subtotal?.toFixed(2)}</span>
                                                                            </div>
                                                                            {receipt.tax > 0 && (
                                                                                <div className="flex justify-between text-sm text-gray-600">
                                                                                    <span>Tax</span>
                                                                                    <span className="font-medium">${receipt.tax?.toFixed(2)}</span>
                                                                                </div>
                                                                            )}
                                                                            {receipt.tip > 0 && (
                                                                                <div className="flex justify-between text-sm text-gray-600">
                                                                                    <span>Tip</span>
                                                                                    <span className="font-medium">${receipt.tip?.toFixed(2)}</span>
                                                                                </div>
                                                                            )}
                                                                            {receipt.shipping > 0 && (
                                                                                <div className="flex justify-between text-sm text-gray-600">
                                                                                    <span>Shipping</span>
                                                                                    <span className="font-medium">${receipt.shipping?.toFixed(2)}</span>
                                                                                </div>
                                                                            )}
                                                                            <Divider className="my-2" />
                                                                            <div className="flex justify-between text-base font-bold text-gray-900">
                                                                                <span>Total</span>
                                                                                <span>${receipt.total?.toFixed(2)}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Receipt Image */}
                                                            {receipt.receiptFile && (
                                                                <div className="pt-2">
                                                                    <Button
                                                                        size="md"
                                                                        variant="flat"
                                                                        color="primary"
                                                                        startContent={<Eye className="w-4 h-4" />}
                                                                        onPress={() => window.open(receipt.receiptFile, '_blank')}
                                                                        className="w-full sm:w-auto"
                                                                    >
                                                                        View Receipt Image
                                                                    </Button>
                                                                </div>
                                                            )}

                                                            {/* Notes */}
                                                            {receipt.notes && (
                                                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                                    <p className="text-sm text-gray-700">
                                                                        <span className="font-semibold text-gray-900">Notes:</span> {receipt.notes}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </CardBody>
                                                    </Card>
                                                </Tab>
                                            ))}
                                        </Tabs>
                                    ) : reimbursement.expenses && reimbursement.expenses.length > 0 ? (
                                        // Legacy single-expense format
                                        <div className="space-y-3">
                                            {reimbursement.expenses.map((expense: any, index: number) => (
                                                <Card key={expense.id || index} shadow="sm">
                                                    <CardBody>
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <h5 className="font-medium text-gray-900 truncate">{expense.description}</h5>
                                                                <Chip size="sm" variant="flat" color="default" className="flex-shrink-0">
                                                                    {expense.category}
                                                                </Chip>
                                                            </div>
                                                            <span className="text-lg font-bold text-gray-900 flex-shrink-0">${expense.amount?.toFixed(2)}</span>
                                                        </div>
                                                        {expense.receipt && (
                                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                                <Button
                                                                    size="sm"
                                                                    variant="flat"
                                                                    color="primary"
                                                                    startContent={<Eye className="w-4 h-4" />}
                                                                    onPress={() => {
                                                                        const url = expense.receipt.url || expense.receipt.downloadURL || expense.receipt;
                                                                        window.open(url, '_blank');
                                                                    }}
                                                                >
                                                                    View Receipt
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </CardBody>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">No receipts or expenses available</p>
                                    )}
                                </div>

                                {/* Action Section - Only show if user can perform officer actions */}
                                {canPerformOfficerActions && onUpdate && availableActions.length > 1 && (
                                    <>
                                        <Divider className="my-6" />
                                        <div className="mb-6">
                                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Actions</h4>

                                            <form onSubmit={handleSubmit} className="space-y-5">
                                                {/* Action Selection Card */}
                                                <Card shadow="sm" className="border border-gray-200">
                                                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                                                        <div className="flex items-center gap-2">
                                                            <MessageCircle className="w-5 h-5 text-blue-600" />
                                                            <h5 className="text-md font-semibold text-gray-900">Choose Action</h5>
                                                        </div>
                                                    </CardHeader>
                                                    <CardBody>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            <Button
                                                                type="button"
                                                                variant={action === 'review' ? 'solid' : 'bordered'}
                                                                color={action === 'review' ? 'primary' : 'default'}
                                                                onPress={() => setAction('review')}
                                                                startContent={<MessageCircle className="w-4 h-4" />}
                                                                className={action === 'review' ? 'shadow-md' : ''}
                                                            >
                                                                Add Note
                                                            </Button>
                                                            {availableActions.includes('approve') && (
                                                                <Button
                                                                    type="button"
                                                                    variant={action === 'approve' ? 'solid' : 'bordered'}
                                                                    color={action === 'approve' ? 'success' : 'default'}
                                                                    onPress={() => setAction('approve')}
                                                                    startContent={<CheckCircle className="w-4 h-4" />}
                                                                    className={action === 'approve' ? 'shadow-md' : ''}
                                                                >
                                                                    Approve
                                                                </Button>
                                                            )}
                                                            {availableActions.includes('decline') && (
                                                                <Button
                                                                    type="button"
                                                                    variant={action === 'decline' ? 'solid' : 'bordered'}
                                                                    color={action === 'decline' ? 'danger' : 'default'}
                                                                    onPress={() => setAction('decline')}
                                                                    startContent={<XCircle className="w-4 h-4" />}
                                                                    className={action === 'decline' ? 'shadow-md' : ''}
                                                                >
                                                                    Decline
                                                                </Button>
                                                            )}
                                                            {availableActions.includes('request_audit') && (
                                                                <Button
                                                                    type="button"
                                                                    variant={action === 'request_audit' ? 'solid' : 'bordered'}
                                                                    color={action === 'request_audit' ? 'secondary' : 'default'}
                                                                    onPress={() => setAction('request_audit')}
                                                                    startContent={<UserCheck className="w-4 h-4" />}
                                                                    className={action === 'request_audit' ? 'shadow-md' : ''}
                                                                >
                                                                    Request Audit
                                                                </Button>
                                                            )}
                                                            {availableActions.includes('approve_paid') && (
                                                                <Button
                                                                    type="button"
                                                                    variant={action === 'approve_paid' ? 'solid' : 'bordered'}
                                                                    color={action === 'approve_paid' ? 'success' : 'default'}
                                                                    onPress={() => setAction('approve_paid')}
                                                                    startContent={<CreditCard className="w-4 h-4" />}
                                                                    className={action === 'approve_paid' ? 'shadow-md' : ''}
                                                                >
                                                                    Mark as Paid
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </CardBody>
                                                </Card>

                                                {/* Action Details Card */}
                                                <Card shadow="sm" className="border border-gray-200">
                                                    <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                                                        <h5 className="text-md font-semibold text-gray-900">Action Details</h5>
                                                    </CardHeader>
                                                    <CardBody className="gap-4">
                                                        {/* Note/Reason Input */}
                                                        <Textarea
                                                            label={action === 'decline' ? 'Reason for Declining (Required)' : 'Note (Optional)'}
                                                            placeholder={action === 'decline' ? 'Please provide a reason...' : 'Add a note...'}
                                                            value={auditNote}
                                                            onValueChange={setAuditNote}
                                                            minRows={3}
                                                            isRequired={action === 'decline'}
                                                            variant="bordered"
                                                        />

                                                        {/* Request Audit - Executive Selection */}
                                                        {action === 'request_audit' && (
                                                            <Select
                                                                label="Select Executive for Audit"
                                                                placeholder="Choose an executive"
                                                                selectedKeys={selectedAuditor ? [selectedAuditor] : []}
                                                                onSelectionChange={(keys) => {
                                                                    const selected = Array.from(keys)[0] as string;
                                                                    setSelectedAuditor(selected || '');
                                                                }}
                                                                isRequired
                                                                variant="bordered"
                                                            >
                                                                {executives.map((exec: any) => (
                                                                    <SelectItem key={exec.id}>
                                                                        {exec.name || exec.email}
                                                                    </SelectItem>
                                                                ))}
                                                            </Select>
                                                        )}

                                                        {/* Mark as Paid - Payment Info */}
                                                        {action === 'approve_paid' && (
                                                            <div className="space-y-4">
                                                                <Input
                                                                    label="Payment Confirmation Number"
                                                                    placeholder="Enter confirmation number"
                                                                    value={paymentInfo.confirmationNumber}
                                                                    onValueChange={(value) => setPaymentInfo(prev => ({ ...prev, confirmationNumber: value }))}
                                                                    isRequired
                                                                    variant="bordered"
                                                                />

                                                                <div>
                                                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                                                        Payment Confirmation Photo (Optional)
                                                                    </label>
                                                                    <div
                                                                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${isDragging
                                                                            ? 'border-primary bg-primary-50 scale-[1.02]'
                                                                            : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                                                                            }`}
                                                                        onDragOver={handleDragOver}
                                                                        onDragLeave={handleDragLeave}
                                                                        onDrop={handleDrop}
                                                                        onPaste={handlePaste}
                                                                        onClick={() => fileInputRef.current?.click()}
                                                                        tabIndex={0}
                                                                    >
                                                                        <input
                                                                            ref={fileInputRef}
                                                                            type="file"
                                                                            accept="image/*"
                                                                            className="hidden"
                                                                            onChange={(e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file) handleFileSelect(file);
                                                                            }}
                                                                        />
                                                                        {previewUrl ? (
                                                                            <div className="space-y-3">
                                                                                <img
                                                                                    src={previewUrl}
                                                                                    alt="Preview"
                                                                                    className="max-h-40 mx-auto rounded-lg shadow-sm"
                                                                                />
                                                                                <p className="text-sm text-gray-600 font-medium">
                                                                                    {paymentInfo.photoAttachment?.name}
                                                                                </p>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="flat"
                                                                                    color="danger"
                                                                                    onPress={() => {
                                                                                        setPaymentInfo(prev => ({ ...prev, photoAttachment: null }));
                                                                                        setPreviewUrl(null);
                                                                                    }}
                                                                                >
                                                                                    Remove
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="py-4">
                                                                                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                                                                                <p className="text-sm font-medium text-gray-700 mb-1">
                                                                                    Drag and drop, paste, or click to upload
                                                                                </p>
                                                                                <p className="text-xs text-gray-500">
                                                                                    PNG, JPG up to 10MB • Press Ctrl+V (Cmd+V) to paste
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </CardBody>
                                                </Card>

                                                {/* Submit Button */}
                                                <div className="flex items-center gap-2 pt-4">
                                                    <Button
                                                        type="button"
                                                        variant="light"
                                                        onPress={onClose}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Spacer />
                                                    <Button
                                                        type="submit"
                                                        isDisabled={isUploading || (action === 'decline' && !auditNote.trim()) || (action === 'request_audit' && !selectedAuditor)}
                                                        isLoading={isUploading}
                                                        color={
                                                            action === 'approve' || action === 'approve_paid'
                                                                ? 'success'
                                                                : action === 'decline'
                                                                    ? 'danger'
                                                                    : action === 'request_audit'
                                                                        ? 'secondary'
                                                                        : 'primary'
                                                        }
                                                    >
                                                        {isUploading ? 'Processing...' : (
                                                            action === 'review' ? 'Add Note' :
                                                                action === 'approve' ? 'Approve (Not Paid)' :
                                                                    action === 'decline' ? 'Decline Request' :
                                                                        action === 'approve_paid' ? 'Approve & Mark Paid' :
                                                                            action === 'request_audit' ? 'Send Audit Request' : 'Submit'
                                                        )}
                                                    </Button>
                                                </div>
                                            </form>
                                        </div>
                                    </>
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
        </>
    );
}
