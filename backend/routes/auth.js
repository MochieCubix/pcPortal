const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, isAdmin, logActivity } = require('../middleware/auth');
const config = require('../config/config');
const { generateOTP, generateToken, sendMagicLink, sendOTP } = require('../services/emailService');
const bcrypt = require('bcryptjs');

// Get all users (admin only)
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all clients (admin only)
router.get('/clients', authenticateToken, isAdmin, async (req, res) => {
    try {
        const clients = await User.find({ role: 'client' })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .sort({ createdAt: -1 });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all employees (admin only)
router.get('/employees', authenticateToken, isAdmin, async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .populate('position', 'name')
            .populate('supervisor', 'firstName lastName email')
            .sort({ lastName: 1, firstName: 1 });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all supervisors (admin only)
router.get('/supervisors', authenticateToken, isAdmin, async (req, res) => {
    try {
        const supervisors = await User.find({ role: 'supervisor' })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .populate('position', 'name')
            .sort({ lastName: 1, firstName: 1 });
        res.json(supervisors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin creates a new client
router.post('/create-client', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { email, firstName, lastName, companyName, contactNumber, address } = req.body;
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ error: 'Client already exists' });
        }

        // Generate a random password
        const tempPassword = Math.random().toString(36).slice(-8);

        // Create new client
        user = new User({
            email,
            firstName,
            lastName,
            companyName,
            contactNumber,
            address,
            password: tempPassword,
            role: 'client'
        });
        await user.save();

        // TODO: Send welcome email with temporary password

        res.status(201).json({ 
            message: 'Client created successfully', 
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                companyName: user.companyName
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Admin creates a new employee
router.post('/create-employee', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            email, 
            firstName, 
            lastName, 
            contactNumber, 
            address, 
            position, 
            supervisor, 
            hireDate 
        } = req.body;
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Generate a random password
        const tempPassword = Math.random().toString(36).slice(-8);

        // Create new employee
        user = new User({
            email,
            firstName,
            lastName,
            contactNumber,
            address,
            password: tempPassword,
            role: 'employee',
            position,
            supervisor,
            hireDate: hireDate || new Date(),
            status: 'active'
        });
        await user.save();

        // TODO: Send welcome email with temporary password

        res.status(201).json({ 
            message: 'Employee created successfully', 
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Admin creates a new supervisor
router.post('/create-supervisor', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            email, 
            firstName, 
            lastName, 
            contactNumber, 
            address, 
            position, 
            hireDate 
        } = req.body;
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Generate a random password
        const tempPassword = Math.random().toString(36).slice(-8);

        // Create new supervisor
        user = new User({
            email,
            firstName,
            lastName,
            contactNumber,
            address,
            password: tempPassword,
            role: 'supervisor',
            position,
            hireDate: hireDate || new Date(),
            status: 'active'
        });
        await user.save();

        // TODO: Send welcome email with temporary password

        res.status(201).json({ 
            message: 'Supervisor created successfully', 
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Request access (magic link or OTP)
router.post('/request-access', async (req, res) => {
    try {
        const { email, method } = req.body;
        console.log('Requesting access for email:', email);
        
        let user = await User.findOne({ email });
        console.log('Found user:', user);

        if (!user) {
            // Create a temporary admin user if no users exist in the system
            const usersCount = await User.countDocuments();
            if (usersCount === 0 && email === 'admin@example.com') {
                console.log('Creating initial admin user');
                user = new User({
                    email: process.env.EMAIL_USER, // Use the email from environment variables
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'admin',
                    isEmailVerified: true,
                    companyName: 'System Admin'
                });
                await user.save();
                console.log('Admin user created successfully');
            } else {
                return res.status(404).json({ 
                    error: 'Email not found. Please contact support.',
                    details: 'If you are a client, please ask your administrator to create an account for you.'
                });
            }
        }

        if (method === 'magic-link') {
            // Generate and save verification token
            const token = generateToken();
            user.emailVerificationToken = token;
            user.emailVerificationExpires = Date.now() + 3600000; // 1 hour
            await user.save();

            // Send magic link email to the configured email address
            await sendMagicLink(email, token);
            console.log('Magic link sent successfully to:', email);
        } else if (method === 'otp') {
            // Generate and save OTP
            const otp = generateOTP();
            user.currentOTP = {
                code: otp,
                expires: Date.now() + 900000 // 15 minutes
            };
            await user.save();

            // Send OTP email to the configured email address
            await sendOTP(email, otp);
            console.log('OTP sent successfully to:', email);
        }

        res.json({ message: `Access ${method === 'magic-link' ? 'link' : 'code'} sent to ${email}` });
    } catch (error) {
        console.error('Error in request-access:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login with password
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { userId: user._id },
            config.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Log the login activity
        const ActivityLog = require('../models/ActivityLog');
        const activityLog = new ActivityLog({
            user: user._id,
            action: 'login',
            resourceType: 'user',
            resourceId: user._id,
            description: `${user.firstName} ${user.lastName} logged in`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();
        
        // Return user info and token
        res.json({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify magic link
router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query;
        console.log('Verifying token:', token);
        
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });
        console.log('Found user:', user);

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Clear verification token and mark email as verified
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        user.isEmailVerified = true;
        await user.save();
        console.log('User verified successfully');

        // Generate JWT
        const jwtToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                companyName: user.companyName
            }, 
            token: jwtToken 
        });
    } catch (error) {
        console.error('Error in verify:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({
            email,
            'currentOTP.code': otp,
            'currentOTP.expires': { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Clear OTP and mark email as verified
        user.currentOTP = undefined;
        user.isEmailVerified = true;
        await user.save();

        // Generate JWT
        const token = jwt.sign({ userId: user._id }, config.JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                companyName: user.companyName
            }, 
            token 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, contactNumber, address } = req.body;
        
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (contactNumber) user.contactNumber = contactNumber;
        if (address) user.address = address;
        
        await user.save();
        
        res.json({ 
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                contactNumber: user.contactNumber,
                address: user.address
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if current password is correct
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single user by ID (admin only)
router.get('/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 