import { useState } from "react";
import { CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DisclaimerSection } from "../wizard/DisclaimerSection";
import { BasicInfoSection } from "../wizard/BasicInfoSection";
import { LogisticsSection } from "../wizard/LogisticsSection";
import { MarketingSection } from "../wizard/MarketingSection";
import { FundingSection } from "../wizard/FundingSection";
import { EventReviewSection } from "../wizard/EventReviewSection";
import type { EventRequest, EventFormData } from "../types";

interface EventRequestWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormData) => void;
  initialData?: Partial<EventRequest>;
}

const steps = [
  { id: 1, title: "Disclaimer", description: "Important information" },
  { id: 2, title: "Basic Info", description: "Event details" },
  { id: 3, title: "Logistics", description: "Location & time" },
  { id: 4, title: "Marketing", description: "Materials & attendance" },
  { id: 5, title: "Funding", description: "Budget & invoices" },
  { id: 6, title: "Review", description: "Final check" },
];

const defaultFormData: EventFormData = {
  eventName: "",
  eventDescription: "",
  eventType: "",
  department: undefined,
  location: "",
  startDate: Date.now(),
  endDate: Date.now() + 3600000,
  capacity: undefined,
  eventCode: "",
  hasFood: false,
  needsFlyers: false,
  needsGraphics: false,
  needsASFunding: false,
  estimatedAttendance: 0,
  files: [],
  invoices: [],
};

export function EventRequestWizardModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: EventRequestWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    ...defaultFormData,
    ...initialData,
    startDate: initialData?.startDate || Date.now(),
    endDate: initialData?.endDate || Date.now() + 3600000,
    invoices: initialData?.invoices || [],
    files: initialData?.files || [],
  });

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  const updateFormData = (data: Partial<EventFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return disclaimerAccepted;
      case 2:
        return (
          formData.eventName.trim() &&
          formData.eventDescription.trim() &&
          formData.eventType
        );
      case 3:
        return (
          formData.location.trim() &&
          formData.startDate &&
          formData.endDate &&
          formData.eventCode.trim()
        );
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
    setCurrentStep(1);
    setDisclaimerAccepted(false);
    setFormData(defaultFormData);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <DisclaimerSection
            checked={disclaimerAccepted}
            onCheckedChange={setDisclaimerAccepted}
          />
        );
      case 2:
        return (
          <BasicInfoSection
            data={{
              eventName: formData.eventName,
              eventDescription: formData.eventDescription,
              eventType: formData.eventType,
              department: formData.department,
            }}
            onChange={(data) =>
              updateFormData(data as Partial<EventFormData>)
            }
          />
        );
      case 3:
        return (
          <LogisticsSection
            data={{
              location: formData.location,
              startDate: formData.startDate,
              endDate: formData.endDate,
              capacity: formData.capacity,
              eventCode: formData.eventCode,
              hasFood: formData.hasFood,
            }}
            onChange={(data) => updateFormData(data)}
          />
        );
      case 4:
        return (
          <MarketingSection
            data={{
              needsFlyers: formData.needsFlyers,
              needsGraphics: formData.needsGraphics,
              estimatedAttendance: formData.estimatedAttendance,
            }}
            onChange={(data) => updateFormData(data)}
          />
        );
      case 5:
        return (
          <FundingSection
            data={{
              needsASFunding: formData.needsASFunding,
              invoices: formData.invoices,
            }}
            onChange={(data) => updateFormData(data)}
          />
        );
      case 6:
        return <EventReviewSection data={formData} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Event Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Step {currentStep} of {steps.length}
              </span>
              <span className="text-gray-500">{steps[currentStep - 1].title}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-400">
              {steps.map((step) => (
                <span
                  key={step.id}
                  className={
                    step.id === currentStep
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : step.id < currentStep
                      ? "text-green-600 dark:text-green-400"
                      : ""
                  }
                >
                  {step.id}
                </span>
              ))}
            </div>
          </div>

          <div className="min-h-[300px]">{renderStepContent()}</div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
