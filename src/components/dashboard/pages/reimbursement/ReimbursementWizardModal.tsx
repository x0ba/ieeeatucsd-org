import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@heroui/react';
import AIWarningStep from '../../shared/AIWarningStep';
import BasicInfoStep from './wizard-steps/BasicInfoStep';
import ReceiptUploadStep from './wizard-steps/ReceiptUploadStep';
import ReviewStep from './wizard-steps/ReviewStep';
import type { ReimbursementFormData, ReimbursementReceipt } from './types';
import { useModalRegistration } from '../../shared/contexts/ModalContext';

interface ReimbursementWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

const STEPS = [
    { id: 1, name: 'Notice', description: 'Important Information' },
    { id: 2, name: 'Basic Information', description: 'Core reimbursement details' },
    { id: 3, name: 'Receipt Upload', description: 'Upload and parse receipts' },
    { id: 4, name: 'Review', description: 'Confirm and submit' }
];

export default function ReimbursementWizardModal({ isOpen, onClose, onSubmit }: ReimbursementWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<ReimbursementFormData>({
        title: '',
        department: '',
        paymentMethod: '',
        additionalInfo: '',
        businessPurpose: ''
    });
    const [receipts, setReceipts] = useState<ReimbursementReceipt[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Register modal with global context
    useModalRegistration('reimbursement-wizard', isOpen);

    const handleNext = () => {
        if (validateCurrentStep()) {
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const validateCurrentStep = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (currentStep === 1) {
            // AI Warning step - no validation needed
            return true;
        } else if (currentStep === 2) {
            if (!formData.title.trim()) newErrors.title = 'Title is required';
            if (!formData.department) newErrors.department = 'Department is required';
            if (!formData.paymentMethod) newErrors.paymentMethod = 'Payment method is required';
            if (!formData.businessPurpose.trim()) newErrors.businessPurpose = 'Business purpose is required';
        } else if (currentStep === 3) {
            if (receipts.length === 0) {
                newErrors.receipts = 'At least one receipt is required';
            } else {
                receipts.forEach((receipt) => {
                    if (!receipt.vendorName.trim()) {
                        newErrors[`receipt_${receipt.id}_vendor`] = 'Vendor name is required';
                    }
                    if (!receipt.dateOfPurchase) {
                        newErrors[`receipt_${receipt.id}_date`] = 'Date is required';
                    }
                    if (!receipt.receiptFile?.url) {
                        newErrors[`receipt_${receipt.id}_file`] = 'Receipt image is required';
                    }
                    if (receipt.lineItems.length === 0) {
                        newErrors[`receipt_${receipt.id}_items`] = 'At least one line item is required';
                    }
                });
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateCurrentStep()) return;

        const formattedReceipts = receipts.map(receipt => ({
            id: receipt.id,
            vendorName: receipt.vendorName,
            location: receipt.location,
            dateOfPurchase: receipt.dateOfPurchase ? new Date(receipt.dateOfPurchase).toISOString() : new Date().toISOString(),
            lineItems: receipt.lineItems.map(item => ({
                id: item.id,
                description: item.description,
                category: item.category,
                amount: item.amount,
                quantity: item.quantity ?? 1
            })),
            receiptFile: receipt.receiptFile?.url,
            notes: receipt.notes,
            subtotal: receipt.subtotal,
            tax: receipt.tax || 0,
            tip: receipt.tip || 0,
            shipping: receipt.shipping || 0,
            total: receipt.total
        }));

        const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0);

        // Use the earliest date from receipts as the main dateOfPurchase, fallback to current date
        const earliestDate = receipts
            .map(receipt => receipt.dateOfPurchase ? new Date(receipt.dateOfPurchase) : new Date())
            .sort((a, b) => a.getTime() - b.getTime())[0];

        const reimbursementData = {
            ...formData,
            receipts: formattedReceipts,
            totalAmount,
            dateOfPurchase: earliestDate.toISOString(),
            status: 'submitted',
            submittedAt: new Date().toISOString()
        };

        onSubmit(reimbursementData);
        handleClose();
    };

    const handleClose = () => {
        setCurrentStep(1);
        setFormData({
            title: '',
            department: '',
            paymentMethod: '',
            additionalInfo: '',
            businessPurpose: ''
        });
        setReceipts([]);
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">New Reimbursement Request</h2>
                        <p className="text-sm text-gray-500 mt-1 font-medium">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                    <div className="relative flex items-start justify-between max-w-4xl mx-auto">
                        <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 -z-0 rounded-full -translate-y-1/2" />
                        <div
                            className="absolute top-5 left-0 h-1 bg-blue-600 transition-all duration-500 ease-out rounded-full -z-0 -translate-y-1/2"
                            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                        />

                        {STEPS.map((step) => (
                            <div key={step.id} className="relative z-10 flex flex-col items-center group">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 transition-all duration-300 ${currentStep > step.id
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20 scale-100'
                                    : currentStep === step.id
                                        ? 'bg-white border-blue-600 text-blue-600 shadow-lg shadow-blue-600/20 scale-110'
                                        : 'bg-white border-gray-200 text-gray-400'
                                    }`}>
                                    {currentStep > step.id ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <span className="text-sm font-bold">{step.id}</span>
                                    )}
                                </div>
                                <div className="mt-3 text-center">
                                    <p className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${currentStep >= step.id ? 'text-blue-900' : 'text-gray-400'
                                        }`}>
                                        {step.name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block font-medium">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                    <div className="max-w-5xl mx-auto">
                        {currentStep === 1 && (
                            <AIWarningStep onNext={handleNext} />
                        )}
                        {currentStep === 2 && (
                            <BasicInfoStep
                                formData={formData}
                                setFormData={setFormData}
                                errors={errors}
                            />
                        )}
                        {currentStep === 3 && (
                            <ReceiptUploadStep
                                receipts={receipts}
                                setReceipts={setReceipts}
                                errors={errors}
                                setErrors={setErrors}
                            />
                        )}
                        {currentStep === 4 && (
                            <ReviewStep
                                formData={formData}
                                receipts={receipts}
                                setFormData={setFormData}
                                setReceipts={setReceipts}
                                onBack={() => setCurrentStep(3)}
                            />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-8 py-6 border-t border-gray-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                    <Button
                        variant="light"
                        onClick={handleClose}
                        className="text-gray-600 font-medium hover:bg-gray-50 px-6"
                    >
                        Cancel
                    </Button>

                    <div className="flex items-center space-x-4">
                        {currentStep > 1 && (
                            <Button
                                variant="bordered"
                                onClick={handleBack}
                                startContent={<ChevronLeft className="w-4 h-4" />}
                                className="border-gray-200 text-gray-700 font-medium hover:bg-gray-50 px-6"
                            >
                                Back
                            </Button>
                        )}

                        {currentStep < STEPS.length ? (
                            <Button
                                color="primary"
                                onClick={handleNext}
                                endContent={<ChevronRight className="w-4 h-4" />}
                                className="bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 px-8 hover:bg-blue-700"
                            >
                                Next Step
                            </Button>
                        ) : (
                            <Button
                                color="success"
                                onClick={handleSubmit}
                                endContent={<Check className="w-4 h-4" />}
                                className="bg-green-600 text-white font-semibold shadow-lg shadow-green-600/20 px-8 hover:bg-green-700"
                            >
                                Submit Request
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

