import React from 'react';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useLoadingOperation } from '../contexts/LoadingContext';

interface LoadingIndicatorProps {
  operationKey: string;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'progress' | 'dots';
  showProgress?: boolean;
  progress?: number;
  timeout?: number;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function LoadingIndicator({
  operationKey,
  message,
  size = 'md',
  variant = 'spinner',
  showProgress = false,
  progress,
  timeout,
  className = '',
}: LoadingIndicatorProps) {
  const { isLoading, error, isTimeout } = useLoadingOperation(operationKey);

  if (!isLoading && !error && !isTimeout) {
    return null;
  }

  const renderContent = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div className="flex items-center justify-center">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
            {message && <span className="ml-2 text-sm text-gray-600">{message}</span>}
          </div>
        );

      case 'progress':
        return (
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{message || 'Processing...'}</span>
              {showProgress && progress !== undefined && (
                <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
          </div>
        );

      case 'dots':
        return (
          <div className="flex items-center justify-center space-x-1">
            {[0, 1, 2].map((dot) => (
              <div
                key={dot}
                className={`w-2 h-2 rounded-full bg-blue-600 animate-pulse ${
                  dot === 0 ? 'opacity-100' : 'opacity-40'
                }`}
                style={{
                  animationDelay: `${dot * 150}ms`,
                }}
              />
            ))}
            {message && <span className="ml-2 text-sm text-gray-600">{message}</span>}
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
            {message && <span className="ml-2 text-sm text-gray-600">{message}</span>}
          </div>
        );
    }
  };

  const getContainerClasses = () => {
    const baseClasses = 'flex items-center justify-center p-4 rounded-lg border';
    
    if (error) {
      return `${baseClasses} border-red-200 bg-red-50`;
    }
    
    if (isTimeout) {
      return `${baseClasses} border-yellow-200 bg-yellow-50`;
    }
    
    return `${baseClasses} border-blue-200 bg-blue-50`;
  };

  const getIcon = () => {
    if (error) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    
    if (isTimeout) {
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
    
    return <CheckCircle className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className={`bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 ${getContainerClasses()}`}>
        <div className="flex items-center space-x-3">
          {getIcon()}
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              {error ? 'Error' : isTimeout ? 'Timeout' : 'Loading'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {error?.message || message || 'Operation in progress...'}
            </p>
            {isTimeout && timeout && (
              <p className="text-xs text-gray-500 mt-2">
                Operation timed out after {timeout}ms
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple inline loading spinner for buttons and small areas
 */
export function InlineLoadingSpinner({ size = 'sm', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 ${className}`} />
  );
}

/**
 * Loading overlay for full-screen operations
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-gray-900">{message}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for cards and content areas
 */
export function LoadingSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Loading button with integrated spinner
 */
export function LoadingButton({
  children,
  isLoading,
  disabled,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  isLoading: boolean;
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`relative ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <InlineLoadingSpinner size="sm" />
        </div>
      )}
      <span className={isLoading ? 'opacity-0' : ''}>
        {children}
      </span>
    </button>
  );
}