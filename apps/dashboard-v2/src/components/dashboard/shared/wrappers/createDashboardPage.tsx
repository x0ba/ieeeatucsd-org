import React, { type ComponentType } from "react";
import ClientDashboardPage from "./ClientDashboardPage";

type AnyProps = Record<string, unknown>;

export default function createDashboardPage<P extends AnyProps = AnyProps>(
  Content: ComponentType<P>,
  currentPath: string,
) {
  return function DashboardPageWrapper(props: P) {
    return (
      <ClientDashboardPage<P>
        currentPath={currentPath}
        Content={Content}
        contentProps={props}
      />
    );
  };
}
