import React from "react";
import { ConvexClientProvider } from "../providers/ConvexClientProvider";
import OnboardingContent from "./OnboardingContent";
import { Toaster } from "sonner";

export default function OnboardingApp() {
    return (
        <ConvexClientProvider>
            <OnboardingContent />
            <Toaster richColors position="top-center" />
        </ConvexClientProvider>
    );
}
