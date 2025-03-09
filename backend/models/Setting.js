const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['general', 'email', 'security', 'notification', 'timesheet', 'jobsite', 'system'],
        default: 'general'
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema); 