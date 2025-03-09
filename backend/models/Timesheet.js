const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobsite: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Jobsite',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    breakDuration: {
        type: Number, // in minutes
        default: 0
    },
    totalHours: {
        type: Number,
        required: true
    },
    tasks: [{
        description: {
            type: String,
            required: true
        },
        hoursSpent: {
            type: Number,
            required: true
        }
    }],
    notes: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalDate: {
        type: Date
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    attachments: [{
        fileName: String,
        fileUrl: String,
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Virtual for calculating overtime hours
timesheetSchema.virtual('overtimeHours').get(function() {
    const regularHours = 8; // Assuming 8 hours is regular time
    return this.totalHours > regularHours ? this.totalHours - regularHours : 0;
});

module.exports = mongoose.model('Timesheet', timesheetSchema); 