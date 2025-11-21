# Loading State Management Guide

This guide explains the comprehensive loading state management system implemented for the IEEE UCSD dashboard to ensure no async operations leave users in indefinite loading states.

## Overview

The loading state management system consists of:

1. **useAsyncOperation Hook** - Core utility for managing async operations with timeouts, retries, and cleanup
2. **LoadingContext** - Global loading state management across the dashboard
3. **AsyncErrorBoundary** - Error boundary component for catching and handling async operation failures
4. **LoadingIndicator Components** - Reusable loading UI components

## Core Features

### ✅ Timeout Protection
- All async operations have configurable timeouts (default: 30s)
- Automatic timeout detection and user notification
- Prevents indefinite loading states

### ✅ Retry Logic
- Configurable retry attempts (default: 3)
- Exponential backoff for failed operations
- Smart retry only for retryable errors

### ✅ Progress Tracking
- File upload progress tracking
- Real-time progress updates
- Progress bars and percentage displays

### ✅ Error Handling
- Comprehensive error categorization
- User-friendly error messages
- Automatic error recovery options
- Development error details

### ✅ Cleanup
- Automatic cleanup on component unmount
- Abort controller support
- Memory leak prevention

## Usage Examples

### Basic Async Operation

```tsx
import { useAsyncOperation } from '../shared/hooks/useAsyncOperation';

function MyComponent() {
  const operation = useAsyncOperation<MyData>();

  const handleLoadData = async () => {
    const result = await operation.execute(
      () => fetch('/api/data'),
      {
        timeoutMs: 15000, // 15 seconds
        retryCount: 2,
        onError: (error) => console.error('Operation failed:', error),
        onTimeout: () => console.warn('Operation timed out'),
      }
    );

    if (result) {
      // Handle success
    }
  };

  return (
    <div>
      {operation.state.isLoading && <div>Loading...</div>}
      {operation.state.error && <div>Error: {operation.state.error.message}</div>}
      {operation.state.data && <div>Data: {JSON.stringify(operation.state.data)}</div>}
    </div>
  );
}
```

### File Upload with Progress

```tsx
import { useFileUpload } from '../shared/hooks/useAsyncOperation';

function FileUploadComponent() {
  const { uploadFile, uploadProgress } = useFileUpload({ timeoutMs: 120000 });

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadFile(file, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });

      if (result) {
        console.log('File uploaded successfully:', result);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      {Object.entries(uploadProgress).map(([fileId, progress]) => (
        <div key={fileId}>
          <div>Uploading {fileId}: {progress}%</div>
        </div>
      ))}
    </div>
  );
}
```

### Global Loading Management

```tsx
import { useLoadingOperation } from '../shared/contexts/LoadingContext';

function MyComponent() {
  const { start, stop, isLoading, error } = useLoadingOperation('my-operation');

  const handleOperation = async () => {
    start('Processing data...', 10000);

    try {
      // Perform async operation
      await processData();
      stop();
    } catch (error) {
      stop(error.message);
    }
  };

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

### Error Boundary Usage

```tsx
import { AsyncErrorBoundary } from '../shared/components/AsyncErrorBoundary';

function App() {
  return (
    <AsyncErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error service
        console.error('Application error:', error, errorInfo);
      }}
      showRetry={true}
      showHomeButton={true}
    >
      <MyApp />
    </AsyncErrorBoundary>
  );
}
```

## Loading State Categories

### 1. Authentication Operations
- **Timeout**: 15 seconds
- **Retry**: 2 attempts
- **Loading States**: `auth-loading`, `auth-role-fetch`

### 2. Data Fetching Operations
- **Timeout**: 20 seconds (Firestore operations)
- **Retry**: 3 attempts
- **Loading States**: `reimbursements-fetch`, `deposits-fetch`, `users-fetch`

### 3. File Upload Operations
- **Timeout**: 2 minutes (large files)
- **Progress**: Real-time percentage tracking
- **Retry**: 3 attempts
- **Loading States**: `file-upload`, `receipt-upload`, `deposit-files`

### 4. API Calls
- **Timeout**: 30 seconds
- **Retry**: 2 attempts
- **Loading States**: `api-call`, `email-send`, `notification-trigger`

## Error Handling Strategy

### Error Categories
1. **Network Errors** - Connection issues, timeouts
2. **Permission Errors** - Access denied, authorization failures
3. **Validation Errors** - Invalid data, missing required fields
4. **Timeout Errors** - Operations exceeding time limits
5. **Server Errors** - API failures, database issues

### Error Recovery
1. **Automatic Retry** - For transient failures
2. **User Notification** - Clear error messages with actions
3. **Fallback States** - Graceful degradation
4. **Error Logging** - Comprehensive error tracking

## Best Practices

### ✅ Do's
- Set appropriate timeouts for each operation type
- Provide clear loading messages
- Show progress for long-running operations
- Handle errors gracefully with user-friendly messages
- Clean up resources on component unmount
- Use error boundaries for critical operations

### ❌ Don'ts
- Don't leave users in indefinite loading states
- Don't show technical error messages to end users
- Don't retry non-retryable errors indefinitely
- Don't forget to clean up async operations
- Don't ignore timeout scenarios

## Migration Guide

### From Old Pattern
```tsx
// Old way - prone to issues
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await fetch('/api/data');
    setData(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### To New Pattern
```tsx
// New way - robust and reliable
const { state, execute } = useAsyncOperation();

const fetchData = async () => {
  const result = await execute(
    () => fetch('/api/data'),
    {
      timeoutMs: 15000,
      retryCount: 2,
      onError: (error) => setError(error.message),
    }
  );

  if (result) {
    setData(result);
  }
};
```

## Performance Considerations

### Memory Management
- All async operations clean up on unmount
- Abort controllers prevent memory leaks
- Timeout cleanup prevents hanging operations

### User Experience
- Loading states are visually clear and informative
- Progress indicators provide real-time feedback
- Error states are actionable and helpful

### Accessibility
- Loading indicators have proper ARIA labels
- Error messages are screen reader friendly
- Focus management during loading states

## Testing

### Unit Testing
```tsx
import { renderHook, act } from '@testing-library/react';
import { useAsyncOperation } from '../hooks/useAsyncOperation';

test('should handle successful operation', async () => {
  const { result, execute } = renderHook(() => useAsyncOperation());
  
  const mockFn = jest.fn().mockResolvedValue('success');
  
  await act(async () => {
    const operationResult = await execute(mockFn);
  });
  
  expect(result.current.data).toBe('success');
  expect(result.current.isLoading).toBe(false);
  expect(result.current.error).toBe(null);
});
```

### Integration Testing
- Test timeout scenarios
- Test error handling
- Test retry logic
- Test cleanup on unmount
- Test progress tracking

## Troubleshooting

### Common Issues
1. **Infinite Loading** - Check timeout values and cleanup
2. **Memory Leaks** - Verify abort controllers are used
3. **Race Conditions** - Ensure proper state management
4. **Error Cascades** - Use error boundaries to prevent propagation

### Debug Tools
- Browser DevTools for loading state inspection
- Network tab for API request monitoring
- Console logging for async operation tracking

## Implementation Status

✅ **Completed Components**
- [x] useAsyncOperation hook
- [x] LoadingContext provider
- [x] AsyncErrorBoundary component
- [x] LoadingIndicator components
- [x] Enhanced authentication hooks
- [x] Updated data fetching components
- [x] Enhanced file upload components

✅ **Updated Pages**
- [x] Authentication (SignIn, useAuth)
- [x] Reimbursement pages
- [x] Fund deposits page
- [x] Dashboard layout with error boundaries

✅ **Testing Recommendations**
- Test all timeout scenarios
- Verify error boundary functionality
- Check memory usage during operations
- Validate loading state transitions

This comprehensive loading state management system ensures that no async operation in the dashboard can leave users in indefinite loading states, providing a smooth and reliable user experience.