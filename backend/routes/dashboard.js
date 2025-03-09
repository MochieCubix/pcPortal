const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Jobsite = require('../models/Jobsite');
const Timesheet = require('../models/Timesheet');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Admin dashboard
router.get('/admin', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Get counts
        const clientCount = await User.countDocuments({ role: 'client' });
        const employeeCount = await User.countDocuments({ role: 'employee' });
        const supervisorCount = await User.countDocuments({ role: 'supervisor' });
        const jobsiteCount = await Jobsite.countDocuments();
        
        // Get active jobsites
        const activeJobsites = await Jobsite.countDocuments({ status: 'active' });
        
        // Get pending timesheets
        const pendingTimesheets = await Timesheet.countDocuments({ status: 'pending' });
        
        // Get recent activity logs
        const recentActivity = await ActivityLog.find()
            .populate('user', 'firstName lastName role')
            .sort({ createdAt: -1 })
            .limit(10);
        
        // Get recent documents
        const recentDocuments = await Document.find()
            .populate('client', 'firstName lastName companyName')
            .populate('uploadedBy', 'firstName lastName')
            .sort({ uploadDate: -1 })
            .limit(5);
        
        // Get recent timesheets
        const recentTimesheets = await Timesheet.find()
            .populate('employee', 'firstName lastName')
            .populate('jobsite', 'name')
            .sort({ createdAt: -1 })
            .limit(5);
        
        // Get recent jobsites
        const recentJobsites = await Jobsite.find()
            .populate('client', 'firstName lastName companyName')
            .sort({ createdAt: -1 })
            .limit(5);
        
        res.json({
            counts: {
                clients: clientCount,
                employees: employeeCount,
                supervisors: supervisorCount,
                jobsites: jobsiteCount,
                activeJobsites,
                pendingTimesheets
            },
            recentActivity,
            recentDocuments,
            recentTimesheets,
            recentJobsites
        });
    } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Supervisor dashboard
router.get('/supervisor', authenticateToken, async (req, res) => {
    try {
        // Check if user is a supervisor
        if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Get supervisor's jobsites
        const supervisorJobsites = await Jobsite.find({ supervisors: req.user._id })
            .populate('client', 'firstName lastName companyName')
            .sort({ startDate: -1 });
        
        const jobsiteIds = supervisorJobsites.map(jobsite => jobsite._id);
        
        // Get counts
        const activeJobsites = supervisorJobsites.filter(j => j.status === 'active').length;
        const completedJobsites = supervisorJobsites.filter(j => j.status === 'completed').length;
        
        // Get employees assigned to these jobsites
        const employeeIds = [];
        for (const jobsite of supervisorJobsites) {
            for (const emp of jobsite.employees) {
                if (!employeeIds.includes(emp.employee.toString())) {
                    employeeIds.push(emp.employee.toString());
                }
            }
        }
        
        const employeeCount = employeeIds.length;
        
        // Get pending timesheets
        const pendingTimesheets = await Timesheet.find({
            jobsite: { $in: jobsiteIds },
            status: 'pending'
        })
            .populate('employee', 'firstName lastName')
            .populate('jobsite', 'name')
            .sort({ date: -1 });
        
        // Get recent timesheets
        const recentTimesheets = await Timesheet.find({
            jobsite: { $in: jobsiteIds }
        })
            .populate('employee', 'firstName lastName')
            .populate('jobsite', 'name')
            .sort({ createdAt: -1 })
            .limit(5);
        
        res.json({
            counts: {
                jobsites: supervisorJobsites.length,
                activeJobsites,
                completedJobsites,
                employees: employeeCount,
                pendingTimesheets: pendingTimesheets.length
            },
            jobsites: supervisorJobsites,
            pendingTimesheets,
            recentTimesheets
        });
    } catch (error) {
        console.error('Error fetching supervisor dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Employee dashboard
router.get('/employee', authenticateToken, async (req, res) => {
    try {
        // Check if user is an employee
        if (req.user.role !== 'employee' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Get employee's jobsites
        const employeeJobsites = await Jobsite.find({ 'employees.employee': req.user._id })
            .populate('client', 'firstName lastName companyName')
            .populate('supervisors', 'firstName lastName email')
            .sort({ startDate: -1 });
        
        // Get employee's timesheets
        const timesheets = await Timesheet.find({ employee: req.user._id })
            .populate('jobsite', 'name')
            .populate('approvedBy', 'firstName lastName')
            .sort({ date: -1 });
        
        // Get pending timesheets
        const pendingTimesheets = timesheets.filter(t => t.status === 'pending');
        
        // Get approved timesheets
        const approvedTimesheets = timesheets.filter(t => t.status === 'approved');
        
        // Get rejected timesheets
        const rejectedTimesheets = timesheets.filter(t => t.status === 'rejected');
        
        // Calculate total hours this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const thisMonthTimesheets = approvedTimesheets.filter(t => {
            const date = new Date(t.date);
            return date >= startOfMonth && date <= endOfMonth;
        });
        
        const totalHoursThisMonth = thisMonthTimesheets.reduce((total, t) => total + t.totalHours, 0);
        
        res.json({
            counts: {
                jobsites: employeeJobsites.length,
                pendingTimesheets: pendingTimesheets.length,
                approvedTimesheets: approvedTimesheets.length,
                rejectedTimesheets: rejectedTimesheets.length,
                totalHoursThisMonth
            },
            jobsites: employeeJobsites,
            recentTimesheets: timesheets.slice(0, 5)
        });
    } catch (error) {
        console.error('Error fetching employee dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Client dashboard
router.get('/client', authenticateToken, async (req, res) => {
    try {
        // Check if user is a client
        if (req.user.role !== 'client' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Get client's jobsites
        const clientJobsites = await Jobsite.find({ client: req.user._id })
            .populate('supervisors', 'firstName lastName email')
            .sort({ startDate: -1 });
        
        // Get client's documents
        const documents = await Document.find({ client: req.user._id })
            .populate('uploadedBy', 'firstName lastName')
            .sort({ uploadDate: -1 });
        
        // Get counts
        const activeJobsites = clientJobsites.filter(j => j.status === 'active').length;
        const completedJobsites = clientJobsites.filter(j => j.status === 'completed').length;
        
        // Get document counts by type
        const invoiceCount = documents.filter(d => d.type === 'invoice').length;
        const documentCount = documents.filter(d => d.type === 'document').length;
        const timesheetCount = documents.filter(d => d.type === 'timesheet').length;
        const statementCount = documents.filter(d => d.type === 'statement').length;
        
        res.json({
            counts: {
                jobsites: clientJobsites.length,
                activeJobsites,
                completedJobsites,
                documents: documents.length,
                invoices: invoiceCount,
                timesheets: timesheetCount,
                statements: statementCount,
                otherDocuments: documentCount
            },
            jobsites: clientJobsites,
            recentDocuments: documents.slice(0, 5)
        });
    } catch (error) {
        console.error('Error fetching client dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

module.exports = router; 