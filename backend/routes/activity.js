const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

// Get all activity logs
// GET /api/activity
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { 
            startDate, 
            endDate, 
            resourceType, 
            action, 
            limit = 50, 
            page = 1 
        } = req.query;

        const query = {};

        // Apply date filters if provided
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        // Apply resource type filter if provided
        if (resourceType) {
            query.resourceType = resourceType;
        }

        // Apply action filter if provided
        if (action) {
            query.action = action;
        }

        // Apply role-based filtering
        if (req.user.role !== 'admin') {
            // Non-admin users can only see activities related to their resources
            // This is a simplified example - adjust based on your business rules
            if (req.user.role === 'client') {
                query.$or = [
                    { resourceType: 'client', resourceId: req.user.clientId },
                    { resourceType: 'jobsite', 'metadata.clientId': req.user.clientId }
                ];
            } else if (req.user.role === 'supervisor') {
                query.$or = [
                    { user: req.user.id },
                    { resourceType: 'jobsite', 'metadata.supervisorIds': req.user.id }
                ];
            } else {
                // Regular employees can only see their own activities
                query.user = req.user.id;
            }
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Fetch activities with pagination
        const activities = await ActivityLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('user', 'firstName lastName email role')
            .lean();

        // Get total count for pagination
        const total = await ActivityLog.countDocuments(query);

        // Transform activities to match the frontend format
        const formattedActivities = await Promise.all(activities.map(async (activity) => {
            // Get company name if available
            let company = null;
            if (activity.resourceType === 'client' && activity.resourceId) {
                const client = await User.findById(activity.resourceId).select('company').lean();
                company = client?.company || null;
            } else if (activity.metadata?.clientId) {
                const client = await User.findById(activity.metadata.clientId).select('company').lean();
                company = client?.company || null;
            }

            // Fix for duplicate action text in description
            let target = activity.description;
            const action = mapActionToFrontend(activity.action);
            
            // Check if the description already contains the action verb
            // For example, if action is "uploaded" and description starts with "uploaded"
            if (action && target.toLowerCase().startsWith(action.toLowerCase())) {
                // Remove the action from the beginning of the description to avoid duplication
                target = target.substring(action.length).trim();
            }

            return {
                id: activity._id,
                type: mapResourceTypeToFrontend(activity.resourceType),
                user: `${activity.user.firstName} ${activity.user.lastName}`,
                action: action,
                target: target,
                timestamp: activity.createdAt,
                company: company
            };
        }));

        res.json({
            activities: formattedActivities,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching activity logs:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper function to map resource types to frontend types
function mapResourceTypeToFrontend(resourceType) {
    const mapping = {
        'client': 'client',
        'supervisor': 'supervisor',
        'employee': 'employee',
        'jobsite': 'jobsite',
        'document': 'pdf',
        'timesheet': 'timesheet',
        'user': 'user'
    };
    return mapping[resourceType] || 'other';
}

// Helper function to map actions to frontend-friendly descriptions
function mapActionToFrontend(action) {
    const mapping = {
        'create': 'created',
        'update': 'updated',
        'delete': 'deleted',
        'view': 'viewed',
        'download': 'downloaded',
        'upload': 'uploaded',
        'approve': 'approved',
        'reject': 'rejected',
        'assign': 'assigned',
        'unassign': 'unassigned',
        'submit': 'submitted',
        'login': 'logged in',
        'logout': 'logged out'
    };
    return mapping[action] || action;
}

module.exports = router; 