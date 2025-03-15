const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    abn: {
        type: String,
        trim: true
    },
    accountEmail: {
        type: String,
        trim: true
    },
    accountsPhone: {
        type: String,
        trim: true
    },
    officeAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    paymentTerms: {
        days: {
            type: Number,
            default: 30,
            min: 0
        },
        type: {
            type: String,
            enum: ['days', 'EOM'],
            default: 'days'
        },
        description: {
            type: String,
            trim: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Client', clientSchema); 