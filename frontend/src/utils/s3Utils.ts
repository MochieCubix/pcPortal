import { 
  GetObjectCommand, 
  PutObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand,
  S3ServiceException
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET_NAME } from './awsConfig';

/**
 * Generate a pre-signed URL to view an S3 object
 * @param key - The S3 object key
 * @param expirationInSeconds - URL expiration time in seconds (default: 3600)
 * @returns Pre-signed URL to view the object
 */
export async function getInvoicePreSignedUrl(key: string, expirationInSeconds = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: expirationInSeconds,
    });

    return url;
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw error;
  }
}

/**
 * Check if an invoice file exists in S3
 * @param key - The S3 object key to check
 * @returns Boolean indicating if the file exists
 */
export async function checkInvoiceExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error instanceof S3ServiceException && error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Sanitize a string to be used in S3 path (remove invalid characters)
 * @param str - The string to sanitize
 * @returns Sanitized string
 */
function sanitizeForS3Path(str: string): string {
  // Replace any characters that might cause issues in S3 paths
  return str.replace(/[^a-zA-Z0-9.-_]/g, ' ').trim();
}

/**
 * Format date components for the S3 path structure
 * @param date - Date object or date string
 * @returns Object containing formatted date components
 */
function formatDateForS3Path(date: Date | string): {
  year: string;
  monthNum: string;
  monthName: string;
  fullDate: string;
} {
  let dateObj: Date;
  
  // Handle DD.MM.YY or DD.MM.YYYY format string
  if (typeof date === 'string') {
    const ddMmYyRegex = /^(\d{2})\.(\d{2})\.(\d{2})$/;
    const ddMmYyyyRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    
    if (ddMmYyRegex.test(date)) {
      // Parse the DD.MM.YY format correctly
      const parts = date.split('.');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed in JS Date
      const year = parseInt(parts[2]);
      // Convert 2-digit year to 4-digit year
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      dateObj = new Date(fullYear, month, day);
      
      console.log(`Parsed date ${date} as: Day=${day}, Month=${month+1}, Year=${fullYear}`);
    } else if (ddMmYyyyRegex.test(date)) {
      // Parse the DD.MM.YYYY format correctly
      const parts = date.split('.');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed in JS Date
      const year = parseInt(parts[2]);
      dateObj = new Date(year, month, day);
      
      console.log(`Parsed date ${date} as: Day=${day}, Month=${month+1}, Year=${year}`);
    } else {
      // Fall back to default Date parsing (which may interpret as MM/DD/YYYY)
      dateObj = new Date(date);
      console.log(`Using default date parsing for ${date}, result: ${dateObj.toISOString()}`);
    }
  } else {
    dateObj = date;
  }
  
  const year = dateObj.getFullYear().toString();
  const monthNum = (dateObj.getMonth() + 1).toString(); // 0-indexed to 1-indexed
  
  // Month names array
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  
  const monthName = monthNames[dateObj.getMonth()];
  
  // Format date as DD.MM.YY (two-digit year)
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const shortYear = (dateObj.getFullYear() % 100).toString().padStart(2, '0');
  
  const fullDate = `${day}.${month}.${shortYear}`;
  
  return {
    year,
    monthNum,
    monthName,
    fullDate
  };
}

/**
 * Get the S3 key for an invoice using the structured directory format:
 * INVOICES/YEAR/MONTH_NUM. MONTH_NAME/DATE/COMPANY/JOBSITE/INVOICE_NUMBER - COMPANY - JOBSITE - (DATE).pdf
 * 
 * @param invoiceData - Object containing invoice data
 * @returns The S3 key for the invoice
 */
export function getInvoiceS3Key(invoiceData: {
  invoiceNumber: string;
  date: string | Date;
  company: string;
  jobsite: string;
  fileExtension?: string;
}): string {
  const { invoiceNumber, date, company, jobsite, fileExtension = 'pdf' } = invoiceData;
  
  // Sanitize strings for S3 path
  const sanitizedCompany = sanitizeForS3Path(company);
  const sanitizedJobsite = sanitizeForS3Path(jobsite);
  const sanitizedInvoiceNumber = sanitizeForS3Path(invoiceNumber);
  
  // Format date components
  const dateComponents = formatDateForS3Path(date);
  
  // Construct the structured path
  const path = [
    'INVOICES',
    dateComponents.year,
    `${dateComponents.monthNum}. ${dateComponents.monthName}`,
    dateComponents.fullDate,
    sanitizedCompany,
    sanitizedJobsite,
    `${sanitizedInvoiceNumber} - ${sanitizedCompany} - ${sanitizedJobsite} - (${dateComponents.fullDate}).${fileExtension}`
  ].join('/');
  
  return path;
}

/**
 * Legacy method for backward compatibility
 */
export function getLegacyInvoiceS3Key(invoiceId: string, invoiceNumber: string): string {
  return `invoices/${invoiceId}/${invoiceNumber}.pdf`;
}

/**
 * Get the content type based on file extension
 * @param filename - The filename to check
 * @returns The content type string
 */
export function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
} 