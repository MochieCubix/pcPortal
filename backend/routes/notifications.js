const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all notifications for the current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate('sender', 'firstName lastName role')
            .sort({ createdAt: -1 });
        
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread notifications for the current user
router.get('/unread', authenticateToken, async (req, res) => {
    try {
        const unreadNotifications = await Notification.find({ 
            recipient: req.user._id,
            read: false
        })
            .populate('sender', 'firstName lastName role')
            .sort({ createdAt: -1 });
        
        res.json(unreadNotifications);
    } catch (error) {
        console.error('Error fetching unread notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get notification by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id)
            .populate('sender', 'firstName lastName role');
        
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        // Check if user is authorized to view this notification
        if (notification.recipient.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        res.json(notification);
    } catch (error) {
        console.error('Error fetching notification:', error);
        res.status(500).json({ error: 'Failed to fetch notification' });
    }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        // Check if user is authorized to update this notification
        if (notification.recipient.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        notification.read = true;
        await notification.save();
        
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all notifications as read for the current user
router.put('/read/all', authenticateToken, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { $set: { read: true } }
        );
        
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// Create notification (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            recipient, 
            sender, 
            type, 
            title, 
            message, 
            relatedResource, 
            actionUrl 
        } = req.body;
        
        const newNotification = new Notification({
            recipient,
            sender: sender || req.user._id,
            type,
            title,
            message,
            relatedResource,
            actionUrl,
            read: false
        });
        
        await newNotification.save();
        
        res.status(201).json({
            message: 'Notification created successfully',
            notification: newNotification
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        // Check if user is authorized to delete this notification
        if (notification.recipient.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        await Notification.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Delete all notifications for the current user
router.delete('/all', authenticateToken, async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.user._id });
        
        res.json({ message: 'All notifications deleted successfully' });
    } catch (error) {
        console.error('Error deleting all notifications:', error);
        res.status(500).json({ error: 'Failed to delete notifications' });
    }
});

module.exports = router; 