"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Utensils, Lock, ArrowRight, Check } from "lucide-react";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string, foodPreference?: string) => void;
  eventHasFood: boolean;
  eventName?: string;
  isSubmitting?: boolean;
}

const FOOD_PREFERENCES = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten-free", label: "Gluten Free" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "no-preference", label: "No Preference" },
];

export function CheckInModal({
  isOpen,
  onClose,
  onSubmit,
  eventHasFood,
  eventName = "this event",
  isSubmitting = false,
}: CheckInModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [foodPreference, setFoodPreference] = useState("");
  const [error, setError] = useState("");

  const handleCodeSubmit = () => {
    if (!code.trim()) {
      setError("Please enter the event code");
      return;
    }
    setError("");
    if (eventHasFood) {
      setStep(2);
    } else {
      onSubmit(code.trim().toUpperCase());
    }
  };

  const handleFoodSubmit = () => {
    onSubmit(code.trim().toUpperCase(), foodPreference || undefined);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setCode("");
      setFoodPreference("");
      setError("");
    }, 150);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              {step === 1 ? (
                <Lock className="w-5 h-5" />
              ) : (
                <Utensils className="w-5 h-5" />
              )}
            </div>
            <div>
              <DialogTitle>
                {step === 1 ? "Enter Event Code" : "Food Preference"}
              </DialogTitle>
              <DialogDescription>
                {step === 1
                  ? `Enter the code to check in to ${eventName}`
                  : "Select your dietary preference for this event"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-code">Event Code</Label>
              <Input
                id="event-code"
                placeholder="Enter code (e.g., IEEE2024)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCodeSubmit();
                }}
                className="text-center text-lg font-mono tracking-wider uppercase"
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Code verified!</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="food-preference">
                Dietary Preference (Optional)
              </Label>
              <Select
                value={foodPreference}
                onValueChange={setFoodPreference}
              >
                <SelectTrigger id="food-preference">
                  <SelectValue placeholder="Select your preference" />
                </SelectTrigger>
                <SelectContent>
                  {FOOD_PREFERENCES.map((pref) => (
                    <SelectItem key={pref.value} value={pref.value}>
                      {pref.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This helps us order the right amount of food for everyone.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {step === 2 && (
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          <Button
            onClick={step === 1 ? handleCodeSubmit : handleFoodSubmit}
            disabled={isSubmitting || (step === 1 && !code.trim())}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Checking in...
              </>
            ) : step === 1 ? (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Complete Check-in
                <Check className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
