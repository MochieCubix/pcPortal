const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Jobsite = require('../models/Jobsite');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { extractInvoiceData } = require('./utils/pdfParser');
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

// Parse existing invoice PDF
router.post('/parse-existing', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({ error: 'No filename provided' });
        }

        // Extract just the filename from the full URL if it's a full URL
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

        // If jobsite name was extracted, try to find matching jobsite
        let jobsiteId = null;
        if (extractedData.jobsiteName && req.body.clientId) {
            const jobsite = await Jobsite.findOne({
                client: req.body.clientId,
                name: new RegExp(extractedData.jobsiteName, 'i')
            });
            if (jobsite) {
                jobsiteId = jobsite._id;
            }
        }

        res.json({
            success: true,
            data: {
                ...extractedData,
                jobsiteId
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
        const { clientId } = req.query;
        
        // Build query based on filters
        let query = {};
        
        // Filter by client if provided
        if (clientId) {
            query.client = clientId;
        }
        
        console.log('Fetching invoices with query:', query);
        
        const invoices = await Invoice.find(query)
            .populate('client', 'companyName')
            .populate('jobsite', 'name')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        // Transform the data to match frontend expectations
        const transformedInvoices = invoices.map(invoice => ({
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.issueDate,
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

        console.log('Sending invoices:', transformedInvoices.length);
        
        res.json(transformedInvoices);
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
        
        // Check if user is authorized to view this invoice
        if (req.user.role !== 'admin' && invoice.client._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        res.json(invoice);
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
            notes
        } = req.body;

        console.log('Received invoice data:', {
            invoiceNumber,
            clientId,
            jobsiteId,
            amount,
            status,
            notes,
            file: req.file ? req.file.filename : 'No file'
        });

        // Ensure clientId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
            console.log('Invalid client ID format:', clientId);
            return res.status(400).json({ error: 'Invalid client ID format' });
        }

        // Validate client exists
        const clientExists = await User.findById(clientId);
        console.log('Client search result:', clientExists ? 'Found' : 'Not found');
        
        if (!clientExists) {
            console.log('Client validation failed for ID:', clientId);
            return res.status(400).json({ error: 'Client not found' });
        }
        
        // Validate jobsite exists if provided
        if (jobsiteId) {
            const jobsiteExists = await Jobsite.findById(jobsiteId);
            if (!jobsiteExists) {
                return res.status(400).json({ error: 'Jobsite not found' });
            }
        }

        // Generate file URL if file was uploaded
        let fileUrl;
        if (req.file) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
        }
        
        // Create new invoice
        const parsedAmount = parseFloat(amount);
        const newInvoice = new Invoice({
            invoiceNumber,
            client: clientId,
            jobsite: jobsiteId,
            amount: parsedAmount,
            status: status || 'draft',
            notes,
            fileUrl,
            createdBy: req.user._id,
            issueDate: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30))
        });

        console.log('Creating invoice with data:', {
            invoiceNumber,
            clientId,
            amount: parsedAmount
        });
        
        await newInvoice.save();
        
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
        const invoice = await Invoice.findByIdAndDelete(req.params.id);
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
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
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Extract data from the PDF
        const extractedData = await extractInvoiceData(req.file.path);

        // If jobsite name was extracted, try to find matching jobsite
        let jobsiteId = null;
        if (extractedData.jobsiteName && req.body.clientId) {
            const jobsite = await Jobsite.findOne({
                client: req.body.clientId,
                name: new RegExp(extractedData.jobsiteName, 'i')
            });
            if (jobsite) {
                jobsiteId = jobsite._id;
            }
        }

        // Prepare the response
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        res.json({
            success: true,
            data: {
                ...extractedData,
                jobsiteId,
                fileUrl
            }
        });
    } catch (error) {
        console.error('Error processing invoice:', error);
        res.status(500).json({ error: 'Failed to process invoice' });
    }
});

module.exports = router; 