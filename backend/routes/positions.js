const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const User = require('../models/User');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all positions (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const positions = await Position.find()
            .populate('createdBy', 'firstName lastName')
            .sort({ name: 1 });
        
        res.json(positions);
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({ error: 'Failed to fetch positions' });
    }
});

// Get position by ID (admin only)
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const position = await Position.findById(req.params.id)
            .populate('createdBy', 'firstName lastName');
        
        if (!position) {
            return res.status(404).json({ error: 'Position not found' });
        }
        
        res.json(position);
    } catch (error) {
        console.error('Error fetching position:', error);
        res.status(500).json({ error: 'Failed to fetch position' });
    }
});

// Create new position (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            name, 
            description, 
            department, 
            responsibilities, 
            requiredSkills, 
            salaryRange 
        } = req.body;
        
        // Check if position already exists
        const existingPosition = await Position.findOne({ name });
        if (existingPosition) {
            return res.status(400).json({ error: 'Position with this name already exists' });
        }
        
        const newPosition = new Position({
            name,
            description,
            department,
            responsibilities,
            requiredSkills,
            salaryRange,
            isActive: true,
            createdBy: req.user._id
        });
        
        await newPosition.save();
        
        res.status(201).json({
            message: 'Position created successfully',
            position: {
                _id: newPosition._id,
                name: newPosition.name,
                department: newPosition.department
            }
        });
    } catch (error) {
        console.error('Error creating position:', error);
        res.status(500).json({ error: 'Failed to create position' });
    }
});

// Update position (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            name, 
            description, 
            department, 
            responsibilities, 
            requiredSkills, 
            salaryRange,
            isActive 
        } = req.body;
        
        const position = await Position.findById(req.params.id);
        if (!position) {
            return res.status(404).json({ error: 'Position not found' });
        }
        
        // Check if name is being changed and if it's already in use
        if (name !== position.name) {
            const existingPosition = await Position.findOne({ name });
            if (existingPosition) {
                return res.status(400).json({ error: 'Position with this name already exists' });
            }
        }
        
        // Update position
        position.name = name || position.name;
        position.description = description || position.description;
        position.department = department || position.department;
        position.responsibilities = responsibilities || position.responsibilities;
        position.requiredSkills = requiredSkills || position.requiredSkills;
        position.salaryRange = salaryRange || position.salaryRange;
        position.isActive = isActive !== undefined ? isActive : position.isActive;
        
        await position.save();
        
        res.json({
            message: 'Position updated successfully',
            position: {
                _id: position._id,
                name: position.name,
                isActive: position.isActive
            }
        });
    } catch (error) {
        console.error('Error updating position:', error);
        res.status(500).json({ error: 'Failed to update position' });
    }
});

// Delete position (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Check if position is being used by any employees
        const employeesWithPosition = await User.countDocuments({ position: req.params.id });
        if (employeesWithPosition > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete position that is assigned to employees',
                count: employeesWithPosition
            });
        }
        
        const position = await Position.findByIdAndDelete(req.params.id);
        
        if (!position) {
            return res.status(404).json({ error: 'Position not found' });
        }
        
        res.json({ message: 'Position deleted successfully' });
    } catch (error) {
        console.error('Error deleting position:', error);
        res.status(500).json({ error: 'Failed to delete position' });
    }
});

// Get employees with this position (admin only)
router.get('/:id/employees', authenticateToken, isAdmin, async (req, res) => {
    try {
        const employees = await User.find({ position: req.params.id })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .sort({ lastName: 1, firstName: 1 });
        
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees with position:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

module.exports = router; 