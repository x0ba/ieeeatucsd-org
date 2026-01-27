import React from "react";
import { ConvexClientProvider } from "../providers/ConvexClientProvider";
import SignInContent from "./SignInContent";
import { Toaster } from "sonner";

export default function SignInApp() {
    return (
        <ConvexClientProvider>
            <SignInContent />
            <Toaster richColors />
        </ConvexClientProvider>
    );
}
