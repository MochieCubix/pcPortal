import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '@/utils/awsConfig';
import { sendEmailWithAttachments } from '@/utils/sesUtils';
import { getInvoiceS3Key, getContentType } from '@/utils/s3Utils';

// Note: This is a placeholder for AWS SES implementation
// You would need to set up the actual AWS SDK and configure SES

interface EmailRequestBody {
  subject: string;
  body: string;
  recipients: string[];
  invoiceIds: string[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  fileKey?: string;
  jobName?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Authentication is handled by middleware or cookies
    // We'll assume the user is already authenticated
    
    // Parse request body
    const { subject, body, recipients, invoiceIds }: EmailRequestBody = await req.json();

    // Validate request
    if (!subject || !body || !recipients.length || !invoiceIds.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    try {
      // Fetch invoice data from your backend API or database
      // This is a placeholder - in production, you would get this data from your API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/invoices/details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.get('authorization') || '',
        },
        body: JSON.stringify({ invoiceIds }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch invoice details: ${response.statusText}`);
      }
      
      const invoices: Invoice[] = await response.json();

      // Fetch invoice files from S3
      const attachments = await Promise.all(
        invoices.map(async (invoice) => {
          try {
            // Get the S3 key for the invoice
            const s3Key = invoice.fileKey || getInvoiceS3Key(invoice.id, invoice.invoiceNumber);
            
            // Fetch the file from S3
            const command = new GetObjectCommand({
              Bucket: S3_BUCKET_NAME,
              Key: s3Key
            });
            
            const response = await s3Client.send(command);
            
            // Convert the response stream to a buffer
            const responseBodyStream = response.Body;
            if (!responseBodyStream) {
              throw new Error('Empty response from S3');
            }
            
            // AWS SDK v3 returns a readable stream
            // We need to convert it to a buffer
            let buffer: Buffer;
            
            // Check if we're in a Node.js environment or browser
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
              // Node.js environment
              const chunks: Buffer[] = [];
              for await (const chunk of responseBodyStream as any) {
                chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
              }
              buffer = Buffer.concat(chunks);
            } else {
              // Browser environment - use web APIs
              const blob = await new Response(responseBodyStream as any).blob();
              const arrayBuffer = await blob.arrayBuffer();
              buffer = Buffer.from(arrayBuffer);
            }
            
            return {
              filename: `Invoice-${invoice.invoiceNumber}.pdf`,
              content: buffer,
              contentType: getContentType(s3Key)
            };
          } catch (error) {
            console.error(`Error fetching invoice ${invoice.id} from S3:`, error);
            // Continue with other attachments
            return null;
          }
        })
      );

      // Filter out any null attachments (failed fetches)
      const validAttachments = attachments.filter(attachment => attachment !== null);

      // Send the email with attachments
      await sendEmailWithAttachments(
        recipients,
        subject,
        body,
        validAttachments as { filename: string; content: Buffer; contentType: string }[]
      );

      // Return success response
      return NextResponse.json(
        { success: true, message: 'Email sent successfully' },
        { status: 200 }
      );
    } catch (error: any) {
      // Handle backend API errors
      console.error('Error sending email with SES:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing email request:', error);
    return NextResponse.json(
      { error: 'Failed to process email request' },
      { status: 500 }
    );
  }
} 