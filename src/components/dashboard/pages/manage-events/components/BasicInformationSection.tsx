import React from "react";
import { Calendar, MapPin, FileText, DollarSign } from "lucide-react";
import { Input, Textarea, Select, SelectItem, Button } from "@heroui/react";
import type { EventFormData, FieldError } from "../types/EventRequestTypes";
import { departmentOptions, eventTypes } from "../types/EventRequestTypes";
import { generateEventCode, formatTimeTo12H } from "../utils/eventRequestUtils";

interface BasicInformationSectionProps {
  formData: EventFormData;
  fieldErrors: FieldError;
  onInputChange: (field: string, value: any) => void;
}

export default function BasicInformationSection({
  formData,
  fieldErrors,
  onInputChange,
}: BasicInformationSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Event Name */}
        <Input
          type="text"
          label="Event Name"
          placeholder="Enter event name"
          value={formData.name}
          onValueChange={(value) => onInputChange("name", value)}
          isRequired
          isInvalid={!!fieldErrors.name}
          errorMessage={fieldErrors.name && "Event name is required"}
          startContent={<FileText className="w-4 h-4 text-gray-400" />}
          classNames={{
            label: "text-sm font-medium",
          }}
        />

        {/* Location */}
        <Input
          type="text"
          label="Location"
          placeholder="Enter event location"
          value={formData.location}
          onValueChange={(value) => onInputChange("location", value)}
          isRequired
          isInvalid={!!fieldErrors.location}
          errorMessage={fieldErrors.location && "Location is required"}
          startContent={<MapPin className="w-4 h-4 text-gray-400" />}
          classNames={{
            label: "text-sm font-medium",
          }}
        />

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              type="date"
              label="Date"
              value={formData.startDate}
              onValueChange={(value) => onInputChange("startDate", value)}
              isRequired
              isInvalid={!!fieldErrors.startDate}
              errorMessage={fieldErrors.startDate && "Date is required"}
              startContent={<Calendar className="w-4 h-4 text-gray-400" />}
              classNames={{
                label: "text-sm font-medium",
              }}
            />
          </div>
          <div>
            <Input
              type="time"
              label="Start Time"
              value={formData.startTime}
              onValueChange={(value) => onInputChange("startTime", value)}
              isRequired
              isInvalid={!!fieldErrors.startTime}
              errorMessage={fieldErrors.startTime && "Start time is required"}
              description={
                formData.startTime && formatTimeTo12H(formData.startTime)
              }
              classNames={{
                label: "text-sm font-medium",
              }}
            />
          </div>
          <div>
            <Input
              type="time"
              label="End Time"
              value={formData.endTime}
              onValueChange={(value) => onInputChange("endTime", value)}
              isRequired
              isInvalid={!!fieldErrors.endTime}
              errorMessage={fieldErrors.endTime && "End time is required"}
              description={
                formData.endTime && formatTimeTo12H(formData.endTime)
              }
              classNames={{
                label: "text-sm font-medium",
              }}
            />
          </div>
        </div>

        {/* Event Description */}
        <Textarea
          label="Event Description"
          placeholder="Describe your event in detail"
          value={formData.eventDescription}
          onValueChange={(value) => onInputChange("eventDescription", value)}
          isRequired
          isInvalid={!!fieldErrors.eventDescription}
          errorMessage={
            fieldErrors.eventDescription && "Event description is required"
          }
          minRows={4}
          classNames={{
            label: "text-sm font-medium",
          }}
        />

        {/* Department */}
        <Select
          label="Department"
          placeholder="Select department"
          selectedKeys={[formData.department]}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            onInputChange("department", selected);
          }}
          classNames={{
            label: "text-sm font-medium",
          }}
        >
          {departmentOptions.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </Select>

        {/* Event Code */}
        <div>
          <div className="flex gap-2">
            <Input
              type="text"
              label="Event Code"
              placeholder="Enter or generate event code"
              value={formData.eventCode}
              onValueChange={(value) => onInputChange("eventCode", value)}
              description="This code will be used for event check-ins and point tracking"
              classNames={{
                label: "text-sm font-medium",
                base: "flex-1",
              }}
            />
            <Button
              color="primary"
              onPress={() => onInputChange("eventCode", generateEventCode())}
              className="mt-auto mb-6"
            >
              Generate
            </Button>
          </div>
        </div>

        {/* Points to Reward */}
        <Input
          type="number"
          label="Points to Reward"
          placeholder="Enter points to reward attendees"
          value={formData.pointsToReward.toString()}
          onValueChange={(value) =>
            onInputChange("pointsToReward", parseInt(value) || 0)
          }
          min={0}
          description="Points that will be awarded to attendees for participating in this event"
          startContent={<DollarSign className="w-4 h-4 text-gray-400" />}
          classNames={{
            label: "text-sm font-medium",
          }}
        />
      </div>
    </div>
  );
}
