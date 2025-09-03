import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, RotateCcw } from 'lucide-react';
import { useError, ErrorMessage } from '../contexts/ErrorContext';

const ErrorToast: React.FC = () => {
  const { errors, removeError } = useError();

  const getIcon = (type: ErrorMessage['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getBackgroundColor = (type: ErrorMessage['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-900/90 border-red-500/50';
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-500/50';
      case 'success':
        return 'bg-green-900/90 border-green-500/50';
      case 'info':
        return 'bg-blue-900/90 border-blue-500/50';
      default:
        return 'bg-red-900/90 border-red-500/50';
    }
  };

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md">
      {errors.map((error) => (
        <div
          key={error.id}
          className={`${getBackgroundColor(error.type)} backdrop-blur-sm border rounded-lg p-4 shadow-lg animate-in slide-in-from-right duration-300`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(error.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-relaxed">
                {error.message}
              </p>
              
              {error.retryAction && (
                <button
                  onClick={() => {
                    error.retryAction?.();
                    removeError(error.id);
                  }}
                  className="mt-2 inline-flex items-center text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {error.retryLabel || 'Try Again'}
                </button>
              )}
            </div>
            
            <button
              onClick={() => removeError(error.id)}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ErrorToast;