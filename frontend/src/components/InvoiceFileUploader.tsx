import React, { useState, useRef } from 'react';
import { PaperClipIcon, DocumentArrowUpIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface InvoiceFileUploaderProps {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  company: string;
  jobsite: string;
  onUploadSuccess?: (fileKey: string) => void;
  onUploadError?: (error: string) => void;
}

const InvoiceFileUploader: React.FC<InvoiceFileUploaderProps> = ({
  invoiceId,
  invoiceNumber,
  date,
  company,
  jobsite,
  onUploadSuccess,
  onUploadError
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('invoiceId', invoiceId);
      formData.append('invoiceNumber', invoiceNumber);
      formData.append('date', date);
      formData.append('company', company);
      formData.append('jobsite', jobsite);
      formData.append('file', file);

      console.log('Uploading file with params:', {
        invoiceId, invoiceNumber, date, company, jobsite, fileName: file.name, fileSize: file.size
      });

      const response = await fetch('/api/invoices/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Upload failed:', data);
        throw new Error(data.error || `Upload failed with status: ${response.status}`);
      }
      
      console.log('Upload response:', data);
      
      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(data.fileKey);
      }
      
      // Reset state
      setFile(null);
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    } catch (err: any) {
      console.error('Upload error:', err);
      const errorMsg = err.message || 'File upload failed';
      setError(errorMsg);
      
      if (onUploadError) {
        onUploadError(errorMsg);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mt-2">
      <div
        className={`
          border-2 border-dashed rounded-md p-4
          ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}
          ${isUploading ? 'opacity-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          {!file ? (
            <>
              <PaperClipIcon className="h-8 w-8 text-gray-400" />
              <div className="text-sm text-center text-gray-500">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                  <span>Upload an invoice file</span>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only" 
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
                <p className="text-xs text-gray-400">PDF, Word, Excel, or Image up to 10MB</p>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <DocumentArrowUpIcon className="h-6 w-6 text-blue-500" />
              <span className="text-sm font-medium">{file.name}</span>
              <button 
                type="button" 
                onClick={clearFile}
                className="text-red-500 hover:text-red-700"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          {progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          {file && !isUploading && (
            <button
              type="button"
              onClick={handleUpload}
              className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Upload Invoice
            </button>
          )}

          {isUploading && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Uploading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceFileUploader; 