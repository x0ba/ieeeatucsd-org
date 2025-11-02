import React, { useState } from 'react';
import { Button, Input, Textarea, Select, SelectItem } from '@heroui/react';
import { Edit2, Receipt, DollarSign, Calendar, Building, CreditCard, FileText, MapPin, Package } from 'lucide-react';
import { DEPARTMENTS, PAYMENT_METHODS, EXPENSE_CATEGORIES, type ReimbursementFormData, type ReimbursementReceipt } from '../types';

interface ReviewStepProps {
    formData: ReimbursementFormData;
    receipts: ReimbursementReceipt[];
    setFormData: (data: ReimbursementFormData) => void;
    setReceipts: (receipts: ReimbursementReceipt[]) => void;
    onBack: () => void;
}

export default function ReviewStep({ formData, receipts, setFormData, setReceipts, onBack }: ReviewStepProps) {
    const [editingBasicInfo, setEditingBasicInfo] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState<string | null>(null);

    const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0);

    const updateReceipt = (id: string, updates: Partial<ReimbursementReceipt>) => {
        setReceipts(receipts.map(receipt =>
            receipt.id === id ? { ...receipt, ...updates } : receipt
        ));
    };

    const updateLineItem = (receiptId: string, itemId: string, field: string, value: any) => {
        setReceipts(receipts.map(receipt => {
            if (receipt.id === receiptId) {
                return {
                    ...receipt,
                    lineItems: receipt.lineItems.map(item =>
                        item.id === itemId ? { ...item, [field]: value } : item
                    )
                };
            }
            return receipt;
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Review & Confirm</h3>
                <p className="text-sm text-gray-600">
                    Review all information before submitting. You can edit any field if needed.
                </p>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">Total Reimbursement Amount</p>
                        <p className="text-3xl font-bold text-blue-700">${totalAmount.toFixed(2)}</p>
                        <p className="text-sm text-blue-600 mt-1">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <DollarSign className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
            </div>

            {/* Basic Information Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-900">Basic Information</h4>
                    <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        onClick={() => setEditingBasicInfo(!editingBasicInfo)}
                        startContent={<Edit2 className="w-3 h-3" />}
                    >
                        {editingBasicInfo ? 'Done' : 'Edit'}
                    </Button>
                </div>

                {editingBasicInfo ? (
                    <div className="space-y-4">
                        <Input
                            label="Title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                        <Select
                            label="Department"
                            selectedKeys={formData.department ? [formData.department] : []}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as string;
                                setFormData({ ...formData, department: value });
                            }}
                        >
                            {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept.value}>{dept.label}</SelectItem>
                            ))}
                        </Select>
                        <Select
                            label="Payment Method"
                            selectedKeys={formData.paymentMethod ? [formData.paymentMethod] : []}
                            onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as string;
                                setFormData({ ...formData, paymentMethod: value });
                            }}
                        >
                            {PAYMENT_METHODS.map((method) => (
                                <SelectItem key={method}>{method}</SelectItem>
                            ))}
                        </Select>
                        <Textarea
                            label="Business Purpose"
                            value={formData.businessPurpose}
                            onChange={(e) => setFormData({ ...formData, businessPurpose: e.target.value })}
                            minRows={3}
                        />
                        <Textarea
                            label="Additional Information"
                            value={formData.additionalInfo}
                            onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                            minRows={2}
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-gray-700">Title</p>
                                <p className="text-sm text-gray-900">{formData.title}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-gray-700">Department</p>
                                <p className="text-sm text-gray-900 capitalize">{formData.department}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-gray-700">Payment Method</p>
                                <p className="text-sm text-gray-900">{formData.paymentMethod}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-gray-700">Business Purpose</p>
                                <p className="text-sm text-gray-900">{formData.businessPurpose}</p>
                            </div>
                        </div>
                        {formData.additionalInfo && (
                            <div className="flex items-start space-x-3">
                                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Additional Information</p>
                                    <p className="text-sm text-gray-900">{formData.additionalInfo}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Receipts Section */}
            <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900">Receipts</h4>
                {receipts.map((receipt, index) => (
                    <div key={receipt.id} className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Receipt className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h5 className="text-sm font-semibold text-gray-900">Receipt {index + 1}</h5>
                                    <p className="text-xs text-gray-500">{receipt.vendorName}</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="light"
                                color="primary"
                                onClick={() => setEditingReceipt(editingReceipt === receipt.id ? null : receipt.id)}
                                startContent={<Edit2 className="w-3 h-3" />}
                            >
                                {editingReceipt === receipt.id ? 'Done' : 'Edit'}
                            </Button>
                        </div>

                        {editingReceipt === receipt.id ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Vendor"
                                        value={receipt.vendorName}
                                        onChange={(e) => updateReceipt(receipt.id, { vendorName: e.target.value })}
                                    />
                                    <Input
                                        label="Date"
                                        type="date"
                                        value={receipt.dateOfPurchase}
                                        onChange={(e) => updateReceipt(receipt.id, { dateOfPurchase: e.target.value })}
                                    />
                                </div>
                                <Input
                                    label="Location"
                                    value={receipt.location}
                                    onChange={(e) => updateReceipt(receipt.id, { location: e.target.value })}
                                />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-700">Line Items</p>
                                    {receipt.lineItems.map((item) => (
                                        <div key={item.id} className="grid grid-cols-12 gap-2">
                                            <Input
                                                className="col-span-5"
                                                value={item.description}
                                                onChange={(e) => updateLineItem(receipt.id, item.id, 'description', e.target.value)}
                                                size="sm"
                                            />
                                            <Select
                                                className="col-span-4"
                                                selectedKeys={item.category ? [item.category] : []}
                                                onSelectionChange={(keys) => {
                                                    const value = Array.from(keys)[0] as string;
                                                    updateLineItem(receipt.id, item.id, 'category', value);
                                                }}
                                                size="sm"
                                            >
                                                {EXPENSE_CATEGORIES.map((cat) => (
                                                    <SelectItem key={cat}>{cat}</SelectItem>
                                                ))}
                                            </Select>
                                            <Input
                                                className="col-span-3"
                                                type="number"
                                                value={item.amount.toString()}
                                                onChange={(e) => updateLineItem(receipt.id, item.id, 'amount', parseFloat(e.target.value) || 0)}
                                                startContent={<DollarSign className="w-3 h-3" />}
                                                size="sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Date:</span>
                                        <span className="font-medium">{receipt.dateOfPurchase}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Location:</span>
                                        <span className="font-medium">{receipt.location || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-3">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                                    <div className="space-y-2">
                                        {receipt.lineItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between text-sm">
                                                <div className="flex-1">
                                                    <span className="font-medium text-gray-900">{item.description}</span>
                                                    <span className="block text-xs text-gray-500">{item.category}</span>
                                                </div>
                                                <span className="font-semibold text-gray-900">${item.amount.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span className="font-medium">${receipt.subtotal.toFixed(2)}</span>
                                    </div>
                                    {receipt.tax > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Tax:</span>
                                            <span className="font-medium">${receipt.tax.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {receipt.tip > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Tip:</span>
                                            <span className="font-medium">${receipt.tip.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {receipt.shipping > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Shipping:</span>
                                            <span className="font-medium">${receipt.shipping.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-2 border-t border-gray-200">
                                        <span className="font-semibold text-gray-900">Total:</span>
                                        <span className="font-bold text-green-600">${receipt.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-yellow-900 mb-1">Ready to Submit?</h4>
                        <p className="text-sm text-yellow-700">
                            Please review all information carefully. Once submitted, you won't be able to edit this request.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

