import React, { useState } from "react";
import { Button } from "../../../../../ui/button";
import { Input } from "../../../../../ui/input";
import { Label } from "../../../../../ui/label";
import { Textarea } from "../../../../../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../ui/select";
import { Checkbox } from "../../../../../ui/checkbox";
import { Badge } from "../../../../../ui/badge";
import { 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Calendar,
  Clock,
  Palette,
  Download
} from "lucide-react";

interface GraphicsUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GraphicsRequestData) => void;
  initialData?: Partial<GraphicsRequestData>;
}

interface GraphicsRequestData {
  eventType: string;
  title: string;
  description: string;
  requiredLogos: string[];
  flyerType: string[];
  advertisingFormat?: string;
  flyerAdvertisingStartDate?: string;
  flyerAdditionalRequests?: string;
  needsGraphics: boolean;
  graphicsCompleted?: boolean;
  graphicsFiles?: string[];
  priority: "low" | "medium" | "high";
  deadline?: string;
}

export function GraphicsUploadModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: GraphicsUploadModalProps) {
  const [formData, setFormData] = useState<GraphicsRequestData>({
    eventType: "",
    title: "",
    description: "",
    requiredLogos: [],
    flyerType: [],
    needsGraphics: true,
    priority: "medium",
    ...initialData,
  });

  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const logoOptions = [
    "IEEE Logo",
    "UC San Diego Logo",
    "IEEE UCSD Logo",
    "Sponsor Logos",
    "Department Logos",
  ];

  const flyerTypes = [
    "Digital Flyer",
    "Print Flyer",
    "Social Media Post",
    "Banner",
    "Instagram Story",
    "Facebook Event Cover",
  ];

  const eventTypes = [
    "social",
    "technical",
    "outreach", 
    "professional",
    "projects",
    "other",
  ];

  const handleInputChange = (field: keyof GraphicsRequestData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoToggle = (logo: string) => {
    setFormData(prev => ({
      ...prev,
      requiredLogos: prev.requiredLogos.includes(logo)
        ? prev.requiredLogos.filter(l => l !== logo)
        : [...prev.requiredLogos, logo]
    }));
  };

  const handleFlyerTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      flyerType: prev.flyerType.includes(type)
        ? prev.flyerType.filter(t => t !== type)
        : [...prev.flyerType, type]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-red-100 text-red-800",
    };
    return colors[priority] || colors.medium;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Graphics Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) => handleInputChange("eventType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "low" | "medium" | "high") => handleInputChange("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor("low")}>Low</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor("medium")}>Medium</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor("high")}>High</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter event title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the graphics you need..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline || ""}
                  onChange={(e) => handleInputChange("deadline", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="advertisingStartDate">Advertising Start Date</Label>
                <Input
                  id="advertisingStartDate"
                  type="datetime-local"
                  value={formData.flyerAdvertisingStartDate || ""}
                  onChange={(e) => handleInputChange("flyerAdvertisingStartDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Required Logos */}
          <div>
            <Label>Required Logos</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {logoOptions.map((logo) => (
                <div key={logo} className="flex items-center space-x-2">
                  <Checkbox
                    id={logo}
                    checked={formData.requiredLogos.includes(logo)}
                    onCheckedChange={() => handleLogoToggle(logo)}
                  />
                  <Label htmlFor={logo} className="text-sm">
                    {logo}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Flyer Types */}
          <div>
            <Label>Flyer Types Needed</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {flyerTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={formData.flyerType.includes(type)}
                    onCheckedChange={() => handleFlyerTypeToggle(type)}
                  />
                  <Label htmlFor={type} className="text-sm">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="advertisingFormat">Advertising Format</Label>
              <Input
                id="advertisingFormat"
                value={formData.advertisingFormat || ""}
                onChange={(e) => handleInputChange("advertisingFormat", e.target.value)}
                placeholder="e.g., 1080x1080, 1920x1080"
              />
            </div>

            <div>
              <Label htmlFor="additionalRequests">Additional Requests</Label>
              <Textarea
                id="additionalRequests"
                value={formData.flyerAdditionalRequests || ""}
                onChange={(e) => handleInputChange("flyerAdditionalRequests", e.target.value)}
                placeholder="Any additional graphics requirements..."
                rows={2}
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="file-upload">Reference Files (Optional)</Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="cursor-pointer"
            />
            {selectedFiles && selectedFiles.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFiles.length} file(s) selected
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Upload className="h-4 w-4 mr-2" />
              Submit Graphics Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
