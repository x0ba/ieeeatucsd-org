import React, { useState, useEffect, useRef } from 'react';
import { Check, XCircle, CreditCard, MessageCircle, Upload, Calendar, Building, UserCheck, User as UserIcon } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input, Textarea, Select, SelectItem, Chip, Spacer } from '@heroui/react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';

interface ReimbursementAuditModalProps {
    reimbursement: any;
    onClose: () => void;
    onUpdate: (id: string, status: string, auditNote?: string, paymentInfo?: any) => void;
}

export default function ReimbursementAuditModal({ reimbursement, onClose, onUpdate }: ReimbursementAuditModalProps) {
    const [user] = useAuthState(auth);
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
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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
                        } else {
                            setSubmitterName(reimbursement.submittedBy);
                            setSubmitterZelle('');
                        }
                    } catch (e) {
                        // Fallbacks if fetching submitter fails
                        setSubmitterName(reimbursement.submittedBy);
                        setSubmitterZelle('');
                    }
                }

                // Fetch executives for audit requests
                if (action === 'request_audit') {
                    const q = query(collection(db, 'users'), where('role', '==', 'Executive Officer'));
                    const querySnapshot = await getDocs(q);
                    const executivesList = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setExecutives(executivesList);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [action, user, reimbursement?.submittedBy]);

    // Support pasting an image/PDF into the modal to attach as confirmation
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (!file) continue;
                    const isAllowed = file.type.startsWith('image/') || file.type === 'application/pdf';
                    const underLimit = file.size <= 10 * 1024 * 1024; // 10MB
                    if (isAllowed && underLimit) {
                        setPaymentInfo(prev => ({ ...prev, photoAttachment: file }));
                        // prevent default paste behavior if we consumed a file
                        e.preventDefault();
                        break;
                    }
                }
            }
        };
        document.addEventListener('paste', onPaste);
        return () => document.removeEventListener('paste', onPaste);
    }, []);

    // Build/cleanup preview URL for images
    useEffect(() => {
        if (paymentInfo.photoAttachment && paymentInfo.photoAttachment.type.startsWith('image/')) {
            const url = URL.createObjectURL(paymentInfo.photoAttachment);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [paymentInfo.photoAttachment]);

    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let newStatus = reimbursement.status;
        let note = auditNote.trim();
        let payment = undefined;

        switch (action) {
            case 'approve':
                newStatus = 'approved';
                if (!note) note = 'Request approved for payment';
                break;
            case 'approve_paid':
                newStatus = 'paid';
                if (!note) note = 'Request approved and marked as paid';
                // If a confirmation file is provided, upload to Firebase Storage
                try {
                    setIsUploading(true);
                    let photoUrl: string | null = null;
                    let storagePath: string | undefined = undefined;
                    if (paymentInfo.photoAttachment) {
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
                    }
                    payment = {
                        confirmationNumber: paymentInfo.confirmationNumber,
                        photoAttachment: photoUrl,
                        storagePath,
                    };
                } catch (err) {
                    console.error('Failed to upload confirmation file:', err);
                    alert(`Failed to upload the payment confirmation file: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    setIsUploading(false);
                    return;
                } finally {
                    setIsUploading(false);
                }
                break;
            case 'decline':
                newStatus = 'declined';
                if (!note) note = 'Request declined';
                break;
            case 'request_audit':
                if (selectedAuditor) {
                    // Send audit request email
                    try {
                        console.log('Sending audit request email with data:', {
                            type: 'audit_request',
                            reimbursementId: reimbursement.id,
                            auditorId: selectedAuditor,
                            requestNote: note
                        });

                        const response = await fetch('/api/email/send-reimbursement-notification', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                type: 'audit_request',
                                reimbursementId: reimbursement.id,
                                auditorId: selectedAuditor,
                                requestNote: note
                            }),
                        });

                        const result = await response.json();
                        console.log('Email API response:', result);

                        if (!response.ok || !result.success) {
                            throw new Error(result.error || 'Failed to send audit request email');
                        }

                        // Update reimbursement with audit request
                        newStatus = 'under_review';
                        if (!note) note = 'Audit requested from another executive';
                    } catch (error) {
                        console.error('Failed to send audit request email:', error);
                        alert(`Failed to send audit request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
                        return;
                    }
                }
                break;
            case 'review':
                if (note) {
                    // Just adding a note without changing status
                }
                break;
        }

        onUpdate(reimbursement.id, newStatus, note || undefined, payment);
        onClose();
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

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            size="2xl"
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
                            <h2 className="text-xl font-semibold">Review Reimbursement</h2>
                        </ModalHeader>

                        <ModalBody>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Reimbursement Summary */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-medium text-gray-900">{reimbursement.title}</h3>
                                        <Chip
                                            color={getStatusColor(reimbursement.status)}
                                            variant="flat"
                                            size="sm"
                                        >
                                            {reimbursement.status === 'submitted' && 'Submitted'}
                                            {reimbursement.status === 'under_review' && 'Under Review'}
                                            {reimbursement.status === 'approved' && 'Approved (Not Paid)'}
                                            {reimbursement.status === 'paid' && 'Approved (Paid)'}
                                            {reimbursement.status === 'declined' && 'Declined'}
                                        </Chip>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center space-x-2">
                                            <Building className="w-4 h-4 text-gray-400" />
                                            <span>Department: <span className="font-medium capitalize">{reimbursement.department}</span></span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>Amount: <span className="font-bold text-green-600">${reimbursement.totalAmount?.toFixed(2)}</span></span>
                                        </div>
                                        <div className="flex items-center space-x-2 col-span-2 md:col-span-1">
                                            <UserIcon className="w-4 h-4 text-gray-400" />
                                            <span>Submitted By: <span className="font-medium">{submitterName || 'Unknown User'}</span></span>
                                        </div>
                                        <div className="flex items-center space-x-2 col-span-2 md:col-span-1">
                                            <CreditCard className="w-4 h-4 text-gray-400" />
                                            <span>Zelle: <span className="font-medium">{submitterZelle || 'Not provided'}</span></span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-sm text-gray-600"><span className="font-medium">Organization Purpose:</span> {reimbursement.businessPurpose}</p>
                                    </div>
                                </div>

                                {/* Action Selection */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-3 block">Choose Action</label>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setAction('review')}
                                            className={`p-3 border-2 rounded-lg text-center transition-colors ${action === 'review'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <MessageCircle className="w-5 h-5 mx-auto mb-1" />
                                            <span className="text-sm font-medium">Add Note</span>
                                        </button>

                                        {(reimbursement.status === 'submitted' || reimbursement.status === 'under_review') && (
                                            <button
                                                type="button"
                                                onClick={() => setAction('request_audit')}
                                                className={`p-3 border-2 rounded-lg text-center transition-colors ${action === 'request_audit'
                                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <UserCheck className="w-5 h-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Request Audit</span>
                                            </button>
                                        )}

                                        {(reimbursement.status === 'submitted' || reimbursement.status === 'under_review') && (
                                            <button
                                                type="button"
                                                onClick={() => setAction('approve')}
                                                className={`p-3 border-2 rounded-lg text-center transition-colors ${action === 'approve'
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <Check className="w-5 h-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Approve (Not Paid)</span>
                                            </button>
                                        )}

                                        {(reimbursement.status === 'submitted' || reimbursement.status === 'under_review' || reimbursement.status === 'approved') && (
                                            <button
                                                type="button"
                                                onClick={() => setAction('approve_paid')}
                                                className={`p-3 border-2 rounded-lg text-center transition-colors ${action === 'approve_paid'
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <CreditCard className="w-5 h-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Approve & Pay</span>
                                            </button>
                                        )}

                                        {(reimbursement.status === 'submitted' || reimbursement.status === 'under_review') && (
                                            <button
                                                type="button"
                                                onClick={() => setAction('decline')}
                                                className={`p-3 border-2 rounded-lg text-center transition-colors ${action === 'decline'
                                                    ? 'border-red-500 bg-red-50 text-red-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <XCircle className="w-5 h-5 mx-auto mb-1" />
                                                <span className="text-sm font-medium">Decline</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Executive Selection for Audit Request */}
                                {action === 'request_audit' && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">
                                            Select Executive for Audit *
                                        </label>
                                        <Select
                                            selectedKeys={selectedAuditor ? [selectedAuditor] : []}
                                            onSelectionChange={(keys) => setSelectedAuditor(Array.from(keys)[0] as string)}
                                            placeholder="Choose an executive officer to audit this request"
                                            className="w-full mt-1"
                                        >
                                            {executives.map((exec) => (
                                                <SelectItem key={exec.id}>
                                                    {exec.name || exec.email} - {exec.position || 'Executive Officer'}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                        {action === 'request_audit' && !selectedAuditor && (
                                            <p className="mt-1 text-sm text-red-600">Please select an executive to audit this request</p>
                                        )}
                                    </div>
                                )}

                                {/* Audit Note */}
                                <div>
                                    <label htmlFor="auditNote" className="text-sm font-medium text-gray-700">
                                        {action === 'decline' ? 'Reason for Decline *' :
                                            action === 'approve' ? 'Approval Notes' :
                                                action === 'request_audit' ? 'Request Message' :
                                                    'Audit Notes'}
                                    </label>
                                    <Textarea
                                        id="auditNote"
                                        value={auditNote}
                                        onChange={(e) => setAuditNote(e.target.value)}
                                        placeholder={
                                            action === 'decline'
                                                ? 'Please provide a reason for declining this request...'
                                                : action === 'approve'
                                                    ? 'Optional notes about the approval...'
                                                    : action === 'request_audit'
                                                        ? 'Optional message to include with the audit request...'
                                                        : 'Add any notes about this reimbursement...'
                                        }
                                        rows={4}
                                        className={action === 'decline' && !auditNote.trim() ? 'border-red-500' : ''}
                                    />
                                    {action === 'decline' && !auditNote.trim() && (
                                        <p className="mt-1 text-sm text-red-600">Please provide a reason for declining</p>
                                    )}
                                </div>

                                {/* Payment Information (only for 'approve_paid' action) */}
                                {action === 'approve_paid' && (
                                    <div className="space-y-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                        <h4 className="font-medium text-emerald-900">Payment Confirmation</h4>

                                        <div>
                                            <label htmlFor="confirmationNumber" className="text-sm font-medium text-gray-700">
                                                Confirmation Number *
                                            </label>
                                            <Input
                                                id="confirmationNumber"
                                                value={paymentInfo.confirmationNumber}
                                                onChange={(e) => setPaymentInfo({ ...paymentInfo, confirmationNumber: e.target.value })}
                                                placeholder="e.g., TXN123456789"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-gray-700">
                                                Payment Confirmation Photo
                                            </label>
                                            <div
                                                className={`group mt-1 flex flex-col items-center justify-center px-6 pt-6 pb-6 border-2 border-dashed rounded-xl transition-colors ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 hover:border-emerald-300 bg-white'}`}
                                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setIsDragging(false);
                                                    const dt = e.dataTransfer;
                                                    if (!dt) return;
                                                    let file: File | null = null;
                                                    if (dt.files && dt.files.length > 0) {
                                                        file = dt.files[0];
                                                    } else if (dt.items && dt.items.length > 0) {
                                                        const item = dt.items[0];
                                                        if (item.kind === 'file') file = item.getAsFile();
                                                    }
                                                    if (file) {
                                                        const isAllowed = file.type.startsWith('image/') || file.type === 'application/pdf';
                                                        const underLimit = file.size <= 10 * 1024 * 1024; // 10MB
                                                        if (!isAllowed) {
                                                            alert('Please drop an image or PDF file.');
                                                            return;
                                                        }
                                                        if (!underLimit) {
                                                            alert('File is too large. Max 10MB.');
                                                            return;
                                                        }
                                                        setPaymentInfo(prev => ({ ...prev, photoAttachment: file }));
                                                    }
                                                }}
                                            >
                                                <div className="w-full max-w-xl text-center">
                                                    <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center ${isDragging ? 'bg-emerald-100' : 'bg-emerald-50'} border border-emerald-100`}>
                                                        <Upload className="h-8 w-8 text-emerald-500" />
                                                    </div>
                                                    <h5 className="mt-3 text-sm font-semibold text-gray-900">Drop, paste, or browse</h5>
                                                    <p className="text-xs text-gray-500">PNG, JPG, or PDF up to 10MB</p>
                                                    <div className="mt-3 flex items-center justify-center gap-2">
                                                        <label
                                                            htmlFor="paymentPhoto"
                                                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                                        >
                                                            Browse files
                                                            <input
                                                                ref={fileInputRef}
                                                                id="paymentPhoto"
                                                                type="file"
                                                                className="sr-only"
                                                                accept="image/*,.pdf"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) setPaymentInfo(prev => ({ ...prev, photoAttachment: file }));
                                                                }}
                                                            />
                                                        </label>
                                                        <span className="text-xs text-gray-500">or drag & drop / paste</span>
                                                    </div>

                                                    {paymentInfo.photoAttachment && (
                                                        <div className="mt-4 text-left w-full">
                                                            <div className="p-3 border rounded-lg bg-white flex items-center gap-3 justify-between">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    {previewUrl ? (
                                                                        <img src={previewUrl} alt="Preview" className="h-14 w-14 object-cover rounded-md border" />
                                                                    ) : (
                                                                        <div className="h-14 w-14 rounded-md border flex items-center justify-center bg-gray-50">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className="h-6 w-6 text-gray-400"><path d="M6 2h9l5 5v15a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V2Z" /><path d="M14 2v6h6" /></svg>
                                                                        </div>
                                                                    )}
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium text-gray-900 truncate">{paymentInfo.photoAttachment.name}</p>
                                                                        <p className="text-xs text-gray-500">{Math.round(paymentInfo.photoAttachment.size / 1024)} KB</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPaymentInfo(prev => ({ ...prev, photoAttachment: null }));
                                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                                    }}
                                                                    className="text-xs px-2 py-1 rounded-md border bg-white hover:bg-gray-50 text-gray-700"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Existing Audit Notes */}
                                {reimbursement.auditNotes && reimbursement.auditNotes.length > 0 && (
                                    <div>
                                        <h4 className="text-md font-medium text-gray-900 mb-3">Previous Audit Notes</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {reimbursement.auditNotes.map((note: any, index: number) => (
                                                <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                                                    <p className="text-sm text-gray-700">{note.note}</p>
                                                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                                        <span>By: {note.createdBy}</span>
                                                        <span>{new Date(note.timestamp?.toDate()).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Form Actions */}
                                <div className="flex items-center justify-end gap-2 pt-6 border-t border-gray-200">
                                    <Button
                                        type="button"
                                        variant="light"
                                        onPress={onModalClose}
                                    >
                                        Cancel
                                    </Button>
                                    <Spacer />
                                    <Button
                                        type="submit"
                                        isDisabled={isUploading || (action === 'decline' && !auditNote.trim()) || (action === 'request_audit' && !selectedAuditor)}
                                        isLoading={isUploading}
                                        color={
                                            action === 'approve'
                                                ? 'success'
                                                : action === 'decline'
                                                    ? 'danger'
                                                    : action === 'approve_paid'
                                                        ? 'success'
                                                        : action === 'request_audit'
                                                            ? 'secondary'
                                                            : 'primary'
                                        }
                                    >
                                        {isUploading ? 'Uploading...' : (
                                            action === 'review' ? 'Add Note' :
                                                action === 'approve' ? 'Approve (Not Paid)' :
                                                    action === 'decline' ? 'Decline Request' :
                                                        action === 'approve_paid' ? 'Approve & Mark Paid' :
                                                            action === 'request_audit' ? 'Send Audit Request' : 'Submit'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
