const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate magic link token
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Send magic link email
const sendMagicLink = async (email, token) => {
    const magicLink = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Access Your Client Portal',
        html: `
            <h1>Welcome to Your Client Portal</h1>
            <p>Click the button below to access your documents:</p>
            <a href="${magicLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0;">
                Access Portal
            </a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${magicLink}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Magic link email sent:', info.response);
        return info;
    } catch (error) {
        console.error('Error sending magic link email:', error);
        throw error;
    }
};

// Send OTP email
const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Portal Access Code',
        html: `
            <h1>Your Access Code</h1>
            <p>Enter the following code to access your documents:</p>
            <h2 style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px;">
                ${otp}
            </h2>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('OTP email sent:', info.response);
        return info;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
};

module.exports = {
    generateOTP,
    generateToken,
    sendMagicLink,
    sendOTP
}; 