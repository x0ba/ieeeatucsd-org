import React from 'react';
import { Input, Textarea, Select, SelectItem } from '@heroui/react';
import { Building, CreditCard, FileText } from 'lucide-react';
import { DEPARTMENTS, PAYMENT_METHODS, type ReimbursementFormData } from '../types';

interface BasicInfoStepProps {
    formData: ReimbursementFormData;
    setFormData: (data: ReimbursementFormData) => void;
    errors: Record<string, string>;
}

export default function BasicInfoStep({ formData, setFormData, errors }: BasicInfoStepProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Basic Information</h3>
                <p className="text-sm text-gray-600">
                    Provide the core details about your reimbursement request.
                </p>
            </div>

            <div className="space-y-4">
                {/* Title */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        Request Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Brief description of the reimbursement"
                        startContent={<FileText className="w-4 h-4 text-gray-400" aria-hidden="true" />}
                        isInvalid={!!errors.title}
                        errorMessage={errors.title}
                        size="lg"
                        aria-label="Request title"
                        aria-required="true"
                    />
                </div>

                {/* Department and Payment Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                            Department <span className="text-red-500">*</span>
                        </label>
                        <Select
                            id="department"
                            selectedKeys={formData.department ? [formData.department] : []}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as string;
                                setFormData({ ...formData, department: value });
                            }}
                            placeholder="Select department"
                            startContent={<Building className="w-4 h-4 text-gray-400" aria-hidden="true" />}
                            isInvalid={!!errors.department}
                            errorMessage={errors.department}
                            size="lg"
                            aria-label="Department"
                            aria-required="true"
                        >
                            {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept.value} value={dept.value}>
                                    {dept.label}
                                </SelectItem>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Method <span className="text-red-500">*</span>
                        </label>
                        <Select
                            id="paymentMethod"
                            selectedKeys={formData.paymentMethod ? [formData.paymentMethod] : []}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as string;
                                setFormData({ ...formData, paymentMethod: value });
                            }}
                            placeholder="How did you pay?"
                            startContent={<CreditCard className="w-4 h-4 text-gray-400" aria-hidden="true" />}
                            isInvalid={!!errors.paymentMethod}
                            errorMessage={errors.paymentMethod}
                            size="lg"
                            aria-label="Payment method"
                            aria-required="true"
                        >
                            {PAYMENT_METHODS.map((method) => (
                                <SelectItem key={method} value={method}>
                                    {method}
                                </SelectItem>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Business Purpose */}
                <div>
                    <label htmlFor="businessPurpose" className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Purpose <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                        Explain how this expense relates to the organization and benefits IEEE UCSD
                    </p>
                    <Textarea
                        id="businessPurpose"
                        value={formData.businessPurpose}
                        onChange={(e) => setFormData({ ...formData, businessPurpose: e.target.value })}
                        placeholder="e.g., Workshop materials for Arduino programming event, food for general body meeting, conference registration to represent IEEE UCSD..."
                        minRows={4}
                        isInvalid={!!errors.businessPurpose}
                        errorMessage={errors.businessPurpose}
                        size="lg"
                        aria-label="Organization purpose"
                        aria-required="true"
                    />
                </div>

                {/* Additional Info (Optional) */}
                <div>
                    <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Information <span className="text-gray-400">(Optional)</span>
                    </label>
                    <Textarea
                        id="additionalInfo"
                        value={formData.additionalInfo}
                        onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                        placeholder="Any other relevant details..."
                        minRows={3}
                        size="lg"
                        aria-label="Additional information (optional)"
                    />
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">Next Step: Receipt Upload</h4>
                        <p className="text-sm text-blue-700">
                            After completing this step, you'll be able to upload receipt images and use AI to automatically extract information.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

