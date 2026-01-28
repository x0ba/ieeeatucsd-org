import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ConvexErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Convex Error Boundary caught an error:', error, errorInfo);
    
    // Check if it's a Convex provider error
    if (error.message.includes('Convex client') || error.message.includes('ConvexProvider')) {
      console.log('Convex provider error detected, this is likely a timing issue during initialization');
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading application...</p>
              <p className="text-sm text-gray-500 mt-2">
                Please wait while we connect to the backend
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
