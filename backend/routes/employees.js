const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Jobsite = require('../models/Jobsite');
const Timesheet = require('../models/Timesheet');
const { authenticateToken, isAdmin, isSupervisorOrAdmin } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');

// Get all employees (admin and supervisors only)
router.get('/', authenticateToken, isSupervisorOrAdmin, async (req, res) => {
    try {
        let query = { role: 'employee' };
        
        // If supervisor, only show employees assigned to their jobsites
        if (req.user.role === 'supervisor') {
            const supervisorJobsites = await Jobsite.find({ supervisors: req.user._id });
            const jobsiteIds = supervisorJobsites.map(jobsite => jobsite._id);
            
            const employeesInJobsites = await Jobsite.find({ _id: { $in: jobsiteIds } })
                .distinct('employees.employee');
            
            query._id = { $in: employeesInJobsites };
        }
        
        const employees = await User.find(query)
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .populate('position', 'name')
            .populate('supervisor', 'firstName lastName email')
            .sort({ lastName: 1, firstName: 1 });
        
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Get employee by ID (admin, supervisor, or the employee themselves)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        // Check if user is authorized to view this employee
        if (req.user.role !== 'admin' && 
            req.user.role !== 'supervisor' && 
            req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // If supervisor, check if employee is assigned to their jobsites
        if (req.user.role === 'supervisor' && req.user._id.toString() !== req.params.id) {
            const supervisorJobsites = await Jobsite.find({ supervisors: req.user._id });
            const jobsiteIds = supervisorJobsites.map(jobsite => jobsite._id);
            
            const employeeInJobsites = await Jobsite.findOne({
                _id: { $in: jobsiteIds },
                'employees.employee': req.params.id
            });
            
            if (!employeeInJobsites) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }
        
        const employee = await User.findOne({ _id: req.params.id, role: 'employee' })
            .select('-password -emailVerificationToken -emailVerificationExpires -currentOTP')
            .populate('position', 'name')
            .populate('supervisor', 'firstName lastName email');
        
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        res.json(employee);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

// Create new employee (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
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
        
        // Check if employee already exists
        const existingEmployee = await User.findOne({ email });
        if (existingEmployee) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        
        // Generate a random password
        const tempPassword = Math.random().toString(36).slice(-8);
        
        const newEmployee = new User({
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
        
        await newEmployee.save();
        
        // Log the activity
        const activityLog = new ActivityLog({
            user: req.user._id,
            action: 'create',
            resourceType: 'employee',
            resourceId: newEmployee._id,
            description: `${req.user.firstName} ${req.user.lastName} created employee ${newEmployee.firstName} ${newEmployee.lastName}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
        await activityLog.save();
        
        // TODO: Send welcome email with temporary password
        
        res.status(201).json({
            message: 'Employee created successfully',
            employee: {
                _id: newEmployee._id,
                email: newEmployee.email,
                firstName: newEmployee.firstName,
                lastName: newEmployee.lastName
            }
        });
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

// Update employee (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { 
            email, 
            firstName, 
            lastName, 
            contactNumber, 
            address, 
            position, 
            supervisor, 
            hireDate,
            terminationDate,
            status 
        } = req.body;
        
        // Check if employee exists
        const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        // Check if email is being changed and if it's already in use
        if (email !== employee.email) {
            const existingEmployee = await User.findOne({ email });
            if (existingEmployee) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        
        // Update employee
        employee.email = email || employee.email;
        employee.firstName = firstName || employee.firstName;
        employee.lastName = lastName || employee.lastName;
        employee.contactNumber = contactNumber || employee.contactNumber;
        employee.address = address || employee.address;
        employee.position = position || employee.position;
        employee.supervisor = supervisor || employee.supervisor;
        employee.hireDate = hireDate || employee.hireDate;
        employee.terminationDate = terminationDate || employee.terminationDate;
        employee.status = status || employee.status;
        
        await employee.save();
        
        res.json({
            message: 'Employee updated successfully',
            employee: {
                _id: employee._id,
                email: employee.email,
                firstName: employee.firstName,
                lastName: employee.lastName,
                status: employee.status
            }
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// Delete employee (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const employee = await User.findOneAndDelete({ _id: req.params.id, role: 'employee' });
        
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

// Get employee's jobsites
router.get('/:id/jobsites', authenticateToken, async (req, res) => {
    try {
        // Check if user is authorized to view this employee's jobsites
        if (req.user.role !== 'admin' && 
            req.user.role !== 'supervisor' && 
            req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Find jobsites where employee is assigned
        const jobsites = await Jobsite.find({ 'employees.employee': req.params.id })
            .populate('client', 'firstName lastName companyName')
            .populate('supervisors', 'firstName lastName email')
            .sort({ startDate: -1 });
        
        res.json(jobsites);
    } catch (error) {
        console.error('Error fetching employee jobsites:', error);
        res.status(500).json({ error: 'Failed to fetch jobsites' });
    }
});

// Get employee's timesheets
router.get('/:id/timesheets', authenticateToken, async (req, res) => {
    try {
        // Check if user is authorized to view this employee's timesheets
        if (req.user.role !== 'admin' && 
            req.user.role !== 'supervisor' && 
            req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // If supervisor, check if employee is assigned to their jobsites
        if (req.user.role === 'supervisor' && req.user._id.toString() !== req.params.id) {
            const supervisorJobsites = await Jobsite.find({ supervisors: req.user._id });
            const jobsiteIds = supervisorJobsites.map(jobsite => jobsite._id);
            
            const employeeInJobsites = await Jobsite.findOne({
                _id: { $in: jobsiteIds },
                'employees.employee': req.params.id
            });
            
            if (!employeeInJobsites) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }
        
        const timesheets = await Timesheet.find({ employee: req.params.id })
            .populate('jobsite', 'name client')
            .populate('approvedBy', 'firstName lastName')
            .sort({ date: -1 });
        
        res.json(timesheets);
    } catch (error) {
        console.error('Error fetching employee timesheets:', error);
        res.status(500).json({ error: 'Failed to fetch timesheets' });
    }
});

// Submit timesheet (employee only)
router.post('/:id/timesheets', authenticateToken, async (req, res) => {
    try {
        // Check if user is the employee themselves
        if (req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const { 
            jobsite, 
            date, 
            startTime, 
            endTime, 
            breakDuration, 
            tasks, 
            notes 
        } = req.body;
        
        // Calculate total hours
        const start = new Date(startTime);
        const end = new Date(endTime);
        const breakInHours = (breakDuration || 0) / 60;
        const totalHours = (end - start) / (1000 * 60 * 60) - breakInHours;
        
        const newTimesheet = new Timesheet({
            employee: req.params.id,
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
        console.error('Error submitting timesheet:', error);
        res.status(500).json({ error: 'Failed to submit timesheet' });
    }
});

// Update employee account (employee can update their own account)
router.put('/:id/account', authenticateToken, async (req, res) => {
    try {
        // Check if user is the employee themselves
        if (req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const { contactNumber, address, password } = req.body;
        
        const employee = await User.findById(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        // Update fields
        if (contactNumber) employee.contactNumber = contactNumber;
        if (address) employee.address = address;
        if (password) employee.password = password;
        
        await employee.save();
        
        res.json({ message: 'Account updated successfully' });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ error: 'Failed to update account' });
    }
});

module.exports = router; 