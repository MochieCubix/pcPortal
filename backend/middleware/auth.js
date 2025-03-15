const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        
        const decoded = jwt.verify(token, config.JWT_SECRET);
        
        // Check if user exists
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token. User not found.' });
        }
        
        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
};

// Middleware to check if user is supervisor
const isSupervisor = (req, res, next) => {
    if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Supervisor role required.' });
    }
    next();
};

// Middleware to check if user is supervisor or admin
const isSupervisorOrAdmin = (req, res, next) => {
    if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Supervisor or admin role required.' });
    }
    next();
};

// Middleware to check if user is client
const isClient = (req, res, next) => {
    if (req.user.role !== 'client' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Client role required.' });
    }
    next();
};

// Middleware to check if user is employee
const isEmployee = (req, res, next) => {
    if (req.user.role !== 'employee' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Employee role required.' });
    }
    next();
};

// Middleware to log user activity
const logActivity = (action, resourceType) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Only log activity if request was successful
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const ActivityLog = require('../models/ActivityLog');
                    
                    // Extract resource ID from request
                    let resourceId = null;
                    if (req.params.id) {
                        resourceId = req.params.id;
                    } else if (req.body._id) {
                        resourceId = req.body._id;
                    } else if (typeof data === 'string') {
                        try {
                            const parsedData = JSON.parse(data);
                            if (parsedData._id) {
                                resourceId = parsedData._id;
                            }
                        } catch (e) {
                            // Not JSON or no _id field
                        }
                    }
                    
                    // Extract resource name or identifier for description
                    let description = '';
                    if (req.body.companyName) {
                        description = req.body.companyName;
                    } else if (req.body.name) {
                        description = req.body.name;
                    } else if (req.params.id) {
                        description = req.params.id;
                    } else {
                        description = `${resourceType}`;
                    }
                    
                    const activityLog = new ActivityLog({
                        user: req.user._id,
                        action,
                        resourceType,
                        resourceId,
                        description,
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent'],
                        metadata: {
                            method: req.method,
                            url: req.originalUrl
                        }
                    });
                    
                    activityLog.save().catch(err => console.error('Error saving activity log:', err));
                } catch (error) {
                    console.error('Error in activity logging middleware:', error);
                }
            }
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

module.exports = {
    authenticateToken,
    isAdmin,
    isSupervisor,
    isSupervisorOrAdmin,
    isClient,
    isEmployee,
    logActivity
}; 