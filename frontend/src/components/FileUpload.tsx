'use client';

import { useState, useRef, useCallback } from 'react';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
    onFileSelect: (files: File[]) => void;
    acceptedFileTypes?: string;
    maxFileSizeMB?: number;
}

export default function FileUpload({ 
    onFileSelect, 
    acceptedFileTypes = '.pdf', 
    maxFileSizeMB = 10 
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const validateFiles = useCallback((files: File[]): boolean => {
        setError(null);

        for (const file of files) {
            // Check file type
            const fileType = file.type;
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            
            if (acceptedFileTypes !== '*') {
                const acceptedTypes = acceptedFileTypes.split(',').map(type => type.trim());
                const isValidType = acceptedTypes.some(type => {
                    if (type.startsWith('.')) {
                        // Check by extension
                        return `.${fileExtension}` === type;
                    } else {
                        // Check by MIME type
                        return fileType.includes(type);
                    }
                });

                if (!isValidType) {
                    setError(`Invalid file type: ${file.name}. Accepted types: ${acceptedFileTypes}`);
                    return false;
                }
            }

            // Check file size
            const fileSizeMB = file.size / (1024 * 1024);
            if (fileSizeMB > maxFileSizeMB) {
                setError(`File size exceeds the maximum limit of ${maxFileSizeMB}MB: ${file.name}`);
                return false;
            }
        }

        return true;
    }, [acceptedFileTypes, maxFileSizeMB]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            if (validateFiles(droppedFiles)) {
                onFileSelect(droppedFiles);
            }
        }
    }, [onFileSelect, validateFiles]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const selectedFiles = Array.from(files);
            if (validateFiles(selectedFiles)) {
                onFileSelect(selectedFiles);
            }
        }
    }, [onFileSelect, validateFiles]);

    const handleButtonClick = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    return (
        <div className="w-full">
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleButtonClick}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={acceptedFileTypes}
                    onChange={handleFileInputChange}
                    multiple
                />
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                    Drag and drop your files here, or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-500">
                    {acceptedFileTypes === '*' 
                        ? `Any file type up to ${maxFileSizeMB}MB` 
                        : `${acceptedFileTypes.replace(/\./g, '').toUpperCase()} files up to ${maxFileSizeMB}MB`}
                </p>
            </div>
            {error && (
                <div className="mt-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </div>
    );
} 