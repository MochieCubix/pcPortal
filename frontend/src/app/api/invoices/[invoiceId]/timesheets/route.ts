import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In a real application, this would be connected to your database
// For this demo, we'll use an in-memory store
export const invoiceTimesheets: Record<string, Array<{
  id: string;
  fileKey: string;
  name: string;
  fileUrl: string;
  fileType: string;
  uploadDate: string;
}>> = {};

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const invoiceId = params.invoiceId;
    
    // Get timesheets for the invoice
    const timesheets = invoiceTimesheets[invoiceId] || [];
    
    return NextResponse.json(timesheets);
  } catch (error) {
    console.error('Error getting timesheets:', error);
    return NextResponse.json(
      { error: 'Failed to get timesheets' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const invoiceId = params.invoiceId;
    const { fileKeys } = await request.json();
    
    if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
      return NextResponse.json(
        { error: 'No file keys provided' },
        { status: 400 }
      );
    }
    
    // Initialize the timesheets array for this invoice if it doesn't exist
    if (!invoiceTimesheets[invoiceId]) {
      invoiceTimesheets[invoiceId] = [];
    }
    
    // Add the new timesheets
    const newTimesheets = fileKeys.map(fileKey => {
      // Extract the filename from the fileKey
      const parts = fileKey.split('/');
      const filename = parts[parts.length - 1];
      const name = filename.substring(filename.indexOf('-') + 1);
      
      // Generate file URL (in a real app, this would come from your storage service)
      const bucketName = process.env.AWS_S3_BUCKET_NAME || 'your-bucket-name';
      const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
      
      // Determine file type based on extension
      const fileExtension = name.split('.').pop()?.toLowerCase();
      let fileType = 'application/octet-stream';
      
      if (fileExtension === 'pdf') fileType = 'application/pdf';
      else if (['jpg', 'jpeg'].includes(fileExtension || '')) fileType = 'image/jpeg';
      else if (fileExtension === 'png') fileType = 'image/png';
      else if (fileExtension === 'heic') fileType = 'image/heic';
      
      return {
        id: uuidv4(),
        fileKey,
        name,
        fileUrl,
        fileType,
        uploadDate: new Date().toISOString(),
      };
    });
    
    // Add to the existing timesheets
    invoiceTimesheets[invoiceId] = [
      ...invoiceTimesheets[invoiceId],
      ...newTimesheets,
    ];
    
    // Return the updated invoice with timesheets
    // In a real application, you would fetch the invoice from the database
    // and add the timesheets to it
    const mockInvoice = {
      _id: invoiceId,
      invoiceNumber: `INV-${invoiceId.substring(0, 5)}`,
      date: new Date().toISOString(),
      status: 'pending',
      timesheets: invoiceTimesheets[invoiceId],
    };
    
    return NextResponse.json(mockInvoice);
  } catch (error) {
    console.error('Error attaching timesheets:', error);
    return NextResponse.json(
      { error: 'Failed to attach timesheets' },
      { status: 500 }
    );
  }
} 