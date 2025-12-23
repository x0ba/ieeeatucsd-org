import { useState, useEffect, useCallback } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Textarea,
    Select,
    SelectItem,
    Progress,
    Chip,
    Card,
    CardBody,
    Divider,
} from '@heroui/react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Link as LinkIcon,
    DollarSign,
    FileText,
    Upload,
    Check,
    AlertCircle,
} from 'lucide-react';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    Timestamp,
    serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import type {
    FundRequest,
    FundRequestCategory,
    VendorLink,
    FundRequestAttachment,
} from '../../../shared/types/fund-requests';
import { CATEGORY_LABELS } from '../../../shared/types/fund-requests';
import MultiFileUpload from '../../fund-deposits/components/MultiFileUpload';
import { showToast } from '../../../shared/utils/toast';

interface FundRequestFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    request?: FundRequest | null;
    isEditMode?: boolean;
}

const STEPS = [
    { id: 1, title: 'Basic Info', description: 'Title, purpose, and category' },
    { id: 2, title: 'Budget', description: 'Amount and vendor links' },
    { id: 3, title: 'Attachments', description: 'Upload supporting files' },
    { id: 4, title: 'Review', description: 'Review and submit' },
];

const isValidUrl = (string: string): boolean => {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
};

export default function FundRequestFormModal({
    isOpen,
    onClose,
    onSuccess,
    request,
    isEditMode = false,
}: FundRequestFormModalProps) {
    const [user] = useAuthState(auth);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [purpose, setPurpose] = useState('');
    const [category, setCategory] = useState<FundRequestCategory>('event');
    const [amount, setAmount] = useState('');
    const [vendorLinks, setVendorLinks] = useState<VendorLink[]>([]);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkLabel, setNewLinkLabel] = useState('');
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
    const [infoResponseNotes, setInfoResponseNotes] = useState('');

    // Validation state
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize form with existing request data
    useEffect(() => {
        if (request && isEditMode) {
            setTitle(request.title);
            setPurpose(request.purpose);
            setCategory(request.category);
            setAmount(request.amount.toString());
            setVendorLinks(request.vendorLinks || []);
            setExistingAttachments(request.attachments?.map((a) => a.url) || []);
            setInfoResponseNotes(request.infoResponseNotes || '');
        } else {
            resetForm();
        }
    }, [request, isEditMode, isOpen]);

    const resetForm = () => {
        setCurrentStep(1);
        setTitle('');
        setPurpose('');
        setCategory('event');
        setAmount('');
        setVendorLinks([]);
        setNewLinkUrl('');
        setNewLinkLabel('');
        setAttachmentFiles([]);
        setExistingAttachments([]);
        setInfoResponseNotes('');
        setErrors({});
    };

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        switch (step) {
            case 1:
                if (!title.trim()) newErrors.title = 'Title is required';
                if (!purpose.trim()) newErrors.purpose = 'Purpose/justification is required';
                break;
            case 2:
                if (!amount || parseFloat(amount) <= 0) {
                    newErrors.amount = 'Valid budget amount is required';
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
        }
    };

    const handlePrevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleAddLink = () => {
        if (!newLinkUrl.trim()) return;

        if (!isValidUrl(newLinkUrl)) {
            setErrors((prev) => ({ ...prev, link: 'Please enter a valid URL' }));
            return;
        }

        const newLink: VendorLink = {
            id: crypto.randomUUID(),
            url: newLinkUrl.trim(),
            label: newLinkLabel.trim() || undefined,
        };

        setVendorLinks((prev) => [...prev, newLink]);
        setNewLinkUrl('');
        setNewLinkLabel('');
        setErrors((prev) => {
            const { link, ...rest } = prev;
            return rest;
        });
    };

    const handleRemoveLink = (id: string) => {
        setVendorLinks((prev) => prev.filter((link) => link.id !== id));
    };

    const handleRemoveExistingAttachment = (url: string) => {
        setExistingAttachments((prev) => prev.filter((a) => a !== url));
    };

    const uploadFiles = async (files: File[], requestId: string): Promise<FundRequestAttachment[]> => {
        if (!user) return [];

        const attachments: FundRequestAttachment[] = [];

        for (const file of files) {
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const timestamp = Date.now();
            const path = `fund_requests/${user.uid}/${requestId}/${timestamp}_${sanitizedName}`;
            const storageRef = ref(storage, path);

            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            attachments.push({
                id: crypto.randomUUID(),
                url,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: Timestamp.now(),
            });
        }

        return attachments;
    };

    const handleSubmit = async () => {
        if (!user) return;

        // Final validation
        if (!validateStep(1) || !validateStep(2)) {
            showToast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            const requestId = request?.id || crypto.randomUUID();

            // Upload new files (optional)
            const newAttachments = attachmentFiles.length > 0
                ? await uploadFiles(attachmentFiles, requestId)
                : [];

            // Combine with existing attachments
            const allAttachments = [
                ...(request?.attachments?.filter((a) => existingAttachments.includes(a.url)) || []),
                ...newAttachments,
            ];

            const status = 'submitted';

            // Build requestData without undefined values
            const requestData: Record<string, any> = {
                title: title.trim(),
                purpose: purpose.trim(),
                category,
                amount: parseFloat(amount) || 0,
                vendorLinks,
                attachments: allAttachments,
                status,
                updatedAt: Timestamp.now(),
            };

            // Only add infoResponseNotes if it has a value
            if (request?.status === 'needs_info' && infoResponseNotes.trim()) {
                requestData.infoResponseNotes = infoResponseNotes.trim();
            }

            if (isEditMode && request) {
                // Update existing request
                const auditLog = {
                    id: crypto.randomUUID(),
                    action: request.status === 'needs_info' ? 'info_provided' : 'updated',
                    performedBy: user.uid,
                    performedByName: user.displayName || user.email || 'Unknown',
                    timestamp: Timestamp.now(),
                    previousStatus: request.status,
                    newStatus: status,
                };

                await updateDoc(doc(db, 'fundRequests', request.id), {
                    ...requestData,
                    auditLogs: [...(request.auditLogs || []), auditLog],
                });

                // Send resubmission email notification
                if (request.status === 'needs_info') {
                    try {
                        await fetch('/api/email/send-fund-request-notification', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'fund_request_submission',
                                requestId: request.id,
                            }),
                        });
                    } catch (emailError) {
                        console.error('Failed to send resubmission email:', emailError);
                    }
                }
            } else {
                // Create new request
                const newRequest = {
                    ...requestData,
                    submittedBy: user.uid,
                    submittedByName: user.displayName || user.email || 'Unknown',
                    submittedByEmail: user.email || '',
                    submittedAt: Timestamp.now(),
                    createdAt: Timestamp.now(),
                    auditLogs: [
                        {
                            id: crypto.randomUUID(),
                            action: 'created',
                            performedBy: user.uid,
                            performedByName: user.displayName || user.email || 'Unknown',
                            timestamp: Timestamp.now(),
                            newStatus: status,
                        },
                    ],
                };

                const docRef = await addDoc(collection(db, 'fundRequests'), newRequest);

                // Send email notification
                try {
                    await fetch('/api/email/send-fund-request-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'fund_request_submission',
                            requestId: docRef.id,
                        }),
                    });
                } catch (emailError) {
                    console.error('Failed to send email notification:', emailError);
                    // Don't fail the whole operation for email errors
                }
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving fund request:', error);
            showToast.error('Failed to save fund request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value: string): string => {
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (isNaN(num)) return '';
        return num.toFixed(2);
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <Input
                            label="Title"
                            placeholder="Enter a descriptive title for your request"
                            value={title}
                            onValueChange={setTitle}
                            isRequired
                            isInvalid={!!errors.title}
                            errorMessage={errors.title}
                            maxLength={100}
                        />
                        <Textarea
                            label="Purpose / Justification"
                            placeholder="Explain why you need this funding and how it will be used"
                            value={purpose}
                            onValueChange={setPurpose}
                            isRequired
                            isInvalid={!!errors.purpose}
                            errorMessage={errors.purpose}
                            minRows={4}
                            maxRows={8}
                        />
                        <Select
                            label="Category"
                            selectedKeys={[category]}
                            onSelectionChange={(keys) => {
                                const selected = Array.from(keys)[0] as FundRequestCategory;
                                if (selected) setCategory(selected);
                            }}
                        >
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                <SelectItem key={key}>{label}</SelectItem>
                            ))}
                        </Select>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-4">
                        <Input
                            label="Budget Amount"
                            placeholder="0.00"
                            value={amount}
                            onValueChange={(value) => {
                                // Allow only numbers and one decimal point
                                const sanitized = value.replace(/[^0-9.]/g, '');
                                const parts = sanitized.split('.');
                                if (parts.length > 2) return;
                                if (parts[1] && parts[1].length > 2) return;
                                setAmount(sanitized);
                            }}
                            onBlur={() => {
                                if (amount) setAmount(formatCurrency(amount));
                            }}
                            startContent={<DollarSign className="w-4 h-4 text-default-400" />}
                            isRequired
                            isInvalid={!!errors.amount}
                            errorMessage={errors.amount}
                            type="text"
                            inputMode="decimal"
                        />

                        <Divider />

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Links to Items/Vendors
                                <span className="text-default-400 font-normal"> (optional)</span>
                            </label>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="URL (e.g., https://example.com/item)"
                                        value={newLinkUrl}
                                        onValueChange={setNewLinkUrl}
                                        startContent={<LinkIcon className="w-4 h-4 text-default-400" />}
                                        isInvalid={!!errors.link}
                                        errorMessage={errors.link}
                                        className="flex-1"
                                        size="sm"
                                    />
                                    <Input
                                        placeholder="Label (optional)"
                                        value={newLinkLabel}
                                        onValueChange={setNewLinkLabel}
                                        className="w-40"
                                        size="sm"
                                    />
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        color="primary"
                                        variant="flat"
                                        onPress={handleAddLink}
                                        isDisabled={!newLinkUrl.trim()}
                                        aria-label="Add link"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                {vendorLinks.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                        {vendorLinks.map((link) => (
                                            <Card key={link.id} className="border border-default-200">
                                                <CardBody className="p-2 flex flex-row items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <a
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-primary hover:underline truncate block"
                                                        >
                                                            {link.label || link.url}
                                                        </a>
                                                        {link.label && (
                                                            <p className="text-xs text-default-400 truncate">{link.url}</p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        color="danger"
                                                        onPress={() => handleRemoveLink(link.id)}
                                                        aria-label="Remove link"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-4">
                        <MultiFileUpload
                            files={attachmentFiles}
                            onFilesChange={setAttachmentFiles}
                            existingFiles={existingAttachments}
                            onRemoveExistingFile={handleRemoveExistingAttachment}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            maxFiles={10}
                            maxSizeInMB={10}
                            label="Supporting Documents"
                            description="Upload receipts, quotes, screenshots, or any supporting documentation."
                        />
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-4">
                        <div className="bg-default-50 rounded-lg p-4 space-y-3">
                            <h4 className="font-semibold text-foreground">Request Summary</h4>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-default-500">Title:</span>
                                    <p className="font-medium">{title}</p>
                                </div>
                                <div>
                                    <span className="text-default-500">Category:</span>
                                    <p className="font-medium">{CATEGORY_LABELS[category]}</p>
                                </div>
                                <div>
                                    <span className="text-default-500">Amount:</span>
                                    <p className="font-medium text-success-600">
                                        ${formatCurrency(amount)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-default-500">Links:</span>
                                    <p className="font-medium">{vendorLinks.length} link(s)</p>
                                </div>
                                <div>
                                    <span className="text-default-500">Attachments:</span>
                                    <p className="font-medium">
                                        {attachmentFiles.length + existingAttachments.length} file(s)
                                    </p>
                                </div>
                            </div>

                            <div>
                                <span className="text-default-500 text-sm">Purpose:</span>
                                <p className="text-sm mt-1">{purpose}</p>
                            </div>
                        </div>

                        {request?.status === 'needs_info' && (
                            <Textarea
                                label="Response to Information Request"
                                placeholder="Provide the additional information that was requested..."
                                value={infoResponseNotes}
                                onValueChange={setInfoResponseNotes}
                                minRows={3}
                                description={request.infoRequestNotes ? `Request: ${request.infoRequestNotes}` : undefined}
                            />
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
            isDismissable={!isSubmitting}
            hideCloseButton={isSubmitting}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <span>{isEditMode ? 'Edit Fund Request' : 'New Fund Request'}</span>
                    <div className="flex items-center gap-2 mt-2">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === step.id
                                        ? 'bg-primary text-white'
                                        : currentStep > step.id
                                            ? 'bg-success text-white'
                                            : 'bg-default-200 text-default-500'
                                        }`}
                                >
                                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`w-8 h-0.5 mx-1 ${currentStep > step.id ? 'bg-success' : 'bg-default-200'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-default-500 mt-1">
                        Step {currentStep}: {STEPS[currentStep - 1].title} - {STEPS[currentStep - 1].description}
                    </p>
                </ModalHeader>

                <ModalBody>{renderStepContent()}</ModalBody>

                <ModalFooter>
                    <div className="flex justify-between w-full">
                        <div className="flex gap-2">
                            {currentStep > 1 && (
                                <Button
                                    variant="light"
                                    onPress={handlePrevStep}
                                    startContent={<ChevronLeft className="w-4 h-4" />}
                                    isDisabled={isSubmitting}
                                >
                                    Back
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="light" onPress={onClose} isDisabled={isSubmitting}>
                                Cancel
                            </Button>
                            {currentStep < STEPS.length ? (
                                <Button
                                    color="primary"
                                    onPress={handleNextStep}
                                    endContent={<ChevronRight className="w-4 h-4" />}
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    color="primary"
                                    onPress={() => handleSubmit()}
                                    isLoading={isSubmitting}
                                    startContent={!isSubmitting && <Check className="w-4 h-4" />}
                                >
                                    {request?.status === 'needs_info' ? 'Resubmit' : 'Submit Request'}
                                </Button>
                            )}
                        </div>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
