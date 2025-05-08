'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import InvoiceTable from '../../components/InvoiceTable';
import TimesheetUploader from '../../components/TimesheetUploader';
import DualPreviewModal from '../../components/DualPreviewModal';
import { MagnifyingGlassIcon, FunnelIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  date: string;
  createdAt: string;
  jobsite: { name: string } | null;
  jobsiteName?: string;
  clientName?: string;
  amount: number;
  total?: number;
  status: string;
  fileKey?: string;
  fileUrl?: string;
  timesheets?: Array<{
    id: string;
    name: string;
    fileKey: string;
    fileUrl?: string;
    fileType?: string;
    uploadDate?: string;
  }>;
}

function WeeklyUploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterJobsite, setFilterJobsite] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState({ start: '', end: '' });
  
  // State for dual preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  
  // Fetch invoices on mount
  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/invoices');
        if (!response.ok) {
          throw new Error('Failed to fetch invoices');
        }
        const data = await response.json();
        setInvoices(data);
        setFilteredInvoices(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvoices();
  }, []);
  
  // Extract unique jobsites for filtering
  const jobsites = useMemo(() => {
    const sites = new Set<string>();
    invoices.forEach(invoice => {
      const siteName = invoice.jobsite?.name || invoice.jobsiteName || 'Unknown';
      sites.add(siteName);
    });
    return Array.from(sites).sort();
  }, [invoices]);
  
  // Apply filters and search
  useEffect(() => {
    let results = [...invoices];
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(invoice => 
        (invoice.invoiceNumber?.toLowerCase().includes(query)) || 
        (invoice.jobsite?.name?.toLowerCase().includes(query)) ||
        (invoice.jobsiteName?.toLowerCase().includes(query)) ||
        (invoice.clientName?.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      results = results.filter(invoice => invoice.status === filterStatus);
    }
    
    // Apply jobsite filter
    if (filterJobsite !== 'all') {
      results = results.filter(invoice => 
        (invoice.jobsite?.name === filterJobsite) || 
        (invoice.jobsiteName === filterJobsite)
      );
    }
    
    // Apply date range filter
    if (filterDateRange.start || filterDateRange.end) {
      const startDate = filterDateRange.start ? new Date(filterDateRange.start) : new Date(0);
      const endDate = filterDateRange.end ? new Date(filterDateRange.end) : new Date();
      
      results = results.filter(invoice => {
        const invoiceDate = new Date(invoice.date || invoice.createdAt);
        return invoiceDate >= startDate && invoiceDate <= endDate;
      });
    }
    
    setFilteredInvoices(results);
  }, [invoices, searchQuery, filterStatus, filterJobsite, filterDateRange]);
  
  // Handle invoice actions
  const handleViewInvoice = useCallback((invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setPreviewModalOpen(true);
  }, []);
  
  const handleDownloadInvoice = useCallback(async (invoice: Invoice) => {
    if (!invoice.fileUrl) {
      alert('No file available for download');
      return;
    }
    
    try {
      // Open in new tab or use download attribute
      window.open(invoice.fileUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  }, []);
  
  const handleAttachTimesheet = useCallback(async (invoice: Invoice, fileKeys: string[]) => {
    try {
      const response = await fetch(`/api/invoices/${invoice._id}/timesheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileKeys }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to attach timesheets');
      }
      
      // Refresh the invoice data
      const updatedInvoice = await response.json();
      setInvoices(prev => prev.map(inv => 
        inv._id === updatedInvoice._id ? updatedInvoice : inv
      ));
      
      // Update current invoice if it's open in preview
      if (currentInvoice?._id === updatedInvoice._id) {
        setCurrentInvoice(updatedInvoice);
      }
      
      return updatedInvoice;
    } catch (error) {
      console.error('Error attaching timesheet:', error);
      throw error;
    }
  }, [currentInvoice]);
  
  const handleDeleteTimesheet = useCallback(async (invoice: Invoice, timesheetId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoice._id}/timesheets/${timesheetId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete timesheet');
      }
      
      // Refresh the invoice data
      const updatedInvoice = await response.json();
      setInvoices(prev => prev.map(inv => 
        inv._id === updatedInvoice._id ? updatedInvoice : inv
      ));
      
      // Update current invoice if it's open in preview
      if (currentInvoice?._id === updatedInvoice._id) {
        setCurrentInvoice(updatedInvoice);
      }
      
      return updatedInvoice;
    } catch (error) {
      console.error('Error deleting timesheet:', error);
      throw error;
    }
  }, [currentInvoice]);
  
  // Refresh data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/invoices');
      if (!response.ok) {
        throw new Error('Failed to refresh invoices');
      }
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during refresh');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Prepare timesheets for dual preview modal
  const timesheetsForPreview = useMemo(() => {
    if (!currentInvoice || !currentInvoice.timesheets) return [];
    
    return currentInvoice.timesheets.map(timesheet => ({
      id: timesheet.id,
      url: timesheet.fileUrl || '',
      name: timesheet.name,
      type: timesheet.fileType || 'application/pdf',
    }));
  }, [currentInvoice]);
  
  // Custom actions for invoice table
  const renderCustomActions = useCallback((invoice: Invoice) => {
    const hasTimesheets = invoice.timesheets && invoice.timesheets.length > 0;
    
    return (
      <div className="flex space-x-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleViewInvoice(invoice);
          }}
          className={`p-1 rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500 ${hasTimesheets ? 'text-blue-600' : ''}`}
          title={hasTimesheets ? `View Invoice & ${invoice.timesheets?.length} Timesheet(s)` : "View Invoice"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          {hasTimesheets && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-3 w-3 flex items-center justify-center">
              {invoice.timesheets?.length}
            </span>
          )}
        </button>
        
        {invoice.fileUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadInvoice(invoice);
            }}
            className="p-1 rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            title="Download Invoice"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
          </button>
        )}
      </div>
    );
  }, [handleViewInvoice, handleDownloadInvoice]);
  
  // Render the page
  return (
    <div className="container mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Invoice & Timesheet Upload</h1>
        <p className="text-gray-600 mt-1">Manage your invoices and upload related timesheets</p>
      </header>
      
      {/* Search and filter bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="w-full md:w-1/3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoices..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="flex space-x-2 md:space-x-4">
            <div>
              <label htmlFor="statusFilter" className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                id="statusFilter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="jobsiteFilter" className="block text-xs text-gray-500 mb-1">Jobsite</label>
              <select
                id="jobsiteFilter"
                value={filterJobsite}
                onChange={(e) => setFilterJobsite(e.target.value)}
                className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Jobsites</option>
                {jobsites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="refreshButton" className="block text-xs text-gray-500 mb-1 opacity-0">Refresh</label>
              <button
                id="refreshButton"
                onClick={refreshData}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex space-x-4">
          <div>
            <label htmlFor="startDate" className="block text-xs text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              id="startDate"
              value={filterDateRange.start}
              onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-xs text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              id="endDate"
              value={filterDateRange.end}
              onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
        {(searchQuery || filterStatus !== 'all' || filterJobsite !== 'all' || filterDateRange.start || filterDateRange.end) && ' with applied filters'}
      </div>
      
      {/* Invoice table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <InvoiceTable
          invoices={filteredInvoices}
          onViewInvoice={handleViewInvoice}
          onDownloadInvoice={handleDownloadInvoice}
          customActions={renderCustomActions}
          showClient={true}
        />
      </div>
      
      {/* Dual preview modal */}
      {currentInvoice && (
        <DualPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          invoiceUrl={currentInvoice.fileUrl || ''}
          invoiceTitle={`Invoice ${currentInvoice.invoiceNumber || ''}`}
          timesheets={timesheetsForPreview}
        />
      )}
      
      {/* Timesheet uploader modal - would normally be a separate component */}
      {currentInvoice && previewModalOpen && currentInvoice.fileUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Timesheets for Invoice #{currentInvoice.invoiceNumber}
              </h3>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <TimesheetUploader
                invoiceId={currentInvoice._id}
                existingTimesheets={currentInvoice.timesheets}
                onUploadSuccess={(fileKeys) => handleAttachTimesheet(currentInvoice, fileKeys)}
                onRemoveTimesheet={(fileId) => handleDeleteTimesheet(currentInvoice, fileId)}
                onViewTimesheet={(fileUrl, fileType) => {
                  // Open in new tab or use modal
                  window.open(fileUrl, '_blank');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="ml-3">Loading data...</p>
    </div>
  );
}

const WeeklyUploadPage: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WeeklyUploadContent />
    </Suspense>
  );
};

export default WeeklyUploadPage; 