import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

export interface LoadingState {
  [key: string]: {
    isLoading: boolean;
    progress?: number;
    message?: string;
    error?: string;
    startTime?: number;
    timeout?: number;
  };
}

export interface LoadingContextType {
  loadingStates: LoadingState;
  startLoading: (key: string, message?: string, timeout?: number) => void;
  stopLoading: (key: string, error?: string) => void;
  updateProgress: (key: string, progress: number) => void;
  isGlobalLoading: boolean;
  getActiveOperations: () => string[];
  clearAllLoading: () => void;
}

type LoadingAction =
  | { type: 'START_LOADING'; payload: { key: string; message?: string; timeout?: number } }
  | { type: 'STOP_LOADING'; payload: { key: string; error?: string } }
  | { type: 'UPDATE_PROGRESS'; payload: { key: string; progress: number } }
  | { type: 'CLEAR_ALL_LOADING' };

const initialState: LoadingState = {};

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'START_LOADING':
      return {
        ...state,
        [action.payload.key]: {
          isLoading: true,
          message: action.payload.message,
          progress: 0,
          startTime: Date.now(),
          timeout: action.payload.timeout,
          error: undefined,
        },
      };

    case 'STOP_LOADING':
      const { [action.payload.key]: removed, ...rest } = state;
      if (removed) {
        return {
          ...rest,
          ...(action.payload.error && {
            [action.payload.key]: {
              ...removed,
              isLoading: false,
              error: action.payload.error,
            },
          }),
        };
      }
      return state;

    case 'UPDATE_PROGRESS':
      if (state[action.payload.key]) {
        return {
          ...state,
          [action.payload.key]: {
            ...state[action.payload.key],
            progress: action.payload.progress,
          },
        };
      }
      return state;

    case 'CLEAR_ALL_LOADING':
      return {};

    default:
      return state;
  }
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingStates, dispatch] = useReducer(loadingReducer, initialState);

  // Auto-timeout cleanup
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    Object.entries(loadingStates).forEach(([key, state]) => {
      if (state.isLoading && state.timeout && state.startTime) {
        const interval = setInterval(() => {
          const elapsed = Date.now() - state.startTime!;
          if (elapsed > state.timeout) {
            dispatch({
              type: 'STOP_LOADING',
              payload: { key, error: `Operation timed out after ${state.timeout}ms` },
            });
          }
        }, 1000); // Check every second

        intervals.push(interval);
      }
    });

    return () => {
      intervals.forEach(clearInterval);
    };
  }, [loadingStates]);

  const startLoading = useCallback((key: string, message?: string, timeout?: number) => {
    dispatch({ type: 'START_LOADING', payload: { key, message, timeout } });
  }, []);

  const stopLoading = useCallback((key: string, error?: string) => {
    dispatch({ type: 'STOP_LOADING', payload: { key, error } });
  }, []);

  const updateProgress = useCallback((key: string, progress: number) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: { key, progress } });
  }, []);

  const getActiveOperations = useCallback(() => {
    return Object.entries(loadingStates)
      .filter(([_, state]) => state.isLoading)
      .map(([key]) => key);
  }, [loadingStates]);

  const clearAllLoading = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_LOADING' });
  }, []);

  const isGlobalLoading = Object.values(loadingStates).some(state => state.isLoading);

  const value: LoadingContextType = {
    loadingStates,
    startLoading,
    stopLoading,
    updateProgress,
    isGlobalLoading,
    getActiveOperations,
    clearAllLoading,
  };

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading(): LoadingContextType {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

/**
 * Hook for managing a specific loading operation
 */
export function useLoadingOperation(operationKey: string) {
  const { startLoading, stopLoading, updateProgress, loadingStates } = useLoading();

  const start = useCallback((message?: string, timeout?: number) => {
    startLoading(operationKey, message, timeout);
  }, [operationKey, startLoading]);

  const stop = useCallback((error?: string) => {
    stopLoading(operationKey, error);
  }, [operationKey, stopLoading]);

  const update = useCallback((progress: number) => {
    updateProgress(operationKey, progress);
  }, [operationKey, updateProgress]);

  const isLoading = loadingStates[operationKey]?.isLoading || false;
  const error = loadingStates[operationKey]?.error;
  const message = loadingStates[operationKey]?.message;
  const progress = loadingStates[operationKey]?.progress;

  return {
    isLoading,
    error,
    message,
    progress,
    start,
    stop,
    update,
  };
}

/**
 * Global loading indicator component
 */
export function GlobalLoadingIndicator() {
  const { isGlobalLoading, getActiveOperations } = useLoading();

  if (!isGlobalLoading) {
    return null;
  }

  const activeOperations = getActiveOperations();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2 shadow-lg">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="text-sm font-medium">
            Processing {activeOperations.length} operation{activeOperations.length > 1 ? 's' : ''}...
          </span>
        </div>
        <div className="text-xs opacity-75">
          {activeOperations.join(', ')}
        </div>
      </div>
    </div>
  );
}