import React from "react";
import { Toaster } from "sonner";

import { ConvexClientProvider } from "../providers/ConvexClientProvider";
import SignOutContent from "./SignOutContent";

export default function SignOutApp() {
  return (
    <ConvexClientProvider>
      <SignOutContent />
      <Toaster richColors />
    </ConvexClientProvider>
  );
}
