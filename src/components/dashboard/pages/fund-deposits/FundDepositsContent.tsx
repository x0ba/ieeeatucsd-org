import React, { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye,
    FileText,
    CreditCard,
    Trash2,
    Receipt,
    Banknote,
    MessageCircle,
    ChevronDown,
    Calendar,
    Filter
} from 'lucide-react';
import {
    Card,
    CardBody,
    Button,
    Chip,
    Input,
    Tabs,
    Tab,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Spinner,
    Tooltip,
    Select,
    SelectItem,
    Textarea,
    Divider,
    Progress
} from '@heroui/react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp, addDoc, getDoc, deleteDoc, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, storage } from '../../../../firebase/client';
import type { UserRole } from '../../shared/types/firestore';
import { showToast } from '../../shared/utils/toast';
import { TableSkeleton } from '../../../ui/loading';
import { useModalRegistration } from '../../shared/contexts/ModalContext';
import { useGlobalImagePaste } from '../../shared/hooks/useGlobalImagePaste';
import { usePasteNotification } from '../../shared/components/PasteNotification';
import MultiFileUpload from './components/MultiFileUpload';

interface FundDeposit {
    id: string;
    title: string;
    amount: number;
    depositDate: string;
    status: 'pending' | 'verified' | 'rejected';
    depositedBy: string;
    depositedByName?: string;
    depositedByEmail?: string;
    depositMethod: 'cash' | 'check' | 'bank_transfer' | 'other';
    otherDepositMethod?: string;
    purpose: string;
    receiptFiles?: string[];
    description: string;
    submittedAt: any;
    verifiedBy?: string;
    verifiedByName?: string;
    verifiedAt?: any;
    notes?: string;
    rejectionReason?: string;
    auditLogs?: any[];
    referenceNumber?: string;
    editedAt?: any;
    editedBy?: string;
    editedByName?: string;
    isIeeeDeposit?: boolean;
    ieeeDepositSource?: 'upp' | 'section' | 'region' | 'global' | 'society' | 'other';
    needsBankTransfer?: boolean;
    bankTransferInstructions?: string;
    bankTransferFiles?: string[];
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'pending': return <Clock className="w-3.5 h-3.5" />;
        case 'verified': return <CheckCircle className="w-3.5 h-3.5" />;
        case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
        default: return <Clock className="w-3.5 h-3.5" />;
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'pending': return 'Pending Review';
        case 'verified': return 'Verified';
        case 'rejected': return 'Rejected';
        default: return status;
    }
};

const getStatusColor = (status: string): "warning" | "success" | "danger" | "default" => {
    switch (status) {
        case 'pending': return 'warning';
        case 'verified': return 'success';
        case 'rejected': return 'danger';
        default: return 'default';
    }
};

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export default function FundDepositsContent() {
    const [user] = useAuthState(auth);
    const [deposits, setDeposits] = useState<FundDeposit[]>([]);
    const [filteredDeposits, setFilteredDeposits] = useState<FundDeposit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<string>('all');
    const [userRole, setUserRole] = useState<UserRole>('Member');

    // Modals
    const [isNewDepositModalOpen, setIsNewDepositModalOpen] = useState(false);
    const [selectedDeposit, setSelectedDeposit] = useState<FundDeposit | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Form State
    const [newDeposit, setNewDeposit] = useState({
        title: '',
        amount: '',
        depositDate: new Date().toISOString().split('T')[0],
        depositMethod: 'cash' as const,
        otherDepositMethod: '',
        purpose: '',
        description: '',
        referenceNumber: '',
        isIeeeDeposit: false,
        ieeeDepositSource: 'upp' as const,
    });
    const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Rejection Modal
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [depositToReject, setDepositToReject] = useState<string | null>(null);

    // Paste Notification
    const { showPasteNotification, PasteNotificationComponent } = usePasteNotification('Receipt image pasted');
    useModalRegistration('fund-deposit-new', isNewDepositModalOpen);
    useGlobalImagePaste({
        modalType: 'fund-deposit-new',
        enabled: isNewDepositModalOpen,
        onImagePaste: (file) => {
            setReceiptFiles(prev => [...prev, file]);
        },
        onPasteSuccess: showPasteNotification
    });

    // Fetch User Role and Deposits
    useEffect(() => {
        if (!user) return;

        const fetchUserRole = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const role = userDoc.data().role || 'Member';
                    setUserRole(role);

                    let q;
                    if (role === 'Administrator') {
                        q = query(collection(db, 'fundDeposits'), orderBy('submittedAt', 'desc'));
                    } else {
                        q = query(collection(db, 'fundDeposits'), where('depositedBy', '==', user.uid), orderBy('submittedAt', 'desc'));
                    }

                    const unsubscribe = onSnapshot(q, (snapshot) => {
                        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FundDeposit[];
                        setDeposits(data);
                        setIsLoading(false);
                    }, (error) => {
                        console.error("Error fetching deposits:", error);
                        setIsLoading(false);
                    });

                    return () => unsubscribe();
                }
            } catch (error) {
                console.error("Error fetching role:", error);
                setIsLoading(false);
            }
        };
        fetchUserRole();
    }, [user]);

    // Filtering
    useEffect(() => {
        let filtered = [...deposits];

        if (selectedTab !== 'all') {
            filtered = filtered.filter(d => d.status === selectedTab);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(d =>
                d.title.toLowerCase().includes(query) ||
                d.purpose.toLowerCase().includes(query) ||
                (d.depositedByName || '').toLowerCase().includes(query)
            );
        }

        setFilteredDeposits(filtered);
    }, [deposits, selectedTab, searchQuery]);

    const handleNewDeposit = () => {
        setNewDeposit({
            title: '',
            amount: '',
            depositDate: new Date().toISOString().split('T')[0],
            depositMethod: 'cash',
            otherDepositMethod: '',
            purpose: '',
            description: '',
            referenceNumber: '',
            isIeeeDeposit: false,
            ieeeDepositSource: 'upp',
        });
        setReceiptFiles([]);
        setValidationErrors({});
        setIsNewDepositModalOpen(true);
    };

    const uploadFiles = async (files: File[]) => {
        const uploadPromises = files.map(async (file) => {
            const storageRef = ref(storage, `fund_deposits/${user?.uid}/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot.ref));
            });
            return await getDownloadURL(storageRef);
        });
        return await Promise.all(uploadPromises);
    };

    const handleSubmit = async () => {
        const errors: Record<string, string> = {};
        if (!newDeposit.title) errors.title = 'Title is required';
        if (!newDeposit.amount) errors.amount = 'Amount is required';
        if (!newDeposit.purpose) errors.purpose = 'Purpose is required';
        if (newDeposit.depositMethod === 'other' && !newDeposit.otherDepositMethod) {
            errors.otherDepositMethod = 'Please specify method';
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setIsSubmitting(true);
        try {
            let receiptUrls: string[] = [];
            if (receiptFiles.length > 0) {
                receiptUrls = await uploadFiles(receiptFiles);
            }

            const userDoc = await getDoc(doc(db, 'users', user!.uid));
            const userData = userDoc.data();

            const depositData = {
                ...newDeposit,
                amount: parseFloat(newDeposit.amount),
                status: 'pending',
                depositedBy: user!.uid,
                depositedByName: userData?.name || user!.email,
                depositedByEmail: user!.email,
                receiptFiles: receiptUrls,
                submittedAt: Timestamp.now(),
                auditLogs: [{
                    action: 'submitted',
                    createdBy: user!.uid,
                    createdByName: userData?.name || user!.email,
                    timestamp: Timestamp.now(),
                    note: 'Deposit submitted for review'
                }]
            };

            const docRef = await addDoc(collection(db, 'fundDeposits'), depositData);

            // Email notification
            try {
                await fetch('/api/email/send-fund-deposit-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'fund_deposit_submission', depositId: docRef.id })
                });
            } catch (e) {
                console.warn('Email failed', e);
            }

            setIsNewDepositModalOpen(false);
            showToast.success('Deposit submitted successfully');
        } catch (error) {
            console.error(error);
            showToast.error('Failed to submit deposit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string, reason?: string) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', user!.uid));
            const userData = userDoc.data();

            const updateData: any = {
                status: newStatus,
                [`${newStatus}By`]: user!.uid,
                [`${newStatus}ByName`]: userData?.name || user!.email,
                [`${newStatus}At`]: Timestamp.now()
            };

            if (newStatus === 'rejected' && reason) {
                updateData.rejectionReason = reason;
            }

            const deposit = deposits.find(d => d.id === id);
            const newAuditLog = {
                action: newStatus,
                createdBy: user!.uid,
                createdByName: userData?.name || user!.email,
                timestamp: Timestamp.now(),
                note: reason || `Status changed to ${newStatus}`,
                previousData: { status: deposit?.status },
                newData: { status: newStatus }
            };
            updateData.auditLogs = [...(deposit?.auditLogs || []), newAuditLog];

            await updateDoc(doc(db, 'fundDeposits', id), updateData);

            // Email
            try {
                await fetch('/api/email/send-fund-deposit-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'fund_deposit_status_change', depositId: id, newStatus, rejectionReason: reason })
                });
            } catch (e) {
                console.warn('Email failed', e);
            }

            showToast.success(`Deposit ${newStatus} successfully`);
        } catch (error) {
            console.error(error);
            showToast.error('Failed to update status');
        }
    };

    const handleDelete = async (deposit: FundDeposit) => {
        if (!window.confirm('Are you sure? This cannot be undone.')) return;
        try {
            await deleteDoc(doc(db, 'fundDeposits', deposit.id));
            if (deposit.receiptFiles) {
                for (const url of deposit.receiptFiles) {
                    try {
                        const fileRef = ref(storage, url);
                        await deleteObject(fileRef);
                    } catch (e) { console.warn('File delete failed', e); }
                }
            }
            showToast.success('Deposit deleted');
            if (isDetailModalOpen) setIsDetailModalOpen(false);
        } catch (error) {
            console.error(error);
            showToast.error('Failed to delete deposit');
        }
    };

    const getStats = () => {
        return {
            total: deposits.length,
            pending: deposits.filter(d => d.status === 'pending').length,
            verified: deposits.filter(d => d.status === 'verified').length,
            rejected: deposits.filter(d => d.status === 'rejected').length,
            totalAmount: deposits.filter(d => d.status === 'verified').reduce((acc, curr) => acc + curr.amount, 0)
        };
    };

    const stats = getStats();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner size="lg" color="primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8">
            {PasteNotificationComponent}
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Fund Deposits</h1>
                    <p className="text-default-500 mt-1 max-w-2xl">
                        Manage and track your fund deposits.
                    </p>
                </div>
                <Button
                    color="primary"
                    size="lg"
                    startContent={<Plus className="w-5 h-5" />}
                    onPress={handleNewDeposit}
                    className="font-medium shadow-md shadow-primary/20"
                >
                    New Deposit
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-default-200 shadow-sm bg-default-50/50">
                    <CardBody className="p-4">
                        <p className="text-small text-default-500 font-medium">Total Deposits</p>
                        <p className="text-2xl font-semibold text-foreground mt-1">{stats.total}</p>
                    </CardBody>
                </Card>
                <Card className="border border-default-200 shadow-sm bg-default-50/50">
                    <CardBody className="p-4">
                        <p className="text-small text-default-500 font-medium">Pending Review</p>
                        <p className="text-2xl font-semibold text-foreground mt-1">{stats.pending}</p>
                    </CardBody>
                </Card>
                <Card className="border border-default-200 shadow-sm bg-default-50/50">
                    <CardBody className="p-4">
                        <p className="text-small text-default-500 font-medium">Verified</p>
                        <p className="text-2xl font-semibold text-foreground mt-1">{stats.verified}</p>
                    </CardBody>
                </Card>
                <Card className="border border-default-200 shadow-sm bg-default-50/50">
                    <CardBody className="p-4">
                        <p className="text-small text-default-500 font-medium">Total Verified Amount</p>
                        <p className="text-2xl font-semibold text-foreground mt-1">{formatCurrency(stats.totalAmount)}</p>
                    </CardBody>
                </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-md py-2 -mx-2 px-2">
                <Tabs
                    selectedKey={selectedTab}
                    onSelectionChange={(key) => setSelectedTab(key as string)}
                    color="primary"
                    variant="underlined"
                    classNames={{
                        tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                        cursor: "w-full bg-primary",
                        tab: "max-w-fit px-0 h-12",
                        tabContent: "group-data-[selected=true]:text-primary font-medium"
                    }}
                >
                    <Tab key="all" title={
                        <div className="flex items-center gap-2">
                            <span>All Deposits</span>
                            <Chip size="sm" variant="flat" className="text-default-500 bg-default-100">{stats.total}</Chip>
                        </div>
                    } />
                    <Tab key="pending" title={
                        <div className="flex items-center gap-2">
                            <span>Pending</span>
                            {stats.pending > 0 && <Chip size="sm" variant="flat" color="warning" className="text-warning-700 bg-warning-100">{stats.pending}</Chip>}
                        </div>
                    } />
                    <Tab key="verified" title={
                        <div className="flex items-center gap-2">
                            <span>Verified</span>
                            <Chip size="sm" variant="flat" color="success" className="text-success-700 bg-success-100">{stats.verified}</Chip>
                        </div>
                    } />
                </Tabs>
                <Input
                    placeholder="Search deposits..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    startContent={<Search className="w-4 h-4 text-default-400" />}
                    className="w-full sm:max-w-xs"
                    radius="lg"
                    variant="bordered"
                />
            </div>

            {/* List */}
            {filteredDeposits.length === 0 ? (
                <Card className="border-dashed border-2 border-default-200 bg-transparent shadow-none">
                    <CardBody className="py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center mx-auto mb-4 text-default-400">
                            <Banknote className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No deposits found</h3>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredDeposits.map((deposit) => (
                        <Card
                            key={deposit.id}
                            isPressable
                            onPress={() => {
                                setSelectedDeposit(deposit);
                                setIsDetailModalOpen(true);
                            }}
                            className="w-full border border-default-200 shadow-sm hover:border-primary-300 hover:shadow-md transition-all duration-200"
                        >
                            <CardBody className="p-4 sm:p-5">
                                <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
                                    {/* Status Bar */}
                                    <div className={`
                                        hidden md:block w-1.5 self-stretch rounded-full
                                        ${deposit.status === 'verified' ? 'bg-success-500' :
                                            deposit.status === 'rejected' ? 'bg-danger-500' :
                                                'bg-warning-500'}
                                    `} />

                                    <div className="flex-1 min-w-0 space-y-2 w-full">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                            <h3 className="text-lg font-semibold text-foreground truncate max-w-full">
                                                {deposit.title}
                                            </h3>
                                            <Chip
                                                size="sm"
                                                color={getStatusColor(deposit.status)}
                                                variant="flat"
                                                className="border-none gap-1 pl-1"
                                                startContent={getStatusIcon(deposit.status)}
                                            >
                                                <span className="font-medium text-xs">{getStatusLabel(deposit.status)}</span>
                                            </Chip>
                                        </div>
                                        <p className="text-sm text-default-500 line-clamp-1">{deposit.purpose}</p>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-default-400 mt-2">
                                            <div className="flex items-center gap-1.5 bg-default-100 px-2 py-1 rounded-md">
                                                <DollarSign className="w-3.5 h-3.5 text-default-500" />
                                                <span className="font-semibold text-foreground">{formatCurrency(deposit.amount)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard className="w-3.5 h-3.5" />
                                                <span className="capitalize">{deposit.depositMethod.replace('_', ' ')}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{formatDate(deposit.depositDate)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0 border-t md:border-t-0 border-default-100 pt-3 md:pt-0 w-full md:w-auto justify-end">
                                        <Button
                                            size="sm"
                                            variant="light"
                                            onPress={() => {
                                                setSelectedDeposit(deposit);
                                                setIsDetailModalOpen(true);
                                            }}
                                            endContent={<Eye className="w-3.5 h-3.5" />}
                                            className="font-medium text-default-500"
                                        >
                                            Details
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {/* New Deposit Modal */}
            <Modal
                isOpen={isNewDepositModalOpen}
                onClose={() => setIsNewDepositModalOpen(false)}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">New Fund Deposit</ModalHeader>
                    <ModalBody>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Title"
                                placeholder="e.g. Membership Dues"
                                value={newDeposit.title}
                                onValueChange={(val) => setNewDeposit({ ...newDeposit, title: val })}
                                errorMessage={validationErrors.title}
                                isInvalid={!!validationErrors.title}
                                isRequired
                            />
                            <Input
                                label="Amount"
                                placeholder="0.00"
                                type="number"
                                startContent={<div className="pointer-events-none flex items-center"><span className="text-default-400 text-small">$</span></div>}
                                value={newDeposit.amount}
                                onValueChange={(val) => setNewDeposit({ ...newDeposit, amount: val })}
                                errorMessage={validationErrors.amount}
                                isInvalid={!!validationErrors.amount}
                                isRequired
                            />
                            <Input
                                label="Deposit Date"
                                type="date"
                                value={newDeposit.depositDate}
                                onValueChange={(val) => setNewDeposit({ ...newDeposit, depositDate: val })}
                                isRequired
                            />
                            <Select
                                label="Method"
                                defaultSelectedKeys={['cash']}
                                selectedKeys={[newDeposit.depositMethod]}
                                onChange={(e) => setNewDeposit({ ...newDeposit, depositMethod: e.target.value as any })}
                            >
                                <SelectItem key="cash" value="cash">Cash</SelectItem>
                                <SelectItem key="check" value="check">Check</SelectItem>
                                <SelectItem key="bank_transfer" value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem key="other" value="other">Other</SelectItem>
                            </Select>
                            {newDeposit.depositMethod === 'other' && (
                                <Input
                                    label="Specify Method"
                                    value={newDeposit.otherDepositMethod}
                                    onValueChange={(val) => setNewDeposit({ ...newDeposit, otherDepositMethod: val })}
                                    errorMessage={validationErrors.otherDepositMethod}
                                    isInvalid={!!validationErrors.otherDepositMethod}
                                    className="md:col-span-2"
                                />
                            )}
                            <Input
                                label="Purpose"
                                placeholder="e.g. Event Revenue"
                                value={newDeposit.purpose}
                                onValueChange={(val) => setNewDeposit({ ...newDeposit, purpose: val })}
                                errorMessage={validationErrors.purpose}
                                isInvalid={!!validationErrors.purpose}
                                isRequired
                                className="md:col-span-2"
                            />
                            <Textarea
                                label="Description"
                                value={newDeposit.description}
                                onValueChange={(val) => setNewDeposit({ ...newDeposit, description: val })}
                                className="md:col-span-2"
                            />
                            <Input
                                label="Reference Number"
                                placeholder="Optional transaction ID"
                                value={newDeposit.referenceNumber}
                                onValueChange={(val) => setNewDeposit({ ...newDeposit, referenceNumber: val })}
                                className="md:col-span-2"
                            />
                        </div>
                        <Divider className="my-2" />
                        <div>
                            <p className="text-small font-medium mb-2">Receipt Files</p>
                            <MultiFileUpload
                                files={receiptFiles}
                                onFilesChange={setReceiptFiles}
                                accept=".pdf,.jpg,.jpeg,.png"
                                maxFiles={5}
                                maxSizeInMB={5}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => setIsNewDepositModalOpen(false)}>Cancel</Button>
                        <Button color="primary" onPress={handleSubmit} isLoading={isSubmitting}>Submit Deposit</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => { setIsDetailModalOpen(false); setSelectedDeposit(null); }}
                size="3xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <div className="flex justify-between items-center pr-8">
                                    <span>{selectedDeposit?.title}</span>
                                    {selectedDeposit && (
                                        <Chip color={getStatusColor(selectedDeposit.status)} variant="flat" size="sm">
                                            {getStatusLabel(selectedDeposit.status)}
                                        </Chip>
                                    )}
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                {selectedDeposit && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Card shadow="sm" className="bg-default-50">
                                                <CardBody>
                                                    <p className="text-xs text-default-500 uppercase font-bold">Amount</p>
                                                    <p className="text-2xl font-bold">{formatCurrency(selectedDeposit.amount)}</p>
                                                </CardBody>
                                            </Card>
                                            <Card shadow="sm" className="bg-default-50">
                                                <CardBody>
                                                    <p className="text-xs text-default-500 uppercase font-bold">Date</p>
                                                    <p className="text-xl">{formatDate(selectedDeposit.depositDate)}</p>
                                                </CardBody>
                                            </Card>
                                        </div>

                                        <div>
                                            <h4 className="text-medium font-semibold mb-2">Details</h4>
                                            <div className="grid grid-cols-2 gap-y-4 text-small">
                                                <div className="text-default-500">Method</div>
                                                <div className="capitalize">{selectedDeposit.depositMethod.replace('_', ' ')}</div>

                                                <div className="text-default-500">Purpose</div>
                                                <div>{selectedDeposit.purpose}</div>

                                                <div className="text-default-500">Submitted By</div>
                                                <div>{selectedDeposit.depositedByName || selectedDeposit.depositedByEmail}</div>

                                                {selectedDeposit.referenceNumber && (
                                                    <>
                                                        <div className="text-default-500">Reference</div>
                                                        <div>{selectedDeposit.referenceNumber}</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {selectedDeposit.description && (
                                            <div>
                                                <h4 className="text-medium font-semibold mb-2">Description</h4>
                                                <p className="text-small text-default-600 bg-default-50 p-3 rounded-lg">
                                                    {selectedDeposit.description}
                                                </p>
                                            </div>
                                        )}

                                        {selectedDeposit.receiptFiles && selectedDeposit.receiptFiles.length > 0 && (
                                            <div>
                                                <h4 className="text-medium font-semibold mb-2">Receipts</h4>
                                                <div className="flex flex-col gap-2">
                                                    {selectedDeposit.receiptFiles.map((url, idx) => (
                                                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 border rounded-lg hover:bg-default-50 transition-colors">
                                                            <FileText className="w-4 h-4 text-primary" />
                                                            <span className="text-small text-primary underline">View Receipt {idx + 1}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Admin Actions */}
                                        {userRole === 'Administrator' && selectedDeposit.status === 'pending' && (
                                            <div className="flex gap-2 justify-end pt-4 border-t">
                                                <Button color="danger" variant="flat" onPress={() => {
                                                    setDepositToReject(selectedDeposit.id);
                                                    setIsRejectionModalOpen(true);
                                                }}>
                                                    Reject
                                                </Button>
                                                <Button color="success" className="text-white" onPress={() => handleStatusUpdate(selectedDeposit.id, 'verified')}>
                                                    Verify Deposit
                                                </Button>
                                            </div>
                                        )}

                                        {/* User Actions */}
                                        {((userRole === 'Administrator') || (selectedDeposit.depositedBy === user?.uid && selectedDeposit.status === 'pending')) && (
                                            <div className="flex justify-end pt-2">
                                                <Button color="danger" variant="light" startContent={<Trash2 className="w-4 h-4" />} onPress={() => handleDelete(selectedDeposit)}>
                                                    Delete Deposit
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button onPress={onClose}>Close</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Rejection Modal */}
            <Modal isOpen={isRejectionModalOpen} onClose={() => setIsRejectionModalOpen(false)}>
                <ModalContent>
                    <ModalHeader>Reject Deposit</ModalHeader>
                    <ModalBody>
                        <Textarea
                            label="Reason for rejection"
                            placeholder="Please explain why this deposit is being rejected..."
                            value={rejectionReason}
                            onValueChange={setRejectionReason}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => setIsRejectionModalOpen(false)}>Cancel</Button>
                        <Button color="danger" onPress={() => {
                            if (depositToReject) {
                                handleStatusUpdate(depositToReject, 'rejected', rejectionReason);
                                setIsRejectionModalOpen(false);
                                setRejectionReason('');
                                setDepositToReject(null);
                                setIsDetailModalOpen(false);
                            }
                        }}>
                            Confirm Rejection
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}
