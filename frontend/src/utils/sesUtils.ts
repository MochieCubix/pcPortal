import { 
  SendEmailCommand, 
  SendRawEmailCommand, 
  SESServiceException,
  RawMessage
} from '@aws-sdk/client-ses';
import { sesClient, DEFAULT_FROM_EMAIL } from './awsConfig';

/**
 * Send a simple email using SES
 * @param to - Recipient email addresses
 * @param subject - Email subject
 * @param html - HTML body content
 * @param from - Sender email address (optional, uses default if not provided)
 * @returns Promise that resolves when email is sent
 */
export async function sendSimpleEmail(
  to: string[],
  subject: string,
  html: string,
  from: string = DEFAULT_FROM_EMAIL
): Promise<void> {
  try {
    const command = new SendEmailCommand({
      Source: from,
      Destination: {
        ToAddresses: to,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
  } catch (error) {
    console.error('Error sending email with SES:', error);
    throw error;
  }
}

/**
 * Generate a boundary string for multipart email
 * @returns Random boundary string
 */
function generateBoundary(): string {
  return `----NextJSMailer${Math.random().toString(16).substring(2)}`;
}

/**
 * Send an email with attachments using SES
 * @param to - Recipient email addresses
 * @param subject - Email subject
 * @param html - HTML body content
 * @param attachments - Array of attachment objects
 * @param from - Sender email address (optional, uses default if not provided)
 * @returns Promise that resolves when email is sent
 */
export async function sendEmailWithAttachments(
  to: string[],
  subject: string,
  html: string,
  attachments: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[],
  from: string = DEFAULT_FROM_EMAIL
): Promise<void> {
  try {
    const boundary = generateBoundary();
    
    // Create email headers
    let message = [
      `From: ${from}`,
      `To: ${to.join(', ')}`,
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      html,
      ''
    ].join('\r\n');

    // Add attachments
    for (const attachment of attachments) {
      const base64Content = attachment.content.toString('base64');
      message += [
        `--${boundary}`,
        `Content-Type: ${attachment.contentType}`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        '',
        base64Content,
        ''
      ].join('\r\n');
    }

    // Close the boundary
    message += `--${boundary}--\r\n`;

    // Create the raw message
    const rawMessage: RawMessage = { Data: Buffer.from(message) };

    // Send the raw email
    const command = new SendRawEmailCommand({
      RawMessage: rawMessage,
    });

    await sesClient.send(command);
  } catch (error) {
    console.error('Error sending email with attachments:', error);
    throw error;
  }
} 