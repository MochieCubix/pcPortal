import React, { useState } from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import InvoiceSelectionModal from './InvoiceSelectionModal';
import EmailComposer from './EmailComposer';

interface EmailInvoicesButtonProps {
  className?: string;
  buttonText?: string;
}

const EmailInvoicesButton: React.FC<EmailInvoicesButtonProps> = ({
  className = '',
  buttonText = 'Email Invoices',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center px-4 py-2 border border-transparent 
                  text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 
                  hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                  focus:ring-blue-500 ${className}`}
      >
        <EnvelopeIcon className="-ml-1 mr-2 h-5 w-5" />
        {buttonText}
      </button>

      {/* Invoice Selection Modal */}
      <InvoiceSelectionModal
        isOpen={isModalOpen}
        onClose={closeModal}
      />
      
      {/* Email Composer (controlled by Context, always render) */}
      <EmailComposer />
    </>
  );
};

export default EmailInvoicesButton; 