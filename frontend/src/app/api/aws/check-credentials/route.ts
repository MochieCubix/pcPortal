import { NextResponse } from 'next/server';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '@/utils/awsConfig';

export async function GET() {
  // During build time, return a success response
  if (process.env.NODE_ENV === 'production' && !process.env.AWS_ACCESS_KEY_ID) {
    return NextResponse.json({
      success: true,
      message: 'AWS credentials check skipped during build'
    });
  }

  try {
    // Attempt to access the S3 bucket
    const command = new HeadBucketCommand({
      Bucket: S3_BUCKET_NAME
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      message: 'AWS credentials are valid and S3 bucket is accessible'
    });
  } catch (error: any) {
    console.error('Error checking AWS credentials:', error);
    
    // Try to provide a helpful error message based on the error type
    let errorMessage = 'Failed to validate AWS credentials';
    
    if (error.name === 'NoCredentialsError') {
      errorMessage = 'No AWS credentials found. Please check your environment variables or configuration';
    } else if (error.name === 'AccessDenied') {
      errorMessage = 'Access denied. The provided AWS credentials do not have permission to access the bucket';
    } else if (error.name === 'NotFound') {
      errorMessage = `Bucket '${S3_BUCKET_NAME}' not found. Please check your bucket name`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 