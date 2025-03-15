const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

/**
 * Extract invoice data from a PDF file using exact line positions
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{invoiceNumber?: string, date?: string, amount?: number, jobsiteName?: string, clientName?: string}>}
 */
async function extractInvoiceData(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        
        // Split text into lines and remove empty lines
        const lines = data.text.split('\n').filter(line => line.trim());
        
        // Initialize the result object
        const result = {};

        // Helper function to clean text by removing extra spaces between characters
        const cleanText = (text) => {
            return text
                .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                .replace(/(\w)\s+(?=\w)/g, '$1')  // Remove spaces between letters/numbers
                .trim();
        };
        
        // Log all lines for debugging
        console.log('----------------------------------------');
        console.log('ALL LINES FROM PDF:');
        console.log('----------------------------------------');
        lines.forEach((line, index) => {
            console.log(`Line ${index + 1}: "${cleanText(line)}"`);
        });
        console.log('----------------------------------------');
        
        // Extract date from line 1
        if (lines[0]) {
            const dateStr = cleanText(lines[0]);
            try {
                // Handle both D/MM/YYYY and DD/MM/YYYY formats
                const parts = dateStr.split(/[-/]/);
                if (parts.length === 3) {
                    let [day, month, year] = parts;
                    
                    // Ensure day and month are two digits
                    day = day.padStart(2, '0');
                    month = month.padStart(2, '0');
                    
                    // Handle two-digit years
                    const fullYear = year.length === 2 ? '20' + year : year;
                    
                    // Create date in YYYY-MM-DD format
                    result.date = `${fullYear}-${month}-${day}`;
                    
                    // Validate the date
                    const testDate = new Date(result.date);
                    if (isNaN(testDate.getTime())) {
                        throw new Error('Invalid date');
                    }
                }
            } catch (e) {
                console.error('Error parsing date:', e);
                console.error('Original date string:', dateStr);
            }
        }

        // Extract invoice number from line 2
        if (lines[1]) {
            // Get the raw invoice number
            const rawInvoiceNumber = cleanText(lines[1]);
            
            // Clean up the invoice number - remove any "INV" prefix if present
            result.invoiceNumber = rawInvoiceNumber.replace(/^INV/i, '');
            
            console.log('Extracted invoice number:', rawInvoiceNumber);
            console.log('Cleaned invoice number:', result.invoiceNumber);
        }

        // Extract jobsite from line 9 (which contains the actual jobsite address)
        if (lines[8]) {
            const jobsite = cleanText(lines[8]);
            // Only use the line if it looks like an address (contains numbers or road/rd/street/st)
            if (jobsite.match(/\d+.*(?:road|rd|street|st|ave|avenue|lane|ln),?\s+\w+/i)) {
                result.jobsiteName = jobsite;
            }
        }

        // Try to find amount in lines 25-33, using the highest value
        // Look for patterns like "Total: $X,XXX.XX" or just "$X,XXX.XX"
        let highestAmount = 0;
        let amountSource = '';
        
        // First pass: Look for amount in lines 25-33 (typical location)
        for (let i = 24; i < Math.min(33, lines.length); i++) {
            const amountStr = cleanText(lines[i]);
            console.log(`Checking line ${i+1} for amount: "${amountStr}"`);
            
            // Look for dollar amounts - improved pattern to catch more variants
            const match = amountStr.match(/\$?\s*([\d,]+\.?\d*)/);
            if (match) {
                const possibleAmount = parseFloat(match[1].replace(/,/g, ''));
                console.log(`Found possible amount: $${possibleAmount}`);
                
                // Check if this line contains keywords that indicate it's the total
                const isTotal = /total|amount due|balance due|invoice total|gst|incl/i.test(amountStr);
                
                // If it's a total or higher than our current highest, use it
                if (isTotal || possibleAmount > highestAmount) {
                    highestAmount = possibleAmount;
                    amountSource = `line ${i+1}${isTotal ? ' (marked as total)' : ''}`;
                    console.log(`New highest amount: $${highestAmount} from ${amountSource}`);
                }
            }
        }
        
        // Second pass: If amount is still not found, search the entire document
        if (highestAmount === 0) {
            console.log('Amount not found in typical location, searching entire document...');
            for (let i = 0; i < lines.length; i++) {
                // Skip already checked lines
                if (i >= 24 && i < 33) continue;
                
                const amountStr = cleanText(lines[i]);
                
                // Look for lines that mention totals and contain dollar amounts
                if (/total|amount due|balance due|invoice total|gst|incl/i.test(amountStr)) {
                    console.log(`Checking promising line ${i+1} for amount: "${amountStr}"`);
                    
                    // Enhanced pattern to catch more variants of amount formats
                    const match = amountStr.match(/\$?\s*([\d,]+\.?\d*)/);
                    if (match) {
                        const possibleAmount = parseFloat(match[1].replace(/,/g, ''));
                        console.log(`Found possible amount in extended search: $${possibleAmount}`);
                        
                        // Use the highest amount found in a promising line
                        if (possibleAmount > highestAmount) {
                            highestAmount = possibleAmount;
                            amountSource = `line ${i+1} (extended search)`;
                            console.log(`New highest amount from extended search: $${highestAmount} from ${amountSource}`);
                        }
                    }
                }
            }
        }
        
        if (highestAmount > 0) {
            result.amount = highestAmount;
            console.log(`Using amount: $${highestAmount} from ${amountSource}`);
        } else {
            console.log('No amount could be extracted from the PDF');
        }

        // Try to extract client name from the filename
        try {
            const filename = path.basename(filePath);
            console.log('Parsing filename for client and jobsite info:', filename);
            
            // Common filename patterns:
            // 1. ClientName_JobsiteName_InvoiceNumber.pdf
            // 2. ClientName-JobsiteName-InvoiceNumber.pdf
            // 3. ClientName JobsiteName InvoiceNumber.pdf
            
            // Try to extract client and jobsite from filename
            const filenameWithoutExt = path.basename(filename, path.extname(filename));
            
            // Split by common separators
            let parts = filenameWithoutExt.split(/[_\-\s]+/);
            
            if (parts.length >= 2) {
                // First part is likely the client name
                if (!result.clientName) {
                    result.clientName = parts[0].replace(/([A-Z])/g, ' $1').trim(); // Add spaces before capital letters
                }
                
                // Second part is likely the jobsite name if not already extracted
                if (!result.jobsiteName && parts[1]) {
                    result.jobsiteName = parts[1].replace(/([A-Z])/g, ' $1').trim();
                }
            }
        } catch (error) {
            console.error('Error extracting info from filename:', error);
        }

        // Debug information
        console.log('----------------------------------------');
        console.log('EXTRACTED DATA FROM PDF:');
        console.log('----------------------------------------');
        console.log('Date:', result.date);
        console.log('Invoice Number:', result.invoiceNumber);
        console.log('Client Name:', result.clientName);
        console.log('Jobsite:', result.jobsiteName);
        console.log('Total Amount (inc. GST):', result.amount);
        console.log('----------------------------------------');
        
        return result;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF file');
    }
}

/**
 * Extract specific data from a line range in the PDF
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<object>} - Object containing specific lines and their contents
 */
async function extractLineRange(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        
        const lines = data.text.split('\n').filter(line => line.trim());
        
        // Helper function to clean text
        const cleanText = (text) => {
            return text
                .replace(/\s+/g, ' ')
                .replace(/(\w)\s+(?=\w)/g, '$1')
                .trim();
        };

        // Log all lines for debugging
        console.log('----------------------------------------');
        console.log('FULL PDF CONTENT:');
        console.log('----------------------------------------');
        lines.forEach((line, index) => {
            console.log(`Line ${index + 1}: "${cleanText(line)}"`);
        });
        console.log('----------------------------------------');

        // Get the first page data (lines 1-35 typically contain the header info)
        const headerData = {
            date: cleanText(lines[0] || ''),
            invoiceNumber: cleanText(lines[1] || ''),
            jobsite: cleanText(lines[8] || ''),
            subtotal: cleanText(lines[29] || ''),
            gst: cleanText(lines[30] || ''),
            total: cleanText(lines[31] || '')
        };

        // Look for amount in lines 25-33, using the highest value
        let possibleAmounts = [];
        let highestAmount = 0;
        let highestAmountSource = '';
        
        for (let i = 24; i < Math.min(33, lines.length); i++) {
            const line = cleanText(lines[i] || '');
            const match = line.match(/\$?([\d,]+\.?\d*)/);
            if (match) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                const isTotal = /total|amount due|balance due|invoice total/i.test(line);
                
                possibleAmounts.push({
                    line: i + 1,
                    text: line,
                    amount: amount,
                    isTotal: isTotal
                });
                
                // Track highest amount
                if (isTotal || amount > highestAmount) {
                    highestAmount = amount;
                    highestAmountSource = `line ${i+1}${isTotal ? ' (marked as total)' : ''}`;
                }
            }
        }
        
        console.log(`Highest amount found: $${highestAmount} from ${highestAmountSource}`);

        // Get employee data (starts from line 36)
        const employeeData = lines.slice(36)
            .filter(line => line.includes('-'))  // Only include lines with employee data (contains a hyphen)
            .map(line => cleanText(line));

        return {
            ...headerData,
            employeeData,
            totalLines: lines.length,
            possibleAmounts,
            highestAmount,
            highestAmountSource,
            // Include first 50 lines for debugging
            headerLines: lines.slice(0, 50).map((line, index) => `${index + 1}: ${line}`)
        };
    } catch (error) {
        console.error('Error extracting line range:', error);
        throw new Error('Failed to extract line range from PDF');
    }
}

module.exports = {
    extractInvoiceData,
    extractLineRange
}; 