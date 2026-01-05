import React, { useState } from "react";
import { Input, Textarea, Select, SelectItem, Button } from "@heroui/react";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  DollarSign,
  Eye,
} from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  type ReimbursementReceipt,
  type LineItem,
} from "../types";
import { convertHeicIfNeeded } from "../../manage-events/utils/heicConversion";
import { toast } from "@/hooks/use-toast";

interface ReceiptFormProps {
  receipt: ReimbursementReceipt;
  updateReceipt: (id: string, updates: Partial<ReimbursementReceipt>) => void;
  errors: Record<string, string>;
  uploadingFiles: Set<string>;
  parsingReceipts: Set<string>;
  parseResults: Record<string, { success: boolean; message: string }>;
  onFileUpload: (receiptId: string, file: File) => void;
}

export default function ReceiptForm({
  receipt,
  updateReceipt,
  errors,
  uploadingFiles,
  parsingReceipts,
  parseResults,
  onFileUpload,
}: ReceiptFormProps) {
  const isUploading = uploadingFiles.has(receipt.id);
  const isParsing = parsingReceipts.has(receipt.id);
  const parseResult = parseResults[receipt.id];
  const [validationError, setValidationError] = useState<string | null>(null);

  // Helper function to validate file with server
  const validateFileWithServer = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/validate-receipt-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: 'Authentication required. Please sign in again.' };
        } else if (response.status === 413) {
          return { valid: false, error: data.error || 'File is too large. Maximum size is 10MB.' };
        } else if (response.status === 415) {
          return { valid: false, error: data.error || 'File type not supported.' };
        } else if (response.status === 400) {
          return { valid: false, error: data.error || 'Invalid file format or size.' };
        } else if (response.status === 500) {
          return { valid: false, error: 'Server error during validation. Please try again.' };
        } else {
          return { valid: false, error: data.error || 'File validation failed.' };
        }
      }

      return { valid: data.valid, error: data.error };
    } catch (error) {
      console.error('Error validating file:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { valid: false, error: 'Network error. Please check your connection and try again.' };
      }
      return { valid: false, error: 'Unable to validate file. Please try again.' };
    }
  };

  // Helper function to process and validate file
  const processAndValidateFile = async (file: File): Promise<File | null> => {
    try {
      // Convert HEIC to JPG if needed
      const convertedFile = await convertHeicIfNeeded(file);

      // Validate file with server
      const validationResult = await validateFileWithServer(convertedFile);

      if (!validationResult.valid) {
        setValidationError(validationResult.error || 'File validation failed');
        toast({
          title: 'File validation failed',
          description: validationResult.error || 'Please check your file and try again.',
          variant: 'destructive',
        });
        return null;
      }

      setValidationError(null);
      return convertedFile;
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Error processing file',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      return null;
    }
  };

  const addLineItem = () => {
    const newLineItem: LineItem = {
      id: `item_${Date.now()}`,
      description: "",
      category: "",
      amount: 0,
      quantity: 1,
    };
    updateReceipt(receipt.id, {
      lineItems: [...receipt.lineItems, newLineItem],
    });
  };

  const removeLineItem = (itemId: string) => {
    if (receipt.lineItems.length > 1) {
      updateReceipt(receipt.id, {
        lineItems: receipt.lineItems.filter((item) => item.id !== itemId),
      });
    }
  };

  const updateLineItem = (
    itemId: string,
    field: keyof LineItem,
    value: any,
  ) => {
    updateReceipt(receipt.id, {
      lineItems: receipt.lineItems.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    });
  };

  const calculateTotals = () => {
    const subtotal = receipt.lineItems.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );
    const total =
      subtotal +
      (receipt.tax || 0) +
      (receipt.tip || 0) +
      (receipt.shipping || 0) +
      (receipt.otherCharges || 0);

    updateReceipt(receipt.id, {
      subtotal,
      total,
    });
  };

  React.useEffect(() => {
    calculateTotals();
  }, [receipt.lineItems, receipt.tax, receipt.tip, receipt.shipping, receipt.otherCharges]);

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Receipt File (Image or PDF) <span className="text-red-500">*</span>
        </label>

        {/* Validation Error Message */}
        {validationError && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Validation Error
              </p>
              <p className="text-xs text-red-700">
                {validationError}
              </p>
            </div>
          </div>
        )}

        {/* Upload Status Messages */}
        {isParsing && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Parsing receipt with AI...
              </p>
              <p className="text-xs text-blue-700">
                This may take a few seconds
              </p>
            </div>
          </div>
        )}

        {parseResult && !isParsing && (
          <div
            className={`mb-3 rounded-xl p-3 flex items-start space-x-3 ${parseResult.success
              ? "bg-green-50 border border-green-200"
              : "bg-yellow-50 border border-yellow-200"
              }`}
          >
            {parseResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${parseResult.success ? "text-green-900" : "text-yellow-900"
                  }`}
              >
                {parseResult.message}
              </p>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-xl transition-colors ${receipt.receiptFile
            ? "border-green-300 bg-green-50"
            : errors[`receipt_${receipt.id}_file`]
              ? "border-red-300 bg-red-50"
              : "border-gray-300 hover:border-gray-400"
            }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer.files;
            if (files && files[0]) {
              const validatedFile = await processAndValidateFile(files[0]);
              if (validatedFile) {
                onFileUpload(receipt.id, validatedFile);
              }
            }
          }}
          onPaste={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.indexOf("image") === 0) {
                const file = item.getAsFile();
                if (file) {
                  // Create a more descriptive filename for pasted images
                  const timestamp = Date.now();
                  const extension = file.type.split("/")[1] || "png";
                  const newFile = new File(
                    [file],
                    `pasted-receipt-${timestamp}.${extension}`,
                    {
                      type: file.type,
                      lastModified: Date.now(),
                    },
                  );
                  const validatedFile = await processAndValidateFile(newFile);
                  if (validatedFile) {
                    onFileUpload(receipt.id, validatedFile);
                  }
                  break; // Only handle the first image
                }
              }
            }
          }}
          role="region"
          aria-label="Receipt file upload area"
          tabIndex={0}
        >
          {isUploading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-blue-600">Uploading...</p>
              </div>
            </div>
          ) : receipt.receiptFile ? (
            <div className="h-32 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p
                  className="text-sm font-medium text-green-700 truncate max-w-[200px]"
                  title={receipt.receiptFile.name}
                >
                  {receipt.receiptFile.name}
                </p>
                <p className="text-xs text-green-600 mb-2">
                  Uploaded successfully
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="text-center">
                    Drag and drop or paste to replace
                  </p>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      type="button"
                      onClick={() =>
                        window.open(receipt.receiptFile.url, "_blank")
                      }
                      className="text-blue-600 hover:text-blue-500 underline"
                    >
                      View
                    </button>
                    <span className="text-gray-400">•</span>
                    <label className="inline-block text-blue-600 hover:text-blue-500 cursor-pointer underline">
                      Replace
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/png,image/jpeg,image/jpg,image/heic,image/heif,.heic,.heif,application/pdf"
                        aria-label="Replace receipt file"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const validatedFile = await processAndValidateFile(file);
                            if (validatedFile) {
                              onFileUpload(receipt.id, validatedFile);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <div className="text-center">
                <Upload
                  className="mx-auto h-8 w-8 text-gray-400 mb-2"
                  aria-hidden="true"
                />
                <label className="relative cursor-pointer font-medium text-blue-600 hover:text-blue-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/png,image/jpeg,image/jpg,image/heic,image/heif,.heic,.heif,application/pdf"
                    aria-label="Upload receipt file"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const validatedFile = await processAndValidateFile(file);
                        if (validatedFile) {
                          onFileUpload(receipt.id, validatedFile);
                        }
                      }
                    }}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  or drag and drop or paste
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, HEIC, or PDF up to 10MB
                </p>
              </div>
            </div>
          )}
        </div>
        {errors[`receipt_${receipt.id}_file`] && (
          <p className="mt-1 text-sm text-red-600">
            {errors[`receipt_${receipt.id}_file`]}
          </p>
        )}
      </div>

      {/* Hide form fields while AI is parsing */}
      {isParsing ? (
        <div className="text-center py-12 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold text-blue-900 mb-2">
            AI is analyzing your receipt...
          </p>
          <p className="text-sm text-blue-700">
            This usually takes 2-5 seconds. Please wait.
          </p>
        </div>
      ) : (
        <>
          {/* Receipt Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor/Merchant <span className="text-red-500">*</span>
              </label>
              <Input
                value={receipt.vendorName}
                onChange={(e) =>
                  updateReceipt(receipt.id, { vendorName: e.target.value })
                }
                placeholder="e.g., Amazon, Target, Starbucks"
                isInvalid={!!errors[`receipt_${receipt.id}_vendor`]}
                errorMessage={errors[`receipt_${receipt.id}_vendor`]}
                aria-label="Vendor or merchant name"
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Purchase <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={receipt.dateOfPurchase}
                onChange={(e) =>
                  updateReceipt(receipt.id, { dateOfPurchase: e.target.value })
                }
                isInvalid={!!errors[`receipt_${receipt.id}_date`]}
                errorMessage={errors[`receipt_${receipt.id}_date`]}
                aria-label="Date of purchase"
                aria-required="true"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <Input
                value={receipt.location}
                onChange={(e) =>
                  updateReceipt(receipt.id, { location: e.target.value })
                }
                placeholder="Store address or location"
                aria-label="Store location or address"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Line Items <span className="text-red-500">*</span>
              </label>
              <Button
                size="sm"
                variant="bordered"
                onClick={addLineItem}
                startContent={<Plus className="w-3 h-3" />}
                aria-label="Add new line item"
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {receipt.lineItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2">
                    No line items yet
                  </p>
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onClick={addLineItem}
                    startContent={<Plus className="w-3 h-3" />}
                    aria-label="Add first line item"
                  >
                    Add First Item
                  </Button>
                </div>
              ) : (
                receipt.lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Item {index + 1}
                      </span>
                      {receipt.lineItems.length > 1 && (
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          onClick={() => removeLineItem(item.id)}
                          isIconOnly
                          aria-label={`Remove item ${index + 1}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-5">
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="Description"
                          size="sm"
                          aria-label={`Item ${index + 1} description`}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Input
                          type="number"
                          value={(item.quantity ?? 1).toString()}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "quantity",
                              parseInt(e.target.value) || 1,
                            )
                          }
                          placeholder="QTY"
                          size="sm"
                          min="1"
                          aria-label={`Item ${index + 1} quantity`}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Select
                          selectedKeys={item.category ? [item.category] : []}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] as string;
                            updateLineItem(item.id, "category", value);
                          }}
                          placeholder="Category"
                          size="sm"
                          aria-label={`Item ${index + 1} category`}
                        >
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                      <div className="md:col-span-3">
                        <Input
                          type="number"
                          value={item.amount.toString()}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              "amount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          placeholder="0.00"
                          startContent={
                            <DollarSign
                              className="w-3 h-3 text-gray-400"
                              aria-hidden="true"
                            />
                          }
                          size="sm"
                          aria-label={`Item ${index + 1} amount in dollars`}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Additional Charges */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax
              </label>
              <Input
                type="number"
                value={receipt.tax?.toString() || "0"}
                onChange={(e) =>
                  updateReceipt(receipt.id, {
                    tax: parseFloat(e.target.value) || 0,
                  })
                }
                startContent={
                  <DollarSign
                    className="w-3 h-3 text-gray-400"
                    aria-hidden="true"
                  />
                }
                size="sm"
                aria-label="Tax amount in dollars"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tip
              </label>
              <Input
                type="number"
                value={receipt.tip?.toString() || "0"}
                onChange={(e) =>
                  updateReceipt(receipt.id, {
                    tip: parseFloat(e.target.value) || 0,
                  })
                }
                startContent={
                  <DollarSign
                    className="w-3 h-3 text-gray-400"
                    aria-hidden="true"
                  />
                }
                size="sm"
                aria-label="Tip amount in dollars"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping
              </label>
              <Input
                type="number"
                value={receipt.shipping?.toString() || "0"}
                onChange={(e) =>
                  updateReceipt(receipt.id, {
                    shipping: parseFloat(e.target.value) || 0,
                  })
                }
                startContent={
                  <DollarSign
                    className="w-3 h-3 text-gray-400"
                    aria-hidden="true"
                  />
                }
                size="sm"
                aria-label="Shipping amount in dollars"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Charges
              </label>
              <Input
                type="number"
                value={receipt.otherCharges?.toString() || "0"}
                onChange={(e) =>
                  updateReceipt(receipt.id, {
                    otherCharges: parseFloat(e.target.value) || 0,
                  })
                }
                startContent={
                  <DollarSign
                    className="w-3 h-3 text-gray-400"
                    aria-hidden="true"
                  />
                }
                size="sm"
                aria-label="Other charges amount in dollars"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total
              </label>
              <Input
                value={`$${receipt.total.toFixed(2)}`}
                isReadOnly
                classNames={{
                  input: "font-bold text-green-700",
                }}
                size="sm"
                aria-label="Total amount in dollars (read-only)"
                aria-readonly="true"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes <span className="text-gray-400">(Optional)</span>
            </label>
            <Textarea
              value={receipt.notes || ""}
              onChange={(e) =>
                updateReceipt(receipt.id, { notes: e.target.value })
              }
              placeholder="Any additional notes about this receipt..."
              minRows={2}
              aria-label="Additional notes for this receipt"
            />
          </div>
        </>
      )}
    </div>
  );
}
