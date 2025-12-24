import { useState, useEffect } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Tabs,
    Tab,
    Divider,
    Textarea,
    Card,
    CardBody,
    Spinner,
} from '@heroui/react';
import { DollarSign, Calendar, Save, Plus, Trash2 } from 'lucide-react';
import { doc, setDoc, collection, addDoc, getDocs, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../../firebase/client';
import type { FundRequestDepartment, BudgetConfig, BudgetAdjustment } from '../../../shared/types/fund-requests';
import { DEPARTMENT_LABELS } from '../../../shared/types/fund-requests';
import { showToast } from '../../../shared/utils/toast';

interface BudgetManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgetConfigs: Record<FundRequestDepartment, BudgetConfig | null>;
    onBudgetUpdate: () => void;
    currentUserId: string;
    currentUserName: string;
}

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
};

export default function BudgetManagementModal({
    isOpen,
    onClose,
    budgetConfigs,
    onBudgetUpdate,
    currentUserId,
    currentUserName,
}: BudgetManagementModalProps) {
    const [selectedDepartment, setSelectedDepartment] = useState<FundRequestDepartment>('events');
    const [budgetAmount, setBudgetAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Manual adjustments
    const [adjustments, setAdjustments] = useState<BudgetAdjustment[]>([]);
    const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(false);
    const [newAdjustmentAmount, setNewAdjustmentAmount] = useState('');
    const [newAdjustmentDescription, setNewAdjustmentDescription] = useState('');
    const [isAddingAdjustment, setIsAddingAdjustment] = useState(false);

    // Load current config when department changes
    useEffect(() => {
        const config = budgetConfigs[selectedDepartment];
        if (config) {
            setBudgetAmount(config.totalBudget.toString());
            const date = config.startDate?.toDate ? config.startDate.toDate() : null;
            setStartDate(formatDateForInput(date));
        } else {
            setBudgetAmount('');
            setStartDate('');
        }
    }, [selectedDepartment, budgetConfigs]);

    // Load adjustments when department changes
    useEffect(() => {
        if (!isOpen) return;

        const loadAdjustments = async () => {
            setIsLoadingAdjustments(true);
            try {
                const adjustmentsRef = collection(db, 'budgetConfig', selectedDepartment, 'adjustments');
                const q = query(adjustmentsRef, orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                const adjustmentsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as BudgetAdjustment[];
                setAdjustments(adjustmentsData);
            } catch (error) {
                console.error('Error loading adjustments:', error);
            } finally {
                setIsLoadingAdjustments(false);
            }
        };

        loadAdjustments();
    }, [selectedDepartment, isOpen]);

    const handleSaveBudget = async () => {
        if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
            showToast.error('Please enter a valid budget amount');
            return;
        }

        if (!startDate) {
            showToast.error('Please select a start date');
            return;
        }

        setIsSaving(true);
        try {
            const budgetConfig: BudgetConfig = {
                department: selectedDepartment,
                totalBudget: parseFloat(budgetAmount),
                startDate: Timestamp.fromDate(new Date(startDate)),
                updatedAt: Timestamp.now(),
                updatedBy: currentUserId,
                updatedByName: currentUserName,
            };

            await setDoc(doc(db, 'budgetConfig', selectedDepartment), budgetConfig);
            showToast.success(`${DEPARTMENT_LABELS[selectedDepartment]} budget updated successfully`);
            onBudgetUpdate();
        } catch (error) {
            console.error('Error saving budget:', error);
            showToast.error('Failed to save budget configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddAdjustment = async () => {
        if (!newAdjustmentAmount || parseFloat(newAdjustmentAmount) <= 0) {
            showToast.error('Please enter a valid adjustment amount');
            return;
        }

        if (!newAdjustmentDescription.trim()) {
            showToast.error('Please enter a description for the adjustment');
            return;
        }

        setIsAddingAdjustment(true);
        try {
            const adjustmentData = {
                department: selectedDepartment,
                amount: parseFloat(newAdjustmentAmount),
                description: newAdjustmentDescription.trim(),
                createdAt: Timestamp.now(),
                createdBy: currentUserId,
                createdByName: currentUserName,
            };

            const adjustmentsRef = collection(db, 'budgetConfig', selectedDepartment, 'adjustments');
            await addDoc(adjustmentsRef, adjustmentData);

            // Refresh adjustments
            const q = query(adjustmentsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const adjustmentsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as BudgetAdjustment[];
            setAdjustments(adjustmentsData);

            // Clear form
            setNewAdjustmentAmount('');
            setNewAdjustmentDescription('');

            showToast.success('Budget adjustment added');
            onBudgetUpdate();
        } catch (error) {
            console.error('Error adding adjustment:', error);
            showToast.error('Failed to add budget adjustment');
        } finally {
            setIsAddingAdjustment(false);
        }
    };

    const handleDeleteAdjustment = async (adjustmentId: string) => {
        try {
            await deleteDoc(doc(db, 'budgetConfig', selectedDepartment, 'adjustments', adjustmentId));
            setAdjustments((prev) => prev.filter((a) => a.id !== adjustmentId));
            showToast.success('Adjustment deleted');
            onBudgetUpdate();
        } catch (error) {
            console.error('Error deleting adjustment:', error);
            showToast.error('Failed to delete adjustment');
        }
    };

    const totalAdjustments = adjustments.reduce((sum, a) => sum + a.amount, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader>Budget Management</ModalHeader>

                <ModalBody>
                    {/* Department Tabs */}
                    <Tabs
                        selectedKey={selectedDepartment}
                        onSelectionChange={(key) => setSelectedDepartment(key as FundRequestDepartment)}
                        size="sm"
                    >
                        <Tab key="events" title="Events" />
                        <Tab key="projects" title="Projects" />
                        <Tab key="internal" title="Internal" />
                    </Tabs>

                    <div className="space-y-6 mt-4">
                        {/* Budget Configuration */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-foreground">Budget Configuration</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Total Budget"
                                    placeholder="5000.00"
                                    value={budgetAmount}
                                    onValueChange={(value) => {
                                        const sanitized = value.replace(/[^0-9.]/g, '');
                                        setBudgetAmount(sanitized);
                                    }}
                                    startContent={<DollarSign className="w-4 h-4 text-default-400" />}
                                    type="text"
                                    inputMode="decimal"
                                />
                                <Input
                                    label="Budget Start Date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    startContent={<Calendar className="w-4 h-4 text-default-400" />}
                                />
                            </div>
                            <Button
                                color="primary"
                                onPress={handleSaveBudget}
                                isLoading={isSaving}
                                startContent={<Save className="w-4 h-4" />}
                            >
                                Save Budget Configuration
                            </Button>
                        </div>

                        <Divider />

                        {/* Manual Adjustments */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-foreground">Manual Adjustments</h3>
                                {totalAdjustments > 0 && (
                                    <span className="text-sm text-warning-600">
                                        Total: {formatCurrency(totalAdjustments)}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-default-500">
                                Add external expenses that should count against the budget but don't have fund requests.
                            </p>

                            {/* Add new adjustment */}
                            <div className="flex gap-2 items-end">
                                <Input
                                    label="Amount"
                                    placeholder="100.00"
                                    value={newAdjustmentAmount}
                                    onValueChange={(value) => {
                                        const sanitized = value.replace(/[^0-9.]/g, '');
                                        setNewAdjustmentAmount(sanitized);
                                    }}
                                    startContent={<DollarSign className="w-4 h-4 text-default-400" />}
                                    className="w-32"
                                    size="sm"
                                />
                                <Input
                                    label="Description"
                                    placeholder="External expense description"
                                    value={newAdjustmentDescription}
                                    onValueChange={setNewAdjustmentDescription}
                                    className="flex-1"
                                    size="sm"
                                />
                                <Button
                                    isIconOnly
                                    size="sm"
                                    color="primary"
                                    onPress={handleAddAdjustment}
                                    isLoading={isAddingAdjustment}
                                    aria-label="Add adjustment"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Existing adjustments */}
                            {isLoadingAdjustments ? (
                                <div className="flex justify-center py-4">
                                    <Spinner size="sm" />
                                </div>
                            ) : adjustments.length > 0 ? (
                                <div className="space-y-2">
                                    {adjustments.map((adjustment) => (
                                        <Card key={adjustment.id} className="border border-default-200">
                                            <CardBody className="p-3 flex flex-row items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{adjustment.description}</p>
                                                    <p className="text-xs text-default-400">
                                                        Added by {adjustment.createdByName || 'Unknown'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-warning-600">
                                                        {formatCurrency(adjustment.amount)}
                                                    </span>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="light"
                                                        color="danger"
                                                        onPress={() => handleDeleteAdjustment(adjustment.id)}
                                                        aria-label="Delete adjustment"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-default-400 text-center py-4">
                                    No manual adjustments added yet.
                                </p>
                            )}
                        </div>
                    </div>
                </ModalBody>

                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
