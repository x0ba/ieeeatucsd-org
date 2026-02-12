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
        rounded-xl border bg-card p-5 shadow-sm transition-all
        ${isConfigured ? "cursor-pointer hover:border-primary hover:shadow-md" : "opacity-70 bg-muted"}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg ${isConfigured ? "bg-primary/10 text-primary" : "bg-default-100 text-muted-foreground"}`}
          >
            <Users className="w-4 h-4" />
          </div>
          <span className="font-semibold">{DEPARTMENT_LABELS[department]}</span>
        </div>
        {!isConfigured && (
          <span className="text-xs rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
            Not Configured
          </span>
        )}
      </div>

      {isConfigured ? (
        <>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-3xl font-bold">{formatCurrency(remainingBudget)}</p>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                of {formatCurrency(totalBudget)} remaining
              </p>
            </div>
            {pendingBudget > 0 && (
              <div className="text-right bg-yellow-50 dark:bg-yellow-950/20 px-2 py-1 rounded-md border border-yellow-100 dark:border-yellow-900/50">
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                  -{formatCurrency(pendingBudget)}
                </p>
                <p className="text-[10px] uppercase font-medium text-yellow-600 dark:text-yellow-500">
                  pending
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Progress
              value={Math.min(percentUsed, 100)}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </>
      ) : (
        <div className="py-4 text-center">
          <div className="w-full h-1.5 bg-muted rounded-full mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Budget has not been configured by admins yet.
          </p>
        </div>
      )}
    </div>
  );
}
