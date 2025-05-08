import React, { useState, useRef } from 'react';
import { PaperClipIcon, DocumentArrowUpIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface TimesheetFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  key?: string;
  error?: string;
}

interface TimesheetUploaderProps {
  invoiceId: string;
  existingTimesheets?: Array<{
    id: string;
    name: string;
    fileKey: string;
    fileUrl?: string;
    fileType?: string;
    uploadDate?: string;
  }>;
  onUploadSuccess?: (fileKeys: string[]) => void;
  onUploadError?: (error: string) => void;
  onRemoveTimesheet?: (fileId: string) => void;
  onViewTimesheet?: (fileUrl: string, fileType: string) => void;
}

const TimesheetUploader: React.FC<TimesheetUploaderProps> = ({
  invoiceId,
  existingTimesheets = [],
  onUploadSuccess,
  onUploadError,
  onRemoveTimesheet,
  onViewTimesheet
}) => {
  const [files, setFiles] = useState<TimesheetFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        progress: 0,
        status: 'pending' as const
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
      
      // Reset the input field to allow selecting the same file multiple times
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      const newFiles = Array.from(e.dataTransfer.files).map(file => ({
        file,
        progress: 0,
        status: 'pending' as const
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Process files sequentially to avoid overwhelming the server
      const successfulUploads: string[] = [];
      
      // Update file status to uploading
      setFiles(prev => prev.map(file => ({
        ...file,
        status: 'uploading'
      })));
      
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        
        try {
          // Update progress
          setFiles(prev => prev.map((file, index) => 
            index === i ? { ...file, progress: 10 } : file
          ));
          
          const formData = new FormData();
          formData.append('invoiceId', invoiceId);
          formData.append('fileType', 'timesheet');
          formData.append('file', fileItem.file);

          // Update progress
          setFiles(prev => prev.map((file, index) => 
            index === i ? { ...file, progress: 30 } : file
          ));

          const response = await fetch('/api/timesheets/upload', {
            method: 'POST',
            body: formData,
          });

          // Update progress
          setFiles(prev => prev.map((file, index) => 
            index === i ? { ...file, progress: 70 } : file
          ));

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
          }

          const data = await response.json();
          
          // Update file status to success
          setFiles(prev => prev.map((file, index) => 
            index === i ? { 
              ...file, 
              progress: 100, 
              status: 'success',
              key: data.fileKey
            } : file
          ));
          
          successfulUploads.push(data.fileKey);
        } catch (err) {
          // Update file status to error
          setFiles(prev => prev.map((file, index) => 
            index === i ? { 
              ...file, 
              progress: 0, 
              status: 'error',
              error: err instanceof Error ? err.message : 'Upload failed'
            } : file
          ));
        }
      }
      
      if (successfulUploads.length > 0 && onUploadSuccess) {
        onUploadSuccess(successfulUploads);
      }
      
      if (successfulUploads.length === 0) {
        setError('All uploads failed');
        if (onUploadError) {
          onUploadError('All uploads failed');
        }
      } else if (successfulUploads.length < files.length) {
        setError(`${files.length - successfulUploads.length} uploads failed`);
      }
    } catch (err: any) {
      setError(err.message || 'File upload failed');
      
      if (onUploadError) {
        onUploadError(err.message || 'File upload failed');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (['pdf'].includes(extension || '')) {
      return "📄";
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'heic'].includes(extension || '')) {
      return "🖼️";
    } else if (['doc', 'docx'].includes(extension || '')) {
      return "📝";
    } else if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
      return "📊";
    } else {
      return "📎";
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing timesheet files */}
      {existingTimesheets.length > 0 && (
        <div className="border rounded-md p-3 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Attached Timesheets</h3>
          <ul className="space-y-2">
            {existingTimesheets.map((timesheet) => (
              <li key={timesheet.id} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span>{getFileIcon(timesheet.name)}</span>
                  <span className="truncate max-w-[200px]">{timesheet.name}</span>
                  {timesheet.uploadDate && (
                    <span className="text-xs text-gray-500">
                      {new Date(timesheet.uploadDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  {timesheet.fileUrl && (
                    <button
                      type="button"
                      onClick={() => onViewTimesheet && onViewTimesheet(timesheet.fileUrl || '', timesheet.fileType || '')}
                      className="text-blue-600 hover:text-blue-800"
                      title="View Timesheet"
                    >
                      <DocumentArrowUpIcon className="h-4 w-4" />
                    </button>
                  )}
                  {onRemoveTimesheet && (
                    <button
                      type="button"
                      onClick={() => onRemoveTimesheet(timesheet.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove Timesheet"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* File upload area */}
      <div
        className={`
          border-2 border-dashed rounded-md p-4 ${isUploading ? 'opacity-70' : ''}
          ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}
        `}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <PaperClipIcon className="h-8 w-8 text-gray-400" />
          <div className="text-sm text-center text-gray-500">
            <label htmlFor="timesheet-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
              <span>Upload timesheets</span>
              <input 
                id="timesheet-upload" 
                name="timesheet-upload" 
                type="file" 
                className="sr-only" 
                onChange={handleFileChange}
                ref={fileInputRef}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.heic"
                multiple
              />
            </label>
            <p className="pl-1">or drag and drop</p>
            <p className="text-xs text-gray-400">PDF, Images (JPG, PNG, HEIC), or Documents up to 10MB</p>
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
        </div>
      </div>

      {/* Selected files list */}
      {files.length > 0 && (
        <div className="border rounded-md p-3 bg-white">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files ({files.length})</h3>
          <ul className="space-y-2">
            {files.map((fileItem, index) => (
              <li key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <span>{getFileIcon(fileItem.file.name)}</span>
                  <span className="truncate max-w-[200px]">{fileItem.file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(fileItem.file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Status indicators */}
                  {fileItem.status === 'success' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  )}
                  {fileItem.status === 'error' && (
                    <div className="flex items-center">
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                      <span className="text-xs text-red-500 ml-1">{fileItem.error}</span>
                    </div>
                  )}
                  {fileItem.status === 'uploading' && fileItem.progress > 0 && (
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${fileItem.progress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  {/* Remove button - disabled during upload */}
                  {fileItem.status !== 'uploading' && (
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      disabled={isUploading}
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          
          {/* Upload button */}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || files.length === 0 || files.every(f => f.status === 'success')}
              className={`
                inline-flex items-center px-3 py-1.5 border border-transparent 
                text-xs font-medium rounded-md shadow-sm text-white 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${isUploading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : files.length === 0 || files.every(f => f.status === 'success')
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }
              `}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                'Upload Timesheets'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetUploader; 