import fs from 'fs';
import pdf from 'pdf-parse';

interface ExtractedInvoiceData {
    invoiceNumber?: string;
    date?: string;
    amount?: number;
    jobsiteName?: string;
}

export async function extractInvoiceData(filePath: string): Promise<ExtractedInvoiceData> {
    try {
        // Read the PDF file
        const dataBuffer = fs.readFileSync(filePath);
        
        // Parse the PDF
        const data = await pdf(dataBuffer);
        
        // Get the text content
        const text = data.text;
        
        // Initialize the result object
        const result: ExtractedInvoiceData = {};
        
        // Extract invoice number (looking for "invoice no." or similar patterns)
        const invoiceMatch = text.match(/invoice\s*no\.?\s*:?\s*([A-Za-z0-9-]+)/i);
        if (invoiceMatch) {
            result.invoiceNumber = invoiceMatch[1].trim();
        }
        
        // Extract date (looking for "week ending" followed by a date)
        const dateMatch = text.match(/week\s*ending\s*[:|]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
        if (dateMatch) {
            // Parse and format the date
            const dateStr = dateMatch[1];
            try {
                const date = new Date(dateStr);
                result.date = date.toISOString().split('T')[0];
            } catch (e) {
                console.error('Error parsing date:', e);
            }
        }
        
        // Extract amount (looking for dollar amounts, typically at the end)
        const amountMatch = text.match(/\$\s*([\d,]+\.?\d*)/);
        if (amountMatch) {
            const amountStr = amountMatch[1].replace(/,/g, '');
            result.amount = parseFloat(amountStr);
        }
        
        // Extract jobsite name (this might need adjustment based on your PDF format)
        // Looking for common patterns in the text that might indicate a jobsite
        const jobsiteMatch = text.match(/site\s*:\s*([^\n]+)/i);
        if (jobsiteMatch) {
            result.jobsiteName = jobsiteMatch[1].trim();
        }
        
        return result;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF file');
    }
} 