import React, { Component } from 'react';
import pkg from 'react';
const { ReactNode, ErrorInfo } = pkg;
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  showHomeButton?: boolean;
  customMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    console.error('AsyncErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to external service if needed
    this.logErrorToService(error, errorInfo);
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(clearTimeout);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // You can integrate with error logging services like Sentry, LogRocket, etc.
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Store in localStorage for debugging
      const existingErrors = JSON.parse(localStorage.getItem('async_errors') || '[]');
      existingErrors.push(errorData);
      
      // Keep only last 50 errors
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }
      
      localStorage.setItem('async_errors', JSON.stringify(existingErrors));
    } catch (e) {
      console.warn('Failed to log error:', e);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));

    // Clear any existing retry timeouts
    this.retryTimeouts.forEach(clearTimeout);
    this.retryTimeouts = [];

    // Add a small delay before retry
    const timeout = setTimeout(() => {
      // Force a re-render by updating state
      this.forceUpdate();
    }, 1000);

    this.retryTimeouts.push(timeout);
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard/overview';
  };

  private getErrorCategory = (error: Error): string => {
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'network';
    }
    if (error.message.includes('timeout')) {
      return 'timeout';
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'permission';
    }
    if (error.message.includes('validation')) {
      return 'validation';
    }
    return 'general';
  };

  private getErrorMessage = (error: Error): string => {
    if (this.props.customMessage) {
      return this.props.customMessage;
    }

    const category = this.getErrorCategory(error);
    
    switch (category) {
      case 'network':
        return 'Network connection error. Please check your internet connection and try again.';
      case 'timeout':
        return 'Operation timed out. Please try again.';
      case 'permission':
        return 'You don\'t have permission to perform this action.';
      case 'validation':
        return 'Invalid data provided. Please check your input and try again.';
      default:
        return 'Something went wrong. Please try again or contact support if the issue persists.';
    }
  };

  private getErrorActions = () => {
    const { showRetry = true, showHomeButton = true } = this.props;
    const { retryCount } = this.state;
    const error = this.state.error!;

    const actions = [];

    if (showRetry && retryCount < this.maxRetries) {
      actions.push(
        <button
          key="retry"
          onClick={this.handleRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry ({this.maxRetries - retryCount} attempts left)
        </button>
      );
    }

    if (showHomeButton) {
      actions.push(
        <button
          key="home"
          onClick={this.handleGoHome}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Home className="w-4 h-4 mr-2" />
          Go to Dashboard
        </button>
      );
    }

    return actions;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const error = this.state.error!;
      const errorMessage = this.getErrorMessage(error);
      const actions = this.getErrorActions();

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Something went wrong
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {errorMessage}
                </p>
                
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">
                      Error Details (Development)
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                      <div className="mb-2">
                        <strong>Error:</strong> {error.message}
                      </div>
                      {error.stack && (
                        <div className="mb-2">
                          <strong>Stack:</strong>
                          <pre className="whitespace-pre-wrap break-all">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap break-all">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>

              <div className="mt-6 flex flex-col space-y-3">
                {actions}
              </div>

              {this.state.retryCount >= this.maxRetries && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Maximum retry attempts reached. If this problem persists, please contact support.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for error boundary integration
 */
export function useAsyncErrorBoundary() {
  const handleError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    // You can add additional error handling logic here
    console.error('Async operation failed:', error);
    
    // Show user-friendly toast or notification
    // This could integrate with your existing toast system
  }, []);

  return { handleError };
}