import React from "react";
import ClientDashboardPage from "../../shared/wrappers/ClientDashboardPage";
import NAVIGATION_PATHS from "../../shared/types/navigation";
import OverviewContent from "./OverviewContent";

export default function OverviewPage() {
  return (
    <ClientDashboardPage
      currentPath={NAVIGATION_PATHS.OVERVIEW}
      Content={OverviewContent}
    />
  );
}
