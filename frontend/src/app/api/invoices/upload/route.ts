import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME, MAX_FILE_SIZE } from '@/utils/awsConfig';
import { getInvoiceS3Key, getContentType } from '@/utils/s3Utils';

// Helper function to validate and ensure proper date format (DD.MM.YY)
function ensureProperDateFormat(dateString: string): string {
  console.log('Original date string:', dateString);
  
  // Check if it matches DD.MM.YY format
  const ddMmYyRegex = /^(\d{2})\.(\d{2})\.(\d{2})$/;
  // Check if it matches DD.MM.YYYY format
  const ddMmYyyyRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  
  if (ddMmYyRegex.test(dateString)) {
    // Already in DD.MM.YY format, just return it
    return dateString;
  }
  
  if (ddMmYyyyRegex.test(dateString)) {
    // Convert from DD.MM.YYYY to DD.MM.YY format
    const matches = dateString.match(ddMmYyyyRegex);
    if (matches) {
      const day = matches[1];
      const month = matches[2];
      const fullYear = matches[3];
      // Convert 4-digit year to 2-digit year
      const shortYear = fullYear.substring(2);
      const result = `${day}.${month}.${shortYear}`;
      console.log('Converted date to DD.MM.YY format:', result);
      return result;
    }
  }
  
  // If not in standard format, try to parse and convert to DD.MM.YY
  try {
    const dateObj = new Date(dateString);
    if (!isNaN(dateObj.getTime())) {
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = (dateObj.getFullYear() % 100).toString().padStart(2, '0');
      const result = `${day}.${month}.${year}`;
      console.log('Parsed date and converted to DD.MM.YY format:', result);
      return result;
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }
  
  // Return original if we can't convert it
  console.log('Using original date format as-is');
  return dateString;
}

export async function POST(req: NextRequest) {
  try {
    // Authentication is handled by middleware/cookies
    // We'll assume the user is already authenticated
    
    console.log('Upload API called');
    
    // Check if the request has the correct content type
    if (!req.headers.get('content-type')?.includes('multipart/form-data')) {
      console.error('Invalid content type:', req.headers.get('content-type'));
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Parse the form data
    const formData = await req.formData();
    
    // Get form fields
    const invoiceId = formData.get('invoiceId') as string;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    let date = formData.get('date') as string;
    const company = formData.get('company') as string;
    const jobsite = formData.get('jobsite') as string;
    const file = formData.get('file') as File;

    // Ensure date is in the proper format (DD.MM.YY)
    date = ensureProperDateFormat(date);

    console.log('Received form data:', { 
      invoiceId, 
      invoiceNumber, 
      date, 
      company, 
      jobsite, 
      fileName: file?.name,
      fileSize: file?.size
    });

    // Validate required fields
    if (!invoiceNumber || !file || !date || !company || !jobsite) {
      const missingFields = [];
      if (!invoiceNumber) missingFields.push('invoiceNumber');
      if (!file) missingFields.push('file');
      if (!date) missingFields.push('date');
      if (!company) missingFields.push('company');
      if (!jobsite) missingFields.push('jobsite');
      
      console.error('Missing required fields:', missingFields);
      
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.error('File too large:', file.size);
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf';

    // Get file buffer
    const buffer = await file.arrayBuffer();
    
    // Generate S3 key for the invoice file using the new structured format
    const s3Key = getInvoiceS3Key({
      invoiceNumber,
      date,
      company,
      jobsite,
      fileExtension
    });
    
    console.log('Generated S3 Key:', s3Key);
    console.log('Target S3 Bucket:', S3_BUCKET_NAME);
    
    // Upload to S3
    try {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: Buffer.from(buffer),
        ContentType: getContentType(file.name),
        // Add metadata for searchability and tracking
        Metadata: {
          invoiceId,
          invoiceNumber,
          company,
          jobsite,
          date,
          uploadedAt: new Date().toISOString(),
        },
      });

      console.log('Sending S3 PutObject command');
      await s3Client.send(command);
      console.log('File uploaded successfully to S3');
      
      // Return success response with the file key
      return NextResponse.json({
        success: true,
        fileKey: s3Key,
        message: 'File uploaded successfully'
      });
    } catch (error: any) {
      console.error('Error uploading file to S3:', error);
      
      return NextResponse.json(
        { 
          error: 'Failed to upload file to S3', 
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error processing upload request:', error);
    
    return NextResponse.json(
      { 
        error: 'Error processing upload request',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Also handle GET requests to indicate this endpoint is for file uploads
export async function GET() {
  return NextResponse.json(
    { message: 'This endpoint is for uploading invoice files. Use POST with multipart/form-data.' },
    { status: 405 }
  );
} 