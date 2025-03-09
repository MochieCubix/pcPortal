'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';

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

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const renderAdminDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard title="Clients" value={stats.clients || 0} icon="👥" />
            <DashboardCard title="Employees" value={stats.employees || 0} icon="👷" />
            <DashboardCard title="Supervisors" value={stats.supervisors || 0} icon="👨‍💼" />
            <DashboardCard title="Jobsites" value={stats.jobsites || 0} icon="🏗️" />
            <DashboardCard title="Active Jobsites" value={stats.activeJobsites || 0} icon="🚧" />
            <DashboardCard title="Pending Timesheets" value={stats.pendingTimesheets || 0} icon="⏱️" />
        </div>
    );

    const renderSupervisorDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard title="My Jobsites" value={stats.jobsites || 0} icon="🏗️" />
            <DashboardCard title="Active Jobsites" value={stats.activeJobsites || 0} icon="🚧" />
            <DashboardCard title="My Team" value={stats.employees || 0} icon="👷" />
            <DashboardCard title="Pending Timesheets" value={stats.pendingTimesheets || 0} icon="⏱️" />
        </div>
    );

    const renderEmployeeDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard title="My Jobsites" value={stats.jobsites || 0} icon="🏗️" />
            <DashboardCard title="Pending Timesheets" value={stats.pendingTimesheets || 0} icon="⏱️" />
            <DashboardCard title="Approved Timesheets" value={stats.approvedTimesheets || 0} icon="✅" />
            <DashboardCard title="Hours This Month" value={stats.totalHoursThisMonth || 0} icon="🕒" />
        </div>
    );

    const renderClientDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard title="My Jobsites" value={stats.jobsites || 0} icon="🏗️" />
            <DashboardCard title="Active Jobsites" value={stats.activeJobsites || 0} icon="🚧" />
            <DashboardCard title="Documents" value={stats.documents || 0} icon="📄" />
            <DashboardCard title="Invoices" value={stats.invoices || 0} icon="💰" />
        </div>
    );

    const renderDashboardContent = () => {
        if (loading) return <div className="text-center py-10">Loading dashboard data...</div>;
        if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

        switch (user?.role) {
            case 'admin':
                return renderAdminDashboard();
            case 'supervisor':
                return renderSupervisorDashboard();
            case 'employee':
                return renderEmployeeDashboard();
            case 'client':
                return renderClientDashboard();
            default:
                return <div className="text-center py-10">Welcome to your dashboard!</div>;
        }
    };

    return (
        <ProtectedLayout>
            <ClientLayout>
                <div className="min-h-screen bg-gray-100">
                    <div className="py-10">
                        <header>
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                    Welcome, {user?.firstName} {user?.lastName}
                                </h1>
                                <p className="mt-2 text-sm text-gray-600">
                                    {user?.role === 'admin' && 'Admin Dashboard'}
                                    {user?.role === 'supervisor' && 'Supervisor Dashboard'}
                                    {user?.role === 'employee' && 'Employee Dashboard'}
                                    {user?.role === 'client' && 'Client Dashboard'}
                                </p>
                            </div>
                        </header>
                        <main>
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    {renderDashboardContent()}
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </ClientLayout>
        </ProtectedLayout>
    );
}

interface DashboardCardProps {
    title: string;
    value: number;
    icon: string;
}

function DashboardCard({ title, value, icon }: DashboardCardProps) {
    return (
        <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0 text-3xl">
                        {icon}
                    </div>
                    <div className="ml-5 w-0 flex-1">
                        <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                                {title}
                            </dt>
                            <dd>
                                <div className="text-lg font-medium text-gray-900">
                                    {value}
                                </div>
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
} 