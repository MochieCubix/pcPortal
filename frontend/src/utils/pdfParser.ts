import * as pdfjs from 'pdfjs-dist';

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ExtractedInvoiceData {
  invoiceNumber?: string;
  date?: string;
  amount?: number;
  jobsiteName?: string;
}

export async function extractInvoiceDataFromPDF(file: File): Promise<ExtractedInvoiceData> {
  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Extract text from the first page
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.map((item: any) => item.str);
    const text = textItems.join(' ');
    
    console.log('Extracted PDF text:', text);
    
    // Extract invoice number
    let invoiceNumber: string | undefined;
    const invoiceNumberMatch = text.match(/inv(?:oice)?\s*(?:no\.?|number)?\s*[:#]?\s*([A-Z0-9\-]+)/i);
    if (invoiceNumberMatch && invoiceNumberMatch[1]) {
      invoiceNumber = invoiceNumberMatch[1].trim();
    }
    
    // Extract date
    let date: string | undefined;
    const weekEndingMatch = text.match(/week\s*ending\s*[:#]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    const dateMatch = text.match(/date\s*[:#]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    
    if (weekEndingMatch && weekEndingMatch[1]) {
      date = formatDate(weekEndingMatch[1]);
    } else if (dateMatch && dateMatch[1]) {
      date = formatDate(dateMatch[1]);
    }
    
    // Extract amount
    let amount: number | undefined;
    const totalMatch = text.match(/total\s*(?:amount)?\s*[:#]?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
    const amountMatch = text.match(/amount\s*(?:due)?\s*[:#]?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
    
    if (totalMatch && totalMatch[1]) {
      amount = parseFloat(totalMatch[1].replace(/,/g, ''));
    } else if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }
    
    // Extract jobsite name
    let jobsiteName: string | undefined;
    const jobsiteMatch = text.match(/(?:jobsite|site|location|project)\s*[:#]?\s*([A-Za-z0-9\s\-\.]+)/i);
    if (jobsiteMatch && jobsiteMatch[1]) {
      jobsiteName = jobsiteMatch[1].trim();
    }
    
    return {
      invoiceNumber,
      date,
      amount,
      jobsiteName
    };
  } catch (error) {
    console.error('Error extracting data from PDF:', error);
    return {};
  }
}

// Helper function to format date to YYYY-MM-DD
function formatDate(dateStr: string): string {
  try {
    // Handle different date formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
    const parts = dateStr.split(/[\/\-\.]/);
    
    // Determine format based on parts
    let day: string, month: string, year: string;
    
    if (parts.length === 3) {
      // Assume DD/MM/YYYY format as default for Australian context
      [day, month, year] = parts;
      
      // If year is 2 digits, convert to 4 digits
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const century = Math.floor(currentYear / 100) * 100;
        year = `${century + parseInt(year)}`;
      }
      
      // Ensure day and month are 2 digits
      day = day.padStart(2, '0');
      month = month.padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }
    
    // If format can't be determined, return original string
    return dateStr;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
} 