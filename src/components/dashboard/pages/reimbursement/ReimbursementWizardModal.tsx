import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@heroui/react';
import BasicInfoStep from './wizard-steps/BasicInfoStep';
import ReceiptUploadStep from './wizard-steps/ReceiptUploadStep';
import ReviewStep from './wizard-steps/ReviewStep';
import type { ReimbursementFormData, ReimbursementReceipt } from './types';

interface ReimbursementWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

const STEPS = [
    { id: 1, name: 'Basic Information', description: 'Core reimbursement details' },
    { id: 2, name: 'Receipt Upload', description: 'Upload and parse receipts' },
    { id: 3, name: 'Review', description: 'Confirm and submit' }
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
            if (!formData.title.trim()) newErrors.title = 'Title is required';
            if (!formData.department) newErrors.department = 'Department is required';
            if (!formData.paymentMethod) newErrors.paymentMethod = 'Payment method is required';
            if (!formData.businessPurpose.trim()) newErrors.businessPurpose = 'Business purpose is required';
        } else if (currentStep === 2) {
            if (receipts.length === 0) {
                newErrors.receipts = 'At least one receipt is required';
            } else {
                receipts.forEach((receipt, index) => {
                    if (!receipt.vendorName.trim()) {
                        newErrors[`receipt_${index}_vendor`] = 'Vendor name is required';
                    }
                    if (!receipt.dateOfPurchase) {
                        newErrors[`receipt_${index}_date`] = 'Date is required';
                    }
                    if (!receipt.receiptFile?.url) {
                        newErrors[`receipt_${index}_file`] = 'Receipt image is required';
                    }
                    if (receipt.lineItems.length === 0) {
                        newErrors[`receipt_${index}_items`] = 'At least one line item is required';
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
                amount: item.amount
            })),
            receiptFile: receipt.receiptFile?.url,
            notes: receipt.notes,
            subtotal: receipt.subtotal,
            tax: receipt.tax || 0,
            total: receipt.total
        }));

        const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0);

        const reimbursementData = {
            ...formData,
            receipts: formattedReceipts,
            totalAmount,
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Submit Reimbursement Request</h2>
                        <p className="text-sm text-gray-600 mt-1">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <div className="flex items-center">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                                        currentStep > step.id
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : currentStep === step.id
                                            ? 'bg-blue-500 border-blue-500 text-white'
                                            : 'bg-white border-gray-300 text-gray-500'
                                    }`}>
                                        {currentStep > step.id ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <span className="text-sm font-semibold">{step.id}</span>
                                        )}
                                    </div>
                                    <div className="ml-3 hidden md:block">
                                        <p className={`text-sm font-medium ${
                                            currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                                        }`}>
                                            {step.name}
                                        </p>
                                        <p className="text-xs text-gray-500">{step.description}</p>
                                    </div>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-4 ${
                                        currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                                    }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {currentStep === 1 && (
                        <BasicInfoStep
                            formData={formData}
                            setFormData={setFormData}
                            errors={errors}
                        />
                    )}
                    {currentStep === 2 && (
                        <ReceiptUploadStep
                            receipts={receipts}
                            setReceipts={setReceipts}
                            errors={errors}
                            setErrors={setErrors}
                        />
                    )}
                    {currentStep === 3 && (
                        <ReviewStep
                            formData={formData}
                            receipts={receipts}
                            setFormData={setFormData}
                            setReceipts={setReceipts}
                            onBack={() => setCurrentStep(2)}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <Button
                        variant="light"
                        onClick={handleClose}
                        className="text-gray-700"
                    >
                        Cancel
                    </Button>
                    
                    <div className="flex-1" />
                    
                    <div className="flex items-center space-x-3">
                        {currentStep > 1 && (
                            <Button
                                variant="bordered"
                                onClick={handleBack}
                                startContent={<ChevronLeft className="w-4 h-4" />}
                            >
                                Back
                            </Button>
                        )}
                        
                        {currentStep < STEPS.length ? (
                            <Button
                                color="primary"
                                onClick={handleNext}
                                endContent={<ChevronRight className="w-4 h-4" />}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button
                                color="success"
                                onClick={handleSubmit}
                                endContent={<Check className="w-4 h-4" />}
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

