import { NextResponse } from 'next/server';
import { GetSendQuotaCommand } from '@aws-sdk/client-ses';
import { sesClient, DEFAULT_FROM_EMAIL } from '@/utils/awsConfig';

export async function GET() {
  // During build time, return a success response
  if (process.env.NODE_ENV === 'production' && !process.env.AWS_ACCESS_KEY_ID) {
    return NextResponse.json({
      success: true,
      message: 'SES check skipped during build'
    });
  }

  try {
    // Attempt to get SES quota to check if SES is properly configured
    const command = new GetSendQuotaCommand({});
    const response = await sesClient.send(command);

    // Check if the sender email is configured
    if (!DEFAULT_FROM_EMAIL || DEFAULT_FROM_EMAIL === 'no-reply@yourdomain.com') {
      return NextResponse.json(
        { 
          warning: true,
          message: 'SES is accessible, but the sender email is not configured. Please set NEXT_PUBLIC_SES_FROM_EMAIL environment variable.'
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SES is properly configured',
      quota: {
        max24HourSend: response.Max24HourSend,
        maxSendRate: response.MaxSendRate,
        sentLast24Hours: response.SentLast24Hours
      }
    });
  } catch (error: any) {
    console.error('Error checking SES configuration:', error);
    
    // Try to provide a helpful error message based on the error type
    let errorMessage = 'Failed to validate SES configuration';
    
    if (error.name === 'NoCredentialsError') {
      errorMessage = 'No AWS credentials found. Please check your environment variables or configuration';
    } else if (error.name === 'AccessDenied') {
      errorMessage = 'Access denied. The provided AWS credentials do not have permission to access SES';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 