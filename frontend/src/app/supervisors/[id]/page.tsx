'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';

interface Supervisor {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    contactNumber?: string;
    position?: {
        _id: string;
        name: string;
    };
    hireDate?: string;
    terminationDate?: string;
    status?: string;
    address?: string;
    createdAt?: string;
}

export default function SupervisorDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { user } = useAuth();
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSupervisor = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:5000/api/supervisors/${params.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch supervisor details');
                }

                const data = await response.json();
                setSupervisor(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (user?.role === 'admin') {
            fetchSupervisor();
        }
    }, [user, params.id]);

    if (user?.role !== 'admin') {
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
                                    Supervisor Details
                                </h1>
                                <div className="flex space-x-3">
                                    <Link
                                        href={`/supervisors/edit/${params.id}`}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                                    >
                                        Edit Supervisor
                                    </Link>
                                    <Link
                                        href="/supervisors"
                                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                                    >
                                        Back to List
                                    </Link>
                                </div>
                            </div>
                        </header>
                        <main>
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    {loading ? (
                                        <div className="text-center py-10">Loading supervisor details...</div>
                                    ) : error ? (
                                        <div className="text-center py-10 text-red-500">{error}</div>
                                    ) : supervisor ? (
                                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                            <div className="px-4 py-5 sm:px-6">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                    {supervisor.firstName} {supervisor.lastName}
                                                </h3>
                                                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                                    {supervisor.position?.name || 'No position assigned'}
                                                </p>
                                            </div>
                                            <div className="border-t border-gray-200">
                                                <dl>
                                                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Full name</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            {supervisor.firstName} {supervisor.lastName}
                                                        </dd>
                                                    </div>
                                                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Email address</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            {supervisor.email}
                                                        </dd>
                                                    </div>
                                                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Contact Number</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            {supervisor.contactNumber || 'No contact number provided'}
                                                        </dd>
                                                    </div>
                                                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Position</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            {supervisor.position?.name || 'No position assigned'}
                                                        </dd>
                                                    </div>
                                                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                supervisor.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                supervisor.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {supervisor.status || 'Active'}
                                                            </span>
                                                        </dd>
                                                    </div>
                                                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Hire Date</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            {supervisor.hireDate ? new Date(supervisor.hireDate).toLocaleDateString() : 'No hire date provided'}
                                                        </dd>
                                                    </div>
                                                    {supervisor.terminationDate && (
                                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                            <dt className="text-sm font-medium text-gray-500">Termination Date</dt>
                                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                                {new Date(supervisor.terminationDate).toLocaleDateString()}
                                                            </dd>
                                                        </div>
                                                    )}
                                                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            {supervisor.address || 'No address provided'}
                                                        </dd>
                                                    </div>
                                                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Created At</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            {supervisor.createdAt ? new Date(supervisor.createdAt).toLocaleString() : 'Unknown'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-red-500">Supervisor not found</div>
                                    )}
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </ClientLayout>
        </ProtectedLayout>
    );
} 