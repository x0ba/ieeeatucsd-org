import { Printer, Image } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface MarketingSectionProps {
  data: {
    needsFlyers: boolean;
    needsGraphics: boolean;
    estimatedAttendance: number;
  };
  onChange: (data: Partial<MarketingSectionProps["data"]>) => void;
}

export function MarketingSection({ data, onChange }: MarketingSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Marketing Materials
          </h3>

          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <Checkbox
              id="needsFlyers"
              checked={data.needsFlyers}
              onCheckedChange={(checked) =>
                onChange({ needsFlyers: checked as boolean })
              }
            />
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-gray-500" />
                <Label htmlFor="needsFlyers" className="cursor-pointer font-medium">
                  Flyers Needed
                </Label>
              </div>
              <p className="text-xs text-gray-500 pl-6">
                Physical flyers to be printed and distributed on campus.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <Checkbox
              id="needsGraphics"
              checked={data.needsGraphics}
              onCheckedChange={(checked) =>
                onChange({ needsGraphics: checked as boolean })
              }
            />
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-gray-500" />
                <Label htmlFor="needsGraphics" className="cursor-pointer font-medium">
                  Graphics Needed
                </Label>
              </div>
              <p className="text-xs text-gray-500 pl-6">
                Digital graphics for social media, website, and digital displays.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Expected Attendance
          </h3>

          <div className="space-y-2">
            <Label htmlFor="estimatedAttendance">
              Estimated Number of Attendees
            </Label>
            <input
              id="estimatedAttendance"
              type="number"
              min={1}
              value={data.estimatedAttendance || ""}
              onChange={(e) =>
                onChange({
                  estimatedAttendance: e.target.value
                    ? parseInt(e.target.value)
                    : 0,
                })
              }
              placeholder="e.g., 50"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-gray-500">
              This helps us plan resources and capacity for your event.
            </p>
          </div>

          {(data.needsFlyers || data.needsGraphics) && (
            <div className="space-y-2 pt-4">
              <Label htmlFor="marketingNotes">
                Additional Marketing Requirements (Optional)
              </Label>
              <Textarea
                id="marketingNotes"
                placeholder="Describe any specific design requirements, dimensions, deadlines, or other marketing needs..."
                rows={3}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
