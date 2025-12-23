import { useState } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Chip,
    Card,
    CardBody,
    Divider,
    Link,
    Textarea,
    Select,
    SelectItem,
    RadioGroup,
    Radio,
} from '@heroui/react';
import {
    DollarSign,
    User,
    FileText,
    ExternalLink,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Eye,
    MessageSquare,
    ThumbsUp,
    ThumbsDown,
    HelpCircle,
} from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { FundRequest, FundRequestStatus, FundingSource } from '../../../shared/types/fund-requests';
import {
    STATUS_LABELS,
    STATUS_COLORS,
    CATEGORY_LABELS,
    FUNDING_SOURCE_LABELS,
} from '../../../shared/types/fund-requests';
import { showToast } from '../../../shared/utils/toast';

interface FundRequestActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: FundRequest | null;
    onActionComplete: () => void;
}

const getStatusIcon = (status: FundRequestStatus) => {
    switch (status) {
        case 'draft':
            return <FileText className="w-4 h-4" />;
        case 'submitted':
            return <Clock className="w-4 h-4" />;
        case 'needs_info':
            return <AlertCircle className="w-4 h-4" />;
        case 'approved':
            return <CheckCircle className="w-4 h-4" />;
        case 'denied':
            return <XCircle className="w-4 h-4" />;
        case 'completed':
            return <CheckCircle className="w-4 h-4" />;
        default:
            return <FileText className="w-4 h-4" />;
    }
};

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
        hour: '2-digit',
        minute: '2-digit',
    });
};

type ActionType = 'approve' | 'deny' | 'request_info' | null;

export default function FundRequestActionModal({
    isOpen,
    onClose,
    request,
    onActionComplete,
}: FundRequestActionModalProps) {
    const [user] = useAuthState(auth);
    const [selectedAction, setSelectedAction] = useState<ActionType>(null);
    const [notes, setNotes] = useState('');
    const [selectedFundingSource, setSelectedFundingSource] = useState<FundingSource>('department');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!request) return null;

    const canTakeAction = request.status === 'submitted';

    const handleAction = async () => {
        if (!user || !selectedAction) return;

        // Validate notes for request_info and deny
        if ((selectedAction === 'request_info' || selectedAction === 'deny') && !notes.trim()) {
            showToast.error(
                selectedAction === 'request_info'
                    ? 'Please provide a question or statement for the requester'
                    : 'Please provide a reason for denying this request'
            );
            return;
        }

        setIsSubmitting(true);

        try {
            let newStatus: FundRequestStatus;
            let updateData: any = {
                reviewedBy: user.uid,
                reviewedByName: user.displayName || user.email || 'Unknown',
                reviewedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            const auditLog = {
                id: crypto.randomUUID(),
                performedBy: user.uid,
                performedByName: user.displayName || user.email || 'Unknown',
                timestamp: Timestamp.now(),
                previousStatus: request.status,
                notes: notes.trim() || undefined,
            };

            switch (selectedAction) {
                case 'approve':
                    newStatus = 'approved';
                    updateData.status = newStatus;
                    updateData.selectedFundingSource = selectedFundingSource;
                    updateData.reviewNotes = notes.trim() || null;
                    updateData.auditLogs = [
                        ...(request.auditLogs || []),
                        { ...auditLog, action: 'approved', newStatus },
                    ];
                    break;

                case 'deny':
                    newStatus = 'denied';
                    updateData.status = newStatus;
                    updateData.reviewNotes = notes.trim();
                    updateData.auditLogs = [
                        ...(request.auditLogs || []),
                        { ...auditLog, action: 'denied', newStatus },
                    ];
                    break;

                case 'request_info':
                    newStatus = 'needs_info';
                    updateData.status = newStatus;
                    updateData.infoRequestNotes = notes.trim();
                    updateData.auditLogs = [
                        ...(request.auditLogs || []),
                        { ...auditLog, action: 'info_requested', newStatus },
                    ];
                    break;

                default:
                    return;
            }

            await updateDoc(doc(db, 'fundRequests', request.id), updateData);

            // Send email notification
            try {
                await fetch('/api/email/send-fund-request-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'fund_request_status_change',
                        requestId: request.id,
                        newStatus: newStatus,
                        reviewNotes: selectedAction === 'deny' ? notes.trim() : (selectedAction === 'approve' ? notes.trim() : undefined),
                        infoRequestNotes: selectedAction === 'request_info' ? notes.trim() : undefined,
                        selectedFundingSource: selectedAction === 'approve' ? selectedFundingSource : undefined,
                        reviewerName: user.displayName || user.email || 'Unknown',
                    }),
                });
            } catch (emailError) {
                console.error('Failed to send status change email:', emailError);
                // Don't fail the whole operation for email errors
            }

            const actionLabels = {
                approve: 'approved',
                deny: 'denied',
                request_info: 'returned for more information',
            };

            showToast.success(`Request has been ${actionLabels[selectedAction]}`);

            // Reset state
            setSelectedAction(null);
            setNotes('');
            setSelectedFundingSource('department');

            onActionComplete();
        } catch (error) {
            console.error('Error updating fund request:', error);
            showToast.error('Failed to update request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedAction(null);
        setNotes('');
        setSelectedFundingSource('department');
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            size="3xl"
            scrollBehavior="inside"
            isDismissable={!isSubmitting}
            hideCloseButton={isSubmitting}
        >
            <ModalContent>
                <ModalHeader className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">{request.title}</h2>
                            <Chip
                                size="sm"
                                color={STATUS_COLORS[request.status]}
                                variant="flat"
                                startContent={getStatusIcon(request.status)}
                            >
                                {STATUS_LABELS[request.status]}
                            </Chip>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-default-500">
                            <User className="w-4 h-4" />
                            <span>{request.submittedByName || 'Unknown'}</span>
                            <span>•</span>
                            <span>{request.submittedByEmail}</span>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody className="space-y-4">
                    {/* Request Details */}
                    <Card className="border border-default-200">
                        <CardBody className="p-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <span className="text-xs text-default-500 uppercase tracking-wide">Amount</span>
                                    <p className="text-lg font-semibold text-success-600">
                                        {formatCurrency(request.amount)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-default-500 uppercase tracking-wide">Category</span>
                                    <p className="font-medium">{CATEGORY_LABELS[request.category]}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-default-500 uppercase tracking-wide">Submitted</span>
                                    <p className="text-sm">{formatDate(request.submittedAt || request.createdAt)}</p>
                                </div>
                                {request.fundingSourcePreference && (
                                    <div>
                                        <span className="text-xs text-default-500 uppercase tracking-wide">
                                            Preferred Source
                                        </span>
                                        <p className="text-sm">{FUNDING_SOURCE_LABELS[request.fundingSourcePreference]}</p>
                                    </div>
                                )}
                            </div>

                            <Divider />

                            <div>
                                <span className="text-xs text-default-500 uppercase tracking-wide">
                                    Purpose / Justification
                                </span>
                                <p className="text-sm mt-1 whitespace-pre-wrap">{request.purpose}</p>
                            </div>

                            {request.infoResponseNotes && (
                                <>
                                    <Divider />
                                    <div>
                                        <span className="text-xs text-default-500 uppercase tracking-wide">
                                            Additional Information Provided
                                        </span>
                                        <p className="text-sm mt-1 whitespace-pre-wrap">{request.infoResponseNotes}</p>
                                    </div>
                                </>
                            )}
                        </CardBody>
                    </Card>

                    {/* Vendor Links */}
                    {request.vendorLinks && request.vendorLinks.length > 0 && (
                        <Card className="border border-default-200">
                            <CardBody className="p-4">
                                <h4 className="text-sm font-semibold mb-3">Vendor Links</h4>
                                <div className="space-y-2">
                                    {request.vendorLinks.map((link) => (
                                        <div key={link.id} className="flex items-center gap-2">
                                            <ExternalLink className="w-4 h-4 text-default-400" />
                                            <Link href={link.url} isExternal showAnchorIcon className="text-sm">
                                                {link.label || link.url}
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Attachments */}
                    {request.attachments && request.attachments.length > 0 && (
                        <Card className="border border-default-200">
                            <CardBody className="p-4">
                                <h4 className="text-sm font-semibold mb-3">Attachments</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {request.attachments.map((attachment) => (
                                        <Card key={attachment.id} className="border border-default-100">
                                            <CardBody className="p-3 flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <FileText className="w-5 h-5 text-default-400 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                                                        <p className="text-xs text-default-400">
                                                            {(attachment.size / 1024).toFixed(1)} KB
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        as="a"
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        aria-label="View attachment"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        as="a"
                                                        href={attachment.url}
                                                        download={attachment.name}
                                                        aria-label="Download attachment"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Action Panel - Only show for submitted requests */}
                    {canTakeAction && (
                        <Card className="border-2 border-primary-200 bg-primary-50/30">
                            <CardBody className="p-4 space-y-4">
                                <h4 className="font-semibold text-foreground">Take Action</h4>

                                <RadioGroup
                                    value={selectedAction || ''}
                                    onValueChange={(value) => setSelectedAction(value as ActionType)}
                                    orientation="horizontal"
                                >
                                    <Radio
                                        value="approve"
                                        description="Approve this request"
                                        classNames={{
                                            base: 'border border-default-200 rounded-lg p-3 m-0 max-w-none data-[selected=true]:border-success-500 data-[selected=true]:bg-success-50',
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ThumbsUp className="w-4 h-4 text-success-600" />
                                            <span>Approve</span>
                                        </div>
                                    </Radio>
                                    <Radio
                                        value="deny"
                                        description="Deny this request"
                                        classNames={{
                                            base: 'border border-default-200 rounded-lg p-3 m-0 max-w-none data-[selected=true]:border-danger-500 data-[selected=true]:bg-danger-50',
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ThumbsDown className="w-4 h-4 text-danger-600" />
                                            <span>Deny</span>
                                        </div>
                                    </Radio>
                                    <Radio
                                        value="request_info"
                                        description="Request more info"
                                        classNames={{
                                            base: 'border border-default-200 rounded-lg p-3 m-0 max-w-none data-[selected=true]:border-warning-500 data-[selected=true]:bg-warning-50',
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <HelpCircle className="w-4 h-4 text-warning-600" />
                                            <span>Request Info</span>
                                        </div>
                                    </Radio>
                                </RadioGroup>

                                {selectedAction === 'approve' && (
                                    <div className="space-y-3">
                                        <Select
                                            label="Funding Source"
                                            selectedKeys={[selectedFundingSource]}
                                            onSelectionChange={(keys) => {
                                                const selected = Array.from(keys)[0] as FundingSource;
                                                if (selected) setSelectedFundingSource(selected);
                                            }}
                                            isRequired
                                        >
                                            {Object.entries(FUNDING_SOURCE_LABELS).map(([key, label]) => (
                                                <SelectItem key={key}>{label}</SelectItem>
                                            ))}
                                        </Select>
                                        <Textarea
                                            label="Notes (optional)"
                                            placeholder="Add any notes about this approval..."
                                            value={notes}
                                            onValueChange={setNotes}
                                            minRows={2}
                                        />
                                    </div>
                                )}

                                {selectedAction === 'deny' && (
                                    <Textarea
                                        label="Reason for Denial"
                                        placeholder="Please explain why this request is being denied..."
                                        value={notes}
                                        onValueChange={setNotes}
                                        isRequired
                                        minRows={3}
                                        isInvalid={selectedAction === 'deny' && !notes.trim()}
                                        errorMessage="A reason is required when denying a request"
                                    />
                                )}

                                {selectedAction === 'request_info' && (
                                    <Textarea
                                        label="Information Request"
                                        placeholder="What additional information do you need from the requester?"
                                        value={notes}
                                        onValueChange={setNotes}
                                        isRequired
                                        minRows={3}
                                        isInvalid={selectedAction === 'request_info' && !notes.trim()}
                                        errorMessage="Please specify what information you need"
                                    />
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* Audit Trail */}
                    {request.auditLogs && request.auditLogs.length > 0 && (
                        <Card className="border border-default-200">
                            <CardBody className="p-4">
                                <h4 className="text-sm font-semibold mb-3">Activity History</h4>
                                <div className="space-y-3">
                                    {request.auditLogs.map((log) => (
                                        <div key={log.id} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-default-300 mt-2 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm">
                                                    <span className="font-medium capitalize">
                                                        {log.action.replace('_', ' ')}
                                                    </span>
                                                    {log.performedByName && (
                                                        <span className="text-default-500"> by {log.performedByName}</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-default-400">{formatDate(log.timestamp)}</p>
                                                {log.notes && (
                                                    <p className="text-sm text-default-600 mt-1">{log.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </ModalBody>

                <ModalFooter>
                    <Button variant="light" onPress={handleClose} isDisabled={isSubmitting}>
                        Close
                    </Button>
                    {canTakeAction && selectedAction && (
                        <Button
                            color={
                                selectedAction === 'approve'
                                    ? 'success'
                                    : selectedAction === 'deny'
                                        ? 'danger'
                                        : 'warning'
                            }
                            onPress={handleAction}
                            isLoading={isSubmitting}
                            startContent={
                                !isSubmitting &&
                                (selectedAction === 'approve' ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : selectedAction === 'deny' ? (
                                    <XCircle className="w-4 h-4" />
                                ) : (
                                    <MessageSquare className="w-4 h-4" />
                                ))
                            }
                        >
                            {selectedAction === 'approve'
                                ? 'Approve Request'
                                : selectedAction === 'deny'
                                    ? 'Deny Request'
                                    : 'Request Information'}
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
