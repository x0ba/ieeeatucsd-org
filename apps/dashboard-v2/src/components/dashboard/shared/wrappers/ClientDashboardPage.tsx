import React, { type ComponentType } from "react";
import ClientDashboardLayout from "./ClientDashboardLayout";

type AnyProps = Record<string, unknown>;

interface ClientDashboardPageProps<P extends AnyProps = AnyProps> {
  currentPath?: string;
  Content: ComponentType<P>;
  contentProps?: P;
}

/**
 * Hydrates the dashboard layout and a page's React content within a single React tree.
 * Ensures Convex providers inside ClientDashboardLayout wrap every page.
 */
export default function ClientDashboardPage<P extends AnyProps = AnyProps>({
  currentPath,
  Content,
  contentProps,
}: ClientDashboardPageProps<P>) {
  return (
    <ClientDashboardLayout currentPath={currentPath}>
      <Content {...(contentProps as P)} />
    </ClientDashboardLayout>
  );
}
