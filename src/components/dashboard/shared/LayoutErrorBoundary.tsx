import React, { Component } from 'react';
import pkg from 'react';
const { ReactNode, ErrorInfo } = pkg;
import { FallbackLayout } from './FallbackLayout';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary specifically for layout rendering.
 * Catches any errors during layout rendering and falls back to minimal layout.
 * Logs errors for debugging without affecting user experience.
 */
export class LayoutErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('[LayoutErrorBoundary] Layout rendering error caught:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });

    // Store error info in state
    this.setState({
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external error tracking service if available
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      try {
        (window as any).errorTracker.captureException(error, {
          context: 'LayoutErrorBoundary',
          componentStack: errorInfo.componentStack,
        });
      } catch (trackingError) {
        console.error('[LayoutErrorBoundary] Failed to log to error tracker:', trackingError);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback layout
      return (
        <FallbackLayout 
          reason="error" 
          errorMessage={this.state.error?.message}
        >
          {this.props.children}
        </FallbackLayout>
      );
    }

    return this.props.children;
  }
}