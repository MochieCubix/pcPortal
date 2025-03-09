'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';

interface Jobsite {
    _id: string;
    name: string;
    location?: {
        address?: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
        }
    };
    description?: string;
    status: string;
    startDate: string;
    endDate?: string;
    supervisors: Array<{
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    }>;
}

export default function ClientJobsitesPage() {
    const { user } = useAuth();
    const [jobsites, setJobsites] = useState<Jobsite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchJobsites = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:5000/api/clients/${user?._id}/jobsites`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch jobsites');
                }

                const data = await response.json();
                setJobsites(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (user && (user.role === 'client' || user.role === 'admin')) {
            fetchJobsites();
        }
    }, [user]);

    if (!user || (user.role !== 'client' && user.role !== 'admin')) {
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
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                    My Jobsites
                                </h1>
                            </div>
                        </header>
                        <main>
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    {loading ? (
                                        <div className="text-center py-10">Loading jobsites...</div>
                                    ) : error ? (
                                        <div className="text-center py-10 text-red-500">{error}</div>
                                    ) : jobsites.length === 0 ? (
                                        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
                                            <p className="text-gray-500">No jobsites found</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                            {jobsites.map((jobsite) => (
                                                <div key={jobsite._id} className="bg-white overflow-hidden shadow rounded-lg">
                                                    <div className="px-4 py-5 sm:p-6">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                                                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                </svg>
                                                            </div>
                                                            <div className="ml-5 w-0 flex-1">
                                                                <dl>
                                                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                                                        {jobsite.name}
                                                                    </dt>
                                                                    <dd>
                                                                        <div className="text-lg font-medium text-gray-900">
                                                                            {jobsite.location?.address?.city && jobsite.location.address.state
                                                                                ? `${jobsite.location.address.city}, ${jobsite.location.address.state}`
                                                                                : 'No location specified'}
                                                                        </div>
                                                                    </dd>
                                                                </dl>
                                                            </div>
                                                        </div>
                                                        <div className="mt-5">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                jobsite.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                jobsite.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                                jobsite.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {jobsite.status.charAt(0).toUpperCase() + jobsite.status.slice(1)}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 text-sm text-gray-500">
                                                            <div>Start Date: {new Date(jobsite.startDate).toLocaleDateString()}</div>
                                                            {jobsite.endDate && (
                                                                <div>End Date: {new Date(jobsite.endDate).toLocaleDateString()}</div>
                                                            )}
                                                        </div>
                                                        {jobsite.supervisors && jobsite.supervisors.length > 0 && (
                                                            <div className="mt-3">
                                                                <h4 className="text-sm font-medium text-gray-500">Supervisors:</h4>
                                                                <ul className="mt-1 text-sm text-gray-500">
                                                                    {jobsite.supervisors.map(supervisor => (
                                                                        <li key={supervisor._id}>
                                                                            {supervisor.firstName} {supervisor.lastName} ({supervisor.email})
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        <div className="mt-5">
                                                            <Link 
                                                                href={`/client/jobsites/${jobsite._id}`}
                                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                            >
                                                                View Details
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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