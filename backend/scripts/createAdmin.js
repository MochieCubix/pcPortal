const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/config');

// MongoDB connection options
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

async function createAdminUser() {
    try {
        console.log('Connecting to MongoDB...');
        console.log('MongoDB URI:', config.MONGODB_URI);
        
        await mongoose.connect(config.MONGODB_URI, mongooseOptions);
        console.log('Connected to MongoDB successfully');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            console.log('Email:', existingAdmin.email);
            return;
        }

        // Create admin user
        const adminUser = new User({
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            isEmailVerified: true
        });

        await adminUser.save();
        console.log('Admin user created successfully');
        console.log('Email: admin@example.com');
        console.log('You can now use this email to request access through magic link or OTP');
    } catch (error) {
        console.error('Error:', error.message);
        if (error.name === 'MongoServerSelectionError') {
            console.error('\nMongoDB Connection Error:');
            console.error('1. Make sure MongoDB is installed and running on your system');
            console.error('2. Check if MongoDB is running on the default port (27017)');
            console.error('3. Verify that you can connect to MongoDB using: mongodb://127.0.0.1:27017');
        }
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

createAdminUser(); 