const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: false, // No longer required
        unique: true,
        sparse: true, // Allow multiple null values
        trim: true,
        lowercase: true
    },
    firstName: {
        type: String,
        required: false, // No longer required
        trim: true
    },
    lastName: {
        type: String,
        required: false, // No longer required
        trim: true
    },
    companyName: {
        type: String,
        required: function() {
            return this.role === 'client'; // Only required for clients
        },
        trim: true
    },
    password: {
        type: String,
        required: false // Making password optional since we use magic links/OTP
    },
    role: {
        type: String,
        enum: ['admin', 'client', 'supervisor', 'employee'],
        default: 'client'
    },
    position: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position'
    },
    assignedJobsites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Jobsite'
    }],
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    hireDate: {
        type: Date
    },
    terminationDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'terminated'],
        default: 'active'
    },
    contactNumber: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    paymentTerms: {
        days: {
            type: Number,
            default: 30, // Default to 30 days
            min: 0
        },
        type: {
            type: String,
            enum: ['days', 'EOM'], // End of Month or specific days
            default: 'days'
        },
        description: {
            type: String,
            trim: true
        }
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    currentOTP: {
        code: String,
        expires: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema); 