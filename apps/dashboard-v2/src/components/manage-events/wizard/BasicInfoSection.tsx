import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BasicInfoSectionProps {
  data: {
    eventName: string;
    eventDescription: string;
    eventType: string;
    department?: string;
  };
  onChange: (data: Partial<BasicInfoSectionProps["data"]>) => void;
}

const eventTypes = [
  "Social",
  "Technical",
  "Outreach",
  "Professional",
  "Projects",
  "Other",
];

const departments = [
  "General",
  "Technical",
  "Social",
  "Outreach",
  "Professional",
  "Projects",
];

export function BasicInfoSection({ data, onChange }: BasicInfoSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="eventName">
            Event Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="eventName"
            value={data.eventName}
            onChange={(e) => onChange({ eventName: e.target.value })}
            placeholder="Enter event name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventDescription">
            Event Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="eventDescription"
            value={data.eventDescription}
            onChange={(e) => onChange({ eventDescription: e.target.value })}
            placeholder="Describe your event..."
            rows={4}
            required
          />
          <p className="text-xs text-gray-500">
            Include key details about what attendees can expect.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eventType">
              Event Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.eventType}
              onValueChange={(value) => onChange({ eventType: value })}
            >
              <SelectTrigger id="eventType">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={data.department || ""}
              onValueChange={(value) => onChange({ department: value || undefined })}
            >
              <SelectTrigger id="department">
                <SelectValue placeholder="Select department (optional)" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
