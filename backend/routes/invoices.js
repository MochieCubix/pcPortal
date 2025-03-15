const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Jobsite = require('../models/Jobsite');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const multer = require('multer');
const path = require('path');
const { extractInvoiceData, extractLineRange } = require('../utils/pdfParser');
const mongoose = require('mongoose');
const fs = require('fs');

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            cb(new Error('Only PDF files are allowed'), false);
        } else {
            cb(null, true);
        }
    }
});

// Helper function to extract suburb from address
function extractSuburb(address) {
    if (!address) return null;
    
    // Clean up the address first
    const cleanAddress = address.replace(/\s+/g, ' ').trim();
    
    // Case 1: If it's just a suburb name (all caps)
    if (/^[A-Z]+$/.test(cleanAddress)) {
        return cleanAddress;
    }
    
    // Case 2: Full address with state and postcode
    const fullAddressMatch = cleanAddress.match(/([A-Za-z\s]+)(?:,\s*)?(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s*\d{4}/i);
    if (fullAddressMatch) {
        return fullAddressMatch[1].trim();
    }
    
    // Case 3: Street address with suburb
    // Remove street number and common street type words
    const streetTypes = /\d+|\bst\b|\bstreet\b|\brd\b|\broad\b|\bave\b|\bavenue\b|\bplace\b|\bway\b|\blane\b|\bclose\b/gi;
    const withoutStreet = cleanAddress.replace(streetTypes, '');
    
    // Extract the last word as it's likely the suburb
    const parts = withoutStreet.split(/[,\s]+/).filter(part => part);
    if (parts.length > 0) {
        // Get the last meaningful part
        const suburb = parts[parts.length - 1].replace(/[^A-Za-z\s]/g, '').trim();
        return suburb || null;
    }
    
    return null;
}

// Parse existing invoice PDF
router.post('/parse-existing', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { filename, clientId } = req.body;
        if (!filename) {
            return res.status(400).json({ error: 'No filename provided' });
        }

        const actualFilename = filename.includes('/') ? filename.split('/').pop() : filename;
        if (!actualFilename) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const filePath = path.join(__dirname, '../uploads', actualFilename);
        console.log('Looking for file at:', filePath);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Extract data from the PDF
        const extractedData = await extractInvoiceData(filePath);
        console.log('Extracted data:', extractedData);

        // Try to find matching jobsite
        let jobsiteId = null;
        let matchedJobsite = null;
        if (extractedData.jobsiteName && clientId) {
            const suburb = extractSuburb(extractedData.jobsiteName);
            console.log('Extracted suburb:', suburb);

            if (suburb) {
                const jobsites = await Jobsite.find({ client: clientId });
                console.log('Found jobsites for client:', jobsites.length);

                for (const jobsite of jobsites) {
                    // Handle both cases where jobsite.name might be the suburb directly
                    // or jobsite.address might contain the full address
                    const jobsiteSuburb = jobsite.name.toUpperCase() === jobsite.name ? 
                        jobsite.name : // If name is all caps, use it directly
                        extractSuburb(jobsite.address || jobsite.name); // Otherwise try to extract from address or name
                    
                    console.log('Comparing with jobsite:', jobsite.name, 'Suburb:', jobsiteSuburb);
                    
                    if (jobsiteSuburb && jobsiteSuburb.toUpperCase() === suburb.toUpperCase()) {
                        jobsiteId = jobsite._id;
                        matchedJobsite = jobsite;
                        console.log('Found matching jobsite:', jobsite.name);
                        break;
                    }
                }
            }
        }

        // Get client name for activity log
        let clientName = '';
        try {
            if (clientId) {
                const clientDoc = await User.findById(clientId);
                if (clientDoc) {
                    clientName = clientDoc.companyName || `${clientDoc.firstName} ${clientDoc.lastName}`;
                } else {
                    const Client = require('../models/Client');
                    const clientDoc2 = await Client.findById(clientId);
                    if (clientDoc2) {
                        clientName = clientDoc2.companyName || `${clientDoc2.firstName} ${clientDoc2.lastName}`;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching client details for activity log:', error);
        }

        // Log the activity
        const activityLog = new ActivityLog({
            user: req.user._id,
            action: 'parse',
            resourceType: 'invoice',
            description: `parsed invoice PDF${clientName ? ` for ${clientName}` : ''}`,
            details: {
                filename: actualFilename,
                extractedData: {
                    invoiceNumber: extractedData.invoiceNumber,
                    amount: extractedData.amount,
                    date: extractedData.date,
                    jobsiteName: extractedData.jobsiteName
                },
                matchedJobsite: matchedJobsite ? {
                    id: matchedJobsite._id,
                    name: matchedJobsite.name
                } : null
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();

        res.json({
            success: true,
            data: {
                ...extractedData,
                jobsiteId,
                matchedJobsite
            }
        });
    } catch (error) {
        console.error('Error processing invoice:', error);
        res.status(500).json({ error: 'Failed to process invoice' });
    }
});

// Get all invoices (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { jobsite, client, status, startDate, endDate, search } = req.query;
        let query = {};
        
        // Filter by jobsite if provided
        if (jobsite) {
            query.jobsite = new mongoose.Types.ObjectId(jobsite);
        }
        
        // Filter by client if provided
        if (client) {
            query.client = new mongoose.Types.ObjectId(client);
        }
        
        // Filter by status if provided
        if (status) {
            query.status = status;
        }
        
        // Filter by date range if provided
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                query.date.$lte = new Date(endDate);
            }
        }
        
        // Search by invoice number if provided
        if (search) {
            query.invoiceNumber = { $regex: search, $options: 'i' };
        }
        
        console.log('[INVOICE DEBUG] Query:', JSON.stringify(query));
        
        // First get raw invoices without population to check client IDs
        const rawInvoices = await Invoice.find(query).lean();
        console.log('[INVOICE DEBUG] Raw invoices client IDs:', rawInvoices.map(inv => ({
            id: inv._id,
            clientId: inv.client,
            clientType: typeof inv.client
        })));
        
        // Get all invoices without population first
        const invoices = await Invoice.find(query).sort({ date: -1 }).lean();
        
        // Now manually populate client data from both User and Client models
        const processedInvoices = await Promise.all(invoices.map(async (invoice) => {
            // Try to get client data from User model
            if (invoice.client) {
                console.log('[INVOICE DEBUG] Attempting to fetch client data for ID:', invoice.client);
                
                // First try User model
                try {
                    const userData = await User.findById(invoice.client)
                        .select('firstName lastName companyName email')
                        .lean();
                        
                    if (userData) {
                        console.log('[INVOICE DEBUG] Found client in User model:', userData.companyName || userData.email);
                        invoice.client = {
                            _id: userData._id,
                            companyName: userData.companyName,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            email: userData.email
                        };
                        return invoice;
                    }
                } catch (error) {
                    console.error('[INVOICE DEBUG] Error fetching from User model:', error.message);
                }
                
                // If not found in User model, try Client model
                try {
                    const Client = require('../models/Client');
                    const clientData = await Client.findById(invoice.client).lean();
                    
                    if (clientData) {
                        console.log('[INVOICE DEBUG] Found client in Client model:', clientData.companyName);
                        invoice.client = {
                            _id: clientData._id,
                            companyName: clientData.companyName,
                            email: clientData.accountEmail
                        };
                        return invoice;
                    } else {
                        console.log('[INVOICE DEBUG] Client not found in either model:', invoice.client);
                        // Keep the client ID but mark it for frontend display
                        invoice.client = {
                            _id: invoice.client,
                            companyName: null,
                            notFound: true
                        };
                    }
                } catch (error) {
                    console.error('[INVOICE DEBUG] Error fetching from Client model:', error.message);
                    // Keep the client ID but mark it as error
                    invoice.client = {
                        _id: invoice.client,
                        companyName: null,
                        error: true
                    };
                }
            } else {
                console.log('[INVOICE DEBUG] No client ID for invoice:', invoice._id);
                invoice.client = null;
            }
            
            // Populate jobsite information
            if (invoice.jobsite) {
                try {
                    console.log('[INVOICE DEBUG] Attempting to fetch jobsite data for ID:', invoice.jobsite);
                    const jobsiteData = await Jobsite.findById(invoice.jobsite)
                        .select('name client')
                        .lean();
                    
                    if (jobsiteData) {
                        console.log('[INVOICE DEBUG] Found jobsite:', jobsiteData.name);
                        invoice.jobsite = {
                            _id: jobsiteData._id,
                            name: jobsiteData.name,
                            client: jobsiteData.client
                        };
                    } else {
                        console.log('[INVOICE DEBUG] Jobsite not found:', invoice.jobsite);
                        // Keep the jobsite ID but mark it for frontend display
                        invoice.jobsite = {
                            _id: invoice.jobsite,
                            name: null,
                            notFound: true
                        };
                    }
                } catch (error) {
                    console.error('[INVOICE DEBUG] Error fetching jobsite:', error.message);
                    // Keep the jobsite ID but mark it as error
                    invoice.jobsite = {
                        _id: invoice.jobsite,
                        name: null,
                        error: true
                    };
                }
            }
            
            return invoice;
        }));
        
        console.log('[INVOICE DEBUG] Final processed invoices:', processedInvoices.map(inv => ({
            id: inv._id,
            clientData: inv.client
        })));
        
        res.json(processedInvoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// Get invoice by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('client', 'companyName email contactNumber address')
            .populate('jobsite', 'name address')
            .populate('createdBy', 'firstName lastName');
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        // If client is not properly populated, try to fetch from Client model
        const invoiceObj = invoice.toObject();
        if (invoiceObj.client && typeof invoiceObj.client === 'string') {
            try {
                const Client = require('../models/Client');
                const clientData = await Client.findById(invoiceObj.client);
                if (clientData) {
                    invoiceObj.client = {
                        _id: clientData._id,
                        companyName: clientData.companyName,
                        email: clientData.email,
                        contactNumber: clientData.contactNumber,
                        address: clientData.address
                    };
                }
            } catch (err) {
                console.error('Error fetching client data:', err);
            }
        }
        
        // Check if user is authorized to view this invoice
        if (req.user.role !== 'admin' && 
            invoiceObj.client._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Log the activity
        const activityLog = new ActivityLog({
            user: req.user._id,
            action: 'view',
            resourceType: 'invoice',
            resourceId: invoice._id,
            description: `${req.user.firstName} ${req.user.lastName} viewed invoice ${invoice.invoiceNumber}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();
        
        res.json(invoiceObj);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Create new invoice (admin only)
router.post('/', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
    try {
        const { 
            invoiceNumber,
            clientId,
            jobsiteId,
            amount,
            status,
            notes,
            date
        } = req.body;

        console.log('Received invoice data:', {
            invoiceNumber,
            clientId,
            jobsiteId,
            amount,
            status,
            notes,
            date,
            file: req.file ? req.file.filename : 'No file'
        });

        // Ensure clientId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
            console.log('Invalid client ID format:', clientId);
            return res.status(400).json({ error: 'Invalid client ID format' });
        }

        // First try to find client in User model
        let clientExists = await User.findById(clientId);
        let clientModel = 'User';
        
        // If not found in User model, try to find in Client model
        if (!clientExists) {
            const Client = require('../models/Client');
            clientExists = await Client.findById(clientId);
            clientModel = 'Client';
        }
        
        console.log('Client search result:', clientExists ? `Found in ${clientModel} model` : 'Not found');
        
        if (!clientExists) {
            console.log('Client validation failed for ID:', clientId);
            return res.status(400).json({ error: 'Client not found' });
        }
        
        // Validate jobsite exists if provided
        let jobsiteName = '';
        if (jobsiteId) {
            const jobsiteExists = await Jobsite.findById(jobsiteId);
            if (!jobsiteExists) {
                return res.status(400).json({ error: 'Jobsite not found' });
            }
            jobsiteName = jobsiteExists.name;
        }

        // Generate file URL if file was uploaded
        let fileUrl;
        if (req.file) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
        }
        
        // Parse the date if provided, otherwise use current date
        let issueDate;
        if (date) {
            try {
                // The date should be in YYYY-MM-DD format from the frontend
                console.log('Received date from frontend:', date);
                issueDate = new Date(date);
                if (isNaN(issueDate.getTime())) {
                    // If date is invalid, use current date
                    console.log('Invalid date format, using current date');
                    issueDate = new Date();
                } else {
                    console.log('Using provided date:', issueDate, 'Formatted as DD/MM/YYYY:', formatDateAsDDMMYYYY(issueDate));
                }
            } catch (error) {
                console.log('Error parsing date, using current date:', error);
                issueDate = new Date();
            }
        } else {
            console.log('No date provided, using current date');
            issueDate = new Date();
        }
        
        // Create new invoice
        const parsedAmount = parseFloat(amount);
        const newInvoice = new Invoice({
            invoiceNumber,
            client: clientId,
            jobsite: jobsiteId,
            amount: parsedAmount,
            status: status || 'pending',
            notes,
            fileUrl,
            createdBy: req.user._id,
            issueDate: issueDate,
            dueDate: new Date(new Date(issueDate).setDate(new Date(issueDate).getDate() + 30))
        });

        console.log('Creating invoice with data:', {
            invoiceNumber,
            clientId,
            amount: parsedAmount,
            clientModel,
            issueDate: issueDate
        });
        
        await newInvoice.save();
        console.log('Invoice saved successfully with ID:', newInvoice._id);
        
        // Log the activity
        const clientName = clientExists.companyName || `${clientExists.firstName} ${clientExists.lastName}`;
        const activityLog = new ActivityLog({
            user: req.user._id,
            action: 'create',
            resourceType: 'invoice',
            resourceId: newInvoice._id,
            description: `${req.user.firstName} ${req.user.lastName} created invoice ${invoiceNumber} for client ${clientName}${jobsiteName ? ` at jobsite ${jobsiteName}` : ''}`,
            details: {
                invoiceNumber,
                amount: parsedAmount,
                status: status || 'pending',
                client: clientName,
                jobsite: jobsiteName || 'N/A'
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();
        
        res.status(201).json({
            message: 'Invoice created successfully',
            invoice: {
                _id: newInvoice._id,
                invoiceNumber: newInvoice.invoiceNumber,
                amount: newInvoice.amount,
                status: newInvoice.status,
                fileUrl: newInvoice.fileUrl,
                date: newInvoice.issueDate,
                jobsite: jobsiteId
            }
        });
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// Update invoice (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            invoiceNumber, 
            client, 
            jobsite, 
            amount,
            status,
            issueDate,
            dueDate,
            notes,
            fileUrl
        } = req.body;
        
        console.log('Received update data:', {
            invoiceNumber,
            amount,
            status,
            issueDate
        });
        
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        console.log('Current invoice amount:', invoice.amount);
        
        // Store original values for activity log
        const originalValues = {
            invoiceNumber: invoice.invoiceNumber,
            client: invoice.client,
            jobsite: invoice.jobsite,
            amount: invoice.amount,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            notes: invoice.notes,
            fileUrl: invoice.fileUrl
        };
        
        // Update invoice fields
        if (invoiceNumber) invoice.invoiceNumber = invoiceNumber;
        if (client) invoice.client = client;
        if (jobsite) invoice.jobsite = jobsite;
        if (amount !== undefined) {
            console.log('Setting new amount:', amount, 'Type:', typeof amount);
            invoice.amount = Number(amount);
            console.log('Invoice amount after setting:', invoice.amount);
        }
        if (status) invoice.status = status;
        if (issueDate) invoice.issueDate = issueDate;
        if (dueDate) invoice.dueDate = dueDate;
        if (notes !== undefined) invoice.notes = notes;
        if (fileUrl) invoice.fileUrl = fileUrl;
        
        console.log('Invoice before save:', {
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            status: invoice.status
        });
        
        await invoice.save();
        
        console.log('Invoice after save:', {
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            status: invoice.status
        });
        
        // Prepare changes for activity log
        const changes = {};
        if (invoiceNumber && invoiceNumber !== originalValues.invoiceNumber) {
            changes.invoiceNumber = {
                from: originalValues.invoiceNumber,
                to: invoiceNumber
            };
        }
        if (client && client.toString() !== originalValues.client.toString()) {
            changes.client = {
                from: originalValues.client,
                to: client
            };
        }
        if (jobsite && jobsite.toString() !== originalValues.jobsite?.toString()) {
            changes.jobsite = {
                from: originalValues.jobsite,
                to: jobsite
            };
        }
        if (amount !== undefined && Number(amount) !== originalValues.amount) {
            changes.amount = {
                from: originalValues.amount,
                to: Number(amount)
            };
        }
        if (status && status !== originalValues.status) {
            changes.status = {
                from: originalValues.status,
                to: status
            };
        }
        if (issueDate && new Date(issueDate).getTime() !== new Date(originalValues.issueDate).getTime()) {
            changes.issueDate = {
                from: originalValues.issueDate,
                to: issueDate
            };
        }
        if (dueDate && new Date(dueDate).getTime() !== new Date(originalValues.dueDate).getTime()) {
            changes.dueDate = {
                from: originalValues.dueDate,
                to: dueDate
            };
        }
        if (notes !== undefined && notes !== originalValues.notes) {
            changes.notes = {
                from: originalValues.notes,
                to: notes
            };
        }
        if (fileUrl && fileUrl !== originalValues.fileUrl) {
            changes.fileUrl = {
                from: originalValues.fileUrl,
                to: fileUrl
            };
        }
        
        // Log the activity if there were changes
        if (Object.keys(changes).length > 0) {
            // Get client and jobsite names for better description
            let clientName = '';
            let jobsiteName = '';
            
            try {
                if (invoice.client) {
                    const clientDoc = await User.findById(invoice.client);
                    if (clientDoc) {
                        clientName = clientDoc.companyName || `${clientDoc.firstName} ${clientDoc.lastName}`;
                    } else {
                        const Client = require('../models/Client');
                        const clientDoc2 = await Client.findById(invoice.client);
                        if (clientDoc2) {
                            clientName = clientDoc2.companyName || `${clientDoc2.firstName} ${clientDoc2.lastName}`;
                        }
                    }
                }
                
                if (invoice.jobsite) {
                    const jobsiteDoc = await Jobsite.findById(invoice.jobsite);
                    if (jobsiteDoc) {
                        jobsiteName = jobsiteDoc.name;
                    }
                }
            } catch (error) {
                console.error('Error fetching client/jobsite details for activity log:', error);
            }
            
            const activityLog = new ActivityLog({
                user: req.user._id,
                action: 'update',
                resourceType: 'invoice',
                resourceId: invoice._id,
                description: `${req.user.firstName} ${req.user.lastName} updated invoice ${invoice.invoiceNumber}${clientName ? ` for ${clientName}` : ''}${jobsiteName ? ` at ${jobsiteName}` : ''}`,
                details: {
                    changes
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
            await activityLog.save();
        }
        
        res.json({
            message: 'Invoice updated successfully',
            invoice: {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                amount: invoice.amount,
                status: invoice.status,
                date: invoice.issueDate
            }
        });
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ error: 'Failed to update invoice' });
    }
});

// Delete invoice (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        // Get client and jobsite names for activity log
        let clientName = '';
        let jobsiteName = '';
        
        try {
            if (invoice.client) {
                const clientDoc = await User.findById(invoice.client);
                if (clientDoc) {
                    clientName = clientDoc.companyName || `${clientDoc.firstName} ${clientDoc.lastName}`;
                } else {
                    const Client = require('../models/Client');
                    const clientDoc2 = await Client.findById(invoice.client);
                    if (clientDoc2) {
                        clientName = clientDoc2.companyName || `${clientDoc2.firstName} ${clientDoc2.lastName}`;
                    }
                }
            }
            
            if (invoice.jobsite) {
                const jobsiteDoc = await Jobsite.findById(invoice.jobsite);
                if (jobsiteDoc) {
                    jobsiteName = jobsiteDoc.name;
                }
            }
        } catch (error) {
            console.error('Error fetching client/jobsite details for activity log:', error);
        }
        
        // Store invoice details before deletion for activity log
        const invoiceDetails = {
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.amount,
            status: invoice.status,
            issueDate: formatDateAsDDMMYYYY(invoice.issueDate),
            client: clientName,
            jobsite: jobsiteName
        };
        
        await Invoice.findByIdAndDelete(req.params.id);
        
        // Log the activity
        const activityLog = new ActivityLog({
            user: req.user._id,
            action: 'delete',
            resourceType: 'invoice',
            resourceId: req.params.id,
            description: `${req.user.firstName} ${req.user.lastName} deleted invoice ${invoiceDetails.invoiceNumber}${clientName ? ` for ${clientName}` : ''}${jobsiteName ? ` at ${jobsiteName}` : ''}`,
            details: invoiceDetails,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();
        
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
});

// Get client's invoices
router.get('/client/:clientId', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or the client themselves
        if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.clientId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const invoices = await Invoice.find({ client: req.params.clientId })
            .populate('jobsite', 'name')
            .sort({ createdAt: -1 });
        
        res.json(invoices);
    } catch (error) {
        console.error('Error fetching client invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// Upload and parse invoice PDF
router.post('/upload-parse', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
    try {
        console.log('Upload-parse endpoint called');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file ? 'File received' : 'No file received');
        
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File details:', {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Extract data from the PDF
        const extractedData = await extractInvoiceData(req.file.path);
        console.log('Extracted Data:', extractedData);

        // Check if this is a recorded or cancelled upload
        const action = req.body.action || 'uploaded'; // Default to 'uploaded' if not specified
        console.log('Action:', action);

        // If client name was extracted but no client ID is provided, try to find matching client
        let clientId = req.body.clientId || null;
        if (extractedData.clientName && !clientId) {
            console.log('Trying to find client by name:', extractedData.clientName);
            
            // First try to find in User model with case-insensitive partial match
            let client = await User.findOne({ 
                companyName: { $regex: new RegExp(extractedData.clientName, 'i') }
            });
            
            // If not found, try with reversed search (client name contains extracted name)
            if (!client) {
                const allClients = await User.find({ role: 'client' });
                client = allClients.find(c => 
                    c.companyName && c.companyName.toLowerCase().includes(extractedData.clientName.toLowerCase())
                );
            }
            
            // If not found in User model, try Client model
            if (!client) {
                const Client = require('../models/Client');
                client = await Client.findOne({ 
                    companyName: { $regex: new RegExp(extractedData.clientName, 'i') }
                });
                
                // If not found, try with reversed search
                if (!client) {
                    const allClients = await Client.find({});
                    client = allClients.find(c => 
                        c.companyName && c.companyName.toLowerCase().includes(extractedData.clientName.toLowerCase())
                    );
                }
            }
            
            if (client) {
                clientId = client._id;
                console.log('Found matching client:', client.companyName);
            }
        }

        // If jobsite name was extracted and clientId provided, try to find matching jobsite
        let jobsiteId = req.body.jobsiteId || null;
        let matchedJobsite = null;
        if (extractedData.jobsiteName) {
            console.log('Trying to find jobsite by name:', extractedData.jobsiteName);
            
            // Try to find by exact name match first
            matchedJobsite = await Jobsite.findOne({
                name: { $regex: new RegExp(extractedData.jobsiteName, 'i') },
                ...(clientId ? { client: clientId } : {})
            });
            
            // If not found, try with partial match
            if (!matchedJobsite) {
                const allJobsites = await Jobsite.find(clientId ? { client: clientId } : {});
                matchedJobsite = allJobsites.find(j => 
                    j.name.toLowerCase().includes(extractedData.jobsiteName.toLowerCase()) ||
                    extractedData.jobsiteName.toLowerCase().includes(j.name.toLowerCase())
                );
            }
            
            // If still not found, try by suburb
            if (!matchedJobsite) {
                const suburb = extractSuburb(extractedData.jobsiteName);
                console.log('Extracted suburb:', suburb);

                if (suburb) {
                    // Find all jobsites for this client if clientId is provided
                    const jobsites = clientId 
                        ? await Jobsite.find({ client: clientId })
                        : await Jobsite.find({});
                    
                    console.log('Found jobsites to check against:', jobsites.length);

                    // Try to find a matching jobsite by suburb
                    for (const jobsite of jobsites) {
                        const jobsiteSuburb = jobsite.name.toUpperCase() === jobsite.name ? 
                            jobsite.name : 
                            extractSuburb(jobsite.address || jobsite.name);
                        
                        console.log('Comparing with jobsite:', jobsite.name, 'Suburb:', jobsiteSuburb);
                        
                        if (jobsiteSuburb && jobsiteSuburb.toUpperCase() === suburb.toUpperCase()) {
                            matchedJobsite = jobsite;
                            console.log('Found matching jobsite by suburb:', jobsite.name);
                            break;
                        }
                    }
                }
            }
            
            if (matchedJobsite) {
                jobsiteId = matchedJobsite._id;
                console.log('Using jobsite:', matchedJobsite.name);
            }
        }

        // Create the file URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        // If action is 'recorded', create an invoice record
        if (action === 'recorded') {
            try {
                console.log('Creating invoice record');
                
                // Use provided data or fall back to extracted data
                const invoiceNumber = req.body.invoiceNumber || extractedData.invoiceNumber || `INV-${Date.now()}`;
                const amount = parseFloat(req.body.amount || extractedData.amount || 0);
                const date = req.body.date || extractedData.date || new Date();
                const status = req.body.status || 'pending';
                
                // Get client for payment terms
                let dueDate;
                if (req.body.dueDate) {
                    dueDate = new Date(req.body.dueDate);
                } else if (clientId) {
                    try {
                        // First try to find client in User model
                        let client = await User.findById(clientId);
                        
                        // If not found in User model, try Client model
                        if (!client) {
                            const Client = require('../models/Client');
                            client = await Client.findById(clientId);
                        }
                        
                        if (client && client.paymentTerms) {
                            const issueDate = new Date(date);
                            dueDate = new Date(issueDate);
                            
                            if (client.paymentTerms.type === 'days') {
                                // Add payment term days to issue date
                                dueDate.setDate(dueDate.getDate() + (client.paymentTerms.days || 30));
                            } else if (client.paymentTerms.type === 'EOM') {
                                // Set to end of month + payment term days
                                dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0); // Last day of current month
                                dueDate.setDate(dueDate.getDate() + (client.paymentTerms.days || 0));
                            }
                        } else {
                            // Default: 30 days from issue date
                            dueDate = new Date(new Date(date).setDate(new Date(date).getDate() + 30));
                        }
                    } catch (error) {
                        console.error('Error calculating due date from client payment terms:', error);
                        // Default: 30 days from issue date
                        dueDate = new Date(new Date(date).setDate(new Date(date).getDate() + 30));
                    }
                } else {
                    // Default: 30 days from issue date
                    dueDate = new Date(new Date(date).setDate(new Date(date).getDate() + 30));
                }
                
                // Create the invoice
                const invoice = new Invoice({
                    invoiceNumber,
                    amount,
                    issueDate: date,
                    dueDate: dueDate,
                    status,
                    client: clientId,
                    jobsite: jobsiteId,
                    fileUrl,
                    createdBy: req.user._id
                });
                
                await invoice.save();
                console.log('Invoice created:', invoice._id);
            } catch (invoiceError) {
                console.error('Error creating invoice record:', invoiceError);
                // Continue execution even if invoice creation fails
            }
        }

        // Get client name for activity log
        let clientName = '';
        try {
            if (req.body.clientId) {
                const clientDoc = await User.findById(req.body.clientId);
                if (clientDoc) {
                    clientName = clientDoc.companyName || `${clientDoc.firstName} ${clientDoc.lastName}`;
                } else {
                    const Client = require('../models/Client');
                    const clientDoc2 = await Client.findById(req.body.clientId);
                    if (clientDoc2) {
                        clientName = clientDoc2.companyName || `${clientDoc2.firstName} ${clientDoc2.lastName}`;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching client details for activity log:', error);
        }

        // Determine the description based on the action
        let description = '';
        if (action === 'recorded') {
            description = `uploaded invoice PDF and recorded${clientName ? ` for ${clientName}` : ''}`;
        } else if (action === 'cancelled') {
            description = `uploaded invoice PDF and cancelled${clientName ? ` for ${clientName}` : ''}`;
        } else {
            description = `uploaded invoice PDF${clientName ? ` for ${clientName}` : ''}`;
        }

        // Log the activity
        const activityLog = new ActivityLog({
            user: req.user._id,
            action: 'upload',
            resourceType: 'invoice',
            description: description,
            details: {
                filename: req.file.filename,
                action: action,
                extractedData: {
                    invoiceNumber: extractedData.invoiceNumber,
                    amount: extractedData.amount,
                    date: extractedData.date,
                    jobsiteName: extractedData.jobsiteName
                },
                matchedJobsite: matchedJobsite ? {
                    id: matchedJobsite._id,
                    name: matchedJobsite.name
                } : null,
                fileUrl
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();

        // If we have a clientId but no clientName, get the client name
        if (clientId && !extractedData.clientName) {
            extractedData.clientName = await getClientName(clientId);
            console.log('Added client name from ID:', extractedData.clientName);
        }

        res.json({
            success: true,
            extractedData: {
                ...extractedData,
                clientId: clientId,
                jobsiteId,
                matchedJobsite: matchedJobsite ? {
                    id: matchedJobsite._id,
                    name: matchedJobsite.name
                } : null,
                fileUrl
            },
            action,
            fileUrl
        });
    } catch (error) {
        console.error('Error processing invoice:', error);
        res.status(500).json({ error: 'Failed to process invoice' });
    }
});

// Helper function to format date as DD/MM/YYYY
function formatDateAsDDMMYYYY(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
}

// Get invoices for a specific client
router.get('/client/:clientId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { clientId } = req.params;
        
        console.log('Fetching invoices for client ID:', clientId);
        
        // First try to find invoices where client is the User ID
        let invoices = await Invoice.find({ client: clientId })
            .populate('client', 'companyName')
            .populate('jobsite', 'name')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 });
            
        console.log('Found invoices with client ID:', invoices.length);
        
        // Transform the data to match frontend expectations
        const transformedInvoices = invoices.map(invoice => ({
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            // Store the original date in ISO format for editing
            originalDate: invoice.issueDate,
            // Format the date as DD/MM/YYYY for display
            date: formatDateAsDDMMYYYY(invoice.issueDate),
            amount: invoice.amount,
            status: invoice.status,
            fileUrl: invoice.fileUrl,
            jobsite: invoice.jobsite ? {
                _id: invoice.jobsite._id,
                name: invoice.jobsite.name
            } : null,
            client: invoice.client ? {
                _id: invoice.client._id,
                companyName: invoice.client.companyName
            } : null
        }));

        console.log('Sending client-specific invoices:', transformedInvoices.length);
        
        res.json(transformedInvoices);
    } catch (error) {
        console.error('Error fetching client invoices:', error);
        res.status(500).json({ error: 'Failed to fetch client invoices' });
    }
});

// PATCH endpoint for updating specific invoice fields
router.patch('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            invoiceNumber, 
            date, // Note: frontend sends 'date' not 'issueDate'
            amount,
            status
        } = req.body;
        
        console.log('Received PATCH data:', {
            invoiceNumber,
            date,
            amount,
            status
        });
        
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        // Store original values for activity log
        const originalValues = {
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            amount: invoice.amount,
            status: invoice.status
        };
        
        // Update invoice fields
        if (invoiceNumber) invoice.invoiceNumber = invoiceNumber;
        
        // Handle date field
        let parsedDate;
        if (date) {
            try {
                // The date should be in YYYY-MM-DD format from the frontend
                console.log('Received date from frontend:', date);
                parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    invoice.issueDate = parsedDate;
                    console.log('Updated issue date to:', parsedDate, 'Formatted as DD/MM/YYYY:', formatDateAsDDMMYYYY(parsedDate));
                } else {
                    console.log('Invalid date format received:', date);
                }
            } catch (error) {
                console.log('Error parsing date:', error);
            }
        }
        
        if (amount !== undefined) {
            invoice.amount = Number(amount);
            console.log('Updated amount to:', invoice.amount);
        }
        
        if (status) invoice.status = status;
        
        console.log('Invoice before save:', {
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            amount: invoice.amount,
            status: invoice.status
        });
        
        await invoice.save();
        
        console.log('Invoice after save:', {
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            amount: invoice.amount,
            status: invoice.status
        });
        
        // Prepare changes for activity log
        const changes = {};
        if (invoiceNumber && invoiceNumber !== originalValues.invoiceNumber) {
            changes.invoiceNumber = {
                from: originalValues.invoiceNumber,
                to: invoiceNumber
            };
        }
        if (date && parsedDate && parsedDate.getTime() !== new Date(originalValues.issueDate).getTime()) {
            changes.issueDate = {
                from: formatDateAsDDMMYYYY(originalValues.issueDate),
                to: formatDateAsDDMMYYYY(parsedDate)
            };
        }
        if (amount !== undefined && Number(amount) !== originalValues.amount) {
            changes.amount = {
                from: originalValues.amount,
                to: Number(amount)
            };
        }
        if (status && status !== originalValues.status) {
            changes.status = {
                from: originalValues.status,
                to: status
            };
        }
        
        // Log the activity if there were changes
        if (Object.keys(changes).length > 0) {
            // Get client and jobsite names for better description
            let clientName = '';
            let jobsiteName = '';
            
            try {
                if (invoice.client) {
                    const clientDoc = await User.findById(invoice.client);
                    if (clientDoc) {
                        clientName = clientDoc.companyName || `${clientDoc.firstName} ${clientDoc.lastName}`;
                    } else {
                        const Client = require('../models/Client');
                        const clientDoc2 = await Client.findById(invoice.client);
                        if (clientDoc2) {
                            clientName = clientDoc2.companyName || `${clientDoc2.firstName} ${clientDoc2.lastName}`;
                        }
                    }
                }
                
                if (invoice.jobsite) {
                    const jobsiteDoc = await Jobsite.findById(invoice.jobsite);
                    if (jobsiteDoc) {
                        jobsiteName = jobsiteDoc.name;
                    }
                }
            } catch (error) {
                console.error('Error fetching client/jobsite details for activity log:', error);
            }
            
            const activityLog = new ActivityLog({
                user: req.user._id,
                action: 'update',
                resourceType: 'invoice',
                resourceId: invoice._id,
                description: `${req.user.firstName} ${req.user.lastName} updated invoice ${invoice.invoiceNumber}${clientName ? ` for ${clientName}` : ''}${jobsiteName ? ` at ${jobsiteName}` : ''}`,
                details: {
                    changes
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
            await activityLog.save();
        }
        
        res.json({
            message: 'Invoice updated successfully',
            invoice: {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                date: invoice.issueDate,
                amount: invoice.amount,
                status: invoice.status
            }
        });
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ error: 'Failed to update invoice' });
    }
});

// Upload and parse multiple invoice PDFs
router.post('/upload-multiple', authenticateToken, isAdmin, upload.array('files', 10), async (req, res) => {
    try {
        console.log('Upload-multiple endpoint called');
        console.log('Request body:', req.body);
        console.log('Request files:', req.files ? `${req.files.length} files received` : 'No files received');
        
        if (!req.files || req.files.length === 0) {
            console.error('No files in request');
            return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log('Files count:', req.files.length);

        const results = [];
        const clientId = req.body.clientId || null;
        const jobsiteId = req.body.jobsiteId || null;
        const action = req.body.action || 'uploaded';

        // Process each file
        for (const file of req.files) {
            try {
                console.log('Processing file:', file.originalname);
                
                // Extract data from the PDF
                const extractedData = await extractInvoiceData(file.path);
                console.log('Extracted Data for', file.originalname, ':', extractedData);

                // Prepare the file URL
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                const fileUrl = `${baseUrl}/uploads/${file.filename}`;

                // Add to results
                results.push({
                    success: true,
                    filename: file.originalname,
                    fileUrl: fileUrl,
                    extractedData: extractedData
                });
            } catch (fileError) {
                console.error('Error processing file', file.originalname, ':', fileError);
                results.push({
                    success: false,
                    filename: file.originalname,
                    error: fileError.message || 'Failed to process file'
                });
            }
        }

        // Log the activity
        try {
            // Get client name for activity log
            let clientName = '';
            if (clientId) {
                try {
                    const clientDoc = await User.findById(clientId);
                    if (clientDoc) {
                        clientName = clientDoc.companyName || `${clientDoc.firstName} ${clientDoc.lastName}`;
                    } else {
                        const Client = require('../models/Client');
                        const clientDoc2 = await Client.findById(clientId);
                        if (clientDoc2) {
                            clientName = clientDoc2.companyName || `${clientDoc2.firstName} ${clientDoc2.lastName}`;
                        }
                    }
                } catch (error) {
                    console.error('Error fetching client details for activity log:', error);
                }
            }

            // Determine the description based on the action
            let description = '';
            if (action === 'recorded') {
                description = `uploaded ${req.files.length} invoice PDFs and recorded${clientName ? ` for ${clientName}` : ''}`;
            } else if (action === 'cancelled') {
                description = `uploaded ${req.files.length} invoice PDFs and cancelled${clientName ? ` for ${clientName}` : ''}`;
            } else {
                description = `uploaded ${req.files.length} invoice PDFs${clientName ? ` for ${clientName}` : ''}`;
            }

            const activityLog = new ActivityLog({
                user: req.user._id,
                action: 'upload',
                resourceType: 'invoice',
                resourceId: null,
                description: description
            });
            await activityLog.save();
        } catch (activityError) {
            console.error('Error logging activity:', activityError);
        }

        res.json({ 
            message: `Processed ${req.files.length} files`,
            results: results
        });
    } catch (error) {
        console.error('Error in upload-multiple endpoint:', error);
        res.status(500).json({ error: 'Failed to process files' });
    }
});

// Extract lines from PDF for debugging
router.post('/extract-lines', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
    try {
        console.log('Extract-lines endpoint called');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file ? 'File received' : 'No file received');
        
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File details:', {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Extract line data from the PDF
        const lineData = await extractLineRange(req.file.path);
        console.log('Line extraction completed');
        
        res.json({
            message: 'Line extraction successful',
            data: lineData
        });
    } catch (error) {
        console.error('Error extracting lines from PDF:', error);
        res.status(500).json({ error: 'Failed to extract lines from PDF' });
    }
});

// Helper function to get client name from ID
async function getClientName(clientId) {
    if (!clientId) return null;
    
    try {
        // First try User model
        let client = await User.findById(clientId);
        if (client) {
            return client.companyName || `${client.firstName} ${client.lastName}`;
        }
        
        // If not found, try Client model
        const Client = require('../models/Client');
        client = await Client.findById(clientId);
        if (client) {
            return client.companyName || `${client.firstName} ${client.lastName}`;
        }
        
        return null;
    } catch (error) {
        console.error('Error getting client name:', error);
        return null;
    }
}

module.exports = router; 