import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface LogisticsSectionProps {
  data: {
    location: string;
    startDate: number;
    endDate: number;
    capacity?: number;
    eventCode: string;
    hasFood: boolean;
  };
  onChange: (data: Partial<LogisticsSectionProps["data"]>) => void;
}

export function LogisticsSection({ data, onChange }: LogisticsSectionProps) {
  const formatDateForInput = (timestamp: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toISOString().slice(0, 16);
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    const timestamp = value ? new Date(value).getTime() : Date.now();
    onChange({ [field]: timestamp });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="location">
            Location <span className="text-red-500">*</span>
          </Label>
          <Input
            id="location"
            value={data.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="e.g., Price Center East Ballroom"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={formatDateForInput(data.startDate)}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">
              End Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={formatDateForInput(data.endDate)}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (Optional)</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              value={data.capacity || ""}
              onChange={(e) =>
                onChange({ capacity: e.target.value ? parseInt(e.target.value) : undefined })
              }
              placeholder="e.g., 100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventCode">
              Event Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="eventCode"
              value={data.eventCode}
              onChange={(e) => onChange({ eventCode: e.target.value })}
              placeholder="e.g., TECH-WORKSHOP-2024"
              required
            />
            <p className="text-xs text-gray-500">
              Used for check-in and tracking attendance.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 pt-4 border-t">
          <Checkbox
            id="hasFood"
            checked={data.hasFood}
            onCheckedChange={(checked) => onChange({ hasFood: checked as boolean })}
          />
          <div className="space-y-1">
            <Label htmlFor="hasFood" className="cursor-pointer">
              Food will be served at this event
            </Label>
            <p className="text-xs text-gray-500">
              Check this if food will be provided. Additional food safety requirements may apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
