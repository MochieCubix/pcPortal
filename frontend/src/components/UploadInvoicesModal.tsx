'use client';

import { useState, useRef, useEffect } from 'react';
import { FiUpload, FiX } from 'react-icons/fi';

interface UploadInvoicesModalProps {
    clientId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function UploadInvoicesModal({ clientId, onClose, onSuccess }: UploadInvoicesModalProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [action, setAction] = useState<'uploaded' | 'recorded' | 'cancelled'>('uploaded');
    const [selectedJobsiteId, setSelectedJobsiteId] = useState<string | null>(null);
    const [jobsites, setJobsites] = useState<Array<{ _id: string, name: string }>>([]);

    // Fetch jobsites for this client
    useEffect(() => {
        if (clientId) {
            const fetchJobsites = async () => {
                try {
                    const response = await fetch(`/api/clients/${clientId}/jobsites`);
                    if (response.ok) {
                        const data = await response.json();
                        setJobsites(data);
                        
                        // Set the first jobsite as default if available
                        if (data && data.length > 0) {
                            setSelectedJobsiteId(data[0]._id);
                        }
                    } else {
                        console.error('Failed to fetch jobsites');
                    }
                } catch (error) {
                    console.error('Error fetching jobsites:', error);
                }
            };
            
            fetchJobsites();
        }
    }, [clientId]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            // Check if all files are PDFs
            const invalidFiles = newFiles.filter(file => file.type !== 'application/pdf');
            if (invalidFiles.length > 0) {
                setError('Only PDF files are allowed');
                return;
            }
            setFiles(prevFiles => [...prevFiles, ...newFiles]);
            setError('');
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        // Check if all files are PDFs
        const invalidFiles = droppedFiles.filter(file => file.type !== 'application/pdf');
        if (invalidFiles.length > 0) {
            setError('Only PDF files are allowed');
            return;
        }
        setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
        setError('');
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const removeFile = (index: number) => {
        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            setError('Please select at least one file');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Process files sequentially
            const results = [];
            
            for (const file of files) {
                try {
                    setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
                    
                    // Create form data for this file
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('invoiceId', clientId); // Use clientId as invoiceId for now
                    formData.append('invoiceNumber', file.name.replace(/\.[^/.]+$/, "")); // Use filename without extension
                    
                    // Add the required date, company, jobsite fields
                    // Format date properly with 2-digit year (YY)
                    const today = new Date();
                    const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${(today.getFullYear() % 100).toString().padStart(2, '0')}`;
                    
                    formData.append('date', dateStr);
                    
                    // Get company name from local storage or profile if available
                    const userData = localStorage.getItem('userData');
                    let company = "Unknown Company";
                    if (userData) {
                        try {
                            const parsedData = JSON.parse(userData);
                            company = parsedData.companyName || parsedData.company || "Unknown Company";
                        } catch (e) {
                            console.error("Error parsing user data", e);
                        }
                    }
                    
                    formData.append('company', company);
                    
                    // Try to get a proper jobsite name if available in local storage
                    // Defaulting to 'Office' if no jobsite information is available
                    let jobsite = 'Office';
                    // If there's client-specific data with jobsite info, try to use that
                    if (clientId) {
                        try {
                            // Prioritize the selected jobsite from our dropdown
                            if (selectedJobsiteId) {
                                // Find the selected jobsite in our already loaded jobsites array
                                const selectedJobsite = jobsites.find(j => j._id === selectedJobsiteId);
                                if (selectedJobsite) {
                                    jobsite = selectedJobsite.name;
                                    console.log(`Using user-selected jobsite: ${jobsite}`);
                                }
                            } 
                            // Fall back to jobsites in localStorage if no selection was made
                            else {
                                const clientJobsites = localStorage.getItem(`jobsites_${clientId}`);
                                if (clientJobsites) {
                                    const jobsitesData = JSON.parse(clientJobsites);
                                    // Use the first jobsite name if available
                                    if (jobsitesData && jobsitesData.length > 0 && jobsitesData[0].name) {
                                        jobsite = jobsitesData[0].name;
                                        console.log(`Using jobsite name from client data: ${jobsite}`);
                                    }
                                }
                            }
                        } catch (e) {
                            console.error("Error getting jobsite data", e);
                        }
                    }
                    
                    formData.append('jobsite', jobsite);
                    
                    // Use the new S3 upload endpoint
                    const response = await fetch('/api/invoices/upload', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('Upload response for', file.name, ':', data);
                    
                    // Add to results
                    results.push({
                        filename: file.name,
                        success: true,
                        fileKey: data.fileKey,
                        message: data.message
                    });
                    
                    setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                } catch (err) {
                    console.error('Error uploading', file.name, ':', err);
                    results.push({
                        filename: file.name,
                        success: false,
                        error: err instanceof Error ? err.message : 'Upload failed'
                    });
                }
            }

            // Check for any failed uploads
            const failedUploads = results.filter(r => !r.success);
            if (failedUploads.length > 0) {
                setError(`Failed to process ${failedUploads.length} file(s)`);
            } else {
                onSuccess();
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload files');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Upload Invoices</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <FiX className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="p-4">
                        <h2 className="text-lg mb-4">Upload Invoices</h2>
                        
                        {/* Jobsite selection dropdown */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Jobsite
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={selectedJobsiteId || ""}
                                onChange={(e) => setSelectedJobsiteId(e.target.value || null)}
                            >
                                <option value="" disabled>Select a jobsite</option>
                                {jobsites.map((jobsite) => (
                                    <option key={jobsite._id} value={jobsite._id}>
                                        {jobsite.name}
                                    </option>
                                ))}
                                {jobsites.length === 0 && (
                                    <option value="" disabled>No jobsites available</option>
                                )}
                            </select>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Files
                            </label>
                            <div
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                className="border-2 border-dashed border-gray-300 p-6 rounded-md text-center"
                            >
                                <FiUpload className="mx-auto h-10 w-10 text-gray-400" />
                                <p className="mt-1 text-sm text-gray-600">
                                    Drag and drop files here, or click to select files
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Select Files
                                </button>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h4>
                                <div className="space-y-2">
                                    {files.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                            <div className="flex-1">
                                                <span className="text-sm text-gray-600">{file.name}</span>
                                                {uploadProgress[file.name] > 0 && (
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                        <div 
                                                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                                            style={{ width: `${uploadProgress[file.name]}%` }}
                                                        ></div>
                                                    </div>
                                                )}
                                            </div>
                                            {uploadProgress[file.name] === 100 ? (
                                                <span className="text-xs text-green-600">Uploaded</span>
                                            ) : (
                                                <button
                                                    onClick={() => removeFile(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                    disabled={loading}
                                                >
                                                    <FiX className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {files.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Action:</h4>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-blue-600"
                                            name="action"
                                            value="recorded"
                                            checked={action === 'recorded'}
                                            onChange={() => setAction('recorded')}
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Record Invoice</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            className="form-radio text-red-600"
                                            name="action"
                                            value="cancelled"
                                            checked={action === 'cancelled'}
                                            onChange={() => setAction('cancelled')}
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Cancel Invoice</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUpload}
                                disabled={loading || files.length === 0}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {loading ? 'Uploading...' : 'Upload Files'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 