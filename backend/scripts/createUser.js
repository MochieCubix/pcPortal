require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const createUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Create admin user
        const adminUser = new User({
            email: 'prochoicerigging@gmail.com',
            firstName: 'Admin',
            lastName: 'User',
            password: '123', // This will be hashed automatically
            role: 'admin',
            status: 'active',
            isEmailVerified: true
        });

        await adminUser.save();
        console.log('Admin user created successfully');

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createUser(); 