import { useState, useEffect, useRef } from 'react';
import { Calendar, Building, CreditCard, MapPin, Eye, CheckCircle, MessageCircle, Upload, UserCheck, User as UserIcon, XCircle, Receipt, RefreshCw, DollarSign, FileText, ImageOff } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Chip, Input, Textarea, Select, SelectItem, Spacer, Divider, Card, CardHeader, CardBody, Tabs, Tab, Image, Tooltip, ScrollShadow } from '@heroui/react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { UserRole } from '../../shared/types/firestore';
import { useGlobalImagePaste } from '../../shared/hooks/useGlobalImagePaste';
import { usePasteNotification } from '../../shared/components/PasteNotification';
import { showToast } from '../../shared/utils/toast';

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

    // AI Recalculation states
    const [recalculatingReceipts, setRecalculatingReceipts] = useState<Set<number>>(new Set());
    const [recalculationErrors, setRecalculationErrors] = useState<Map<number, string>>(new Map());

    // Image loading errors
    const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

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

    // Helper for correct date formatting
    const formatDate = (dateValue: any) => {
        if (!dateValue) return 'N/A';
        try {
            // Handle Firestore Timestamp
            if (dateValue?.toDate) {
                return dateValue.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            }
            // Handle string or Date object
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return String(dateValue);
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            return String(dateValue);
        }
    };

    // Paste notification
    const { showPasteNotification, PasteNotificationComponent } = usePasteNotification('Payment confirmation image pasted');

    // NOTE: Removed useModalRegistration to prevent errors about missing ModalProvider.
    // Ensure this doesn't break global features.

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
            showToast.error('Please select an image file');
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
                        showToast.error('Please provide a reason for declining this request.');
                        setIsUploading(false);
                        return;
                    }
                    newStatus = 'declined';
                    break;
                case 'approve_paid':
                    if (!paymentInfo.confirmationNumber.trim()) {
                        showToast.error('Please provide a payment confirmation number.');
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
                            showToast.error(`Failed to upload the payment confirmation file: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
                        showToast.error('Please select an executive to request audit from.');
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
            showToast.error('Failed to submit action. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    // AI Recalculation function
    const handleRecalculateReceipt = async (receiptIndex: number) => {
        const receipt = reimbursement.receipts[receiptIndex];

        // Check if receipt has a file
        if (!receipt.receiptFile) {
            showToast.error('No receipt file found to recalculate.');
            return;
        }

        // Get the receipt file URL (handle both string and object formats)
        const receiptFileUrl = typeof receipt.receiptFile === 'string'
            ? receipt.receiptFile
            : receipt.receiptFile.url;

        if (!receiptFileUrl) {
            showToast.error('Receipt file URL not found.');
            return;
        }

        try {
            // Mark receipt as recalculating
            setRecalculatingReceipts(prev => new Set(prev).add(receiptIndex));
            setRecalculationErrors(prev => {
                const newMap = new Map(prev);
                newMap.delete(receiptIndex);
                return newMap;
            });

            // Call the parse-receipt API
            const response = await fetch('/api/parse-receipt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageUrl: receiptFileUrl }),
            });

            if (!response.ok) {
                throw new Error('Failed to parse receipt with AI');
            }

            const result = await response.json();

            if (!result.success || !result.data) {
                throw new Error('Invalid response from AI parser');
            }

            const parsedData = result.data;

            // Update the receipt in Firestore
            const updatedReceipts = [...reimbursement.receipts];
            updatedReceipts[receiptIndex] = {
                ...receipt,
                vendorName: parsedData.vendorName || receipt.vendorName,
                location: parsedData.location || receipt.location,
                dateOfPurchase: parsedData.dateOfPurchase || receipt.dateOfPurchase,
                lineItems: Array.isArray(parsedData.lineItems)
                    ? parsedData.lineItems.map((item: any, index: number) => ({
                        id: `recalc_${Date.now()}_${index}`,
                        description: item.description || '',
                        category: item.category || 'Other',
                        amount: parseFloat(item.amount) || 0,
                    }))
                    : receipt.lineItems,
                subtotal: parsedData.subtotal || 0,
                tax: parsedData.tax || 0,
                tip: parsedData.tip || 0,
                shipping: parsedData.shipping || 0,
                otherCharges: parsedData.otherCharges || 0,
                total: parsedData.total || 0,
            };

            // Calculate new total amount
            const newTotalAmount = updatedReceipts.reduce((sum, r) => {
                return sum + (r.total || 0);
            }, 0);

            // Update Firestore
            const reimbursementRef = doc(db, 'reimbursements', reimbursement.id);
            await updateDoc(reimbursementRef, {
                receipts: updatedReceipts,
                totalAmount: newTotalAmount,
                auditLogs: [
                    ...(reimbursement.auditLogs || []),
                    {
                        action: `Receipt ${receiptIndex + 1} (${receipt.vendorName}) recalculated with AI`,
                        createdBy: user?.uid || 'unknown',
                        timestamp: Timestamp.now(),
                    }
                ]
            });

            // Update local state by triggering a refresh
            if (onUpdate) {
                // Trigger parent component to refresh data
                onUpdate(reimbursement.id, reimbursement.status);
            }

            showToast.success('Receipt recalculated successfully!');
        } catch (error) {
            console.error('Error recalculating receipt:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setRecalculationErrors(prev => {
                const newMap = new Map(prev);
                newMap.set(receiptIndex, errorMessage);
                return newMap;
            });
            showToast.error(`Failed to recalculate receipt: ${errorMessage}`);
        } finally {
            setRecalculatingReceipts(prev => {
                const newSet = new Set(prev);
                newSet.delete(receiptIndex);
                return newSet;
            });
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
                classNames={{
                    base: "max-h-[90vh] bg-[#fafafa]",
                    header: "border-b border-gray-100 bg-white px-6 py-4",
                    body: "p-0 bg-[#fafafa]",
                    footer: "border-t border-gray-100 bg-white px-6 py-4",
                    closeButton: "hover:bg-gray-100 active:bg-gray-200 text-gray-400 hover:text-gray-900",
                }}
            >
                <ModalContent>
                    {(onModalClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 rounded-lg">
                                        <FileText className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{reimbursement.title}</h2>
                                        <div className="flex items-center gap-2 text-xs font-normal text-gray-500 mt-0.5">
                                            <span>Requested on {formatDate(reimbursement.submittedAt)}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span>ID: {reimbursement.id.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                    <div className="ml-auto">
                                        <Chip
                                            color={getStatusColor(reimbursement.status)}
                                            variant="flat"
                                            size="sm"
                                            classNames={{
                                                base: "px-3 h-8",
                                                content: "font-semibold"
                                            }}
                                        >
                                            {getStatusDisplayName(reimbursement.status)}
                                        </Chip>
                                    </div>
                                </div>
                            </ModalHeader>

                            <ModalBody>
                                <ScrollShadow className="w-full h-full">
                                    <div className="p-6 space-y-6">
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Details Card */}
                                            <Card shadow="sm" className="border border-gray-100 h-full">
                                                <CardBody className="p-5 space-y-4">
                                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Request Details</h3>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                                                                <Building className="w-3.5 h-3.5" /> Department
                                                            </div>
                                                            <p className="font-semibold text-gray-900 capitalize">{reimbursement.department}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                                                                <Calendar className="w-3.5 h-3.5" /> Date Purchased
                                                            </div>
                                                            <p className="font-semibold text-gray-900">{formatDate(reimbursement.dateOfPurchase)}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                                                                <CreditCard className="w-3.5 h-3.5" /> Payment Method
                                                            </div>
                                                            <p className="font-semibold text-gray-900">{reimbursement.paymentMethod}</p>
                                                        </div>
                                                        {reimbursement.location && (
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                                                                    <MapPin className="w-3.5 h-3.5" /> Location
                                                                </div>
                                                                <p className="font-semibold text-gray-900 truncate" title={reimbursement.location}>{reimbursement.location}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Zelle Information Moved Here */}
                                                    {submitterZelle && (
                                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                                            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium mb-1">
                                                                <CreditCard className="w-3.5 h-3.5" /> Zelle / Payment Info
                                                            </div>
                                                            <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium border border-blue-100 flex items-center justify-between">
                                                                <span>{submitterZelle}</span>
                                                                <Chip size="sm" color="primary" variant="solid" className="h-5 text-[10px]">VERIFIED</Chip>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardBody>
                                            </Card>

                                            {/* Amount & Submitter Card */}
                                            <Card shadow="sm" className="border border-gray-100 h-full bg-gradient-to-br from-white to-gray-50">
                                                <CardBody className="p-5 flex flex-col justify-between h-full">
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Total Amount</h3>
                                                        <div className="flex items-baseline gap-1 mb-4">
                                                            <span className="text-4xl font-black text-gray-900 tracking-tight">${calculateTotalAmount().toFixed(2)}</span>
                                                            <span className="text-gray-500 font-medium text-sm">USD</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-gray-200">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                                                                    {submitterName ? submitterName.charAt(0) : <UserIcon className="w-4 h-4" />}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500 font-medium">Submitted by</p>
                                                                    <p className="text-sm font-bold text-gray-900">{submitterName || 'Unknown'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </div>

                                        {/* Business Purpose */}
                                        <Card shadow="none" className="bg-white border border-gray-200">
                                            <CardBody className="p-5">
                                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Business Purpose</h4>
                                                <p className="text-gray-700 leading-relaxed text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                    {reimbursement.businessPurpose}
                                                </p>
                                            </CardBody>
                                        </Card>

                                        {/* Payment Confirmation */}
                                        {reimbursement.status === 'paid' && reimbursement.paymentConfirmation && (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 bg-emerald-100 rounded-full">
                                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-emerald-900">Payment Confirmed</h4>
                                                        <div className="text-xs text-emerald-700 flex gap-1">
                                                            <span>Processed by {reimbursement.paymentConfirmation.paidByName}</span>
                                                            <span>•</span>
                                                            <span>{formatDate(reimbursement.paymentConfirmation.paidAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 items-center bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Confirmation Number</p>
                                                        <p className="font-mono text-lg font-bold text-gray-900 tracking-wide">{reimbursement.paymentConfirmation.confirmationNumber}</p>
                                                    </div>
                                                    {reimbursement.paymentConfirmation.photoAttachment && (
                                                        <Button
                                                            size="sm"
                                                            color="success"
                                                            variant="flat"
                                                            startContent={<Eye className="w-4 h-4" />}
                                                            onPress={() => window.open(reimbursement.paymentConfirmation.photoAttachment, '_blank')}
                                                            aria-label="View Payment Proof"
                                                        >
                                                            View Proof
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <Divider />

                                        {/* Receipts Section */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-bold text-gray-900">
                                                    {reimbursement.receipts ? 'Receipts' : 'Itemized Expenses'}
                                                </h4>
                                                <div className="text-sm text-gray-500">
                                                    {reimbursement.receipts ? reimbursement.receipts.length : reimbursement.expenses?.length || 0} items
                                                </div>
                                            </div>

                                            {reimbursement.receipts && reimbursement.receipts.length > 0 ? (
                                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                                    <Tabs
                                                        selectedKey={activeReceiptTab}
                                                        onSelectionChange={(key) => setActiveReceiptTab(key as string)}
                                                        variant="underlined"
                                                        color="primary"
                                                        aria-label="Receipt Tabs"
                                                        classNames={{
                                                            tabList: "p-0 border-b border-gray-100 bg-gray-50 gap-0",
                                                            cursor: "w-full bg-primary",
                                                            tab: "h-12 px-6 border-r border-gray-100 transition-colors",
                                                            tabContent: "group-data-[selected=true]:text-primary font-medium"
                                                        }}
                                                    >
                                                        {reimbursement.receipts.map((receipt: any, receiptIndex: number) => (
                                                            <Tab
                                                                key={receiptIndex.toString()}
                                                                title={
                                                                    <div className="flex items-center gap-2">
                                                                        <Receipt className="w-4 h-4" />
                                                                        <span className="truncate max-w-[120px]">{receipt.vendorName || `Receipt ${receiptIndex + 1}`}</span>
                                                                    </div>
                                                                }
                                                                aria-label={`Receipt ${receiptIndex + 1}`}
                                                            >
                                                                <div className="p-6">
                                                                    <div className="flex flex-col md:flex-row gap-6">
                                                                        {/* Receipt Info Column */}
                                                                        <div className="flex-1 space-y-6">
                                                                            <div className="flex justify-between items-start">
                                                                                <div>
                                                                                    <h5 className="text-xl font-bold text-gray-900 mb-1">{receipt.vendorName}</h5>
                                                                                    <div className="flex gap-3 text-sm text-gray-500">
                                                                                        {receipt.location && (
                                                                                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {receipt.location}</span>
                                                                                        )}
                                                                                        {receipt.dateOfPurchase && (
                                                                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(receipt.dateOfPurchase)}</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="text-2xl font-black text-gray-900">${calculateReceiptTotal(receipt).toFixed(2)}</p>
                                                                                </div>
                                                                            </div>

                                                                            {/* Line Items Table */}
                                                                            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                                                                {receipt.lineItems && receipt.lineItems.length > 0 ? (
                                                                                    <table className="w-full text-sm">
                                                                                        <thead className="bg-gray-100 border-b border-gray-200 text-gray-500 text-xs uppercase font-semibold">
                                                                                            <tr>
                                                                                                <th className="px-4 py-3 text-left">Description</th>
                                                                                                <th className="px-4 py-3 text-right">Category</th>
                                                                                                <th className="px-4 py-3 text-right">Amount</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="divide-y divide-gray-100">
                                                                                            {receipt.lineItems.map((item: any, i: number) => (
                                                                                                <tr key={i} className="hover:bg-white transition-colors">
                                                                                                    <td className="px-4 py-3 font-medium text-gray-900">{item.description}</td>
                                                                                                    <td className="px-4 py-3 text-right text-gray-500">{item.category}</td>
                                                                                                    <td className="px-4 py-3 text-right font-mono text-gray-900">${item.amount?.toFixed(2)}</td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                ) : (
                                                                                    <div className="p-4 text-center text-gray-500 text-sm">No line items specified</div>
                                                                                )}
                                                                                {/* Breakdown */}
                                                                                <div className="border-t border-gray-200 p-4 space-y-2 bg-gray-50/50">
                                                                                    <div className="flex justify-between text-sm text-gray-500">
                                                                                        <span>Subtotal</span>
                                                                                        <span className="font-medium text-gray-900">${calculateReceiptSubtotal(receipt).toFixed(2)}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between text-sm text-gray-500">
                                                                                        <span>Tax</span>
                                                                                        <span className="font-medium text-gray-900">${(receipt.tax || 0).toFixed(2)}</span>
                                                                                    </div>
                                                                                    {(receipt.tip > 0 || receipt.shipping > 0 || receipt.otherCharges > 0) && (
                                                                                        <>
                                                                                            {receipt.tip > 0 && (
                                                                                                <div className="flex justify-between text-sm text-gray-500">
                                                                                                    <span>Tip</span>
                                                                                                    <span className="font-medium text-gray-900">${receipt.tip.toFixed(2)}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            {receipt.shipping > 0 && (
                                                                                                <div className="flex justify-between text-sm text-gray-500">
                                                                                                    <span>Shipping</span>
                                                                                                    <span className="font-medium text-gray-900">${receipt.shipping.toFixed(2)}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            {receipt.otherCharges > 0 && (
                                                                                                <div className="flex justify-between text-sm text-gray-500">
                                                                                                    <span>Other</span>
                                                                                                    <span className="font-medium text-gray-900">${receipt.otherCharges.toFixed(2)}</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                    <Divider className="my-2" />
                                                                                    <div className="flex justify-between text-base font-bold text-gray-900">
                                                                                        <span>Total</span>
                                                                                        <span>${calculateReceiptTotal(receipt).toFixed(2)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {receipt.notes && (
                                                                                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-100 text-sm">
                                                                                    <span className="font-bold block mb-1">Notes</span>
                                                                                    {receipt.notes}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Receipt Image Column */}
                                                                        <div className="w-full md:w-1/3 flex flex-col gap-3">
                                                                            <h6 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Receipt / File</h6>
                                                                            {receipt.receiptFile ? (
                                                                                (() => {
                                                                                    const url = typeof receipt.receiptFile === 'string' ? receipt.receiptFile : receipt.receiptFile.url;
                                                                                    const isPdf = url?.toLowerCase().includes('.pdf') || (typeof receipt.receiptFile !== 'string' && receipt.receiptFile?.type?.includes('pdf'));

                                                                                    if (isPdf) {
                                                                                        return (
                                                                                            <div className="group relative rounded-xl overflow-hidden border border-gray-200 bg-red-50 aspect-[3/4] flex flex-col items-center justify-center text-red-900">
                                                                                                <FileText className="w-16 h-16 mb-2 opacity-80" />
                                                                                                <span className="font-bold text-sm">PDF Document</span>
                                                                                                <div className="absolute inset-0 bg-black/5 mr-0 mb-0 pointer-events-none" />
                                                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                                                                    <Button
                                                                                                        color="danger"
                                                                                                        variant="solid"
                                                                                                        startContent={<Eye className="w-4 h-4" />}
                                                                                                        onPress={() => window.open(url, '_blank')}
                                                                                                        aria-label="View PDF"
                                                                                                    >
                                                                                                        View PDF
                                                                                                    </Button>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    }

                                                                                    if (!failedImages.has(receiptIndex)) {
                                                                                        return (
                                                                                            <div className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-[3/4] flex items-center justify-center">
                                                                                                <img
                                                                                                    src={url}
                                                                                                    alt="Receipt"
                                                                                                    className="object-contain w-full h-full"
                                                                                                    onError={() => setFailedImages(prev => new Set(prev).add(receiptIndex))}
                                                                                                />
                                                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                                                                    <Button
                                                                                                        color="primary"
                                                                                                        variant="solid"
                                                                                                        startContent={<Eye className="w-4 h-4" />}
                                                                                                        onPress={() => window.open(url, '_blank')}
                                                                                                        aria-label="View Full Receipt"
                                                                                                    >
                                                                                                        View Full
                                                                                                    </Button>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    }

                                                                                    // Fallback for failed image
                                                                                    return (
                                                                                        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 aspect-[3/4] flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                                                                                            <ImageOff className="w-12 h-12 mb-2 opacity-50 text-danger" />
                                                                                            <span className="text-sm font-medium text-danger">Failed to load image</span>
                                                                                            <Button
                                                                                                size="sm"
                                                                                                variant="light"
                                                                                                color="primary"
                                                                                                className="mt-2"
                                                                                                onPress={() => window.open(url, '_blank')}
                                                                                            >
                                                                                                Try Open URL
                                                                                            </Button>
                                                                                        </div>
                                                                                    );
                                                                                })()
                                                                            ) : (
                                                                                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 aspect-[3/4] flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                                                                                    <FileText className="w-12 h-12 mb-2 opacity-50" />
                                                                                    <span className="text-sm font-medium">No Image Uploaded</span>
                                                                                </div>
                                                                            )}

                                                                            {canPerformOfficerActions && receipt.receiptFile && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    color="secondary"
                                                                                    variant="flat"
                                                                                    startContent={<RefreshCw className="w-4 h-4" />}
                                                                                    isLoading={recalculatingReceipts.has(receiptIndex)}
                                                                                    onPress={() => handleRecalculateReceipt(receiptIndex)}
                                                                                    className="w-full"
                                                                                    aria-label="Recalculate with AI"
                                                                                >
                                                                                    Recalculate with AI
                                                                                </Button>
                                                                            )}

                                                                            {recalculationErrors.has(receiptIndex) && (
                                                                                <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                                                                                    {recalculationErrors.get(receiptIndex)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Tab>
                                                        ))}
                                                    </Tabs>
                                                </div>
                                            ) : reimbursement.expenses && reimbursement.expenses.length > 0 ? (
                                                <div className="space-y-4">
                                                    {reimbursement.expenses.map((expense: any, index: number) => (
                                                        <Card key={expense.id || index} shadow="sm" className="border border-gray-200">
                                                            <CardBody className="p-4 flex items-center justify-between gap-4">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                                                                        <DollarSign className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-gray-900 truncate">{expense.description}</p>
                                                                        <p className="text-xs text-gray-500">{expense.category}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="font-bold text-gray-900 font-mono">${expense.amount?.toFixed(2)}</span>
                                                                    {expense.receipt && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="flat"
                                                                            onPress={() => {
                                                                                const url = expense.receipt.url || expense.receipt.downloadURL || expense.receipt;
                                                                                window.open(url, '_blank');
                                                                            }}
                                                                            isIconOnly
                                                                            aria-label="View Receipt"
                                                                        >
                                                                            <Eye className="w-4 h-4" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </CardBody>
                                                        </Card>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                    <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                    <p>No receipts or expenses available.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Section */}
                                        {canPerformOfficerActions && onUpdate && availableActions.length > 1 && (
                                            <div className="pt-6 border-t border-gray-200">
                                                <h4 className="text-lg font-bold text-gray-900 mb-4">Actions</h4>

                                                <Card shadow="none" className="bg-gray-50 border border-gray-200">
                                                    <CardBody className="p-1">
                                                        <Tabs
                                                            aria-label="Actions"
                                                            selectedKey={action}
                                                            onSelectionChange={(key) => setAction(key as any)}
                                                            color="primary"
                                                            variant="solid"
                                                            radius="md"
                                                            fullWidth
                                                            classNames={{
                                                                tabList: "bg-transparent gap-1",
                                                                cursor: "shadow-sm",
                                                                tab: "h-10",
                                                                tabContent: "font-semibold"
                                                            }}
                                                        >
                                                            <Tab key="review" title="Review Note" />
                                                            {availableActions.includes('approve') && <Tab key="approve" title="Approve" />}
                                                            {availableActions.includes('decline') && <Tab key="decline" title="Decline" />}
                                                            {availableActions.includes('request_audit') && <Tab key="request_audit" title="Audit" />}
                                                            {availableActions.includes('approve_paid') && <Tab key="approve_paid" title="Mark Paid" />}
                                                        </Tabs>

                                                        <div className="p-4 bg-white mt-1 rounded-xl border border-gray-100 shadow-sm m-1">
                                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                                {action === 'review' && (
                                                                    <div className="space-y-2">
                                                                        <p className="text-sm text-gray-500 mb-2">Leave a note for the internal audit log.</p>
                                                                        <Textarea
                                                                            value={auditNote}
                                                                            onValueChange={setAuditNote}
                                                                            placeholder="Enter note here..."
                                                                            minRows={3}
                                                                            variant="faded"
                                                                            aria-label="Audit Note"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {action === 'approve' && (
                                                                    <div className="space-y-2">
                                                                        <div className="p-3 bg-success-50 text-success-800 rounded-lg text-sm border border-success-100 flex gap-2">
                                                                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                                                            The request will be marked as approved. You can optionally add a note.
                                                                        </div>
                                                                        <Textarea
                                                                            value={auditNote}
                                                                            onValueChange={setAuditNote}
                                                                            placeholder="Optional approval note..."
                                                                            minRows={2}
                                                                            variant="faded"
                                                                            aria-label="Approval Note"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {action === 'decline' && (
                                                                    <div className="space-y-2">
                                                                        <div className="p-3 bg-danger-50 text-danger-800 rounded-lg text-sm border border-danger-100 flex gap-2">
                                                                            <XCircle className="w-5 h-5 flex-shrink-0" />
                                                                            The request will be declined. A reason is required.
                                                                        </div>
                                                                        <Textarea
                                                                            value={auditNote}
                                                                            onValueChange={setAuditNote}
                                                                            placeholder="Reason for declining..."
                                                                            minRows={3}
                                                                            isRequired
                                                                            variant="faded"
                                                                            aria-label="Decline Reason"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {action === 'request_audit' && (
                                                                    <div className="space-y-4">
                                                                        <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 flex gap-2">
                                                                            <UserCheck className="w-5 h-5 flex-shrink-0" />
                                                                            Request another executive to review this reimbursement.
                                                                        </div>
                                                                        <Select
                                                                            label="Select Executive"
                                                                            placeholder="Choose an executive"
                                                                            selectedKeys={selectedAuditor ? [selectedAuditor] : []}
                                                                            onSelectionChange={(keys) => setSelectedAuditor(Array.from(keys)[0] as string)}
                                                                            isRequired
                                                                            variant="bordered"
                                                                        >
                                                                            {executives.map((exec: any) => (
                                                                                <SelectItem key={exec.id}>{exec.name || exec.email}</SelectItem>
                                                                            ))}
                                                                        </Select>
                                                                        <Textarea
                                                                            value={auditNote}
                                                                            onValueChange={setAuditNote}
                                                                            placeholder="Reason for audit request..."
                                                                            minRows={2}
                                                                            variant="faded"
                                                                            aria-label="Audit Request Reason"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {action === 'approve_paid' && (
                                                                    <div className="space-y-4">
                                                                        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm border border-emerald-100 flex gap-2">
                                                                            <CreditCard className="w-5 h-5 flex-shrink-0" />
                                                                            Confirm payment and mark as paid. Drag & drop proof below.
                                                                        </div>
                                                                        <Input
                                                                            label="Confirmation Number"
                                                                            placeholder="Zelle/Bank Ref #"
                                                                            value={paymentInfo.confirmationNumber}
                                                                            onValueChange={(val) => setPaymentInfo(prev => ({ ...prev, confirmationNumber: val }))}
                                                                            isRequired
                                                                            variant="bordered"
                                                                        />

                                                                        {/* Dropzone */}
                                                                        <div
                                                                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                                                                                ? 'border-primary bg-primary-50 scale-[1.01]'
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
                                                                                <div className="relative group inline-block">
                                                                                    <img
                                                                                        src={previewUrl}
                                                                                        alt="Preview"
                                                                                        className="max-h-32 rounded-lg shadow-sm"
                                                                                    />
                                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                                                        <Button size="sm" color="danger" variant="flat" onPress={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setPaymentInfo(prev => ({ ...prev, photoAttachment: null }));
                                                                                            setPreviewUrl(null);
                                                                                        }}>Remove</Button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex flex-col items-center gap-1">
                                                                                    <Upload className="w-8 h-8 text-gray-300" />
                                                                                    <span className="text-sm font-medium text-gray-500">Drop payment proof here</span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <Textarea
                                                                            value={auditNote}
                                                                            onValueChange={setAuditNote}
                                                                            placeholder="Payment notes..."
                                                                            minRows={1}
                                                                            variant="faded"
                                                                            aria-label="Payment Note"
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div className="flex justify-end pt-2">
                                                                    <Button
                                                                        color={
                                                                            action === 'approve' || action === 'approve_paid' ? 'success' :
                                                                                action === 'decline' ? 'danger' :
                                                                                    action === 'request_audit' ? 'secondary' : 'primary'
                                                                        }
                                                                        type="submit"
                                                                        isLoading={isUploading}
                                                                        className="font-semibold shadow-md"
                                                                    >
                                                                        Confirm Action
                                                                    </Button>
                                                                </div>
                                                            </form>
                                                        </div>
                                                    </CardBody>
                                                </Card>
                                            </div>
                                        )}
                                    </div>
                                </ScrollShadow>
                            </ModalBody>
                            <ModalFooter className="border-t border-gray-100">
                                <Button variant="light" color="default" onPress={onModalClose}>
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
