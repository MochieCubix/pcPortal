import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// AWS S3 configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || '';

// This would typically be stored in your database
// For this demo, we're using a reference to the object defined in the timesheets route.ts
// In a real application, you would use a proper database connection
// @ts-ignore - Access to invoiceTimesheets from the parent route
import { invoiceTimesheets } from '../route';

export async function DELETE(
  request: NextRequest,
  context: { params: { invoiceId: string; timesheetId: string } }
) {
  try {
    const { invoiceId, timesheetId } = context.params;
    
    // Check if the invoice has any timesheets
    if (!invoiceTimesheets[invoiceId] || invoiceTimesheets[invoiceId].length === 0) {
      return NextResponse.json(
        { error: 'No timesheets found for this invoice' },
        { status: 404 }
      );
    }
    
    // Find the timesheet to delete
    const timesheetIndex = invoiceTimesheets[invoiceId].findIndex(
      (ts) => ts.id === timesheetId
    );
    
    if (timesheetIndex === -1) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }
    
    // Get the timesheet details before removing it
    const timesheet = invoiceTimesheets[invoiceId][timesheetIndex];
    
    // Delete from S3 if a real S3 bucket is configured
    if (bucketName && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: timesheet.fileKey,
          })
        );
      } catch (s3Error) {
        console.error('Error deleting file from S3:', s3Error);
        // Continue with the process even if S3 deletion fails
      }
    }
    
    // Remove the timesheet from the list
    invoiceTimesheets[invoiceId].splice(timesheetIndex, 1);
    
    // Return the updated invoice with timesheets
    // In a real application, you would update the database and return the updated invoice
    const mockInvoice = {
      _id: invoiceId,
      invoiceNumber: `INV-${invoiceId.substring(0, 5)}`,
      date: new Date().toISOString(),
      status: 'pending',
      timesheets: invoiceTimesheets[invoiceId],
    };
    
    return NextResponse.json(mockInvoice);
  } catch (error) {
    console.error('Error deleting timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to delete timesheet' },
      { status: 500 }
    );
  }
} 