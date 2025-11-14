import React, { useState } from "react";
import { Button, Tabs, Tab } from "@heroui/react";
import {
  Plus,
  Receipt,
  X,
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, auth } from "../../../../../firebase/client";
import type { ReimbursementReceipt } from "../types";
import ReceiptForm from "./ReceiptForm";
import { useGlobalImagePaste } from "../../../shared/hooks/useGlobalImagePaste";
import { usePasteNotification } from "../../../shared/components/PasteNotification";

interface ReceiptUploadStepProps {
  receipts: ReimbursementReceipt[];
  setReceipts: (receipts: ReimbursementReceipt[]) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
}

export default function ReceiptUploadStep({
  receipts,
  setReceipts,
  errors,
  setErrors,
}: ReceiptUploadStepProps) {
  const [activeReceiptTab, setActiveReceiptTab] = useState(
    receipts.length > 0 ? receipts[0].id : "",
  );
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [parsingReceipts, setParsingReceipts] = useState<Set<string>>(
    new Set(),
  );
  const [parseResults, setParseResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});

  // Paste notification
  const { showPasteNotification, PasteNotificationComponent } =
    usePasteNotification("Receipt file pasted");

  // Global image paste handler - paste image to active receipt tab
  useGlobalImagePaste({
    modalType: "reimbursement-wizard",
    enabled: true,
    onImagePaste: (file) => {
      if (activeReceiptTab) {
        handleReceiptUpload(activeReceiptTab, file);
      }
    },
    onPasteSuccess: () => {
      showPasteNotification();
    },
  });

  const addReceipt = () => {
    const newReceiptId = Date.now().toString();
    const newReceipt: ReimbursementReceipt = {
      id: newReceiptId,
      vendorName: "",
      location: "",
      dateOfPurchase: "",
      lineItems: [],
      notes: "",
      subtotal: 0,
      tax: 0,
      tip: 0,
      shipping: 0,
      otherCharges: 0,
      total: 0,
    };
    setReceipts([...receipts, newReceipt]);
    setActiveReceiptTab(newReceiptId);
  };

  const removeReceipt = (id: string) => {
    if (receipts.length > 1) {
      const newReceipts = receipts.filter((receipt) => receipt.id !== id);
      setReceipts(newReceipts);
      if (activeReceiptTab === id && newReceipts.length > 0) {
        setActiveReceiptTab(newReceipts[0].id);
      }
    } else if (receipts.length === 1) {
      // Don't allow removing the last receipt, just reset it
      setReceipts([
        {
          id: receipts[0].id,
          vendorName: "",
          location: "",
          dateOfPurchase: "",
          lineItems: [],
          notes: "",
          subtotal: 0,
          tax: 0,
          tip: 0,
          shipping: 0,
          otherCharges: 0,
          total: 0,
        },
      ]);
    }
  };

  const updateReceipt = (
    id: string,
    updates: Partial<ReimbursementReceipt>,
  ) => {
    setReceipts(
      receipts.map((receipt) =>
        receipt.id === id ? { ...receipt, ...updates } : receipt,
      ),
    );
  };

  const handleReceiptUpload = async (receiptId: string, file: File) => {
    try {
      setUploadingFiles((prev) => new Set(prev).add(receiptId));
      setParseResults((prev) => {
        const newResults = { ...prev };
        delete newResults[receiptId];
        return newResults;
      });

      // Upload file to Firebase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(
        storage,
        `receipts/${auth.currentUser?.uid}/${fileName}`,
      );

      const uploadTask = uploadBytesResumable(storageRef, file);
      await new Promise((resolve, reject) => {
        uploadTask.on("state_changed", null, reject, () =>
          resolve(uploadTask.snapshot.ref),
        );
      });

      const downloadURL = await getDownloadURL(storageRef);

      // Create receipt file object
      const receiptFileObj = {
        url: downloadURL,
        name: file.name,
        size: file.size,
        type: file.type,
      };

      // Update receipt with file info
      updateReceipt(receiptId, {
        receiptFile: receiptFileObj,
      });

      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(receiptId);
        return newSet;
      });

      // Automatically trigger AI parsing, passing the receipt file to preserve it
      await parseReceiptWithAI(receiptId, downloadURL, receiptFileObj);
    } catch (error) {
      console.error("Error uploading file:", error);
      setErrors({
        ...errors,
        [`receipt_${receiptId}_file`]:
          "Failed to upload file. Please try again.",
      });
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(receiptId);
        return newSet;
      });
    }
  };

  const parseReceiptWithAI = async (
    receiptId: string,
    imageUrl: string,
    receiptFile?: { url: string; name: string; size: number; type: string },
  ) => {
    try {
      setParsingReceipts((prev) => new Set(prev).add(receiptId));
      setParseResults((prev) => ({
        ...prev,
        [receiptId]: { success: false, message: "Parsing receipt..." },
      }));

      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage =
          result.error || result.message || "Failed to parse receipt";
        const details = result.details ? ` (${result.details})` : "";
        throw new Error(`${errorMessage}${details}`);
      }

      const parsedData = result.data;

      // Validate that we have at least some data
      if (!parsedData || typeof parsedData !== "object") {
        throw new Error("Invalid response from AI service");
      }

      // Update receipt with parsed data
      // Explicitly preserve receiptFile if it was passed in
      const updates: Partial<ReimbursementReceipt> = {
        vendorName: parsedData.vendorName || "",
        location: parsedData.location || "",
        dateOfPurchase: parsedData.dateOfPurchase || "",
        lineItems: Array.isArray(parsedData.lineItems)
          ? parsedData.lineItems.map((item: any, index: number) => ({
            id: `parsed_${Date.now()}_${index}`,
            description: item.description || "",
            category: item.category || "Other",
            amount: parseFloat(item.amount) || 0,
          }))
          : [
            {
              id: `parsed_${Date.now()}_0`,
              description: "Receipt Total",
              category: "Other",
              amount: parsedData.total || 0,
            },
          ],
        subtotal: parseFloat(parsedData.subtotal) || 0,
        tax: parseFloat(parsedData.tax) || 0,
        tip: parseFloat(parsedData.tip) || 0,
        shipping: parseFloat(parsedData.shipping) || 0,
        otherCharges: parseFloat(parsedData.otherCharges) || 0,
        total: parseFloat(parsedData.total) || 0,
      };

      // Preserve receiptFile if provided
      if (receiptFile) {
        updates.receiptFile = receiptFile;
      }

      updateReceipt(receiptId, updates);

      setParseResults((prev) => ({
        ...prev,
        [receiptId]: {
          success: true,
          message:
            "Receipt parsed successfully! Review and edit the information below.",
        },
      }));

      // Clear any previous errors
      const newErrors = { ...errors };
      delete newErrors[`receipt_${receiptId}_parse`];
      setErrors(newErrors);
    } catch (error) {
      console.error("Error parsing receipt:", error);

      // Provide a more helpful error message
      let errorMessage =
        "Failed to parse receipt. Please fill in the information manually.";
      if (error instanceof Error) {
        if (error.message.includes("AI service not configured")) {
          errorMessage =
            "AI service is not configured. Please contact support or enter data manually.";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else {
          errorMessage = `${error.message}. You can still enter the information manually.`;
        }
      }

      setParseResults((prev) => ({
        ...prev,
        [receiptId]: {
          success: false,
          message: errorMessage,
        },
      }));
    } finally {
      setParsingReceipts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(receiptId);
        return newSet;
      });
    }
  };

  // Initialize with one receipt if empty
  React.useEffect(() => {
    if (receipts.length === 0) {
      addReceipt();
    }
  }, []);

  return (
    <>
      {PasteNotificationComponent}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Receipt Upload & AI Parsing
            </h3>
            <p className="text-sm text-gray-600">
              Upload receipt files (images or PDFs, or paste images directly)
              and let AI automatically extract the information.
            </p>
          </div>
          <Button
            color="primary"
            variant="bordered"
            onPress={addReceipt}
            startContent={<Plus className="w-4 h-4" />}
            size="sm"
          >
            Add Receipt
          </Button>
        </div>

        {errors.receipts && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{errors.receipts}</p>
          </div>
        )}

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
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeReceipt(receipt.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          removeReceipt(receipt.id);
                        }
                      }}
                      className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </div>
                  )}
                </div>
              }
            >
              <div className="p-4 border border-gray-200 rounded-lg mt-4">
                <ReceiptForm
                  receipt={receipt}
                  updateReceipt={updateReceipt}
                  errors={errors}
                  uploadingFiles={uploadingFiles}
                  parsingReceipts={parsingReceipts}
                  parseResults={parseResults}
                  onFileUpload={handleReceiptUpload}
                />
              </div>
            </Tab>
          ))}
        </Tabs>
      </div>
    </>
  );
}
