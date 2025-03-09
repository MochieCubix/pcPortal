const express = require('express');
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});

// Add more routes here
router.get('/status', (req, res) => {
    res.json({ 
        status: 'online',
        timestamp: new Date(),
        version: '1.0.0'
    });
});

module.exports = router; 