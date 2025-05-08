import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText: string;
  cancelButtonText?: string;
  items?: Array<{
    id: string;
    title: string;
    subtitle?: string;
  }>;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'success' | 'info';
}

// Helper function to create invoice items from raw invoice data
export const createInvoiceItems = (invoices: any[] = []) => {
  return invoices.map(invoice => ({
    id: invoice._id,
    title: invoice.invoiceNumber || `Invoice #${invoice._id.slice(-5)}`,
    subtitle: invoice.clientName || invoice.amount ? `${invoice.clientName || 'Unknown Client'} - ${formatCurrency(invoice.amount || invoice.total || 0)}` : undefined
  }));
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText,
  cancelButtonText = 'Cancel',
  items = [],
  isLoading = false,
  variant = 'info',
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-400',
      button: 'bg-red-600 hover:bg-red-700',
      icon: 'text-red-400',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      icon: 'text-yellow-400',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-400',
      button: 'bg-green-600 hover:bg-green-700',
      icon: 'text-green-400',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: 'text-blue-400',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${styles.bg}`}>
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${styles.bg} sm:mx-0 sm:h-10 sm:w-10`}>
                <svg className={`h-6 w-6 ${styles.icon}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
                
                {items.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Selected {items.length === 1 ? 'Invoice' : `Invoices (${items.length})`}
                    </h4>
                    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                      {items.map((item) => (
                        <li key={item.id} className="px-3 py-2 flex items-center text-sm">
                          <div>
                            <p className="font-medium text-gray-800">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-xs text-gray-500">{item.subtitle}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                confirmButtonText
              )}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export a ready-to-use confirmation function for invoice operations
export const useInvoiceConfirmation = () => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    items: any[];
    variant: 'danger' | 'warning' | 'success' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    items: [],
    variant: 'info',
    onConfirm: () => {}
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };
  
  const confirmMarkAsPaid = (invoices: any[], onConfirm: () => void) => {
    setModalState({
      isOpen: true,
      title: 'Mark as Paid',
      message: `Are you sure you want to mark ${invoices.length === 1 ? 'this invoice' : 'these invoices'} as paid?`,
      confirmText: 'Mark as Paid',
      items: createInvoiceItems(invoices),
      variant: 'success',
      onConfirm: () => {
        setIsLoading(true);
        onConfirm();
        // Delay closing to show loading state
        setTimeout(() => {
          setIsLoading(false);
          closeModal();
        }, 500);
      }
    });
  };
  
  const confirmDeleteInvoice = (invoices: any[], onConfirm: () => void) => {
    setModalState({
      isOpen: true,
      title: 'Delete Invoice',
      message: `Are you sure you want to delete ${invoices.length === 1 ? 'this invoice' : 'these invoices'}? This action cannot be undone.`,
      confirmText: 'Delete',
      items: createInvoiceItems(invoices),
      variant: 'danger',
      onConfirm: () => {
        setIsLoading(true);
        onConfirm();
        // Delay closing to show loading state
        setTimeout(() => {
          setIsLoading(false);
          closeModal();
        }, 500);
      }
    });
  };
  
  // Return both the confirmation methods and the modal component
  return {
    ConfirmationModalComponent: () => (
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmButtonText={modalState.confirmText}
        items={modalState.items}
        isLoading={isLoading}
        variant={modalState.variant}
      />
    ),
    confirmMarkAsPaid,
    confirmDeleteInvoice,
    closeModal
  };
};

export default ConfirmationModal; 