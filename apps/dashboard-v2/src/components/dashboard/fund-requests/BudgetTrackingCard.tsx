import { Users } from "lucide-react";
import { formatCurrency } from "@/types/fund-requests";
import { DEPARTMENT_LABELS, type FundRequestDepartment } from "@/types/fund-requests";
import { Progress } from "@/components/ui/progress";

interface BudgetTrackingCardProps {
  department: FundRequestDepartment;
  totalBudget: number;
  remainingBudget: number;
  pendingBudget: number;
  percentUsed: number;
  isConfigured: boolean;
  onClick?: () => void;
}

export function BudgetTrackingCard({
  department,
  totalBudget,
  remainingBudget,
  pendingBudget,
  percentUsed,
  isConfigured,
  onClick,
}: BudgetTrackingCardProps) {
  return (
    <div
      onClick={isConfigured ? onClick : undefined}
      className={`
        rounded-lg border bg-card p-3 shadow-sm transition-all
        ${isConfigured ? "cursor-pointer hover:border-primary hover:shadow-md" : "opacity-70 bg-muted"}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-md ${isConfigured ? "bg-primary/10 text-primary" : "bg-default-100 text-muted-foreground"}`}
          >
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm">
            {DEPARTMENT_LABELS[department]}
          </span>
        </div>
        {!isConfigured && (
          <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-muted text-muted-foreground border">
            Not Configured
          </span>
        )}
      </div>

      {isConfigured ? (
        <>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xl font-bold leading-none">
                {formatCurrency(remainingBudget)}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                of {formatCurrency(totalBudget)} remaining
              </p>
            </div>
            {pendingBudget > 0 && (
              <div className="text-right bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100">
                <p className="text-xs font-semibold text-yellow-700">
                  -{formatCurrency(pendingBudget)}
                </p>
                <p className="text-[8px] uppercase font-medium text-yellow-600">
                  pending
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Progress value={Math.min(percentUsed, 100)} className="h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </>
      ) : (
        <div className="py-2 text-center">
          <div className="w-full h-1 bg-muted rounded-full mb-1 opacity-50" />
          <p className="text-xs text-muted-foreground">Budget not configured.</p>
        </div>
      )}
    </div>
  );
}
