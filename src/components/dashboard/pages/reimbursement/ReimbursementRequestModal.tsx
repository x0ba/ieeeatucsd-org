import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, Plus, DollarSign, Calendar, MapPin, FileText, Building, CreditCard, CheckCircle, Receipt, Camera, Bot, AlertTriangle } from 'lucide-react';
import { Button, Input, Textarea, Select, SelectItem, Tabs, Tab } from '@heroui/react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../../../../firebase/client';
import type { Receipt as ReceiptType, LineItem } from '../../shared/types/firestore';

interface ReimbursementReceipt {
    id: string;
    vendorName: string;
    location: string;
    dateOfPurchase: string; // Date string for form input
    lineItems: (LineItem & { tempId?: string })[];
    receiptFile?: { url: string; name: string; size: number; type: string };
    notes?: string;
    subtotal: number;
    tax?: number;
    total: number;
}

interface AIReceiptResponse {
    vendorName: string;
    location: string;
    dateOfPurchase: string;
    lineItems: {
        description: string;
        category: string;
        amount: number;
    }[];
    tax?: number;
    total: number;
}

interface ReimbursementRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

const DEPARTMENTS = [
    { value: 'general', label: 'General' },
    { value: 'internal', label: 'Internal' },
    { value: 'projects', label: 'Projects' },
    { value: 'events', label: 'Events' },
    { value: 'other', label: 'Other' }
];

const EXPENSE_CATEGORIES = [
    'Food & Beverages',
    'Transportation',
    'Materials & Supplies',
    'Registration Fees',
    'Equipment',
    'Software/Subscriptions',
    'Printing/Marketing',
    'Other'
];

const PAYMENT_METHODS = [
    'Personal Credit Card',
    'Personal Debit Card',
    'Cash',
    'Venmo',
    'Zelle',
    'PayPal',
    'Check',
    'Other'
];

export default function ReimbursementRequestModal({ isOpen, onClose, onSubmit }: ReimbursementRequestModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        paymentMethod: '',
        additionalInfo: '',
        businessPurpose: ''
    });

    const [receipts, setReceipts] = useState<ReimbursementReceipt[]>([
        {
            id: '1',
            vendorName: '',
            location: '',
            dateOfPurchase: null as any,
            lineItems: [{ id: '1', description: '', category: '', amount: 0 }],
            notes: '',
            subtotal: 0,
            tax: 0,
            total: 0
        }
    ]);

    const [activeReceiptTab, setActiveReceiptTab] = useState('1');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
    const [parsingReceipt, setParsingReceipt] = useState(false);
    const [aiResponses, setAiResponses] = useState<Record<string, string>>({});
    const [parseSuccess, setParseSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addReceipt = () => {
        const newReceiptId = Date.now().toString();
        const newReceipt: ReimbursementReceipt = {
            id: newReceiptId,
            vendorName: '',
            location: '',
            dateOfPurchase: null as any,
            lineItems: [{ id: '1', description: '', category: '', amount: 0 }],
            notes: '',
            subtotal: 0,
            tax: 0,
            total: 0
        };
        setReceipts([...receipts, newReceipt]);
        setActiveReceiptTab(newReceiptId);
    };

    const removeReceipt = (id: string) => {
        if (receipts.length > 1) {
            setReceipts(receipts.filter(receipt => receipt.id !== id));
            // Switch to first remaining receipt if current active is removed
            if (activeReceiptTab === id) {
                const remainingReceipts = receipts.filter(r => r.id !== id);
                setActiveReceiptTab(remainingReceipts[0]?.id || '1');
            }
        }
    };

    const updateReceipt = (id: string, field: keyof ReimbursementReceipt, value: any) => {
        setReceipts(receipts.map(receipt =>
            receipt.id === id ? { ...receipt, [field]: value } : receipt
        ));
    };

    const addLineItem = (receiptId: string) => {
        const newLineItem = { id: Date.now().toString(), description: '', category: '', amount: 0 };
        setReceipts(receipts.map(receipt =>
            receipt.id === receiptId
                ? { ...receipt, lineItems: [...receipt.lineItems, newLineItem] }
                : receipt
        ));
    };

    const removeLineItem = (receiptId: string, lineItemId: string) => {
        setReceipts(receipts.map(receipt =>
            receipt.id === receiptId
                ? {
                    ...receipt,
                    lineItems: receipt.lineItems.length > 1
                        ? receipt.lineItems.filter(item => item.id !== lineItemId)
                        : receipt.lineItems
                }
                : receipt
        ));
    };

    const updateLineItem = (receiptId: string, lineItemId: string, field: keyof LineItem, value: any) => {
        setReceipts(receipts.map(receipt =>
            receipt.id === receiptId
                ? {
                    ...receipt,
                    lineItems: receipt.lineItems.map(item =>
                        item.id === lineItemId ? { ...item, [field]: value } : item
                    )
                }
                : receipt
        ));
    };

    const handleReceiptUpload = async (receiptId: string, file: File) => {
        try {
            setUploadingFiles(prev => new Set(prev).add(receiptId));

            // Upload file to Firebase Storage
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `reimbursements/${auth.currentUser?.uid}/${fileName}`);

            const uploadTask = uploadBytesResumable(storageRef, file);
            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed', null, reject, () => resolve(uploadTask.snapshot.ref));
            });

            const downloadURL = await getDownloadURL(storageRef);
            console.log('Firebase Storage upload completed. Download URL:', downloadURL);

            // Update receipt with the download URL and original file info
            const receiptData = {
                url: downloadURL,
                name: file.name,
                size: file.size,
                type: file.type
            };
            console.log('Updating receipt file data:', receiptData);
            updateReceipt(receiptId, 'receiptFile', receiptData);

            setUploadingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(receiptId);
                return newSet;
            });

        } catch (error) {
            console.error('Error uploading file:', error);
            setErrors(prev => ({
                ...prev,
                [`receipt_${receiptId}_file`]: 'Failed to upload file. Please try again.'
            }));
            setUploadingFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(receiptId);
                return newSet;
            });
        }
    };

    const parseReceiptWithAI = async (receiptId: string, jsonString: string) => {
        try {
            setParsingReceipt(true);

            // Parse the JSON response from AI
            let parsedData: AIReceiptResponse;
            try {
                parsedData = JSON.parse(jsonString);
            } catch (parseError) {
                throw new Error('Invalid JSON format. Please check your AI response and try again.');
            }

            // Validate required fields
            if (!parsedData.vendorName || !parsedData.location || !parsedData.dateOfPurchase || !parsedData.lineItems || !Array.isArray(parsedData.lineItems)) {
                throw new Error('Missing required fields. Please ensure the AI response includes vendorName, location, dateOfPurchase, and lineItems array.');
            }

            // Validate date format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(parsedData.dateOfPurchase)) {
                throw new Error('Invalid date format. Please use YYYY-MM-DD format for dateOfPurchase.');
            }

            // Validate line items
            parsedData.lineItems.forEach((item, index: number) => {
                if (!item.description || !item.category || typeof item.amount !== 'number') {
                    throw new Error(`Invalid line item ${index + 1}. Each item must have description, category, and amount.`);
                }
            });

            // Update receipt with parsed data
            setReceipts(receipts.map(receipt =>
                receipt.id === receiptId
                    ? {
                        ...receipt,
                        vendorName: parsedData.vendorName,
                        location: parsedData.location,
                        dateOfPurchase: parsedData.dateOfPurchase,
                        lineItems: parsedData.lineItems.map((item: any, index: number) => ({
                            id: `parsed_${index + 1}`,
                            description: item.description,
                            category: item.category,
                            amount: item.amount
                        })),
                        tax: parsedData.tax || 0,
                        total: parsedData.total,
                        subtotal: parsedData.total - (parsedData.tax || 0)
                    } as ReimbursementReceipt
                    : receipt
            ));

            // Clear any previous parse errors and AI response
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`receipt_${receiptId}_parse`];
                return newErrors;
            });

            // Clear the AI response text
            setAiResponses(prev => {
                const newResponses = { ...prev };
                delete newResponses[receiptId];
                return newResponses;
            });

            // Show success message
            setParseSuccess(receiptId);
            setTimeout(() => setParseSuccess(null), 3000);

        } catch (error) {
            console.error('Error parsing receipt:', error);
            setErrors(prev => ({
                ...prev,
                [`receipt_${receiptId}_parse`]: error instanceof Error ? error.message : 'Failed to parse receipt. Please check the format and try again.'
            }));
        } finally {
            setParsingReceipt(false);
        }
    };

    const getTotalAmount = () => {
        return receipts.reduce((total, receipt) => total + (receipt.total || 0), 0);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.department) newErrors.department = 'Department is required';
        if (!formData.paymentMethod) newErrors.paymentMethod = 'Payment method is required';
        if (!formData.businessPurpose.trim()) newErrors.businessPurpose = 'Business purpose is required';

        receipts.forEach((receipt, receiptIndex) => {
            if (!receipt.vendorName.trim()) newErrors[`receipt_${receipt.id}_vendor`] = 'Vendor name is required';
            if (!receipt.dateOfPurchase) newErrors[`receipt_${receipt.id}_date`] = 'Date of purchase is required';

            receipt.lineItems.forEach((item, itemIndex) => {
                if (!item.description.trim()) newErrors[`receipt_${receipt.id}_item_${item.id}_description`] = 'Description is required';
                if (!item.category) newErrors[`receipt_${receipt.id}_item_${item.id}_category`] = 'Category is required';
                if (!item.amount || item.amount <= 0) newErrors[`receipt_${receipt.id}_item_${item.id}_amount`] = 'Valid amount is required';
            });

            if (!receipt.receiptFile || !receipt.receiptFile.url) newErrors[`receipt_${receipt.id}_file`] = 'Receipt image is required';
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        // Convert receipts to proper format for Firestore
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

        const reimbursementData = {
            ...formData,
            receipts: formattedReceipts,
            totalAmount: getTotalAmount(),
            status: 'submitted',
            submittedAt: new Date().toISOString()
        };

        onSubmit(reimbursementData);
        onClose();

        // Reset form
        setFormData({
            title: '',
            department: '',
            paymentMethod: '',
            additionalInfo: '',
            businessPurpose: ''
        });
        setReceipts([{
            id: '1',
            vendorName: '',
            location: '',
            dateOfPurchase: null as any,
            lineItems: [{ id: '1', description: '', category: '', amount: 0 }],
            notes: '',
            subtotal: 0,
            tax: 0,
            total: 0
        }]);
        setActiveReceiptTab('1');
        setErrors({});
        setAiResponses({});
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Submit Reimbursement Request</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label htmlFor="title" className="text-sm font-medium text-gray-700">
                                Request Title <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Brief description of the reimbursement"
                                className={errors.title ? 'border-red-500' : ''}
                            />
                            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                        </div>

                        <div>
                            <label htmlFor="department" className="text-sm font-medium text-gray-700">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <Select
                                selectedKeys={formData.department ? [formData.department] : []}
                                onSelectionChange={(keys) => setFormData({ ...formData, department: Array.from(keys)[0] as string })}
                                placeholder="Select department"
                                className={errors.department ? 'border-red-500' : ''}
                            >
                                {DEPARTMENTS.map((dept) => (
                                    <SelectItem key={dept.value}>{dept.label}</SelectItem>
                                ))}
                            </Select>
                            {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
                        </div>

                        <div>
                            <label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">
                                Payment Method <span className="text-red-500">*</span>
                            </label>
                            <Select
                                selectedKeys={formData.paymentMethod ? [formData.paymentMethod] : []}
                                onSelectionChange={(keys) => setFormData({ ...formData, paymentMethod: Array.from(keys)[0] as string })}
                                placeholder="How did you pay?"
                                className={errors.paymentMethod ? 'border-red-500' : ''}
                            >
                                {PAYMENT_METHODS.map((method) => (
                                    <SelectItem key={method}>{method}</SelectItem>
                                ))}
                            </Select>
                            {errors.paymentMethod && <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="businessPurpose" className="text-sm font-medium text-gray-700">
                                Organization Purpose <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2">Explain how this expense relates to the organization and benefits IEEE UCSD</p>
                            <Textarea
                                id="businessPurpose"
                                value={formData.businessPurpose}
                                onChange={(e) => setFormData({ ...formData, businessPurpose: e.target.value })}
                                placeholder="e.g., Workshop materials for Arduino programming event, food for general body meeting, conference registration to represent IEEE UCSD..."
                                rows={3}
                                className={errors.businessPurpose ? 'border-red-500' : ''}
                            />
                            {errors.businessPurpose && <p className="mt-1 text-sm text-red-600">{errors.businessPurpose}</p>}
                        </div>
                    </div>

                    {/* Receipts Section with Tabs */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Receipts</h3>
                                <p className="text-sm text-gray-600 mt-1">Add receipts for your expenses. Each receipt can have multiple line items.</p>
                            </div>
                            <Button
                                type="button"
                                onClick={addReceipt}
                                variant="bordered"
                                size="sm"
                                className="flex items-center space-x-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Receipt</span>
                            </Button>
                        </div>

                        <Tabs
                            selectedKey={activeReceiptTab}
                            onSelectionChange={(key) => setActiveReceiptTab(key as string)}
                            className="w-full"
                        >
                            {receipts.map((receipt, index) => (
                                <Tab
                                    key={receipt.id}
                                    title={
                                        <div className="flex items-center space-x-2">
                                            <Receipt className="w-4 h-4" />
                                            <span>Receipt {index + 1}</span>
                                            {receipts.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeReceipt(receipt.id);
                                                    }}
                                                    className="ml-2 text-red-500 hover:text-red-700"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    }
                                >
                                    <div className="p-4 border border-gray-200 rounded-lg mt-4">
                                        {/* Receipt Header Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">
                                                    Vendor/Merchant <span className="text-red-500">*</span>
                                                </label>
                                                <Input
                                                    value={receipt.vendorName}
                                                    onChange={(e) => updateReceipt(receipt.id, 'vendorName', e.target.value)}
                                                    placeholder="e.g., Amazon, Target, Starbucks"
                                                    className={errors[`receipt_${receipt.id}_vendor`] ? 'border-red-500' : ''}
                                                />
                                                {errors[`receipt_${receipt.id}_vendor`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`receipt_${receipt.id}_vendor`]}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium text-gray-700">
                                                    Date of Purchase <span className="text-red-500">*</span>
                                                </label>
                                                <Input
                                                    type="date"
                                                    value={receipt.dateOfPurchase || ''}
                                                    onChange={(e) => updateReceipt(receipt.id, 'dateOfPurchase', e.target.value)}
                                                    className={errors[`receipt_${receipt.id}_date`] ? 'border-red-500' : ''}
                                                />
                                                {errors[`receipt_${receipt.id}_date`] && (
                                                    <p className="mt-1 text-sm text-red-600">{errors[`receipt_${receipt.id}_date`]}</p>
                                                )}
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Location
                                                </label>
                                                <Input
                                                    value={receipt.location}
                                                    onChange={(e) => updateReceipt(receipt.id, 'location', e.target.value)}
                                                    placeholder="Where the purchase was made"
                                                />
                                            </div>
                                        </div>

                                        {/* AI Receipt Parser */}
                                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-2">
                                                    <Bot className="w-5 h-5 text-blue-600" />
                                                    <span className="font-medium text-blue-900">AI Receipt Parser</span>
                                                </div>
                                                {parsingReceipt && (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                        <span className="text-sm text-blue-600">Parsing...</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Step 1: Copy Prompt */}
                                            <div className="mb-4">
                                                <h5 className="text-sm font-medium text-blue-900 mb-2">Step 1: Copy this prompt</h5>
                                                <div className="bg-white border border-blue-200 rounded p-3 text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
                                                    <p className="mb-2">Please analyze this receipt image and extract the following information in JSON format:</p>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        <li>vendorName: The business/store name</li>
                                                        <li>location: The full address of the business</li>
                                                        <li>dateOfPurchase: The purchase date (YYYY-MM-DD format)</li>
                                                        <li>lineItems: Array of items with description, category (choose from: Food & Beverages, Transportation, Materials & Supplies, Registration Fees, Equipment, Software/Subscriptions, Printing/Marketing, Other), and amount</li>
                                                        <li>tax: Total tax amount (0 if none)</li>
                                                        <li>total: Total amount paid</li>
                                                    </ul>
                                                    <p className="mt-2">Return only valid JSON with this exact structure:</p>
                                                    <p className="mt-1 font-semibold">{"{"}</p>
                                                    <p className="ml-4">"vendorName": "Business Name",</p>
                                                    <p className="ml-4">"location": "Full Address",</p>
                                                    <p className="ml-4">"dateOfPurchase": "YYYY-MM-DD",</p>
                                                    <p className="ml-4">"lineItems": [{"{"}"description": "Item description", "category": "Category", "amount": 0.00{"}"}],</p>
                                                    <p className="ml-4">"tax": 0.00,</p>
                                                    <p className="ml-4">"total": 0.00</p>
                                                    <p className="font-semibold">{"}"}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const prompt = `Please analyze this receipt image and extract the following information in JSON format:

- vendorName: The business/store name
- location: The full address of the business  
- dateOfPurchase: The purchase date (YYYY-MM-DD format)
- lineItems: Array of items with description, category (choose from: Food & Beverages, Transportation, Materials & Supplies, Registration Fees, Equipment, Software/Subscriptions, Printing/Marketing, Other), and amount
- tax: Total tax amount (0 if none)
- total: Total amount paid

Return only valid JSON with this exact structure:
{
  "vendorName": "Business Name",
  "location": "Full Address", 
  "dateOfPurchase": "YYYY-MM-DD",
  "lineItems": [{"description": "Item description", "category": "Category", "amount": 0.00}],
  "tax": 0.00,
  "total": 0.00
}`;
                                                        navigator.clipboard.writeText(prompt);
                                                        // Could add a toast notification here
                                                    }}
                                                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                                >
                                                    Copy Prompt
                                                </button>
                                            </div>

                                            {/* Step 2: Upload and Get AI Response */}
                                            <div className="mb-4">
                                                <h5 className="text-sm font-medium text-blue-900 mb-2">Step 2: Use AI to analyze your receipt</h5>
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <label className="flex items-center space-x-2 cursor-pointer">
                                                        <Camera className="w-4 h-4 text-blue-600" />
                                                        <span className="text-sm text-blue-600 hover:text-blue-800">Upload Receipt Image</span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    handleReceiptUpload(receipt.id, file);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    <span className="text-xs text-gray-500">Upload your receipt to attach it to this reimbursement</span>
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    1. Go to ChatGPT, Claude, or another AI tool<br />
                                                    2. Paste the prompt above<br />
                                                    3. Upload your receipt image to the AI<br />
                                                    4. Copy the JSON response<br />
                                                    5. Paste it below
                                                </p>
                                            </div>

                                            {/* Step 3: Paste AI Response */}
                                            <div>
                                                <h5 className="text-sm font-medium text-blue-900 mb-2">Step 3: Paste the AI response</h5>
                                                <Textarea
                                                    value={aiResponses[receipt.id] || ''}
                                                    placeholder='Paste the JSON response from AI here (e.g., {"vendorName": "Starbucks", "location": "123 Main St", ...})'
                                                    rows={6}
                                                    className="font-mono text-xs"
                                                    onChange={(e) => {
                                                        const jsonStr = e.target.value;
                                                        setAiResponses(prev => ({ ...prev, [receipt.id]: jsonStr }));

                                                        if (jsonStr.trim()) {
                                                            try {
                                                                parseReceiptWithAI(receipt.id, jsonStr.trim());
                                                            } catch (error) {
                                                                // Error will be shown in the parse function
                                                            }
                                                        }
                                                    }}
                                                />
                                                {parseSuccess === receipt.id && (
                                                    <div className="flex items-center space-x-2 text-green-600 mt-2">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="text-sm">Receipt parsed successfully! Form fields have been populated.</span>
                                                    </div>
                                                )}
                                                {errors[`receipt_${receipt.id}_parse`] && (
                                                    <div className="flex items-center space-x-2 text-red-600 mt-2">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        <span className="text-sm">{errors[`receipt_${receipt.id}_parse`]}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Receipt Upload */}
                                        <div className="mb-6">
                                            <label className="text-sm font-medium text-gray-700">
                                                Receipt Image <span className="text-red-500">*</span>
                                            </label>
                                            <div
                                                className={`mt-1 border-2 border-dashed rounded-md transition-colors h-32 ${receipt.receiptFile
                                                    ? 'border-green-300 bg-green-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                                    }`}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const files = e.dataTransfer.files;
                                                    if (files && files[0]) {
                                                        handleReceiptUpload(receipt.id, files[0]);
                                                    }
                                                }}
                                            >
                                                {uploadingFiles.has(receipt.id) ? (
                                                    <div className="h-full flex items-center justify-center">
                                                        <div className="text-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                                            <p className="text-sm text-blue-600">Uploading...</p>
                                                        </div>
                                                    </div>
                                                ) : receipt.receiptFile ? (
                                                    <div className="h-full flex items-center justify-center">
                                                        <div className="text-center">
                                                            <div className="flex items-center justify-center mb-2">
                                                                <CheckCircle className="w-8 h-8 text-green-600" />
                                                            </div>
                                                            <p className="text-sm font-medium text-green-700">{receipt.receiptFile.name}</p>
                                                            <p className="text-xs text-green-600">Receipt uploaded successfully</p>
                                                            <p className="text-xs text-gray-500">{(receipt.receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                            <div className="mt-2 space-x-2">
                                                                <label
                                                                    htmlFor={`receipt-file-${receipt.id}`}
                                                                    className="inline-block text-xs text-blue-600 hover:text-blue-500 cursor-pointer underline"
                                                                >
                                                                    Replace file
                                                                    <input
                                                                        id={`receipt-file-${receipt.id}`}
                                                                        type="file"
                                                                        className="sr-only"
                                                                        accept="image/*,.pdf"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleReceiptUpload(receipt.id, file);
                                                                        }}
                                                                    />
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateReceipt(receipt.id, 'receiptFile', undefined)}
                                                                    className="text-xs text-red-600 hover:text-red-800 underline"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center">
                                                        <div className="text-center">
                                                            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                                            <div className="flex text-sm text-gray-600">
                                                                <label
                                                                    htmlFor={`receipt-file-${receipt.id}`}
                                                                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                                                                >
                                                                    <span>Upload a file</span>
                                                                    <input
                                                                        id={`receipt-file-${receipt.id}`}
                                                                        type="file"
                                                                        className="sr-only"
                                                                        accept="image/*,.pdf"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleReceiptUpload(receipt.id, file);
                                                                        }}
                                                                    />
                                                                </label>
                                                                <p className="pl-1">or drag and drop</p>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {errors[`receipt_${receipt.id}_file`] && (
                                                <p className="mt-1 text-sm text-red-600">{errors[`receipt_${receipt.id}_file`]}</p>
                                            )}
                                        </div>

                                        {/* Line Items */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-medium text-gray-900">Line Items</h4>
                                                <Button
                                                    type="button"
                                                    onClick={() => addLineItem(receipt.id)}
                                                    variant="bordered"
                                                    size="sm"
                                                    className="flex items-center space-x-1"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    <span>Add Item</span>
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                {receipt.lineItems.map((item, itemIndex) => (
                                                    <div key={item.id} className="p-3 border border-gray-200 rounded-lg">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="font-medium text-gray-900">Item {itemIndex + 1}</span>
                                                            {receipt.lineItems.length > 1 && (
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => removeLineItem(receipt.id, item.id)}
                                                                    variant="light"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-800"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div className="md:col-span-2">
                                                                <label className="text-sm font-medium text-gray-700">
                                                                    Description <span className="text-red-500">*</span>
                                                                </label>
                                                                <Input
                                                                    value={item.description}
                                                                    onChange={(e) => updateLineItem(receipt.id, item.id, 'description', e.target.value)}
                                                                    placeholder="What was purchased"
                                                                    className={errors[`receipt_${receipt.id}_item_${item.id}_description`] ? 'border-red-500' : ''}
                                                                />
                                                                {errors[`receipt_${receipt.id}_item_${item.id}_description`] && (
                                                                    <p className="mt-1 text-sm text-red-600">{errors[`receipt_${receipt.id}_item_${item.id}_description`]}</p>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <label className="text-sm font-medium text-gray-700">
                                                                    Category <span className="text-red-500">*</span>
                                                                </label>
                                                                <Select
                                                                    selectedKeys={item.category ? [item.category] : []}
                                                                    onSelectionChange={(keys) => updateLineItem(receipt.id, item.id, 'category', Array.from(keys)[0] as string)}
                                                                    placeholder="Select category"
                                                                    className={errors[`receipt_${receipt.id}_item_${item.id}_category`] ? 'border-red-500' : ''}
                                                                >
                                                                    {EXPENSE_CATEGORIES.map((category) => (
                                                                        <SelectItem key={category}>{category}</SelectItem>
                                                                    ))}
                                                                </Select>
                                                                {errors[`receipt_${receipt.id}_item_${item.id}_category`] && (
                                                                    <p className="mt-1 text-sm text-red-600">{errors[`receipt_${receipt.id}_item_${item.id}_category`]}</p>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <label className="text-sm font-medium text-gray-700">
                                                                    Amount <span className="text-red-500">*</span>
                                                                </label>
                                                                <div className="relative">
                                                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={item.amount === 0 ? '' : item.amount.toString()}
                                                                        onChange={(e) => updateLineItem(receipt.id, item.id, 'amount', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                                                        placeholder="0.00"
                                                                        className={`pl-10 ${errors[`receipt_${receipt.id}_item_${item.id}_amount`] ? 'border-red-500' : ''}`}
                                                                    />
                                                                </div>
                                                                {errors[`receipt_${receipt.id}_item_${item.id}_amount`] && (
                                                                    <p className="mt-1 text-sm text-red-600">{errors[`receipt_${receipt.id}_item_${item.id}_amount`]}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Receipt Totals */}
                                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-gray-600">Subtotal:</span>
                                                        <span className="font-medium ml-2">${receipt.lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Tax:</span>
                                                        <div className="relative inline-block ml-2">
                                                            <DollarSign className="absolute left-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={receipt.tax?.toString() || ''}
                                                                onChange={(e) => updateReceipt(receipt.id, 'tax', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                                                placeholder="0.00"
                                                                className="w-20 pl-5 h-6 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Total:</span>
                                                        <span className="font-bold text-blue-600 ml-2">${((receipt.lineItems.reduce((sum, item) => sum + item.amount, 0)) + (receipt.tax || 0)).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Receipt Notes */}
                                        <div className="mt-4">
                                            <label className="text-sm font-medium text-gray-700">
                                                Notes
                                            </label>
                                            <Textarea
                                                value={receipt.notes}
                                                onChange={(e) => updateReceipt(receipt.id, 'notes', e.target.value)}
                                                placeholder="Any additional notes about this receipt"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </Tab>
                            ))}
                        </Tabs>

                        {/* Total Amount Display */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-medium text-gray-900">Total Reimbursement Amount:</span>
                                <span className="text-3xl font-bold text-blue-600">${getTotalAmount().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div>
                        <label htmlFor="additionalInfo" className="text-sm font-medium text-gray-700">
                            Additional Information
                        </label>
                        <Textarea
                            id="additionalInfo"
                            value={formData.additionalInfo}
                            onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                            placeholder="Any additional details or special circumstances"
                            rows={3}
                        />
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="bordered"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                        >
                            Submit Request
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
} 