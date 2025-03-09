require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pcPortal';

module.exports = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: mongoUri,
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key'
}; 