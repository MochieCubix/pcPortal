const express = require('express');
const router = express.Router();
const Jobsite = require('../models/Jobsite');
const User = require('../models/User');
const Timesheet = require('../models/Timesheet');
const { authenticateToken, isAdmin, isSupervisorOrAdmin } = require('../middleware/auth');

// Get all jobsites (admin only)
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query = {};
        
        // If client, only show their jobsites
        if (req.user.role === 'client') {
            query.client = req.user._id;
        }
        
        // If supervisor, only show jobsites they supervise
        if (req.user.role === 'supervisor') {
            query.supervisors = req.user._id;
        }
        
        // If employee, only show jobsites they are assigned to
        if (req.user.role === 'employee') {
            query['employees.employee'] = req.user._id;
        }
        
        const jobsites = await Jobsite.find(query)
            .populate('client', 'firstName lastName companyName')
            .populate('supervisors', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .sort({ startDate: -1 });
        
        res.json(jobsites);
    } catch (error) {
        console.error('Error fetching jobsites:', error);
        res.status(500).json({ error: 'Failed to fetch jobsites' });
    }
});

// Get jobsite by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const jobsite = await Jobsite.findById(req.params.id)
            .populate('client', 'firstName lastName companyName email')
            .populate('supervisors', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .populate('employees.employee', 'firstName lastName email position');
        
        if (!jobsite) {
            return res.status(404).json({ error: 'Jobsite not found' });
        }
        
        // Check if user is authorized to view this jobsite
        if (req.user.role === 'client' && jobsite.client._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (req.user.role === 'supervisor' && !jobsite.supervisors.some(s => s._id.toString() === req.user._id.toString())) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (req.user.role === 'employee' && !jobsite.employees.some(e => e.employee._id.toString() === req.user._id.toString())) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        res.json(jobsite);
    } catch (error) {
        console.error('Error fetching jobsite:', error);
        res.status(500).json({ error: 'Failed to fetch jobsite' });
    }
});

// Create new jobsite (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            name, 
            client, 
            location, 
            description, 
            startDate, 
            endDate, 
            supervisors, 
            budget 
        } = req.body;
        
        const newJobsite = new Jobsite({
            name,
            client,
            location,
            description,
            startDate,
            endDate,
            supervisors,
            budget,
            status: 'active',
            createdBy: req.user._id
        });
        
        await newJobsite.save();
        
        // TODO: Send notifications to client and supervisors
        
        res.status(201).json({
            message: 'Jobsite created successfully',
            jobsite: {
                _id: newJobsite._id,
                name: newJobsite.name,
                client: newJobsite.client,
                startDate: newJobsite.startDate
            }
        });
    } catch (error) {
        console.error('Error creating jobsite:', error);
        res.status(500).json({ error: 'Failed to create jobsite' });
    }
});

// Update jobsite (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            name, 
            client, 
            location, 
            description, 
            status,
            startDate, 
            endDate, 
            supervisors, 
            budget 
        } = req.body;
        
        const jobsite = await Jobsite.findById(req.params.id);
        if (!jobsite) {
            return res.status(404).json({ error: 'Jobsite not found' });
        }
        
        // Update jobsite
        jobsite.name = name || jobsite.name;
        jobsite.client = client || jobsite.client;
        jobsite.location = location || jobsite.location;
        jobsite.description = description || jobsite.description;
        jobsite.status = status || jobsite.status;
        jobsite.startDate = startDate || jobsite.startDate;
        jobsite.endDate = endDate || jobsite.endDate;
        jobsite.supervisors = supervisors || jobsite.supervisors;
        jobsite.budget = budget || jobsite.budget;
        
        await jobsite.save();
        
        res.json({
            message: 'Jobsite updated successfully',
            jobsite: {
                _id: jobsite._id,
                name: jobsite.name,
                status: jobsite.status
            }
        });
    } catch (error) {
        console.error('Error updating jobsite:', error);
        res.status(500).json({ error: 'Failed to update jobsite' });
    }
});

// Delete jobsite (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const jobsite = await Jobsite.findByIdAndDelete(req.params.id);
        
        if (!jobsite) {
            return res.status(404).json({ error: 'Jobsite not found' });
        }
        
        res.json({ message: 'Jobsite deleted successfully' });
    } catch (error) {
        console.error('Error deleting jobsite:', error);
        res.status(500).json({ error: 'Failed to delete jobsite' });
    }
});

// Assign employee to jobsite (admin and supervisors)
router.post('/:id/employees', authenticateToken, isSupervisorOrAdmin, async (req, res) => {
    try {
        const { employeeId } = req.body;
        
        const jobsite = await Jobsite.findById(req.params.id);
        if (!jobsite) {
            return res.status(404).json({ error: 'Jobsite not found' });
        }
        
        // Check if supervisor is assigned to this jobsite
        if (req.user.role === 'supervisor' && !jobsite.supervisors.includes(req.user._id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Check if employee exists
        const employee = await User.findOne({ _id: employeeId, role: 'employee' });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        // Check if employee is already assigned to this jobsite
        const isAssigned = jobsite.employees.some(e => e.employee.toString() === employeeId);
        if (isAssigned) {
            return res.status(400).json({ error: 'Employee already assigned to this jobsite' });
        }
        
        // Assign employee to jobsite
        jobsite.employees.push({
            employee: employeeId,
            assignedDate: new Date()
        });
        
        await jobsite.save();
        
        // Update employee's assigned jobsites
        if (!employee.assignedJobsites.includes(jobsite._id)) {
            employee.assignedJobsites.push(jobsite._id);
            await employee.save();
        }
        
        // TODO: Send notification to employee
        
        res.json({
            message: 'Employee assigned to jobsite successfully',
            employee: {
                _id: employee._id,
                firstName: employee.firstName,
                lastName: employee.lastName
            }
        });
    } catch (error) {
        console.error('Error assigning employee to jobsite:', error);
        res.status(500).json({ error: 'Failed to assign employee' });
    }
});

// Remove employee from jobsite (admin and supervisors)
router.delete('/:id/employees/:employeeId', authenticateToken, isSupervisorOrAdmin, async (req, res) => {
    try {
        const jobsite = await Jobsite.findById(req.params.id);
        if (!jobsite) {
            return res.status(404).json({ error: 'Jobsite not found' });
        }
        
        // Check if supervisor is assigned to this jobsite
        if (req.user.role === 'supervisor' && !jobsite.supervisors.includes(req.user._id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Check if employee is assigned to this jobsite
        const employeeIndex = jobsite.employees.findIndex(e => e.employee.toString() === req.params.employeeId);
        if (employeeIndex === -1) {
            return res.status(404).json({ error: 'Employee not assigned to this jobsite' });
        }
        
        // Set end date for employee assignment
        jobsite.employees[employeeIndex].endDate = new Date();
        
        await jobsite.save();
        
        // Update employee's assigned jobsites
        const employee = await User.findById(req.params.employeeId);
        if (employee) {
            employee.assignedJobsites = employee.assignedJobsites.filter(j => j.toString() !== jobsite._id.toString());
            await employee.save();
        }
        
        // TODO: Send notification to employee
        
        res.json({ message: 'Employee removed from jobsite successfully' });
    } catch (error) {
        console.error('Error removing employee from jobsite:', error);
        res.status(500).json({ error: 'Failed to remove employee' });
    }
});

// Get jobsite timesheets
router.get('/:id/timesheets', authenticateToken, async (req, res) => {
    try {
        const jobsite = await Jobsite.findById(req.params.id);
        if (!jobsite) {
            return res.status(404).json({ error: 'Jobsite not found' });
        }
        
        // Check if user is authorized to view this jobsite's timesheets
        if (req.user.role === 'client' && jobsite.client.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (req.user.role === 'supervisor' && !jobsite.supervisors.includes(req.user._id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        if (req.user.role === 'employee' && !jobsite.employees.some(e => e.employee.toString() === req.user._id.toString())) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const timesheets = await Timesheet.find({ jobsite: req.params.id })
            .populate('employee', 'firstName lastName email')
            .populate('approvedBy', 'firstName lastName')
            .sort({ date: -1 });
        
        res.json(timesheets);
    } catch (error) {
        console.error('Error fetching jobsite timesheets:', error);
        res.status(500).json({ error: 'Failed to fetch timesheets' });
    }
});

// Add note to jobsite (admin and supervisors)
router.post('/:id/notes', authenticateToken, isSupervisorOrAdmin, async (req, res) => {
    try {
        const { content } = req.body;
        
        const jobsite = await Jobsite.findById(req.params.id);
        if (!jobsite) {
            return res.status(404).json({ error: 'Jobsite not found' });
        }
        
        // Check if supervisor is assigned to this jobsite
        if (req.user.role === 'supervisor' && !jobsite.supervisors.includes(req.user._id)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Add note
        jobsite.notes.push({
            content,
            createdBy: req.user._id,
            createdAt: new Date()
        });
        
        await jobsite.save();
        
        res.json({
            message: 'Note added successfully',
            note: jobsite.notes[jobsite.notes.length - 1]
        });
    } catch (error) {
        console.error('Error adding note to jobsite:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

module.exports = router; 