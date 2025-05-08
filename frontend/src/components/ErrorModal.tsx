import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: string;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  details
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="error-modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-red-50 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="error-modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                  
                  {details && (
                    <div className="mt-3 p-3 bg-gray-100 rounded-md text-xs text-gray-600 font-mono overflow-x-auto">
                      {details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
            {details && (
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  // Copy error details to clipboard
                  navigator.clipboard.writeText(details);
                }}
              >
                Copy Details
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export a hook for easier error modal management
export const useErrorModal = () => {
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    title: 'Error',
    message: 'An error occurred',
    details: undefined
  });
  
  const showError = (title: string, message: string, details?: string) => {
    setModalState({
      isOpen: true,
      title,
      message,
      details
    });
  };
  
  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };
  
  // Generate a user-friendly error message for email sending errors
  const showEmailError = (error: any) => {
    let title = 'Failed to Send Email';
    let message = 'The system was unable to send your email. Please try again later.';
    
    if (typeof error === 'string') {
      showError(title, message, error);
      return;
    }
    
    // Handle specific error types with user-friendly messages
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      message = 'Could not connect to the email server. Please check your internet connection and try again.';
    } else if (error?.code === 'EAUTH') {
      message = 'Authentication failed. Please contact support to verify email settings.';
    } else if (error?.code === 'ESOCKET') {
      message = 'Network error while sending email. Please check your internet connection and try again.';
    } else if (error?.message?.includes('Invalid recipient')) {
      message = 'One or more email addresses are invalid. Please check all recipient email addresses.';
    }
    
    showError(title, message, JSON.stringify(error, null, 2));
  };
  
  return {
    ErrorModalComponent: () => (
      <ErrorModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        details={modalState.details}
      />
    ),
    showError,
    showEmailError,
    closeModal
  };
};

export default ErrorModal; 