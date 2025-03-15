'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';
import EmployeeFormModal from '@/components/EmployeeFormModal';
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Employee {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    position?: {
        _id: string;
        name: string;
    };
    supervisor?: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    status?: string;
    hireDate?: string;
}

export default function EmployeesPage() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/api/employees', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch employees');
                }

                const data = await response.json();
                setEmployees(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (user?.role === 'admin' || user?.role === 'supervisor') {
            fetchEmployees();
        }
    }, [user]);

    if (user?.role !== 'admin' && user?.role !== 'supervisor') {
        return (
            <ProtectedLayout>
                <ClientLayout>
                    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                        <div className="bg-white p-8 rounded-lg shadow-md">
                            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                            <p className="mt-2">You do not have permission to view this page.</p>
                            <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
                                Return to Dashboard
                            </Link>
                        </div>
                    </div>
                </ClientLayout>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <ClientLayout>
                <div className="min-h-screen bg-gray-100">
                    <div className="py-10">
                        <header>
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                    Manage Employees
                                </h1>
                                {user?.role === 'admin' && (
                                    <button 
                                        onClick={() => setIsModalOpen(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                    >
                                        Add New Employee
                                    </button>
                                )}
                            </div>
                        </header>
                        <main>
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    {loading ? (
                                        <div className="text-center py-10">Loading employees...</div>
                                    ) : error ? (
                                        <div className="text-center py-10 text-red-500">{error}</div>
                                    ) : (
                                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Name
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Email
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Position
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Supervisor
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {employees.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                                                No employees found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        employees.map((employee) => (
                                                            <tr key={employee._id}>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {employee.firstName} {employee.lastName}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-500">{employee.email}</div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-500">
                                                                        {employee.position?.name || '-'}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-500">
                                                                        {employee.supervisor ? 
                                                                            `${employee.supervisor.firstName} ${employee.supervisor.lastName}` : 
                                                                            '-'}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                        employee.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                        employee.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {employee.status || 'Active'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <div className="flex justify-end space-x-3">
                                                                        <Link 
                                                                            href={`/employees/${employee._id}`} 
                                                                            className="text-blue-600 hover:text-blue-900"
                                                                            title="View"
                                                                        >
                                                                            <EyeIcon className="h-5 w-5" />
                                                                        </Link>
                                                                        {user?.role === 'admin' && (
                                                                            <>
                                                                                <Link 
                                                                                    href={`/employees/edit/${employee._id}`} 
                                                                                    className="text-indigo-600 hover:text-indigo-900"
                                                                                    title="Edit"
                                                                                >
                                                                                    <PencilIcon className="h-5 w-5" />
                                                                                </Link>
                                                                                <button
                                                                                    className="text-red-600 hover:text-red-900"
                                                                                    title="Delete"
                                                                                    onClick={() => {
                                                                                        if (window.confirm('Are you sure you want to delete this employee?')) {
                                                                                            // Handle delete
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <TrashIcon className="h-5 w-5" />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </main>
                    </div>
                </div>

                {/* Employee Form Modal */}
                {user?.role === 'admin' && (
                    <EmployeeFormModal 
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                    />
                )}
            </ClientLayout>
        </ProtectedLayout>
    );
} 