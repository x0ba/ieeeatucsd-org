import React, { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { Spinner } from '@heroui/react';
import { LoadingProvider, GlobalLoadingIndicator } from '../contexts/LoadingContext';
import { AsyncErrorBoundary } from '../components/AsyncErrorBoundary';
import { useAuth } from '../../../../hooks/useAuth';

interface ClientDashboardLayoutProps {
  currentPath?: string;
  children?: React.ReactNode;
}

/**
 * Enhanced client-side wrapper for DashboardLayout that prevents hydration issues
 * and provides comprehensive loading state management and error handling.
 *
 * This component ensures that the DashboardLayout only renders on the client side,
 * preventing hydration mismatches between server and client rendering.
 * It handles authentication state and browser-specific APIs safely.
 */
export default function ClientDashboardLayout({
  currentPath,
  children
}: ClientDashboardLayoutProps) {
  const [isClient, setIsClient] = useState(false);
  const { loading: authLoading, error: authError } = useAuth();

  useEffect(() => {
    // Only render on client side after component mounts
    setIsClient(true);
  }, []);

  // Return a loading state or null during server-side rendering
  if (!isClient) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" color="primary" className="mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if auth failed
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-center">
          Authentication Error: {authError}
        </div>
      </div>
    );
  }

  // Only render the actual DashboardLayout on the client side
  return (
    <LoadingProvider>
      <AsyncErrorBoundary>
        <GlobalLoadingIndicator />
        <DashboardLayout currentPath={currentPath}>
          {children}
        </DashboardLayout>
      </AsyncErrorBoundary>
    </LoadingProvider>
  );
}