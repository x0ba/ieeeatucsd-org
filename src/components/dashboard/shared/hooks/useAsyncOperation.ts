import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncOperationOptions {
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  onTimeout?: () => void;
  showRetry?: boolean;
}

export interface AsyncOperationState<T = any> {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
  isTimeout: boolean;
  retryCount: number;
  lastUpdated: Date | null;
}

export interface UseAsyncOperationReturn<T = any> {
  state: AsyncOperationState<T>;
  execute: (asyncFn: () => Promise<T>, options?: AsyncOperationOptions) => Promise<T | null>;
  reset: () => void;
  retry: () => Promise<T | null>;
  clearError: () => void;
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 1000; // 1 second

/**
 * Enhanced async operation hook with timeout, retry, and cleanup support
 * Prevents indefinite loading states and provides comprehensive error handling
 */
export function useAsyncOperation<T = any>(
  initialState?: Partial<AsyncOperationState<T>>
): UseAsyncOperationReturn<T> {
  const [state, setState] = useState<AsyncOperationState<T>>({
    isLoading: false,
    error: null,
    data: null,
    isTimeout: false,
    retryCount: 0,
    lastUpdated: null,
    ...initialState,
  });

  const activeOperationRef = useRef<{
    abortController: AbortController | null;
    timeoutId: NodeJS.Timeout | null;
  }>({
    abortController: null,
    timeoutId: null,
  });

  const cleanup = useCallback(() => {
    if (activeOperationRef.current.timeoutId) {
      clearTimeout(activeOperationRef.current.timeoutId);
      activeOperationRef.current.timeoutId = null;
    }
    if (activeOperationRef.current.abortController) {
      activeOperationRef.current.abortController.abort();
      activeOperationRef.current.abortController = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: null,
      data: null,
      isTimeout: false,
      retryCount: 0,
      lastUpdated: null,
    }));
  }, [cleanup]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      isTimeout: false,
    }));
  }, []);

  const execute = useCallback(
    async (
      asyncFn: () => Promise<T>,
      options: AsyncOperationOptions = {}
    ): Promise<T | null> => {
      const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        retryCount = DEFAULT_RETRY_COUNT,
        retryDelayMs = DEFAULT_RETRY_DELAY_MS,
        onSuccess,
        onError,
        onTimeout,
        showRetry = true,
      } = options;

      cleanup();

      let attemptCount = 0;
      let lastError: Error | null = null;

      const attemptExecution = async (): Promise<T> => {
        attemptCount++;
        
        const abortController = new AbortController();
        activeOperationRef.current.abortController = abortController;

        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
          isTimeout: false,
          retryCount: attemptCount - 1,
        }));

        try {
          // Set up timeout
          const timeoutPromise = new Promise<never>((_, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            activeOperationRef.current.timeoutId = timeoutId;
          });

          // Race between the actual operation and timeout
          const result = await Promise.race([
            asyncFn().then((result) => {
              if (abortController.signal.aborted) {
                throw new Error('Operation was aborted');
              }
              return result;
            }),
            timeoutPromise,
          ]);

          cleanup();

          setState(prev => ({
            ...prev,
            isLoading: false,
            error: null,
            data: result,
            isTimeout: false,
            lastUpdated: new Date(),
          }));

          onSuccess?.(result);
          return result;
        } catch (error) {
          cleanup();

          const err = error instanceof Error ? error : new Error(String(error));
          lastError = err;

          // Check if it's a timeout
          const isTimeout = err.message.includes('timed out');
          
          if (isTimeout) {
            onTimeout?.();
          }

          // Retry logic
          if (attemptCount < retryCount && showRetry) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: err,
              isTimeout,
              retryCount: attemptCount,
            }));

            onError?.(err);

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            return attemptExecution();
          }

          // Final failure
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: err,
            isTimeout,
            retryCount: attemptCount,
          }));

          onError?.(err);
          throw err;
        }
      };

      try {
        return await attemptExecution();
      } catch (error) {
        return null;
      }
    },
    [cleanup]
  );

  const retry = useCallback(async (): Promise<T | null> => {
    if (state.data) {
      // Retry with last successful function if we have it
      // This would need to be stored, for now just clear error
      clearError();
      return null;
    }
    return null;
  }, [state.data, clearError]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    state,
    execute,
    reset,
    retry,
    clearError,
  };
}

/**
 * Specialized hook for file upload operations with progress tracking
 */
export function useFileUpload(options: AsyncOperationOptions = {}) {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const operation = useAsyncOperation<{ url: string; filename: string }[]>();

  const uploadFile = useCallback(
    async (
      file: File,
      uploadFn: (file: File, progressCallback: (progress: number) => void) => Promise<string>
    ): Promise<{ url: string; filename: string } | null> => {
      const fileId = `${Date.now()}_${file.name}`;
      
      try {
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        const url = await uploadFn(file, (progress) => {
          setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
        });
        
        const result = { url, filename: file.name };
        
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        
        return result;
      } catch (error) {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        throw error;
      }
    },
    []
  );

  return {
    ...operation,
    uploadProgress,
    uploadFile,
  };
}

/**
 * Specialized hook for data fetching with caching support
 */
export function useDataFetch<T = any>(
  key: string,
  options: AsyncOperationOptions & { cacheTimeMs?: number } = {}
) {
  const { cacheTimeMs = 5 * 60 * 1000, ...asyncOptions } = options; // 5 minutes default cache
  const operation = useAsyncOperation<T>();

  const fetchWithCache = useCallback(
    async (fetchFn: () => Promise<T>): Promise<T | null> => {
      // Check cache first
      const cacheKey = `async_cache_${key}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < cacheTimeMs) {
            operation.setState(prev => ({
              ...prev,
              data,
              isLoading: false,
              error: null,
              lastUpdated: new Date(timestamp),
            }));
            return data;
          }
        } catch {
          // Cache corrupted, ignore
        }
      }

      // Fetch fresh data
      const result = await operation.execute(fetchFn, asyncOptions);
      
      if (result) {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: result,
            timestamp: Date.now(),
          })
        );
      }
      
      return result;
    },
    [key, cacheTimeMs, asyncOptions, operation]
  );

  const invalidateCache = useCallback(() => {
    const cacheKey = `async_cache_${key}`;
    localStorage.removeItem(cacheKey);
  }, [key]);

  return {
    ...operation,
    fetchWithCache,
    invalidateCache,
  };
}