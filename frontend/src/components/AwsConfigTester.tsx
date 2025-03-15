import React, { useState, useEffect } from 'react';
import { validateAwsCredentials, validateSesConfiguration } from '@/utils/awsCredentials';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const AwsConfigTester: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [s3Status, setS3Status] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [sesStatus, setSesStatus] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  const checkAwsConfiguration = async () => {
    setIsChecking(true);
    
    try {
      // Check S3 credentials
      const s3Result = await validateAwsCredentials();
      setS3Status(s3Result);
      
      // Check SES configuration
      const sesResult = await validateSesConfiguration();
      setSesStatus(sesResult);
    } catch (error) {
      console.error('Error checking AWS configuration:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 max-w-lg mx-auto">
      <h2 className="text-lg font-medium mb-4">AWS Configuration Checker</h2>
      
      <div className="mb-4">
        <button
          type="button"
          onClick={checkAwsConfiguration}
          disabled={isChecking}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
            ${isChecking 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {isChecking ? (
            <>
              <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
              Checking...
            </>
          ) : 'Check AWS Configuration'}
        </button>
      </div>
      
      {s3Status && (
        <div className={`mb-3 p-3 rounded-md ${s3Status.valid ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {s3Status.valid ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${s3Status.valid ? 'text-green-800' : 'text-red-800'}`}>
                S3 Configuration
              </h3>
              <div className={`mt-1 text-sm ${s3Status.valid ? 'text-green-700' : 'text-red-700'}`}>
                {s3Status.message}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {sesStatus && (
        <div className={`mb-3 p-3 rounded-md ${sesStatus.valid ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {sesStatus.valid ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${sesStatus.valid ? 'text-green-800' : 'text-red-800'}`}>
                SES Configuration
              </h3>
              <div className={`mt-1 text-sm ${sesStatus.valid ? 'text-green-700' : 'text-red-700'}`}>
                {sesStatus.message}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {(s3Status || sesStatus) && (
        <div className="mt-4 text-sm text-gray-500">
          <p>Make sure your AWS credentials have the following permissions:</p>
          <ul className="list-disc list-inside mt-1 ml-2">
            <li>s3:GetObject, s3:PutObject for S3 operations</li>
            <li>ses:SendEmail, ses:SendRawEmail for sending emails</li>
            <li>ses:GetSendQuota for checking SES configuration</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AwsConfigTester; 