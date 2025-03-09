const mongoose = require('mongoose');

const jobsiteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        },
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'on-hold', 'cancelled'],
        default: 'active'
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    supervisors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    employees: [{
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        assignedDate: {
            type: Date,
            default: Date.now
        },
        endDate: Date
    }],
    budget: {
        amount: Number,
        currency: {
            type: String,
            default: 'USD'
        }
    },
    notes: [{
        content: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    documents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Jobsite', jobsiteSchema); 