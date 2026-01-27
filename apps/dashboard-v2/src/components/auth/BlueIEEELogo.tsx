import React from "react";

interface BlueIEEELogoProps {
  className?: string;
}

export default function BlueIEEELogo({
  className = "w-32 h-auto",
}: BlueIEEELogoProps) {
  return (
    <img
      src="/logos/blue_logo_only.svg"
      alt="IEEE UCSD Logo"
      className={className}
      role="img"
      aria-label="IEEE UCSD Logo"
    />
  );
}
