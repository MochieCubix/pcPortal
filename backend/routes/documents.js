const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const Document = require('../models/Document');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Accept only PDF files for invoices
    if (req.body.type === 'invoice' && file.mimetype !== 'application/pdf') {
        cb(new Error('Only PDF files are allowed for invoices'), false);
    } else {
        cb(null, true);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Simple test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Documents API is working!' });
});

// Upload document (admin only)
router.post('/', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        const document = new Document({
            title: req.body.title,
            type: req.body.type,
            fileUrl: fileUrl,
            fileName: req.file.originalname,
            client: req.body.clientId,
            uploadedBy: req.user._id,
            metadata: {
                period: req.body.period,
                amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
                status: req.body.status
            }
        });
        await document.save();
        res.status(201).json(document);
    } catch (error) {
        console.error('Upload error:', error);
        // Delete the uploaded file if document creation fails
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        res.status(500).json({ error: error.message });
    }
});

// Get all documents for a client
router.get('/my-documents', authenticateToken, async (req, res) => {
    try {
        const documents = await Document.find({ client: req.user._id })
            .sort({ uploadDate: -1 });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all documents (admin only)
router.get('/all', authenticateToken, isAdmin, async (req, res) => {
    try {
        const documents = await Document.find({})
            .populate('client', 'firstName lastName email')
            .sort({ uploadDate: -1 });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update document status (admin only)
router.patch('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const document = await Document.findByIdAndUpdate(
            req.params.id,
            { $set: { 'metadata.status': req.body.status } },
            { new: true }
        );
        res.json(document);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete document (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete the file from local storage
        const filePath = path.join(uploadsDir, path.basename(document.fileUrl));
        try {
            fs.unlinkSync(filePath);
        } catch (unlinkError) {
            console.error('Error deleting file:', unlinkError);
        }

        await document.deleteOne();
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get documents for a specific client (admin only)
router.get('/client/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        console.log('Fetching documents for client:', req.params.id);
        const documents = await Document.find({ client: req.params.id })
            .sort({ uploadDate: -1 });
        console.log('Found documents:', documents);
        res.json(documents);
    } catch (error) {
        console.error('Error fetching client documents:', error);
        res.status(500).json({ error: error.message });
    }
});

// Simple upload endpoint (no multer middleware)
router.post('/upload-simple', authenticateToken, (req, res) => {
    res.status(200).json({ 
        message: 'Upload endpoint reached successfully',
        user: req.user._id,
        body: req.body
    });
});

// Upload document (general purpose endpoint)
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { type, clientId, jobsiteId, description } = req.body;

        // Create document record
        const newDocument = new Document({
            title: req.file.originalname,
            type: type || 'other',
            fileUrl: `/uploads/${req.file.filename}`,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            client: clientId || null,
            jobsite: jobsiteId || null,
            description: description || '',
            uploadedBy: req.user._id,
            uploadDate: new Date(),
            metadata: {
                status: 'pending'
            }
        });

        await newDocument.save();

        res.status(201).json({
            message: 'Document uploaded successfully',
            document: {
                _id: newDocument._id,
                name: newDocument.title,
                fileUrl: newDocument.fileUrl
            }
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        // Delete the uploaded file if document creation fails
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

module.exports = router; 