'use client';

import React, { useState } from 'react';
import AwsConfigTester from '@/components/AwsConfigTester';
import InvoiceFileUploader from '@/components/InvoiceFileUploader';
import { s3Client, S3_BUCKET_NAME } from '@/utils/awsConfig';
import { ListBucketsCommand } from '@aws-sdk/client-s3';

export default function AwsTestPage() {
  const [uploadedFileKey, setUploadedFileKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  const handleUploadSuccess = (fileKey: string) => {
    setUploadedFileKey(fileKey);
    setUploadError(null);
  };
  
  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadedFileKey(null);
  };

  const testAwsConnection = async () => {
    try {
      setDebugInfo("Testing AWS connection...");
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      const buckets = response.Buckets?.map(b => b.Name).join(', ') || 'No buckets found';
      setDebugInfo(`AWS connection successful! Buckets: ${buckets}\nUsing bucket: ${S3_BUCKET_NAME}`);
    } catch (error: any) {
      setDebugInfo(`AWS connection error: ${error.message}`);
      console.error("AWS Error:", error);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">AWS Integration Test Page</h1>
      
      <div className="mb-4">
        <button 
          onClick={testAwsConnection}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Test AWS Connection
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">AWS Configuration Test</h2>
          <AwsConfigTester />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">S3 File Upload Test</h2>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-4">
              Test uploading a file to your S3 bucket. This simulates uploading an invoice document.
            </p>
            
            <InvoiceFileUploader 
              invoiceId="test-invoice-123"
              invoiceNumber="INV-TEST-001"
              date="12.06.2023"
              company="TEST COMPANY PTY LTD"
              jobsite="TEST JOBSITE"
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
            
            {uploadedFileKey && (
              <div className="mt-4 p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-700">
                  File uploaded successfully to S3!
                </p>
                <p className="text-xs text-green-600 font-mono mt-1">
                  {uploadedFileKey}
                </p>
              </div>
            )}
            
            {uploadError && (
              <div className="mt-4 p-3 bg-red-50 rounded-md">
                <p className="text-sm text-red-700">
                  Error uploading file: {uploadError}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {debugInfo && (
        <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-2">Debug Information</h3>
          <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-100 p-2 rounded">
            {debugInfo}
          </pre>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
        <div className="bg-white shadow rounded-lg p-4">
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Ensure your AWS credentials have the correct permissions</li>
            <li>Configure your SES sender email in environment variables</li>
            <li>If you're using SES in sandbox mode, verify recipient email addresses</li>
            <li>Add IAM policies for production use of these services</li>
            <li>Consider setting up CloudWatch monitoring for S3 and SES operations</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 