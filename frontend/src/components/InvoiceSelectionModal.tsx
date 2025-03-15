import React, { useState, useEffect } from 'react';
import { XMarkIcon, EnvelopeIcon, DocumentIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEmail } from '../contexts/EmailContext';
import { getInvoicePreSignedUrl } from '@/utils/s3Utils';

type Invoice = {
  id: string;
  jobId: string;
  jobName?: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  fileKey?: string;
  fileUrl?: string;
  supervisorEmail?: string;
  supervisorName?: string;
  hasFile?: boolean;
};

type InvoiceSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const InvoiceSelectionModal: React.FC<InvoiceSelectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const { addInvoice, openEmailComposer, getInvoiceUrl } = useEmail();

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Replace with your actual API endpoint
      const response = await axios.get('/api/invoices');
      
      // Process invoices to check which ones have files in S3
      const processedInvoices = response.data.map((invoice: Invoice) => ({
        ...invoice,
        hasFile: Boolean(invoice.fileKey || invoice.fileUrl)
      }));
      
      setInvoices(processedInvoices);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) => {
      if (prev.includes(invoiceId)) {
        return prev.filter((id) => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handlePreviewInvoice = async (invoice: Invoice) => {
    try {
      const url = await getInvoiceUrl(invoice);
      setPreviewUrl(url);
      
      // Open the URL in a new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing invoice:', error);
      // Show error to user
      alert('Unable to preview this invoice. The file may not be available.');
    }
  };

  const handleComposeEmail = () => {
    // Get the full invoice objects for selected IDs
    const selectedInvoices = invoices.filter((invoice) => 
      selectedInvoiceIds.includes(invoice.id)
    );
    
    // Add each selected invoice to the email context
    selectedInvoices.forEach((invoice) => {
      addInvoice(invoice);
    });
    
    // Open the email composer
    openEmailComposer();
    
    // Close this modal
    onClose();
  };

  // Filter invoices based on search term
  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      (invoice.jobName && invoice.jobName.toLowerCase().includes(searchLower)) ||
      invoice.jobId.toLowerCase().includes(searchLower) ||
      (invoice.supervisorName && invoice.supervisorName.toLowerCase().includes(searchLower))
    );
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-4xl">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-gray-100 flex justify-between items-center border-b border-gray-200">
          <h3 className="font-medium">Select Invoices to Email</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Search and Controls */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="w-full max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoices by number, job name, or supervisor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleComposeEmail}
              disabled={selectedInvoiceIds.length === 0}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white 
                ${selectedInvoiceIds.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              <EnvelopeIcon className="h-4 w-4 mr-1" />
              <span>Compose Email ({selectedInvoiceIds.length})</span>
            </button>
          </div>
        </div>

        {/* Invoices List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {searchTerm ? 'No invoices match your search.' : 'No invoices available.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={filteredInvoices.length > 0 && selectedInvoiceIds.length === filteredInvoices.length}
                      onChange={() => {
                        if (selectedInvoiceIds.length === filteredInvoices.length) {
                          setSelectedInvoiceIds([]);
                        } else {
                          setSelectedInvoiceIds(filteredInvoices.map(inv => inv.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supervisor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr 
                    key={invoice.id}
                    onClick={() => toggleInvoiceSelection(invoice.id)}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedInvoiceIds.includes(invoice.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(invoice.id)}
                        onChange={() => toggleInvoiceSelection(invoice.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.jobName || invoice.jobId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.supervisorName || 'Not assigned'}
                      {invoice.supervisorEmail && (
                        <div className="text-xs text-gray-400">{invoice.supervisorEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.hasFile ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewInvoice(invoice);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <DocumentIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <span className="text-gray-400">No file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {selectedInvoiceIds.length} {selectedInvoiceIds.length === 1 ? 'invoice' : 'invoices'} selected
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleComposeEmail}
              disabled={selectedInvoiceIds.length === 0}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white 
                ${selectedInvoiceIds.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              Compose Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSelectionModal; 