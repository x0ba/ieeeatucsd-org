import { AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface DisclaimerSectionProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function DisclaimerSection({
  checked,
  onCheckedChange,
}: DisclaimerSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
              Important Information
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Please read the following before proceeding with your event request.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
        <p>
          By submitting this event request, you acknowledge and agree to the following:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>
            All events must comply with university policies and IEEE guidelines.
          </li>
          <li>
            Event approval is required before any public announcements or promotions.
          </li>
          <li>
            You are responsible for ensuring all necessary permits and permissions are obtained.
          </li>
          <li>
            Any changes to the event after approval must be communicated promptly.
          </li>
          <li>
            IEEE UCSD reserves the right to review and modify event details.
          </li>
        </ul>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Required Lead Times
          </h4>
          <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400">
            <li>Standard events: 2 weeks minimum</li>
            <li>Events requiring funding: 4 weeks minimum</li>
            <li>Large events (100+ attendees): 6 weeks minimum</li>
            <li>Events with external speakers: 4 weeks minimum</li>
          </ul>
        </div>
      </div>

      <div className="flex items-start gap-3 pt-4 border-t">
        <Checkbox
          id="disclaimer"
          checked={checked}
          onCheckedChange={(checked) => onCheckedChange(checked as boolean)}
        />
        <label
          htmlFor="disclaimer"
          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          I have read and understood the above information. I agree to comply with all
          policies and requirements for hosting this event.
        </label>
      </div>
    </div>
  );
}
