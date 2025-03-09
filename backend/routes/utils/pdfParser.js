const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');
const Jobsite = require('../../models/Jobsite');

/**
 * Extract invoice data from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{invoiceNumber?: string, date?: string, amount?: number, jobsiteName?: string, jobsiteId?: string}>}
 */
async function extractInvoiceData(filePath) {
    try {
        // Create a log file
        const logPath = path.join(__dirname, 'pdf-parser.log');
        const logStream = fs.createWriteStream(logPath, { flags: 'w' });
        
        const log = (message) => {
            logStream.write(message + '\n');
            console.log(message);
        };

        // Read the PDF file
        const dataBuffer = fs.readFileSync(filePath);
        
        // Parse PDF with raw text extraction
        const data = await pdf(dataBuffer, {
            pagerender: function(pageData) {
                return pageData.getTextContent().then(function(textContent) {
                    let lastY, text = '';
                    for (const item of textContent.items) {
                        if (lastY != item.transform[5] && text.length > 0) {
                            text += '\n';
                        }
                        text += item.str + ' ';
                        lastY = item.transform[5];
                    }
                    return text;
                });
            }
        });

        // Get the raw text and split into lines
        const lines = data.text.split('\n').map(line => line.trim()).filter(line => line);
        
        // Log the raw text for debugging
        log('----------------------------------------');
        log('RAW PDF TEXT:');
        log('----------------------------------------');
        log(data.text);
        log('----------------------------------------');
        log('LINES:');
        lines.forEach((line, i) => log(`${i + 1}: ${line}`));
        log('----------------------------------------');
        
        // Initialize the result object
        const result = {};
        
        // Look for date (dd/mm/yyyy format)
        for (const line of lines) {
            const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
                try {
                    const dateStr = dateMatch[1];
                    const [day, month, year] = dateStr.split('/');
                    const date = new Date(year, month - 1, day);
                    if (!isNaN(date.getTime())) {
                        result.date = date.toISOString().split('T')[0];
                        log('Found date: ' + result.date);
                        break;
                    }
                } catch (e) {
                    log('Error parsing date: ' + e.message);
                }
            }
        }
        
        // Look for invoice number (8 digits)
        for (const line of lines) {
            const invoiceMatch = line.match(/(\d{8})/);
            if (invoiceMatch) {
                result.invoiceNumber = invoiceMatch[1];
                log('Found invoice number: ' + result.invoiceNumber);
                break;
            }
        }
        
        // Get total from line 92 (if it exists)
        if (lines.length >= 92) {
            const totalLine = lines[91]; // 0-based index
            const amountMatch = totalLine.match(/\$?([\d,]+\.?\d*)/);
            if (amountMatch) {
                const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
                if (!isNaN(amount)) {
                    result.amount = amount;
                    log('Found total amount from line 92: ' + amount);
                }
            }
        }
        
        // Get jobsite from line 69 and match with existing jobsites
        if (lines.length >= 69) {
            const jobsiteLine = lines[68]; // 0-based index
            if (jobsiteLine) {
                // Clean up the jobsite name
                const jobsiteName = jobsiteLine.trim();
                log('Found potential jobsite name from line 69: ' + jobsiteName);
                
                try {
                    // Get all jobsites from the database
                    const jobsites = await Jobsite.find({});
                    
                    // Try to find a matching jobsite
                    const matchingJobsite = jobsites.find(jobsite => {
                        // Convert both names to lowercase and remove extra spaces for comparison
                        const cleanJobsiteName = jobsiteName.toLowerCase().replace(/\s+/g, ' ').trim();
                        const cleanExistingName = jobsite.name.toLowerCase().replace(/\s+/g, ' ').trim();
                        
                        return cleanJobsiteName.includes(cleanExistingName) || 
                               cleanExistingName.includes(cleanJobsiteName);
                    });
                    
                    if (matchingJobsite) {
                        result.jobsiteName = matchingJobsite.name;
                        result.jobsiteId = matchingJobsite._id;
                        log('Matched with existing jobsite: ' + matchingJobsite.name);
                    } else {
                        result.jobsiteName = jobsiteName;
                        log('No matching jobsite found in database');
                    }
                } catch (e) {
                    log('Error matching jobsite: ' + e.message);
                    result.jobsiteName = jobsiteName;
                }
            }
        }
        
        log('----------------------------------------');
        log('FINAL EXTRACTED DATA:');
        log(JSON.stringify(result, null, 2));
        log('----------------------------------------');
        
        // Close the log stream
        logStream.end();
        
        return result;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF file: ' + error.message);
    }
}

module.exports = {
    extractInvoiceData
}; 