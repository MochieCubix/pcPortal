import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// AWS S3 configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || '';

// Helper to stream file to a temp location
async function streamToTempFile(readableStream: ReadableStream) {
  const tempFilePath = path.join(os.tmpdir(), `upload-${uuidv4()}`);
  const chunks = [];
  
  const reader = readableStream.getReader();
  
  let done = false;
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      chunks.push(value);
    }
  }
  
  const buffer = Buffer.concat(chunks);
  await fs.writeFile(tempFilePath, buffer);
  
  return {
    path: tempFilePath,
    buffer,
    size: buffer.length,
  };
}

// Helper to get file MIME type
function getMimeType(filename: string): string {
  const extension = path.extname(filename).toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.heic': 'image/heic',
    '.gif': 'image/gif',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const invoiceId = formData.get('invoiceId') as string;
    const fileType = formData.get('fileType') as string;
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!invoiceId) {
      return NextResponse.json({ error: 'No invoice ID provided' }, { status: 400 });
    }
    
    // Stream the file to a temp location
    const fileStream = file.stream();
    const tempFile = await streamToTempFile(fileStream);
    
    // Generate a unique key for S3
    const timestamp = Date.now();
    const fileKey = `timesheets/${invoiceId}/${timestamp}-${file.name.replace(/\s+/g, '-')}`;
    
    // Upload to S3
    const mimeType = getMimeType(file.name);
    
    const uploadParams = {
      Bucket: bucketName,
      Key: fileKey,
      Body: tempFile.buffer,
      ContentType: mimeType,
    };
    
    await s3Client.send(new PutObjectCommand(uploadParams));
    
    // Clean up the temp file
    await fs.unlink(tempFile.path);
    
    // Get the file URL
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
    
    // Update the database to link this timesheet to the invoice
    // This would typically involve a database update operation
    // For now, we'll just return the success response
    
    return NextResponse.json({
      success: true,
      fileKey,
      fileUrl,
      message: 'Timesheet uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to upload timesheet' },
      { status: 500 }
    );
  }
} 