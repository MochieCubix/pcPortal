'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/Layouts/ClientLayout';
import { ChartBarIcon, UsersIcon, CurrencyDollarIcon, ClockIcon, DocumentTextIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface DashboardStats {
    clients?: number;
    employees?: number;
    supervisors?: number;
    jobsites?: number;
    activeJobsites?: number;
    pendingTimesheets?: number;
    approvedTimesheets?: number;
    rejectedTimesheets?: number;
    documents?: number;
    invoices?: number;
    totalHoursThisMonth?: number;
}

interface ActivityItem {
    id: string;
    type: 'client' | 'supervisor' | 'invoice' | 'jobsite' | 'email' | 'pdf';
    user: string;
    action: string;
    target: string;
    timestamp: string;
    company?: string;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [filteredActivity, setFilteredActivity] = useState<ActivityItem[]>([]);
    
    // Filter states
    const [dateFilter, setDateFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [companyFilter, setCompanyFilter] = useState('all');
    const [companies, setCompanies] = useState<string[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                setLoading(true);
                let endpoint = '';

                // Determine which dashboard endpoint to use based on user role
                if (user.role === 'admin') {
                    endpoint = '/api/dashboard/admin';
                } else if (user.role === 'supervisor') {
                    endpoint = '/api/dashboard/supervisor';
                } else if (user.role === 'employee') {
                    endpoint = '/api/dashboard/employee';
                } else if (user.role === 'client') {
                    endpoint = '/api/dashboard/client';
                }

                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:5000${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch dashboard data');
                }

                const data = await response.json();
                setStats(data.counts || {});
                
                // Fetch recent activity
                const activityResponse = await fetch(`http://localhost:5000/api/activity?limit=20`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (activityResponse.ok) {
                    const activityData = await activityResponse.json();
                    if (activityData.activities && activityData.activities.length > 0) {
                        setRecentActivity(activityData.activities);
                        setFilteredActivity(activityData.activities);
                        
                        // Extract unique companies for filtering
                        const uniqueCompanies = [...new Set(activityData.activities
                            .filter(item => item.company)
                            .map(item => item.company))] as string[];
                        setCompanies(uniqueCompanies);
                    } else {
                        // If no activities returned, use mock data
                        createMockActivityData();
                    }
                } else {
                    // If API call fails, use mock data
                    createMockActivityData();
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                // If an error occurs, use mock data for activity
                createMockActivityData();
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);
    
    // Function to create mock activity data
    const createMockActivityData = () => {
        const mockActivity: ActivityItem[] = [
            {
                id: '1',
                type: 'client',
                user: 'John Smith',
                action: 'added a new client',
                target: 'Acme Corp',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                company: 'Acme Corp'
            },
            {
                id: '2',
                type: 'jobsite',
                user: 'Sarah Johnson',
                action: 'created a new jobsite',
                target: 'Downtown Project',
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                company: 'TechStart Inc'
            },
            {
                id: '3',
                type: 'invoice',
                user: 'Mike Williams',
                action: 'generated an invoice',
                target: 'INV-2023-056',
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                company: 'Global Services'
            },
            {
                id: '4',
                type: 'email',
                user: 'Emily Davis',
                action: 'sent an email to',
                target: 'client@example.com',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                company: 'Bright Future LLC'
            },
            {
                id: '5',
                type: 'pdf',
                user: 'Robert Johnson',
                action: 'parsed a PDF document',
                target: 'Contract-2023.pdf',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                company: 'Acme Corp'
            },
            {
                id: '6',
                type: 'supervisor',
                user: 'Jennifer Lee',
                action: 'assigned a supervisor to',
                target: 'North Site',
                timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                company: 'TechStart Inc'
            }
        ];
        
        setRecentActivity(mockActivity);
        setFilteredActivity(mockActivity);
        
        // Extract unique companies for filtering
        const uniqueCompanies = [...new Set(mockActivity
            .filter(item => item.company)
            .map(item => item.company))] as string[];
        setCompanies(uniqueCompanies);
    };

    // Apply filters when any filter changes
    useEffect(() => {
        let filtered = [...recentActivity];
        
        // Apply date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const cutoff = new Date();
            
            switch (dateFilter) {
                case 'today':
                    cutoff.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    cutoff.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    cutoff.setMonth(now.getMonth() - 1);
                    break;
            }
            
            filtered = filtered.filter(item => new Date(item.timestamp) >= cutoff);
        }
        
        // Apply type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(item => item.type === typeFilter);
        }
        
        // Apply company filter
        if (companyFilter !== 'all') {
            filtered = filtered.filter(item => item.company === companyFilter);
        }
        
        setFilteredActivity(filtered);
    }, [dateFilter, typeFilter, companyFilter, recentActivity]);

    // Function to fetch activity with filters
    const fetchFilteredActivity = async () => {
        try {
            setLoading(true);
            
            let queryParams = new URLSearchParams();
            
            // Add date filters
            if (dateFilter !== 'all') {
                const now = new Date();
                let startDate;
                
                switch (dateFilter) {
                    case 'today':
                        startDate = new Date(now);
                        startDate.setHours(0, 0, 0, 0);
                        break;
                    case 'week':
                        startDate = new Date(now);
                        startDate.setDate(now.getDate() - 7);
                        break;
                    case 'month':
                        startDate = new Date(now);
                        startDate.setMonth(now.getMonth() - 1);
                        break;
                }
                
                if (startDate) {
                    queryParams.append('startDate', startDate.toISOString());
                }
            }
            
            // Add resource type filter
            if (typeFilter !== 'all') {
                // Map frontend type to backend resourceType
                const resourceTypeMap: Record<string, string> = {
                    'client': 'client',
                    'supervisor': 'supervisor',
                    'invoice': 'invoice',
                    'jobsite': 'jobsite',
                    'pdf': 'document',
                    'email': 'email'
                };
                
                const resourceType = resourceTypeMap[typeFilter];
                if (resourceType) {
                    queryParams.append('resourceType', resourceType);
                }
            }
            
            // Set limit
            queryParams.append('limit', '50');
            
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/activity?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.activities && data.activities.length > 0) {
                    setRecentActivity(data.activities);
                    
                    // Apply company filter client-side
                    let filtered = data.activities;
                    if (companyFilter !== 'all') {
                        filtered = filtered.filter((item: ActivityItem) => item.company === companyFilter);
                    }
                    
                    setFilteredActivity(filtered);
                    
                    // Extract unique companies for filtering
                    const uniqueCompanies = [...new Set(data.activities
                        .filter((item: ActivityItem) => item.company)
                        .map((item: ActivityItem) => item.company))] as string[];
                    setCompanies(uniqueCompanies);
                }
            }
        } catch (err) {
            console.error('Error fetching filtered activity:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch filtered activity when filters change
    useEffect(() => {
        if (user) {
            fetchFilteredActivity();
        }
    }, [dateFilter, typeFilter, user]);

    const getStatsWithIcons = () => {
        const statsWithIcons = [];
        
        if (user?.role === 'admin') {
            statsWithIcons.push(
                { name: 'Clients', value: stats.clients || 0, icon: UsersIcon, color: 'bg-blue-500' },
                { name: 'Employees', value: stats.employees || 0, icon: UsersIcon, color: 'bg-green-500' },
                { name: 'Supervisors', value: stats.supervisors || 0, icon: UsersIcon, color: 'bg-purple-500' },
                { name: 'Active Jobsites', value: stats.activeJobsites || 0, icon: BuildingOfficeIcon, color: 'bg-yellow-500' }
            );
        } else if (user?.role === 'supervisor') {
            statsWithIcons.push(
                { name: 'My Jobsites', value: stats.jobsites || 0, icon: BuildingOfficeIcon, color: 'bg-blue-500' },
                { name: 'Active Jobsites', value: stats.activeJobsites || 0, icon: BuildingOfficeIcon, color: 'bg-green-500' },
                { name: 'My Team', value: stats.employees || 0, icon: UsersIcon, color: 'bg-purple-500' },
                { name: 'Pending Timesheets', value: stats.pendingTimesheets || 0, icon: ClockIcon, color: 'bg-yellow-500' }
            );
        } else if (user?.role === 'employee') {
            statsWithIcons.push(
                { name: 'My Jobsites', value: stats.jobsites || 0, icon: BuildingOfficeIcon, color: 'bg-blue-500' },
                { name: 'Pending Timesheets', value: stats.pendingTimesheets || 0, icon: ClockIcon, color: 'bg-green-500' },
                { name: 'Approved Timesheets', value: stats.approvedTimesheets || 0, icon: DocumentTextIcon, color: 'bg-purple-500' },
                { name: 'Hours This Month', value: stats.totalHoursThisMonth || 0, icon: ClockIcon, color: 'bg-yellow-500' }
            );
        } else if (user?.role === 'client') {
            statsWithIcons.push(
                { name: 'My Jobsites', value: stats.jobsites || 0, icon: BuildingOfficeIcon, color: 'bg-blue-500' },
                { name: 'Active Jobsites', value: stats.activeJobsites || 0, icon: BuildingOfficeIcon, color: 'bg-green-500' },
                { name: 'Documents', value: stats.documents || 0, icon: DocumentTextIcon, color: 'bg-purple-500' },
                { name: 'Invoices', value: stats.invoices || 0, icon: CurrencyDollarIcon, color: 'bg-yellow-500' }
            );
        }
        
        return statsWithIcons;
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'client':
                return <UsersIcon className="h-5 w-5 text-blue-500" />;
            case 'supervisor':
                return <UsersIcon className="h-5 w-5 text-purple-500" />;
            case 'invoice':
                return <CurrencyDollarIcon className="h-5 w-5 text-green-500" />;
            case 'jobsite':
                return <BuildingOfficeIcon className="h-5 w-5 text-yellow-500" />;
            case 'email':
                return <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
            case 'pdf':
                return <DocumentTextIcon className="h-5 w-5 text-red-500" />;
            default:
                return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.round(diffMs / 1000);
        const diffMin = Math.round(diffSec / 60);
        const diffHour = Math.round(diffMin / 60);
        const diffDay = Math.round(diffHour / 24);
        
        if (diffSec < 60) {
            return 'just now';
        } else if (diffMin < 60) {
            return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        } else if (diffHour < 24) {
            return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        } else if (diffDay < 7) {
            return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <ClientLayout>
            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                Welcome, {user?.firstName} {user?.lastName}
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">
                                {user?.role === 'admin' && 'Admin Dashboard'}
                                {user?.role === 'supervisor' && 'Supervisor Dashboard'}
                                {user?.role === 'employee' && 'Employee Dashboard'}
                                {user?.role === 'client' && 'Client Dashboard'}
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0">
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                                        activeTab === 'overview'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                                        activeTab === 'activity'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    Activity
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="mt-3 text-gray-600">Loading dashboard data...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">{error}</div>
                    ) : (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                                {getStatsWithIcons().map((stat, index) => (
                                    <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
                                        <div className="p-5">
                                            <div className="flex items-center">
                                                <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                                                    <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                                                </div>
                                                <div className="ml-5 w-0 flex-1">
                                                    <dl>
                                                        <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                                                        <dd>
                                                            <div className="text-lg font-medium text-gray-900">{stat.value}</div>
                                                        </dd>
                                                    </dl>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Main content based on active tab */}
                            {activeTab === 'overview' && (
                                <div className="bg-white shadow rounded-lg p-6 mb-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                                        <button
                                            onClick={() => setActiveTab('activity')}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            View all
                                        </button>
                                    </div>
                                    <div className="flow-root">
                                        <ul className="-my-5 divide-y divide-gray-200">
                                            {filteredActivity.slice(0, 5).map((item) => (
                                                <li key={item.id} className="py-4">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex-shrink-0">
                                                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                                {getActivityIcon(item.type)}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                <span className="font-medium">{item.user}</span> <span className="font-normal">{item.action}</span> {item.target}
                                                            </p>
                                                            <p className="text-sm text-gray-500 truncate">
                                                                {item.company && `${item.company} • `}{formatDate(item.timestamp)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="bg-white shadow rounded-lg p-6 mb-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-medium text-gray-900">Activity Log</h2>
                                        <button
                                            onClick={fetchFilteredActivity}
                                            className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                    
                                    {/* Filters */}
                                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                                                Date Range
                                            </label>
                                            <select
                                                id="date-filter"
                                                value={dateFilter}
                                                onChange={(e) => setDateFilter(e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            >
                                                <option value="all">All Time</option>
                                                <option value="today">Today</option>
                                                <option value="week">Last 7 Days</option>
                                                <option value="month">Last 30 Days</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                                                Activity Type
                                            </label>
                                            <select
                                                id="type-filter"
                                                value={typeFilter}
                                                onChange={(e) => setTypeFilter(e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            >
                                                <option value="all">All Types</option>
                                                <option value="client">Client</option>
                                                <option value="supervisor">Supervisor</option>
                                                <option value="invoice">Invoice</option>
                                                <option value="jobsite">Jobsite</option>
                                                <option value="email">Email</option>
                                                <option value="pdf">PDF</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="company-filter" className="block text-sm font-medium text-gray-700 mb-1">
                                                Company
                                            </label>
                                            <select
                                                id="company-filter"
                                                value={companyFilter}
                                                onChange={(e) => setCompanyFilter(e.target.value)}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                disabled={companies.length === 0}
                                            >
                                                <option value="all">All Companies</option>
                                                {companies.map((company) => (
                                                    <option key={company} value={company}>
                                                        {company}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    {/* Activity List */}
                                    <div className="flow-root">
                                        {loading ? (
                                            <div className="text-center py-10">
                                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                                                <p className="mt-3 text-gray-600">Loading activity data...</p>
                                            </div>
                                        ) : filteredActivity.length > 0 ? (
                                            <ul className="-my-5 divide-y divide-gray-200">
                                                {filteredActivity.map((item) => (
                                                    <li key={item.id} className="py-4">
                                                        <div className="flex items-center space-x-4">
                                                            <div className="flex-shrink-0">
                                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                                    {getActivityIcon(item.type)}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                                    <span className="font-medium">{item.user}</span> <span className="font-normal">{item.action}</span> {item.target}
                                                                </p>
                                                                <p className="text-sm text-gray-500 truncate">
                                                                    {item.company && `${item.company} • `}{formatDate(item.timestamp)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-center py-10 text-gray-500">
                                                No activity found matching your filters.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </ClientLayout>
    );
} 