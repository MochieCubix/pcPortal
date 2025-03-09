const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    responsibilities: [{
        type: String,
        trim: true
    }],
    requiredSkills: [{
        type: String,
        trim: true
    }],
    salaryRange: {
        min: Number,
        max: Number
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Position', positionSchema); 