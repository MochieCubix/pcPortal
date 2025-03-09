const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('./config/config');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const apiRoutes = require('./routes/api');
const clientRoutes = require('./routes/clients');
const employeeRoutes = require('./routes/employees');
const supervisorRoutes = require('./routes/supervisors');
const jobsiteRoutes = require('./routes/jobsites');
const timesheetRoutes = require('./routes/timesheets');
const positionRoutes = require('./routes/positions');
const dashboardRoutes = require('./routes/dashboard');
const settingRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const invoiceRoutes = require('./routes/invoices');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // HTTP request logger

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/jobsites', jobsiteRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invoices', invoiceRoutes);

// Direct upload endpoint for testing
const directUpload = multer({ dest: 'uploads/' });
app.post('/api/direct-upload', directUpload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        res.status(200).json({
            message: 'File uploaded successfully',
            file: req.file
        });
    } catch (error) {
        console.error('Direct upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug route to check all registered routes
app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    
    // Function to extract routes from a router
    function print(path, layer) {
        if (layer.route) {
            layer.route.stack.forEach(print.bind(null, path + layer.route.path));
        } else if (layer.name === 'router' && layer.handle.stack) {
            layer.handle.stack.forEach(print.bind(null, path + (layer.regexp ? layer.regexp.source.replace(/\\\//g, '/').replace(/\^\//g, '/').replace(/\$\//g, '/') : '')));
        } else if (layer.method) {
            routes.push(`${layer.method.toUpperCase()} ${path}`);
        }
    }
    
    // Extract routes from app
    app._router.stack.forEach(print.bind(null, ''));
    
    res.json(routes);
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404 routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});