import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';
import { getInvoicePreSignedUrl } from '@/utils/s3Utils';

// Types
type Invoice = {
  id: string;
  jobId: string;
  jobName?: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  fileKey?: string;  // S3 file key
  fileUrl?: string;
  supervisorEmail?: string;
  supervisorName?: string;
};

type EmailState = {
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  subject: string;
  body: string;
  selectedInvoices: Invoice[];
  recipients: string[];
  isLoading: boolean;
  error: string | null;
  success: string | null;
};

type EmailContextType = {
  emailState: EmailState;
  openEmailComposer: () => void;
  closeEmailComposer: () => void;
  updatePosition: (position: { x: number; y: number }) => void;
  updateSize: (size: { width: number; height: number }) => void;
  setSubject: (subject: string) => void;
  setBody: (body: string) => void;
  addInvoice: (invoice: Invoice) => void;
  removeInvoice: (invoiceId: string) => void;
  addRecipient: (email: string) => void;
  removeRecipient: (email: string) => void;
  sendEmail: () => Promise<void>;
  resetState: () => void;
  getInvoiceUrl: (invoice: Invoice) => Promise<string>;
};

const initialState: EmailState = {
  isOpen: false,
  position: { x: 20, y: 20 },
  size: { width: 600, height: 500 },
  subject: '',
  body: '',
  selectedInvoices: [],
  recipients: [],
  isLoading: false,
  error: null,
  success: null,
};

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export const EmailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [emailState, setEmailState] = useState<EmailState>(initialState);

  const openEmailComposer = () => {
    setEmailState((prev) => ({ ...prev, isOpen: true }));
  };

  const closeEmailComposer = () => {
    setEmailState((prev) => ({ ...prev, isOpen: false }));
  };

  const updatePosition = (position: { x: number; y: number }) => {
    setEmailState((prev) => ({ ...prev, position }));
  };

  const updateSize = (size: { width: number; height: number }) => {
    setEmailState((prev) => ({ ...prev, size }));
  };

  const setSubject = (subject: string) => {
    setEmailState((prev) => ({ ...prev, subject }));
  };

  const setBody = (body: string) => {
    setEmailState((prev) => ({ ...prev, body }));
  };

  const addInvoice = (invoice: Invoice) => {
    setEmailState((prev) => ({
      ...prev,
      selectedInvoices: [...prev.selectedInvoices, invoice],
      // Automatically add the supervisor email if available
      recipients: invoice.supervisorEmail 
        ? [...new Set([...prev.recipients, invoice.supervisorEmail])]
        : prev.recipients
    }));
  };

  const removeInvoice = (invoiceId: string) => {
    setEmailState((prev) => ({
      ...prev,
      selectedInvoices: prev.selectedInvoices.filter((inv) => inv.id !== invoiceId)
    }));
  };

  const addRecipient = (email: string) => {
    setEmailState((prev) => ({
      ...prev,
      recipients: [...new Set([...prev.recipients, email])]
    }));
  };

  const removeRecipient = (email: string) => {
    setEmailState((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((e) => e !== email)
    }));
  };

  // Get a pre-signed URL for the invoice
  const getInvoiceUrl = async (invoice: Invoice): Promise<string> => {
    if (invoice.fileUrl) {
      return invoice.fileUrl;
    }

    if (invoice.fileKey) {
      try {
        const url = await getInvoicePreSignedUrl(invoice.fileKey);
        return url;
      } catch (error) {
        console.error('Error generating pre-signed URL:', error);
        throw error;
      }
    }

    throw new Error('No file information available for this invoice');
  };

  const sendEmail = async () => {
    setEmailState((prev) => ({ ...prev, isLoading: true, error: null, success: null }));
    
    try {
      // Format the invoice IDs to send
      const invoiceIds = emailState.selectedInvoices.map((inv) => inv.id);
      
      // Call the API to send the email
      await axios.post('/api/email/send', {
        subject: emailState.subject,
        body: emailState.body,
        recipients: emailState.recipients,
        invoiceIds
      });
      
      setEmailState((prev) => ({ 
        ...prev, 
        isLoading: false, 
        success: 'Email sent successfully',
        // Optionally reset other fields after successful send
        subject: '',
        body: '',
        selectedInvoices: [],
        recipients: []
      }));
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailState((prev) => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to send email. Please try again.'
      }));
    }
  };

  const resetState = () => {
    setEmailState(initialState);
  };

  return (
    <EmailContext.Provider
      value={{
        emailState,
        openEmailComposer,
        closeEmailComposer,
        updatePosition,
        updateSize,
        setSubject,
        setBody,
        addInvoice,
        removeInvoice,
        addRecipient,
        removeRecipient,
        sendEmail,
        resetState,
        getInvoiceUrl
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};

export const useEmail = (): EmailContextType => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
}; 