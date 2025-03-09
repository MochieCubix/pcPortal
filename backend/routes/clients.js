const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Jobsite = require('../models/Jobsite');
const Document = require('../models/Document');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all clients (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const clients = await User.find({ role: 'client' })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .sort({ createdAt: -1 });
        
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// Get client by ID (admin only)
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const client = await User.findOne({ _id: req.params.id, role: 'client' })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP');
        
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json(client);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

// Create new client (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { companyName, phone, address, suburb, postcode } = req.body;
        
        // Create a new client with only company information
        const newClient = new User({
            // Set empty values for fields that are no longer required
            email: '',
            firstName: '',
            lastName: '',
            // Set the required fields
            companyName,
            contactNumber: phone,
            address: {
                street: address,
                city: suburb,
                zipCode: postcode,
                country: 'Australia' // Default value
            },
            role: 'client',
            // Generate a random password (not used but required by schema)
            password: Math.random().toString(36).slice(-8)
        });
        
        await newClient.save();
        
        res.status(201).json({
            message: 'Client created successfully',
            client: {
                _id: newClient._id,
                companyName: newClient.companyName,
                contactNumber: newClient.contactNumber,
                address: newClient.address
            }
        });
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// Update client (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { companyName, phone, address, suburb, postcode, status } = req.body;
        
        // Check if client exists
        const client = await User.findOne({ _id: req.params.id, role: 'client' });
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        // Update client
        client.companyName = companyName || client.companyName;
        client.contactNumber = phone || client.contactNumber;
        client.address = {
            street: address || (client.address ? client.address.street : ''),
            city: suburb || (client.address ? client.address.city : ''),
            zipCode: postcode || (client.address ? client.address.zipCode : ''),
            country: 'Australia'
        };
        client.status = status || client.status;
        
        await client.save();
        
        res.json({
            message: 'Client updated successfully',
            client: {
                _id: client._id,
                companyName: client.companyName,
                contactNumber: client.contactNumber,
                address: client.address,
                status: client.status
            }
        });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// Delete client (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const client = await User.findOneAndDelete({ _id: req.params.id, role: 'client' });
        
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

// Get client's jobsites
router.get('/:id/jobsites', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or the client themselves
        if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const jobsites = await Jobsite.find({ client: req.params.id })
            .populate('supervisors', 'firstName lastName email')
            .sort({ createdAt: -1 });
        
        res.json(jobsites);
    } catch (error) {
        console.error('Error fetching client jobsites:', error);
        res.status(500).json({ error: 'Failed to fetch jobsites' });
    }
});

// Get client's documents
router.get('/:id/documents', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or the client themselves
        if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const documents = await Document.find({ client: req.params.id })
            .populate('uploadedBy', 'firstName lastName')
            .sort({ uploadDate: -1 });
        
        res.json(documents);
    } catch (error) {
        console.error('Error fetching client documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

module.exports = router; 