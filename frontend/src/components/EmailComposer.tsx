import React, { useState, useEffect } from 'react';
import { XMarkIcon, PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  source: 'invoice' | 'timesheet';
}

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoices: any[];
  invoiceTimesheets: Record<string, any[]>;
  recipients?: string[];
  onSend: (data: EmailData) => Promise<void>;
}

interface EmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  message: string;
  attachments: Attachment[];
}

const EmailComposer: React.FC<EmailComposerProps> = ({
  isOpen,
  onClose,
  selectedInvoices,
  invoiceTimesheets,
  recipients = [],
  onSend
}) => {
  const [to, setTo] = useState<string[]>(recipients);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showCc, setShowCc] = useState<boolean>(false);
  const [showBcc, setShowBcc] = useState<boolean>(false);
  const [currentInputValue, setCurrentInputValue] = useState<string>('');

  // Prepare attachments from selected invoices and their timesheets
  useEffect(() => {
    if (selectedInvoices.length > 0) {
      const invoiceAttachments: Attachment[] = selectedInvoices.map(invoice => ({
        id: invoice._id,
        name: `Invoice-${invoice.invoiceNumber || invoice._id}.pdf`,
        size: 0, // Would be populated with actual size in real implementation
        type: 'application/pdf',
        url: invoice.fileUrl,
        source: 'invoice'
      }));

      const timesheetAttachments: Attachment[] = [];
      
      // Add timesheets for each invoice
      selectedInvoices.forEach(invoice => {
        const timesheets = invoice.timesheets || [];
        if (timesheets.length > 0) {
          timesheets.forEach((timesheet: any) => {
            timesheetAttachments.push({
              id: timesheet.id,
              name: timesheet.name,
              size: 0, // Would be populated with actual size
              type: timesheet.fileType || 'application/pdf',
              url: timesheet.fileUrl,
              source: 'timesheet'
            });
          });
        }
      });

      setAttachments([...invoiceAttachments, ...timesheetAttachments]);
      
      // Set default subject based on number of invoices
      if (selectedInvoices.length === 1) {
        setSubject(`Invoice ${selectedInvoices[0].invoiceNumber || 'Attachment'}`);
      } else {
        setSubject(`${selectedInvoices.length} Invoices - ${new Date().toLocaleDateString()}`);
      }
    }
  }, [selectedInvoices, invoiceTimesheets]);

  const handleAddRecipient = (type: 'to' | 'cc' | 'bcc') => {
    if (!currentInputValue || !currentInputValue.includes('@')) return;
    
    switch (type) {
      case 'to':
        setTo(prev => [...prev, currentInputValue]);
        break;
      case 'cc':
        setCc(prev => [...prev, currentInputValue]);
        break;
      case 'bcc':
        setBcc(prev => [...prev, currentInputValue]);
        break;
    }
    
    setCurrentInputValue('');
  };

  const handleRemoveRecipient = (type: 'to' | 'cc' | 'bcc', index: number) => {
    switch (type) {
      case 'to':
        setTo(prev => prev.filter((_, i) => i !== index));
        break;
      case 'cc':
        setCc(prev => prev.filter((_, i) => i !== index));
        break;
      case 'bcc':
        setBcc(prev => prev.filter((_, i) => i !== index));
        break;
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (to.length === 0) {
      setError('Please add at least one recipient');
      return;
    }
    
    if (!subject) {
      setError('Please enter a subject');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onSend({
        to,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        message,
        attachments
      });
      
      setSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 flex justify-between items-center">
            <h2 className="text-white text-lg font-medium">Send Invoice{selectedInvoices.length > 1 ? 's' : ''}</h2>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200"
              disabled={isLoading}
              type="button"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4">
            {/* Success message */}
            {success && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-700">Email sent successfully!</span>
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* To field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <div className="relative rounded-md border border-gray-300 p-2 flex flex-wrap items-center gap-1 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                {to.map((email, index) => (
                  <span key={index} className="bg-blue-100 px-2 py-1 rounded text-sm flex items-center">
                    {email}
                    <button 
                      type="button"
                      onClick={() => handleRemoveRecipient('to', index)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={currentInputValue}
                  onChange={(e) => setCurrentInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRecipient('to');
                    }
                  }}
                  onBlur={() => handleAddRecipient('to')}
                  placeholder={to.length === 0 ? "Enter email addresses" : ""}
                  className="flex-grow border-0 focus:ring-0 p-1 text-sm"
                />
              </div>
              
              <div className="flex space-x-2 text-xs text-blue-600 mt-1">
                <button 
                  type="button"
                  onClick={() => setShowCc(!showCc)}
                  className="hover:underline"
                >
                  {showCc ? 'Hide Cc' : 'Add Cc'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowBcc(!showBcc)}
                  className="hover:underline"
                >
                  {showBcc ? 'Hide Bcc' : 'Add Bcc'}
                </button>
              </div>
            </div>
            
            {/* Cc field */}
            {showCc && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cc</label>
                <div className="relative rounded-md border border-gray-300 p-2 flex flex-wrap items-center gap-1 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                  {cc.map((email, index) => (
                    <span key={index} className="bg-blue-100 px-2 py-1 rounded text-sm flex items-center">
                      {email}
                      <button 
                        type="button"
                        onClick={() => handleRemoveRecipient('cc', index)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    value={currentInputValue}
                    onChange={(e) => setCurrentInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRecipient('cc');
                      }
                    }}
                    onBlur={() => handleAddRecipient('cc')}
                    placeholder={cc.length === 0 ? "Enter Cc email addresses" : ""}
                    className="flex-grow border-0 focus:ring-0 p-1 text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* Bcc field */}
            {showBcc && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bcc</label>
                <div className="relative rounded-md border border-gray-300 p-2 flex flex-wrap items-center gap-1 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                  {bcc.map((email, index) => (
                    <span key={index} className="bg-blue-100 px-2 py-1 rounded text-sm flex items-center">
                      {email}
                      <button 
                        type="button"
                        onClick={() => handleRemoveRecipient('bcc', index)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    value={currentInputValue}
                    onChange={(e) => setCurrentInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRecipient('bcc');
                      }
                    }}
                    onBlur={() => handleAddRecipient('bcc')}
                    placeholder={bcc.length === 0 ? "Enter Bcc email addresses" : ""}
                    className="flex-grow border-0 focus:ring-0 p-1 text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* Subject field */}
            <div className="mb-4">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter subject"
                required
              />
            </div>
            
            {/* Message field */}
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter your message"
              ></textarea>
            </div>
            
            {/* Attachments */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments ({attachments.length})
              </label>
              <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                {attachments.length === 0 ? (
                  <p className="text-sm text-gray-500 p-2">No attachments</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {attachments.map((attachment) => (
                      <li key={attachment.id} className="py-2 flex justify-between items-center">
                        <div className="flex items-center">
                          <PaperClipIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700 truncate max-w-xs">
                            {attachment.name}
                            <span className="ml-2 text-xs text-gray-500">
                              {attachment.source === 'invoice' ? '(Invoice)' : '(Timesheet)'}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 mr-2">
                            {formatFileSize(attachment.size)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                disabled={isLoading}
              >
                {isLoading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isLoading ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer; 