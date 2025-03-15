import { S3Client } from '@aws-sdk/client-s3';
import { SESClient } from '@aws-sdk/client-ses';

// AWS Region
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-southeast-2';

// S3 Configuration
export const S3_BUCKET_NAME = process.env.NEXT_PUBLIC_S3_INVOICE_BUCKET || 'pcpanel';

console.log('AWS Configuration:', {
  region: AWS_REGION,
  bucket: S3_BUCKET_NAME,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
});

// Create S3 client with error handling middleware
export const s3Client = new S3Client({
  region: AWS_REGION,
  // Enable debug logging in development
  logger: console,
  // The credentials will be loaded from environment variables or IAM roles
  // depending on where this code is running
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY 
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    : undefined
});

// Create SES client
export const sesClient = new SESClient({
  region: AWS_REGION,
  // Enable debug logging in development
  logger: console,
  // The credentials will be loaded from environment variables or IAM roles
  // depending on where this code is running
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY 
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    : undefined
});

// SES Email Configuration
export const DEFAULT_FROM_EMAIL = process.env.NEXT_PUBLIC_SES_FROM_EMAIL || 'no-reply@yourdomain.com';

// Maximum file size for S3 uploads (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024; 