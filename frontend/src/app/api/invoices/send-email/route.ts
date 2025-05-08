import { NextRequest, NextResponse } from 'next/server';

interface EmailAttachment {
  id: string;
  name: string;
  type: string;
  url?: string;
  source: 'invoice' | 'timesheet';
}

interface EmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  message: string;
  attachments: EmailAttachment[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const requestData: EmailRequest = await request.json();
    
    // Validation
    if (!requestData.to || requestData.to.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }
    
    if (!requestData.subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }
    
    // In a real implementation, you'd use a service like AWS SES, SendGrid, etc.
    // Here, we'll just simulate a response with a delay
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Randomly fail occasionally to demonstrate error handling
    if (Math.random() < 0.2) {
      throw new Error('Email service temporarily unavailable. Please try again later.');
    }
    
    // Success response
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      sentTo: requestData.to,
      sentAttachments: requestData.attachments.length,
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to send email',
        errorDetail: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 