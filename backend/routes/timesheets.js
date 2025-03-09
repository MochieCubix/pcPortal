const express = require('express');
const router = express.Router();
const Timesheet = require('../models/Timesheet');
const Jobsite = require('../models/Jobsite');
const User = require('../models/User');
const { authenticateToken, isAdmin, isSupervisorOrAdmin } = require('../middleware/auth');

// Get all timesheets (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const timesheets = await Timesheet.find()
            .populate('employee', 'firstName lastName email')
            .populate('jobsite', 'name client')
            .populate('approvedBy', 'firstName lastName')
            .sort({ date: -1 });
        
        res.json(timesheets);
    } catch (error) {
        console.error('Error fetching timesheets:', error);
        res.status(500).json({ error: 'Failed to fetch timesheets' });
    }
});

// Get timesheet by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const timesheet = await Timesheet.findById(req.params.id)
            .populate('employee', 'firstName lastName email')
            .populate('jobsite', 'name client supervisors')
            .populate('approvedBy', 'firstName lastName');
        
        if (!timesheet) {
            return res.status(404).json({ error: 'Timesheet not found' });
        }
        
        // Check if user is authorized to view this timesheet
        if (req.user.role === 'employee' && timesheet.employee._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (req.user.role === 'supervisor') {
            const jobsite = await Jobsite.findById(timesheet.jobsite);
            if (!jobsite || !jobsite.supervisors.includes(req.user._id)) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }
        
        if (req.user.role === 'client') {
            const jobsite = await Jobsite.findById(timesheet.jobsite);
            if (!jobsite || jobsite.client.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }
        
        res.json(timesheet);
    } catch (error) {
        console.error('Error fetching timesheet:', error);
        res.status(500).json({ error: 'Failed to fetch timesheet' });
    }
});

// Create new timesheet
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            employee, 
            jobsite, 
            date, 
            startTime, 
            endTime, 
            breakDuration, 
            tasks, 
            notes 
        } = req.body;
        
        // If employee is creating their own timesheet
        const employeeId = employee || req.user._id;
        
        // Check if user is authorized to create this timesheet
        if (req.user.role === 'employee' && employeeId !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Check if employee is assigned to the jobsite
        const jobsiteDoc = await Jobsite.findById(jobsite);
        if (!jobsiteDoc) {
            return res.status(404).json({ error: 'Jobsite not found' });
        }
        
        const isEmployeeAssigned = jobsiteDoc.employees.some(e => e.employee.toString() === employeeId);
        if (!isEmployeeAssigned && req.user.role !== 'admin') {
            return res.status(400).json({ error: 'Employee is not assigned to this jobsite' });
        }
        
        // Calculate total hours
        const start = new Date(startTime);
        const end = new Date(endTime);
        const breakInHours = (breakDuration || 0) / 60;
        const totalHours = (end - start) / (1000 * 60 * 60) - breakInHours;
        
        if (totalHours <= 0) {
            return res.status(400).json({ error: 'Invalid time range' });
        }
        
        const newTimesheet = new Timesheet({
            employee: employeeId,
            jobsite,
            date,
            startTime,
            endTime,
            breakDuration: breakDuration || 0,
            totalHours,
            tasks,
            notes,
            status: 'pending'
        });
        
        await newTimesheet.save();
        
        // TODO: Send notification to supervisor
        
        res.status(201).json({
            message: 'Timesheet submitted successfully',
            timesheet: newTimesheet
        });
    } catch (error) {
        console.error('Error creating timesheet:', error);
        res.status(500).json({ error: 'Failed to create timesheet' });
    }
});

// Update timesheet (employee can update their own pending timesheets)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { 
            date, 
            startTime, 
            endTime, 
            breakDuration, 
            tasks, 
            notes 
        } = req.body;
        
        const timesheet = await Timesheet.findById(req.params.id);
        if (!timesheet) {
            return res.status(404).json({ error: 'Timesheet not found' });
        }
        
        // Check if user is authorized to update this timesheet
        if (req.user.role === 'employee' && timesheet.employee.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Employees can only update pending timesheets
        if (req.user.role === 'employee' && timesheet.status !== 'pending') {
            return res.status(400).json({ error: 'Cannot update timesheet that has been approved or rejected' });
        }
        
        // Calculate total hours if time fields are updated
        let totalHours = timesheet.totalHours;
        if (startTime && endTime) {
            const start = new Date(startTime);
            const end = new Date(endTime);
            const breakInHours = (breakDuration || timesheet.breakDuration) / 60;
            totalHours = (end - start) / (1000 * 60 * 60) - breakInHours;
            
            if (totalHours <= 0) {
                return res.status(400).json({ error: 'Invalid time range' });
            }
        }
        
        // Update timesheet
        timesheet.date = date || timesheet.date;
        timesheet.startTime = startTime || timesheet.startTime;
        timesheet.endTime = endTime || timesheet.endTime;
        timesheet.breakDuration = breakDuration !== undefined ? breakDuration : timesheet.breakDuration;
        timesheet.totalHours = totalHours;
        timesheet.tasks = tasks || timesheet.tasks;
        timesheet.notes = notes || timesheet.notes;
        
        await timesheet.save();
        
        res.json({
            message: 'Timesheet updated successfully',
            timesheet: {
                _id: timesheet._id,
                date: timesheet.date,
                totalHours: timesheet.totalHours
            }
        });
    } catch (error) {
        console.error('Error updating timesheet:', error);
        res.status(500).json({ error: 'Failed to update timesheet' });
    }
});

// Delete timesheet (admin only or employee can delete their own pending timesheets)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const timesheet = await Timesheet.findById(req.params.id);
        if (!timesheet) {
            return res.status(404).json({ error: 'Timesheet not found' });
        }
        
        // Check if user is authorized to delete this timesheet
        if (req.user.role === 'employee') {
            if (timesheet.employee.toString() !== req.user._id.toString()) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            
            if (timesheet.status !== 'pending') {
                return res.status(400).json({ error: 'Cannot delete timesheet that has been approved or rejected' });
            }
        } else if (req.user.role === 'supervisor') {
            const jobsite = await Jobsite.findById(timesheet.jobsite);
            if (!jobsite || !jobsite.supervisors.includes(req.user._id)) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        await Timesheet.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Timesheet deleted successfully' });
    } catch (error) {
        console.error('Error deleting timesheet:', error);
        res.status(500).json({ error: 'Failed to delete timesheet' });
    }
});

// Approve or reject timesheet (admin and supervisors)
router.put('/:id/status', authenticateToken, isSupervisorOrAdmin, async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const timesheet = await Timesheet.findById(req.params.id);
        if (!timesheet) {
            return res.status(404).json({ error: 'Timesheet not found' });
        }
        
        // Check if supervisor is assigned to the jobsite
        if (req.user.role === 'supervisor') {
            const jobsite = await Jobsite.findOne({
                _id: timesheet.jobsite,
                supervisors: req.user._id
            });
            
            if (!jobsite) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
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
        console.error('Error updating timesheet status:', error);
        res.status(500).json({ error: 'Failed to update timesheet status' });
    }
});

// Get pending timesheets (admin and supervisors)
router.get('/status/pending', authenticateToken, isSupervisorOrAdmin, async (req, res) => {
    try {
        let query = { status: 'pending' };
        
        // If supervisor, only show timesheets for jobsites they supervise
        if (req.user.role === 'supervisor') {
            const supervisorJobsites = await Jobsite.find({ supervisors: req.user._id });
            const jobsiteIds = supervisorJobsites.map(jobsite => jobsite._id);
            
            query.jobsite = { $in: jobsiteIds };
        }
        
        const pendingTimesheets = await Timesheet.find(query)
            .populate('employee', 'firstName lastName email')
            .populate('jobsite', 'name client')
            .sort({ date: -1 });
        
        res.json(pendingTimesheets);
    } catch (error) {
        console.error('Error fetching pending timesheets:', error);
        res.status(500).json({ error: 'Failed to fetch timesheets' });
    }
});

module.exports = router; 