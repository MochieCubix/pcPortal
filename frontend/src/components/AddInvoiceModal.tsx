'use client';

import React, { useState, useRef, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PencilIcon, TrashIcon, CheckIcon, EyeIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { DocumentArrowUpIcon } from '@heroicons/react/24/solid';
import { createPortal } from 'react-dom';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

interface ExtractedInvoiceData {
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  amount?: number;
  jobsiteName?: string;
  clientName?: string;
  status?: string;
  clientId?: string;
  jobsiteId?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}

interface ProcessedFile {
  file: File;
  extractedData: ExtractedInvoiceData;
  editedData: ExtractedInvoiceData;
  isProcessed: boolean;
  error?: string;
  status: 'idle' | 'processing' | 'success' | 'error';
}

interface Client {
  _id: string;
  companyName: string;
  paymentTerms?: {
    days: number;
    type: 'days' | 'EOM';
    description: string;
  };
}

interface Jobsite {
  _id: string;
  name: string;
  client?: string;
}

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clientId?: string;
  jobsiteId?: string;
}

// PDF Preview component using a portal
const PDFPreviewModal = ({ 
  isOpen, 
  onClose, 
  pdfUrl 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  pdfUrl: string | null;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !pdfUrl || typeof window === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] overflow-visible" 
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      
      {/* Modal content */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full h-[90vh] flex flex-col overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="flex items-center justify-between p-4 border-b"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium">PDF Preview</h2>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          <div 
            className="flex-1 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <embed 
              src={pdfUrl} 
              type="application/pdf"
              className="w-full h-full border-0" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Add a function to parse information from the filename
const parseFromFilename = (filename: string): Partial<ExtractedInvoiceData> => {
  console.log('Parsing from filename:', filename);
  
  // Strip file extension if present
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // Try to match the pattern: "COMPANY - JOBSITE - INVNUMBER (DATE)"
  // Also handle variations in spacing and separators
  const filenameRegex = /^(.+?)\s*-\s*(.+?)\s*-\s*(.+?)\s*\((.+?)\)$/;
  const match = nameWithoutExt.match(filenameRegex);
  
  if (match) {
    const [_, company, jobsite, invoiceNumberRaw, dateStr] = match;
    console.log('Filename parsed successfully:', { company, jobsite, invoiceNumberRaw, dateStr });
    
    // Clean up invoice number - remove "INV" prefix if present
    const invoiceNumber = invoiceNumberRaw.trim().replace(/^INV/i, '');
    
    // Format date properly - if it's in DD.MM.YY or D.MM.YY format, convert to proper date
    let formattedDate = dateStr.trim();
    // Check if date is in DD.MM.YY or D.MM.YY format
    const dateRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/;
    const dateMatch = dateStr.trim().match(dateRegex);
    
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      // Create a date object using ISO string format to avoid timezone issues
      const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
      
      // Format the parts with proper padding
      const paddedDay = day.padStart(2, '0');
      const paddedMonth = month.padStart(2, '0');
      
      // Create the date using ISO format (YYYY-MM-DD) to avoid timezone issues
      formattedDate = `${fullYear}-${paddedMonth}-${paddedDay}`;
      console.log('Converted date from filename:', dateStr.trim(), 'to formatted date:', formattedDate);
    }
    
    return {
      clientName: company.trim(),
      jobsiteName: jobsite.trim(),
      invoiceNumber: invoiceNumber,
      date: formattedDate
      // Note: amount is deliberately not included here as it will never be in the filename
    };
  }
  
  // Check if the filename itself is just a date in the DD.MM.YY format (common for invoice files)
  const justDateRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/;
  const justDateMatch = nameWithoutExt.match(justDateRegex);
  
  if (justDateMatch) {
    console.log('Filename appears to be just a date, parsing as invoice date');
    const [_, day, month, year] = justDateMatch;
    
    // Create a date object using ISO string format to avoid timezone issues
    const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
    
    // Format the parts with proper padding
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    
    // Create the date using ISO format (YYYY-MM-DD) to avoid timezone issues
    const formattedDate = `${fullYear}-${paddedMonth}-${paddedDay}`;
    console.log('Converted date from filename:', nameWithoutExt, 'to formatted date:', formattedDate);
    
    // For filenames that are just dates, we return only the date information
    // Other fields will need to be filled in by the user or from PDF extraction
    return {
      date: formattedDate
    };
  }
  
  console.log('Unable to parse filename using standard pattern');
  return {};
};

export const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  jobsiteId
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobsites, setJobsites] = useState<Jobsite[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || '');
  const [selectedJobsiteId, setSelectedJobsiteId] = useState<string>(jobsiteId || '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setProcessedFiles([]);
      setIsDragging(false);
      setIsUploading(false);
      setProcessingFile(null);
    } else {
      // Initialize with provided clientId and jobsiteId
      if (clientId) setSelectedClientId(clientId);
      if (jobsiteId) setSelectedJobsiteId(jobsiteId);
      
      // Fetch clients and jobsites when modal opens
      fetchClients();
      // Only fetch jobsites if we have a clientId
      if (clientId) {
        fetchJobsites();
      } else {
        // Otherwise, fetch all jobsites
        fetchJobsites();
      }
    }
  }, [isOpen, clientId, jobsiteId]);

  // Fetch clients
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.status}`);
      }
      
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Fetch jobsites
  const fetchJobsites = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching jobsites, clientId:', clientId, 'selectedClientId:', selectedClientId);

      // If clientId is provided, fetch jobsites for that client
      const endpoint = clientId 
        ? `http://localhost:5000/api/clients/${clientId}/jobsites` 
        : 'http://localhost:5000/api/jobsites';
      
      console.log('Fetching jobsites from endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch jobsites: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched jobsites:', data);
      setJobsites(data);
    } catch (error) {
      console.error('Error fetching jobsites:', error);
    }
  };

  // Fetch jobsites when selected client changes
  useEffect(() => {
    console.log('Selected client changed to:', selectedClientId);
    if (selectedClientId && isOpen) {
      // Fetch jobsites for the selected client
      const fetchClientJobsites = async () => {
        try {
          const token = localStorage.getItem('token');
          console.log('Fetching jobsites for selected client:', selectedClientId);
          
          const response = await fetch(`http://localhost:5000/api/clients/${selectedClientId}/jobsites`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch jobsites: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('Fetched jobsites for selected client:', data);
          setJobsites(data);
        } catch (error) {
          console.error('Error fetching jobsites for selected client:', error);
        }
      };
      
      fetchClientJobsites();
    }
  }, [selectedClientId, isOpen]);

  // Calculate due date based on client payment terms
  const calculateDueDate = (issueDate: string, clientId: string): string => {
    if (!issueDate || !clientId) return '';
    
    const client = clients.find(c => c._id === clientId);
    if (!client || !client.paymentTerms) return '';
    
    const issueDateObj = new Date(issueDate);
    if (isNaN(issueDateObj.getTime())) return '';
    
    let dueDate = new Date(issueDateObj);
    
    if (client.paymentTerms.type === 'days') {
      // Add payment term days to issue date
      dueDate.setDate(dueDate.getDate() + client.paymentTerms.days);
    } else if (client.paymentTerms.type === 'EOM') {
      // Set to end of month + payment term days
      dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0); // Last day of current month
      dueDate.setDate(dueDate.getDate() + client.paymentTerms.days);
    }
    
    return dueDate.toISOString().split('T')[0];
  };

  // Process a single file
  const processFile = async (file: File) => {
    // Check if file is already being processed or has been processed
    const existingFile = processedFiles.find(pf => pf.file.name === file.name);
    if (existingFile) {
      console.log(`File ${file.name} is already in the processed list with status: ${existingFile.status}`);
      if (existingFile.status === 'processing') {
        console.log(`File ${file.name} is currently being processed, skipping duplicate processing`);
        return false;
      }
      if (existingFile.status === 'success') {
        console.log(`File ${file.name} has already been successfully processed, skipping`);
        return true;
      }
      if (existingFile.status === 'error') {
        console.log(`File ${file.name} previously had an error, attempting to reprocess`);
        // Remove the existing file from the array before continuing
        setProcessedFiles(prevFiles => prevFiles.filter(pf => pf.file.name !== file.name));
      }
    }

    setProcessingFile(file.name);
    
    console.log(`Beginning to process file: ${file.name}`);
    
    try {
      // First try to parse from filename
      const filenameData = parseFromFilename(file.name);
      console.log('Data extracted from filename:', filenameData);
      
      const hasAllRequiredFields = 
        filenameData.invoiceNumber && 
        filenameData.date && 
        filenameData.clientName && 
        filenameData.jobsiteName;
      
      let extractedData: ExtractedInvoiceData = {};
      let useFilenameOnly = false;
      
      // If we have all the required fields from the filename, skip the PDF parsing
      if (hasAllRequiredFields) {
        console.log('All required fields found in filename, skipping PDF parsing');
        extractedData = filenameData as ExtractedInvoiceData;
        useFilenameOnly = true;
      } else {
        console.log('Some fields missing from filename, proceeding with PDF parsing');
        
        // Add the file to the list with processing status before fetching data
        setProcessedFiles(prevFiles => [
          ...prevFiles, 
          {
            file,
            extractedData: {},
            editedData: {},
            isProcessed: false,
            status: 'processing'
          }
        ]);
        
        const formData = new FormData();
        formData.append('file', file);
        
        // Add client and jobsite IDs if available - only for initial parsing
        if (clientId) formData.append('clientId', clientId);
        if (jobsiteId) formData.append('jobsiteId', jobsiteId);
        
        console.log(`Processing file: ${file.name}`);
        console.log('Request details:', {
          clientId,
          jobsiteId,
          fileSize: file.size,
          fileType: file.type
        });
        
        // Log the token being used (masked for security)
        const token = localStorage.getItem('token');
        console.log('Using token:', token ? `${token.substring(0, 10)}...` : 'No token found');
        
        const response = await fetch('http://localhost:5000/api/invoices/upload-parse', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
        
        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // If not JSON, get the text and log it
          const text = await response.text();
          console.error('Non-JSON response received:', text);
          throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Processed file data:', data);
        
        // PRIORITY SYSTEM: Create a properly merged data object with clear priorities
        // 1. Start with PDF extracted data as the base
        // 2. For certain fields, prefer filename data if available
        // 3. Ensure amount ALWAYS comes from PDF
        
        // First get the PDF-extracted data
        const pdfData = data.extractedData || {};
        console.log('PDF extracted data:', pdfData);
        
        // Then apply the filename data with specific field priority
        extractedData = {
          // Start with PDF data as base
          ...pdfData,
          
          // Override specific fields based on clear priority rules
          // Invoice number: Prefer filename, fall back to PDF
          invoiceNumber: filenameData.invoiceNumber || pdfData.invoiceNumber,
          
          // Date: Prefer filename, fall back to PDF
          date: filenameData.date || pdfData.date,
          
          // Client name: Prefer filename, fall back to PDF
          clientName: filenameData.clientName || pdfData.clientName,
          
          // Jobsite: Prefer filename, fall back to PDF
          jobsiteName: filenameData.jobsiteName || pdfData.jobsiteName,
          
          // Client ID: Always use the PDF-extracted or backend-matched client ID
          clientId: pdfData.clientId,
          
          // Amount: ALWAYS use PDF-extracted amount, NEVER from filename
          amount: pdfData.amount
        };
        
        console.log('Final merged data with priorities applied:', extractedData);
      }
      
      // If we used filename-only parsing and don't have an amount,
      // we need to make sure the user adds it manually
      if (!extractedData.amount) {
        console.log('No amount found in data, user will need to enter manually');
      }
      
      // Find matching client if available
      let matchingClientId = extractedData.clientId || clientId || '';
      
      // Log current client ID state for debugging
      console.log('Client matching - Initial state:', { 
        extractedClientId: extractedData.clientId,
        passedClientId: clientId,
        currentMatchingClientId: matchingClientId,
        extractedClientName: extractedData.clientName
      });
      
      if (extractedData.clientName && !matchingClientId) {
        console.log('Looking for client match with name:', extractedData.clientName);
        
        // Normalize client name for better matching
        const normalizedClientName = extractedData.clientName.toLowerCase().trim();
        console.log('Normalized client name for matching:', normalizedClientName);
        
        // First try exact match
        let matchingClient = clients.find(c => 
          c.companyName.toLowerCase().trim() === normalizedClientName
        );
        
        // If no exact match, try substring match in both directions
        if (!matchingClient) {
          console.log('No exact match found, trying partial matches...');
          matchingClient = clients.find(c => 
            c.companyName.toLowerCase().includes(normalizedClientName) ||
            normalizedClientName.includes(c.companyName.toLowerCase())
          );
        }
        
        if (matchingClient) {
          console.log('Found matching client:', matchingClient.companyName, 'with ID:', matchingClient._id);
          matchingClientId = matchingClient._id;
          
          // Also update the selected client ID to trigger jobsite fetch
          if (matchingClientId !== selectedClientId) {
            console.log('Updating selected client ID to trigger jobsite fetch:', matchingClientId);
            setSelectedClientId(matchingClientId);
          }
        } else {
          console.log('No matching client found for:', normalizedClientName);
          console.log('Available clients:', clients.map(c => ({ id: c._id, name: c.companyName })));
        }
      }
      
      // Find matching jobsite if available
      let matchingJobsiteId = jobsiteId || '';
      
      // Log current jobsite matching state
      console.log('Jobsite matching - Initial state:', {
        matchingClientId,
        jobsiteId,
        extractedJobsiteName: extractedData.jobsiteName,
        availableJobsitesCount: jobsites.length
      });
      
      if (extractedData.jobsiteName && !matchingJobsiteId) {
        console.log('Looking for jobsite match with name:', extractedData.jobsiteName);
        
        // Normalize jobsite name for better matching
        const normalizedJobsiteName = extractedData.jobsiteName.toLowerCase().trim();
        console.log('Normalized jobsite name for matching:', normalizedJobsiteName);
        
        // First filter jobsites by selected client if available
        const clientJobsites = matchingClientId 
          ? jobsites.filter(j => j.client === matchingClientId)
          : jobsites;
        
        console.log(`Found ${clientJobsites.length} jobsites for client ID: ${matchingClientId || 'none'}`);
        
        // First try exact match
        let matchingJobsite = clientJobsites.find(j => 
          j.name.toLowerCase().trim() === normalizedJobsiteName
        );
        
        // If no exact match, try substring match in both directions
        if (!matchingJobsite) {
          console.log('No exact jobsite match found, trying partial matches...');
          matchingJobsite = clientJobsites.find(j => 
            j.name.toLowerCase().includes(normalizedJobsiteName) ||
            normalizedJobsiteName.includes(j.name.toLowerCase())
          );
        }
        
        if (matchingJobsite) {
          console.log('Found matching jobsite:', matchingJobsite.name, 'with ID:', matchingJobsite._id);
          matchingJobsiteId = matchingJobsite._id;
        } else {
          console.log('No matching jobsite found for:', normalizedJobsiteName);
          console.log('Available jobsites for this client:', 
            clientJobsites.map(j => ({ id: j._id, name: j.name }))
          );
        }
      }
      
      // Calculate due date based on issue date and client payment terms
      let dueDate = '';
      if (extractedData.date && matchingClientId) {
        dueDate = calculateDueDate(extractedData.date, matchingClientId);
      }
      
      // Create the final file data object
      const finalFileData: ProcessedFile = {
        file,
        extractedData,
        editedData: { 
          ...extractedData,
          dueDate: dueDate || extractedData.dueDate,
          clientId: matchingClientId,
          jobsiteId: matchingJobsiteId
        },
        isProcessed: true,
        status: 'success'
      };
      
      // If we're parsing from filename only, add the file to the list with all data at once
      if (useFilenameOnly) {
        setProcessedFiles(prevFiles => [...prevFiles, finalFileData]);
      } else {
        // Update existing file in the list by finding it by name
        setProcessedFiles(prevFiles => 
          prevFiles.map(pf => 
            pf.file.name === file.name && pf.status === 'processing'
              ? finalFileData
              : pf
          )
        );
      }
      
      console.log(`File ${file.name} processed successfully`);
      return true;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      
      // Create error file data
      const errorFileData: ProcessedFile = {
        file,
        extractedData: {},
        editedData: {},
        isProcessed: false,
        error: error instanceof Error ? error.message : 'Failed to process file',
        status: 'error'
      };
      
      // Update file in the list with error status
      setProcessedFiles(prevFiles => {
        // Check if file is already in the list
        const existingFileIndex = prevFiles.findIndex(pf => pf.file.name === file.name);
        
        if (existingFileIndex >= 0) {
          // Update existing file with error status
          const updatedFiles = [...prevFiles];
          updatedFiles[existingFileIndex] = errorFileData;
          return updatedFiles;
        } else {
          // Add new file with error status
          return [...prevFiles, errorFileData];
        }
      });
      
      // Show toast with error
      toast.error(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return false;
    } finally {
      setProcessingFile(null);
    }
  };

  // Update due dates when client changes
  useEffect(() => {
    if (selectedClientId && processedFiles.length > 0) {
      setProcessedFiles(prev => prev.map(pf => {
        if (pf.editedData.date) {
          const newDueDate = calculateDueDate(pf.editedData.date, selectedClientId);
          return {
            ...pf,
            editedData: {
              ...pf.editedData,
              dueDate: newDueDate
            }
          };
        }
        return pf;
      }));
    }
  }, [selectedClientId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('Files selected:', files);
    
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      console.log(`Selected ${fileArray.length} files:`, fileArray.map(f => f.name).join(', '));
      
      // Add files to selected files
      setSelectedFiles(prev => [...prev, ...fileArray]);
      
      // Process files sequentially
      console.log('Starting sequential file processing...');
      for (const file of fileArray) {
        try {
          console.log(`Processing file ${file.name}...`);
          await processFile(file);
          console.log(`Completed processing ${file.name}`);
        } catch (e) {
          console.error(`Error in handleFileSelect for ${file.name}:`, e);
        }
      }
      console.log('All files have been processed');
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    console.log('Files dropped:', files);
    
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      console.log(`Dropped ${fileArray.length} files:`, fileArray.map(f => f.name).join(', '));
      
      // Add files to selected files
      setSelectedFiles(prev => [...prev, ...fileArray]);
      
      // Process files sequentially
      console.log('Starting sequential file processing from drop...');
      for (const file of fileArray) {
        try {
          console.log(`Processing dropped file ${file.name}...`);
          await processFile(file);
          console.log(`Completed processing dropped file ${file.name}`);
        } catch (e) {
          console.error(`Error in handleDrop for ${file.name}:`, e);
        }
      }
      console.log('All dropped files have been processed');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    
    // Remove from selected files
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Also remove from processed files if it exists there
    setProcessedFiles(prev => prev.filter(pf => pf.file.name !== fileToRemove.name));
  };

  const handleRemoveProcessedFile = (index: number) => {
    const fileToRemove = processedFiles[index].file;
    
    // Remove from processed files
    setProcessedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Also remove from selected files if it exists there
    setSelectedFiles(prev => prev.filter(f => f.name !== fileToRemove.name));
  };

  // Update invoice data when edited by user
  const handleDataChange = (index: number, field: keyof ExtractedInvoiceData | 'clientId' | 'jobsiteId', value: string | number) => {
    if (field === 'clientId') {
      console.log('Client changed to:', value);
      // Update the selectedClientId to trigger jobsite fetch
      setSelectedClientId(value as string);
    }
    
    setProcessedFiles(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        editedData: {
          ...updated[index].editedData,
          [field]: value
        }
      };
      
      // If date or client changed, recalculate due date
      if ((field === 'date' || field === 'clientId') && updated[index].editedData.date) {
        const clientIdToUse = field === 'clientId' ? value as string : updated[index].editedData.clientId as string;
        if (clientIdToUse) {
          const newDueDate = calculateDueDate(updated[index].editedData.date as string, clientIdToUse);
          if (newDueDate) {
            updated[index].editedData.dueDate = newDueDate;
          }
        }
      }
      
      return updated;
    });
  };

  // Create a new function to upload a file to S3
  const uploadFileToS3 = async (file: File, data: ExtractedInvoiceData, client: Client | undefined): Promise<string> => {
    try {
      console.log(`Uploading file ${file.name} to S3`);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Use invoice data or fallback to file name for invoice number
      const invoiceNumber = data.invoiceNumber || file.name.replace(/\.[^/.]+$/, "");
      formData.append('invoiceNumber', invoiceNumber);
      formData.append('invoiceId', data.clientId || clientId || 'unknown');
      
      // Format date for S3 path using DD.MM.YY (two-digit year)
      const dateObj = data.date ? new Date(data.date) : new Date();
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = (dateObj.getFullYear() % 100).toString().padStart(2, '0'); // Convert to 2-digit year
      const dateStr = `${day}.${month}.${year}`;
      formData.append('date', dateStr);
      
      // Get company name
      let company = "Unknown Company";
      if (client) {
        company = client.companyName;
      } else if (data.clientName) {
        company = data.clientName;
      }
      formData.append('company', company);
      
      // Get jobsite name - ALWAYS prioritize the selected jobsite from the app
      let jobsite = "Office";
      // First try to get the jobsite name from the selected jobsiteId (user's choice in the app)
      if (data.jobsiteId) {
        const selectedJobsite = jobsites.find(j => j._id === data.jobsiteId);
        if (selectedJobsite) {
          jobsite = selectedJobsite.name;
          console.log(`Using selected jobsite name: ${jobsite}`);
        }
      } 
      // Only fall back to parsed jobsiteName if we couldn't find by ID
      else if (data.jobsiteName) {
        jobsite = data.jobsiteName;
        console.log(`Falling back to parsed jobsite name: ${jobsite}`);
      }
      formData.append('jobsite', jobsite);
      
      // Upload to S3 using our new endpoint
      const response = await fetch('/api/invoices/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to upload file: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('S3 upload response:', responseData);
      
      return responseData.fileKey;
    } catch (error) {
      console.error(`Error uploading file to S3:`, error);
      throw error;
    }
  };

  const handleRecordInvoices = async () => {
    setIsUploading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Upload each file and create invoices
      for (let i = 0; i < processedFiles.length; i++) {
        const processedFile = processedFiles[i];
        
        try {
          // Skip files with errors
          if (!processedFile.isProcessed || processedFile.error) {
            console.log(`Skipping file ${processedFile.file.name} due to processing error`);
            continue;
          }
          
          const data = processedFile.editedData;
          
          // Make sure we have required fields
          if (!data.invoiceNumber || !data.date || !data.amount || !data.clientId) {
            console.error(`Missing required fields for file ${processedFile.file.name}`);
            toast.error(`Missing required fields for ${processedFile.file.name}`);
            continue;
          }
          
          // Get client for company name
          const client = clients.find(c => c._id === data.clientId);
          
          // First upload file to S3
          const fileKey = await uploadFileToS3(processedFile.file, data, client);
          
          // Then create invoice record
          const invoiceData = {
            invoiceNumber: data.invoiceNumber,
            clientId: data.clientId,
            jobsiteId: data.jobsiteId,
            amount: data.amount,
            status: data.status || 'pending',
            date: data.date,
            dueDate: data.dueDate,
            items: data.items || [],
            fileKey: fileKey // Use the S3 file key instead of a local file path
          };
          
          console.log('Creating invoice with data:', invoiceData);
          
          const response = await fetch('http://localhost:5000/api/invoices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(invoiceData)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }
          
          const createdInvoice = await response.json();
          console.log('Invoice created:', createdInvoice);
          
          toast.success(`Invoice ${data.invoiceNumber} recorded successfully`);
        } catch (error) {
          console.error(`Error processing file ${processedFile.file.name}:`, error);
          toast.error(`Error recording invoice from ${processedFile.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Callback for success
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error recording invoices:', error);
      toast.error(`Error recording invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Test the PDF parser with a sample file
  const testPdfParser = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select a file first');
      return;
    }
    
    const file = selectedFiles[0];
    try {
      toast.loading('Testing PDF parser...');
      await processFile(file);
      toast.dismiss();
      toast.success('PDF parser test completed');
    } catch (error) {
      toast.dismiss();
      toast.error(`PDF parser test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Preview PDF file
  const handlePreviewFile = (file: File) => {
    const fileUrl = URL.createObjectURL(file);
    setPreviewUrl(fileUrl);
    setShowPreview(true);
  };

  // Close preview
  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setShowPreview(false);
  };

  // Test line extraction for debugging
  const testLineExtraction = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select a file first');
      return;
    }
    
    const file = selectedFiles[0];
    try {
      toast.loading('Testing line extraction...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'extract_lines');
      
      const token = localStorage.getItem('token');
      // Fix the URL to match the backend route
      const response = await fetch('http://localhost:5000/api/invoices/extract-lines', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Line extraction results:', data);
      
      toast.dismiss();
      toast.success('Line extraction completed. Check console for results.');
    } catch (error) {
      toast.dismiss();
      toast.error(`Line extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const renderFileTable = () => (
    <div className="overflow-x-auto mt-6 border rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[40px]">
              Status
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">
              File
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
              Client
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
              Jobsite
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Invoice #
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {processedFiles.map((processedFile, index) => (
            <tr key={index} className={processedFile.error ? 'bg-red-50' : ''}>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                {processedFile.status === 'processing' && (
                  <AiOutlineLoading3Quarters className="animate-spin h-5 w-5 text-blue-500 mx-auto" />
                )}
                {processedFile.status === 'success' && (
                  <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />
                )}
                {processedFile.status === 'error' && (
                  <XMarkIcon className="h-5 w-5 text-red-500 mx-auto" />
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="truncate max-w-[100px]">{processedFile.file.name}</div>
                  <button 
                    onClick={() => handlePreviewFile(processedFile.file)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                    title="Preview PDF"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
                {processedFile.error && (
                  <div className="text-xs text-red-500 mt-1">{processedFile.error}</div>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                <select
                  value={processedFile.editedData.clientId || ''}
                  onChange={(e) => handleDataChange(index, 'clientId', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                <select
                  value={processedFile.editedData.jobsiteId || ''}
                  onChange={(e) => handleDataChange(index, 'jobsiteId', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select a jobsite</option>
                  {jobsites.length === 0 ? (
                    <option value="" disabled>No jobsites available</option>
                  ) : !processedFile.editedData.clientId ? (
                    <option value="" disabled>Select a client first</option>
                  ) : (
                    jobsites
                      .filter(j => !processedFile.editedData.clientId || j.client === processedFile.editedData.clientId)
                      .map(jobsite => (
                        <option key={jobsite._id} value={jobsite._id}>
                          {jobsite.name}
                        </option>
                      ))
                  )}
                  {jobsites.length > 0 && processedFile.editedData.clientId && 
                   jobsites.filter(j => j.client === processedFile.editedData.clientId).length === 0 && (
                    <option value="" disabled>No jobsites for selected client</option>
                  )}
                </select>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                <input
                  type="text"
                  value={processedFile.editedData.invoiceNumber || ''}
                  onChange={(e) => handleDataChange(index, 'invoiceNumber', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                <input
                  type="date"
                  value={processedFile.editedData.date ? new Date(processedFile.editedData.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDataChange(index, 'date', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                <input
                  type="date"
                  value={processedFile.editedData.dueDate ? new Date(processedFile.editedData.dueDate).toISOString().split('T')[0] : ''}
                  readOnly
                  className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  title="Due date is calculated automatically based on client payment terms"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                <input
                  type="number"
                  step="0.01"
                  value={processedFile.editedData.amount || ''}
                  onChange={(e) => handleDataChange(index, 'amount', parseFloat(e.target.value))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                <select
                  value={processedFile.editedData.status || 'pending'}
                  onChange={(e) => handleDataChange(index, 'status', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRemoveProcessedFile(index)}
                    className="text-red-600 hover:text-red-900"
                    title="Remove"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {processingFile && !processedFiles.some(pf => pf.file.name === processingFile) && (
            <tr>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                <AiOutlineLoading3Quarters className="animate-spin h-5 w-5 text-blue-500 mx-auto" />
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                <div className="truncate max-w-[120px]">{processingFile}</div>
                <div className="text-xs text-blue-500 mt-1">Processing...</div>
              </td>
              <td colSpan={8} className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-full"></div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>
          
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="mx-auto max-w-7xl rounded bg-white p-6 shadow-xl w-full overflow-visible">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-lg font-medium">
                      Upload Invoices
                    </Dialog.Title>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={onClose}
                    >
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
                        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Drag and drop your invoice PDF{selectedFiles.length !== 1 ? 's' : ''} here, or click to select
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Supports PDF files only
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf"
                        multiple
                      />
                    </div>

                    {/* Debug information */}
                    <div className="bg-gray-50 p-3 rounded-md text-xs">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Debug Information</h4>
                        <div className="space-x-2">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            onClick={() => {
                              // Test the API connection
                              fetch('http://localhost:5000/api/invoices', {
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                                }
                              })
                              .then(response => {
                                console.log('API connection test:', response.status);
                                toast.success(`API connection test: ${response.status}`);
                              })
                              .catch(error => {
                                console.error('API connection test failed:', error);
                                toast.error(`API connection test failed: ${error.message}`);
                              });
                            }}
                          >
                            Test API Connection
                          </button>
                          {selectedFiles.length > 0 && (
                            <>
                              <button
                                type="button"
                                className="text-green-600 hover:text-green-800 text-xs"
                                onClick={testPdfParser}
                              >
                                Test PDF Parser
                              </button>
                              <button
                                type="button"
                                className="text-purple-600 hover:text-purple-800 text-xs"
                                onClick={testLineExtraction}
                              >
                                Debug Line Extraction
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="mt-1">Initial Client ID: {clientId || 'Not provided'}</p>
                      <p>Initial Jobsite ID: {jobsiteId || 'Not provided'}</p>
                      <p>Selected Files: {selectedFiles.length}</p>
                      <p>Processed Files: {processedFiles.length}</p>
                      <p>API URL: http://localhost:5000/api/invoices/upload-parse</p>
                    </div>

                    {/* Show the table of processed files */}
                    {processedFiles.length > 0 && renderFileTable()}

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        onClick={onClose}
                        disabled={isUploading}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
                          processedFiles.length === 0 || isUploading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                        }`}
                        onClick={handleRecordInvoices}
                        disabled={processedFiles.length === 0 || isUploading}
                      >
                        {isUploading ? 'Recording...' : 'Record Invoices'}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Use the completely isolated PDF Preview component */}
      <PDFPreviewModal 
        isOpen={showPreview} 
        onClose={handleClosePreview} 
        pdfUrl={previewUrl} 
      />
    </>
  );
}; 