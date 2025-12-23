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
} from '@heroui/react';
import {
    DollarSign,
    Calendar,
    User,
    FileText,
    ExternalLink,
    Edit,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Eye,
} from 'lucide-react';
import type { FundRequest, FundRequestStatus } from '../../../shared/types/fund-requests';
import {
    STATUS_LABELS,
    STATUS_COLORS,
    CATEGORY_LABELS,
    FUNDING_SOURCE_LABELS,
} from '../../../shared/types/fund-requests';

interface FundRequestDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: FundRequest | null;
    onEdit?: () => void;
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

export default function FundRequestDetailModal({
    isOpen,
    onClose,
    request,
    onEdit,
}: FundRequestDetailModalProps) {
    if (!request) return null;

    const canEdit = request.status === 'draft' || request.status === 'needs_info';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
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
                        <p className="text-sm text-default-500 mt-1">
                            {CATEGORY_LABELS[request.category]} Request
                        </p>
                    </div>
                </ModalHeader>

                <ModalBody className="space-y-4">
                    {/* Info Request Alert */}
                    {request.status === 'needs_info' && request.infoRequestNotes && (
                        <Card className="border-warning-200 bg-warning-50">
                            <CardBody className="p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-warning-800">Information Requested</h4>
                                        <p className="text-sm text-warning-700 mt-1">{request.infoRequestNotes}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Denied Alert */}
                    {request.status === 'denied' && request.reviewNotes && (
                        <Card className="border-danger-200 bg-danger-50">
                            <CardBody className="p-4">
                                <div className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-danger-800">Request Denied</h4>
                                        <p className="text-sm text-danger-700 mt-1">{request.reviewNotes}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Approved Alert */}
                    {request.status === 'approved' && (
                        <Card className="border-success-200 bg-success-50">
                            <CardBody className="p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-success-800">Request Approved</h4>
                                        {request.selectedFundingSource && (
                                            <p className="text-sm text-success-700 mt-1">
                                                Funding Source: {FUNDING_SOURCE_LABELS[request.selectedFundingSource]}
                                            </p>
                                        )}
                                        {request.reviewNotes && (
                                            <p className="text-sm text-success-700 mt-1">{request.reviewNotes}</p>
                                        )}
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Request Details */}
                    <Card className="border border-default-200">
                        <CardBody className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
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
                                    <span className="text-xs text-default-500 uppercase tracking-wide">Created</span>
                                    <p className="text-sm">{formatDate(request.createdAt)}</p>
                                </div>
                                {request.submittedAt && (
                                    <div>
                                        <span className="text-xs text-default-500 uppercase tracking-wide">Submitted</span>
                                        <p className="text-sm">{formatDate(request.submittedAt)}</p>
                                    </div>
                                )}
                                {request.fundingSourcePreference && (
                                    <div>
                                        <span className="text-xs text-default-500 uppercase tracking-wide">
                                            Preferred Funding Source
                                        </span>
                                        <p className="text-sm">{FUNDING_SOURCE_LABELS[request.fundingSourcePreference]}</p>
                                    </div>
                                )}
                            </div>

                            <Divider />

                            <div>
                                <span className="text-xs text-default-500 uppercase tracking-wide">Purpose / Justification</span>
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
                                            <Link
                                                href={link.url}
                                                isExternal
                                                showAnchorIcon
                                                className="text-sm"
                                            >
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
                                <div className="space-y-2">
                                    {request.attachments.map((attachment) => (
                                        <Card key={attachment.id} className="border border-default-100">
                                            <CardBody className="p-3 flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-default-400" />
                                                    <div>
                                                        <p className="text-sm font-medium">{attachment.name}</p>
                                                        <p className="text-xs text-default-400">
                                                            {(attachment.size / 1024).toFixed(1)} KB
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
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
                    <Button variant="light" onPress={onClose}>
                        Close
                    </Button>
                    {canEdit && onEdit && (
                        <Button
                            color="primary"
                            startContent={<Edit className="w-4 h-4" />}
                            onPress={onEdit}
                        >
                            {request.status === 'needs_info' ? 'Respond & Resubmit' : 'Edit Request'}
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
