const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Jobsite = require('../models/Jobsite');
const Timesheet = require('../models/Timesheet');
const { authenticateToken, isAdmin, isSupervisor } = require('../middleware/auth');

// Get all supervisors (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const supervisors = await User.find({ role: 'supervisor' })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .populate('position', 'name')
            .sort({ lastName: 1, firstName: 1 });
        
        res.json(supervisors);
    } catch (error) {
        console.error('Error fetching supervisors:', error);
        res.status(500).json({ error: 'Failed to fetch supervisors' });
    }
});

// Get supervisor by ID (admin or the supervisor themselves)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        // Check if user is authorized to view this supervisor
        if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const supervisor = await User.findOne({ _id: req.params.id, role: 'supervisor' })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .populate('position', 'name');
        
        if (!supervisor) {
            return res.status(404).json({ error: 'Supervisor not found' });
        }
        
        res.json(supervisor);
    } catch (error) {
        console.error('Error fetching supervisor:', error);
        res.status(500).json({ error: 'Failed to fetch supervisor' });
    }
});

// Create new supervisor (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
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
        
        // Check if supervisor already exists
        const existingSupervisor = await User.findOne({ email });
        if (existingSupervisor) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        
        // Generate a random password
        const tempPassword = Math.random().toString(36).slice(-8);
        
        const newSupervisor = new User({
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
        
        await newSupervisor.save();
        
        // TODO: Send welcome email with temporary password
        
        res.status(201).json({
            message: 'Supervisor created successfully',
            supervisor: {
                _id: newSupervisor._id,
                email: newSupervisor.email,
                firstName: newSupervisor.firstName,
                lastName: newSupervisor.lastName
            }
        });
    } catch (error) {
        console.error('Error creating supervisor:', error);
        res.status(500).json({ error: 'Failed to create supervisor' });
    }
});

// Update supervisor (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            email, 
            firstName, 
            lastName, 
            contactNumber, 
            address, 
            position, 
            hireDate,
            terminationDate,
            status 
        } = req.body;
        
        // Check if supervisor exists
        const supervisor = await User.findOne({ _id: req.params.id, role: 'supervisor' });
        if (!supervisor) {
            return res.status(404).json({ error: 'Supervisor not found' });
        }
        
        // Check if email is being changed and if it's already in use
        if (email !== supervisor.email) {
            const existingSupervisor = await User.findOne({ email });
            if (existingSupervisor) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        
        // Update supervisor
        supervisor.email = email || supervisor.email;
        supervisor.firstName = firstName || supervisor.firstName;
        supervisor.lastName = lastName || supervisor.lastName;
        supervisor.contactNumber = contactNumber || supervisor.contactNumber;
        supervisor.address = address || supervisor.address;
        supervisor.position = position || supervisor.position;
        supervisor.hireDate = hireDate || supervisor.hireDate;
        supervisor.terminationDate = terminationDate || supervisor.terminationDate;
        supervisor.status = status || supervisor.status;
        
        await supervisor.save();
        
        res.json({
            message: 'Supervisor updated successfully',
            supervisor: {
                _id: supervisor._id,
                email: supervisor.email,
                firstName: supervisor.firstName,
                lastName: supervisor.lastName,
                status: supervisor.status
            }
        });
    } catch (error) {
        console.error('Error updating supervisor:', error);
        res.status(500).json({ error: 'Failed to update supervisor' });
    }
});

// Delete supervisor (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const supervisor = await User.findOneAndDelete({ _id: req.params.id, role: 'supervisor' });
        
        if (!supervisor) {
            return res.status(404).json({ error: 'Supervisor not found' });
        }
        
        res.json({ message: 'Supervisor deleted successfully' });
    } catch (error) {
        console.error('Error deleting supervisor:', error);
        res.status(500).json({ error: 'Failed to delete supervisor' });
    }
});

// Get supervisor's jobsites
router.get('/:id/jobsites', authenticateToken, async (req, res) => {
    try {
        // Check if user is authorized to view this supervisor's jobsites
        if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const jobsites = await Jobsite.find({ supervisors: req.params.id })
            .populate('client', 'firstName lastName companyName')
            .sort({ startDate: -1 });
        
        res.json(jobsites);
    } catch (error) {
        console.error('Error fetching supervisor jobsites:', error);
        res.status(500).json({ error: 'Failed to fetch jobsites' });
    }
});

// Get supervisor's employees
router.get('/:id/employees', authenticateToken, async (req, res) => {
    try {
        // Check if user is authorized to view this supervisor's employees
        if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Get jobsites supervised by this supervisor
        const supervisorJobsites = await Jobsite.find({ supervisors: req.params.id });
        const jobsiteIds = supervisorJobsites.map(jobsite => jobsite._id);
        
        // Get employees assigned to these jobsites
        const employeeIds = [];
        for (const jobsite of supervisorJobsites) {
            for (const emp of jobsite.employees) {
                if (!employeeIds.includes(emp.employee.toString())) {
                    employeeIds.push(emp.employee.toString());
                }
            }
        }
        
        const employees = await User.find({ _id: { $in: employeeIds }, role: 'employee' })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .populate('position', 'name')
            .sort({ lastName: 1, firstName: 1 });
        
        res.json(employees);
    } catch (error) {
        console.error('Error fetching supervisor employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Get pending timesheets for supervisor approval
router.get('/:id/timesheets/pending', authenticateToken, async (req, res) => {
    try {
        // Check if user is authorized
        if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Get jobsites supervised by this supervisor
        const supervisorJobsites = await Jobsite.find({ supervisors: req.params.id });
        const jobsiteIds = supervisorJobsites.map(jobsite => jobsite._id);
        
        // Get pending timesheets for these jobsites
        const pendingTimesheets = await Timesheet.find({
            jobsite: { $in: jobsiteIds },
            status: 'pending'
        })
            .populate('employee', 'firstName lastName email')
            .populate('jobsite', 'name client')
            .sort({ date: -1 });
        
        res.json(pendingTimesheets);
    } catch (error) {
        console.error('Error fetching pending timesheets:', error);
        res.status(500).json({ error: 'Failed to fetch timesheets' });
    }
});

// Approve or reject timesheet
router.put('/timesheets/:timesheetId', authenticateToken, isSupervisor, async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const timesheet = await Timesheet.findById(req.params.timesheetId);
        if (!timesheet) {
            return res.status(404).json({ error: 'Timesheet not found' });
        }
        
        // Check if supervisor is assigned to the jobsite
        const jobsite = await Jobsite.findOne({
            _id: timesheet.jobsite,
            supervisors: req.user._id
        });
        
        if (!jobsite) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Update timesheet
        timesheet.status = status;
        timesheet.approvedBy = req.user._id;
        timesheet.approvalDate = new Date();
        
        if (status === 'rejected' && rejectionReason) {
            timesheet.rejectionReason = rejectionReason;
        }
        
        await timesheet.save();
        
        // TODO: Send notification to employee
        
        res.json({
            message: `Timesheet ${status}`,
            timesheet: {
                _id: timesheet._id,
                status: timesheet.status,
                approvalDate: timesheet.approvalDate
            }
        });
    } catch (error) {
        console.error('Error updating timesheet:', error);
        res.status(500).json({ error: 'Failed to update timesheet' });
    }
});

// Update supervisor account (supervisor can update their own account)
router.put('/:id/account', authenticateToken, async (req, res) => {
    try {
        // Check if user is the supervisor themselves
        if (req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const { contactNumber, address, password } = req.body;
        
        const supervisor = await User.findById(req.params.id);
        if (!supervisor) {
            return res.status(404).json({ error: 'Supervisor not found' });
        }
        
        // Update fields
        if (contactNumber) supervisor.contactNumber = contactNumber;
        if (address) supervisor.address = address;
        if (password) supervisor.password = password;
        
        await supervisor.save();
        
        res.json({ message: 'Account updated successfully' });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ error: 'Failed to update account' });
    }
});

module.exports = router; 