import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ErrorMessage {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  duration?: number;
  retryAction?: () => void;
  retryLabel?: string;
}

interface ErrorContextType {
  errors: ErrorMessage[];
  addError: (error: Omit<ErrorMessage, 'id'>) => void;
  removeError: (id: string) => void;
  clearAllErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  const addError = (error: Omit<ErrorMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newError: ErrorMessage = {
      ...error,
      id,
      duration: error.duration || 5000, // Default 5 seconds
    };

    setErrors(prev => [...prev, newError]);

    // Auto-remove error after duration
    if (newError.duration && newError.duration > 0) {
      setTimeout(() => {
        removeError(id);
      }, newError.duration);
    }
  };

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  return (
    <ErrorContext.Provider value={{ errors, addError, removeError, clearAllErrors }}>
      {children}
    </ErrorContext.Provider>
  );
};