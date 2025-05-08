const mongoose = require('mongoose');

// Create a separate schema for file
const fileSchema = new mongoose.Schema({
    name: String,
    path: String,
    type: String
}, { _id: false }); // Don't create _id for subdocuments

const commentSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true,
        default: () => {
            const now = new Date();
            return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        }
    },
    comment: {
        type: String,
        required: true
    },
    file: fileSchema, // Use the file schema as a subdocument
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Comment', commentSchema); 