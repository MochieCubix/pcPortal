const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Client = require('../models/Client');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/comments');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        // Create a safer filename
        const uniquePrefix = Date.now() + '-';
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, uniquePrefix + safeName);
    }
});

const upload = multer({ storage: storage });

// Get all comments for a client (admin only)
router.get('/client/:clientId', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Verify the client exists
        const clientExists = await Client.findById(req.params.clientId);
        if (!clientExists) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        const comments = await Comment.find({ client: req.params.clientId })
            .populate('createdBy', 'firstName lastName')
            .sort({ date: -1 });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new comment for a client (admin only)
router.post('/client/:clientId', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
    try {
        const { date, time, comment } = req.body;
        
        // Verify the client exists
        const clientExists = await Client.findById(req.params.clientId);
        if (!clientExists) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Create the comment document directly, not using object literals for file
        const newComment = new Comment();
        newComment.client = req.params.clientId;
        newComment.date = date;
        newComment.time = time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        newComment.comment = comment;
        newComment.createdBy = req.user._id;

        // Add file if uploaded
        if (req.file) {
            // Store relative paths for file access via static server
            const relativePath = path.relative(path.join(__dirname, '..'), req.file.path)
                .replace(/\\/g, '/'); // Convert backslashes to forward slashes
            
            // Set individual file properties, not as an object
            newComment.file = {};
            newComment.file.name = req.file.originalname;
            newComment.file.path = relativePath;
            newComment.file.type = req.file.mimetype;
        }

        await newComment.save();
        
        // Populate createdBy before returning
        await newComment.populate('createdBy', 'firstName lastName');
        
        res.status(201).json(newComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update a comment (admin only)
router.patch('/:id', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
    try {
        const { date, time, comment } = req.body;
        const commentId = req.params.id;
        
        // Find the comment
        const existingComment = await Comment.findById(commentId);
        if (!existingComment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        // Update the fields
        if (date) existingComment.date = date;
        if (time) existingComment.time = time;
        if (comment !== undefined) existingComment.comment = comment;
        
        // Handle file upload if provided
        if (req.file) {
            // Remove old file if exists
            if (existingComment.file && existingComment.file.path) {
                try {
                    // Get the absolute path from the relative path
                    const fullPath = path.join(__dirname, '..', existingComment.file.path);
                    fs.unlinkSync(fullPath);
                } catch (err) {
                    console.warn('Could not delete old file:', err);
                }
            }
            
            // Store relative paths for file access via static server
            const relativePath = path.relative(path.join(__dirname, '..'), req.file.path)
                .replace(/\\/g, '/'); // Convert backslashes to forward slashes
            
            // Set individual file properties, not as an object
            if (!existingComment.file) existingComment.file = {};
            existingComment.file.name = req.file.originalname;
            existingComment.file.path = relativePath;
            existingComment.file.type = req.file.mimetype;
        }
        
        await existingComment.save();
        
        // Populate createdBy before returning
        await existingComment.populate('createdBy', 'firstName lastName');
        
        res.json(existingComment);
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete a comment (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Delete the file if it exists
        if (comment.file && comment.file.path) {
            try {
                fs.unlinkSync(comment.file.path);
            } catch (err) {
                console.warn('Could not delete file:', err);
            }
        }

        await comment.deleteOne();
        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 