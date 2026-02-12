import { DollarSign, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Invoice } from "../types";

interface FundingSectionProps {
  data: {
    needsASFunding: boolean;
    invoices: Invoice[];
  };
  onChange: (data: Partial<FundingSectionProps["data"]>) => void;
}

export function FundingSection({ data, onChange }: FundingSectionProps) {
  const addInvoice = () => {
    const newInvoice: Invoice = {
      _id: crypto.randomUUID(),
      amount: 0,
      vendor: "",
      description: "",
    };
    onChange({ invoices: [...data.invoices, newInvoice] });
  };

  const removeInvoice = (id: string) => {
    onChange({ invoices: data.invoices.filter((inv) => inv._id !== id) });
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    onChange({
      invoices: data.invoices.map((inv) =>
        inv._id === id ? { ...inv, ...updates } : inv
      ),
    });
  };

  const totalAmount = data.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <Checkbox
            id="needsASFunding"
            checked={data.needsASFunding}
            onCheckedChange={(checked) =>
              onChange({ needsASFunding: checked as boolean })
            }
          />
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <Label htmlFor="needsASFunding" className="cursor-pointer font-medium">
                Request AS Funding
              </Label>
            </div>
            <p className="text-xs text-gray-500 pl-6">
              Check this if you need Associated Students funding for this event.
              Additional documentation may be required.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Invoices
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={addInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          </div>

          {data.invoices.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No invoices added yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add invoices to track event expenses
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.invoices.map((invoice) => (
                <div
                  key={invoice._id}
                  className="p-4 border rounded-lg space-y-4 bg-gray-50/50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      Invoice #{data.invoices.indexOf(invoice) + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => removeInvoice(invoice._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`vendor-${invoice._id}`}>Vendor</Label>
                      <Input
                        id={`vendor-${invoice._id}`}
                        value={invoice.vendor}
                        onChange={(e) =>
                          updateInvoice(invoice._id, { vendor: e.target.value })
                        }
                        placeholder="e.g., Costco"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`amount-${invoice._id}`}>Amount ($)</Label>
                      <Input
                        id={`amount-${invoice._id}`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={invoice.amount || ""}
                        onChange={(e) =>
                          updateInvoice(invoice._id, {
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`description-${invoice._id}`}>
                      Description
                    </Label>
                    <Textarea
                      id={`description-${invoice._id}`}
                      value={invoice.description}
                      onChange={(e) =>
                        updateInvoice(invoice._id, { description: e.target.value })
                      }
                      placeholder="Describe the purchase..."
                      rows={2}
                    />
                  </div>

                  {invoice.fileUrl && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Receipt attached
                    </div>
                  )}
                </div>
              ))}

              {data.invoices.length > 0 && (
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Invoiced:
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
