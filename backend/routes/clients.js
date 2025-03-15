const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Jobsite = require('../models/Jobsite');
const { authenticateToken, isAdmin, logActivity } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');

// Get all clients (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const clients = await Client.find();
        res.json(clients);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching clients' });
    }
});

// Get client jobsites (admin only)
router.get('/:id/jobsites', authenticateToken, isAdmin, async (req, res) => {
    try {
        const jobsites = await Jobsite.find({ client: req.params.id })
            .populate('supervisors', 'firstName lastName email')
            .sort({ createdAt: -1 });
        res.json(jobsites);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching client jobsites' });
    }
});

// Get single client (admin only)
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching client' });
    }
});

// Create client (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const client = new Client(req.body);
        await client.save();
        
        // Log the activity
        const activityLog = new ActivityLog({
            user: req.user._id,
            action: 'create',
            resourceType: 'client',
            resourceId: client._id,
            description: client.companyName,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();
        
        res.status(201).json(client);
    } catch (err) {
        res.status(400).json({ error: 'Error creating client' });
    }
});

// Update client (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const client = await Client.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Log the activity
        const activityLog = new ActivityLog({
            user: req.user._id,
            action: 'update',
            resourceType: 'client',
            resourceId: client._id,
            description: client.companyName,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();
        
        res.json(client);
    } catch (err) {
        res.status(400).json({ error: 'Error updating client' });
    }
});

// Delete client (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Log the activity
        const activityLog = new ActivityLog({
            user: req.user._id,
            action: 'delete',
            resourceType: 'client',
            resourceId: client._id,
            description: client.companyName,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();
        
        res.json({ message: 'Client deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting client' });
    }
});

// Get all jobsites for a client
router.get('/:id/jobsites', authenticateToken, async (req, res) => {
    try {
        const clientId = req.params.id;
        
        // Check if user is authorized to view this client's jobsites
        if (req.user.role !== 'admin' && req.user._id.toString() !== clientId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Validate client exists
        const clientExists = await Client.findById(clientId);
        if (!clientExists) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        const jobsites = await Jobsite.find({ client: clientId })
            .populate({
                path: 'client',
                select: 'firstName lastName companyName',
                match: { status: { $ne: 'terminated' } }
            })
            .populate({
                path: 'supervisors',
                select: 'firstName lastName email',
                match: { status: { $ne: 'terminated' } }
            })
            .sort({ startDate: -1 });
        
        // Ensure data is sanitized before sending to client
        const sanitizedJobsites = jobsites.map(jobsite => {
            const jobsiteObj = jobsite.toObject();
            
            // Handle null client
            if (!jobsiteObj.client) {
                jobsiteObj.client = {
                    _id: clientId,
                    firstName: clientExists.firstName || 'Unknown',
                    lastName: clientExists.lastName || 'Client',
                    companyName: clientExists.companyName
                };
            }
            
            // Handle null supervisors
            if (Array.isArray(jobsiteObj.supervisors)) {
                jobsiteObj.supervisors = jobsiteObj.supervisors.filter(sup => sup !== null);
            } else {
                jobsiteObj.supervisors = [];
            }
            
            return jobsiteObj;
        });
        
        res.json(sanitizedJobsites);
    } catch (error) {
        console.error('Error fetching client jobsites:', error);
        res.status(500).json({ error: 'Failed to fetch client jobsites' });
    }
});

module.exports = router; 