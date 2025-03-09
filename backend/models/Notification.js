const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: [
            'timesheet_submitted', 
            'timesheet_approved', 
            'timesheet_rejected',
            'jobsite_assigned',
            'employee_assigned',
            'document_uploaded',
            'account_created',
            'task_assigned',
            'system_notification'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    relatedResource: {
        resourceType: {
            type: String,
            enum: ['timesheet', 'jobsite', 'user', 'document', 'task']
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    actionUrl: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema); 