const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'login', 
            'logout', 
            'create', 
            'update', 
            'delete', 
            'view', 
            'download',
            'upload',
            'approve',
            'reject',
            'assign',
            'unassign',
            'submit'
        ]
    },
    resourceType: {
        type: String,
        required: true,
        enum: [
            'user', 
            'client', 
            'employee', 
            'supervisor', 
            'jobsite', 
            'timesheet', 
            'document',
            'position',
            'setting'
        ]
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId
    },
    description: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for faster queries
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ resourceType: 1, resourceId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema); 