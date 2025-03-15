const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity in the system
 * @param {Object} options - Activity options
 * @param {Object} options.user - User object or user ID
 * @param {String} options.action - Action performed (create, update, delete, etc.)
 * @param {String} options.resourceType - Type of resource (client, jobsite, etc.)
 * @param {String|Object} options.resourceId - ID of the resource
 * @param {String} options.description - Description of the activity
 * @param {Object} options.req - Express request object (optional)
 * @param {Object} options.metadata - Additional metadata (optional)
 * @returns {Promise<Object>} - Created activity log
 */
async function logActivity(options) {
    try {
        const { 
            user, 
            action, 
            resourceType, 
            resourceId, 
            description, 
            req, 
            metadata = {} 
        } = options;

        // Validate required fields
        if (!user || !action || !resourceType || !description) {
            console.error('Missing required fields for activity logging');
            return null;
        }

        // Create activity log object
        const activityData = {
            user: typeof user === 'object' ? user._id || user.id : user,
            action,
            resourceType,
            description,
            metadata
        };

        // Add resource ID if provided
        if (resourceId) {
            activityData.resourceId = typeof resourceId === 'object' ? resourceId._id || resourceId.id : resourceId;
        }

        // Add IP and user agent if request is provided
        if (req) {
            activityData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            activityData.userAgent = req.headers['user-agent'];
        }

        // Create and save the activity log
        const activityLog = new ActivityLog(activityData);
        await activityLog.save();
        
        return activityLog;
    } catch (error) {
        console.error('Error logging activity:', error);
        return null;
    }
}

module.exports = { logActivity }; 