import { ErrorMessage } from '../contexts/ErrorContext';

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  delay: 1000,
  backoff: true,
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = defaultRetryOptions
): Promise<T> => {
  const { maxRetries = 3, delay = 1000, backoff = true } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with optional exponential backoff
      const currentDelay = backoff ? delay * Math.pow(2, attempt) : delay;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw lastError!;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'An unexpected error occurred';
};

export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('connection') ||
      error.name === 'NetworkError'
    );
  }
  return false;
};

export const createErrorMessage = (
  message: string,
  type: ErrorMessage['type'] = 'error',
  retryAction?: () => void,
  retryLabel?: string
): Omit<ErrorMessage, 'id'> => ({
  message,
  type,
  retryAction,
  retryLabel,
  duration: type === 'success' ? 3000 : 5000,
});