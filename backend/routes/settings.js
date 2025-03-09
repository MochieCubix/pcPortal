const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all settings (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const settings = await Setting.find()
            .populate('lastUpdatedBy', 'firstName lastName')
            .sort({ category: 1, key: 1 });
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Get public settings (accessible to all authenticated users)
router.get('/public', authenticateToken, async (req, res) => {
    try {
        const publicSettings = await Setting.find({ isPublic: true })
            .select('-lastUpdatedBy')
            .sort({ category: 1, key: 1 });
        
        res.json(publicSettings);
    } catch (error) {
        console.error('Error fetching public settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Get settings by category (admin only)
router.get('/category/:category', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { category } = req.params;
        
        const settings = await Setting.find({ category })
            .populate('lastUpdatedBy', 'firstName lastName')
            .sort({ key: 1 });
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings by category:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Get setting by key
router.get('/:key', authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;
        
        const setting = await Setting.findOne({ key })
            .populate('lastUpdatedBy', 'firstName lastName');
        
        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        
        // Check if user is authorized to view this setting
        if (!setting.isPublic && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        res.json(setting);
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

// Create new setting (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { key, value, description, category, isPublic } = req.body;
        
        // Check if setting already exists
        const existingSetting = await Setting.findOne({ key });
        if (existingSetting) {
            return res.status(400).json({ error: 'Setting with this key already exists' });
        }
        
        const newSetting = new Setting({
            key,
            value,
            description,
            category,
            isPublic: isPublic || false,
            lastUpdatedBy: req.user._id
        });
        
        await newSetting.save();
        
        res.status(201).json({
            message: 'Setting created successfully',
            setting: {
                key: newSetting.key,
                value: newSetting.value,
                category: newSetting.category
            }
        });
    } catch (error) {
        console.error('Error creating setting:', error);
        res.status(500).json({ error: 'Failed to create setting' });
    }
});

// Update setting (admin only)
router.put('/:key', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value, description, category, isPublic } = req.body;
        
        const setting = await Setting.findOne({ key });
        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        
        // Update setting
        setting.value = value !== undefined ? value : setting.value;
        setting.description = description || setting.description;
        setting.category = category || setting.category;
        setting.isPublic = isPublic !== undefined ? isPublic : setting.isPublic;
        setting.lastUpdatedBy = req.user._id;
        
        await setting.save();
        
        res.json({
            message: 'Setting updated successfully',
            setting: {
                key: setting.key,
                value: setting.value,
                category: setting.category
            }
        });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// Delete setting (admin only)
router.delete('/:key', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        
        const setting = await Setting.findOneAndDelete({ key });
        
        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        
        res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
        console.error('Error deleting setting:', error);
        res.status(500).json({ error: 'Failed to delete setting' });
    }
});

module.exports = router; 