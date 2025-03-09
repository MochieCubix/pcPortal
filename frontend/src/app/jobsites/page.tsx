'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';
import JobsiteFormModal from '@/components/JobsiteFormModal';

interface Jobsite {
    _id: string;
    name: string;
    client: {
        _id: string;
        firstName: string;
        lastName: string;
        companyName?: string;
    };
    location?: {
        address?: {
            city?: string;
            state?: string;
        }
    };
    status: string;
    startDate: string;
    endDate?: string;
}

export default function JobsitesPage() {
    const { user } = useAuth();
    const [jobsites, setJobsites] = useState<Jobsite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchJobsites = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/jobsites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch jobsites');
            }

            const data = await response.json();
            setJobsites(data);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobsites();
    }, []);

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
                                    Jobsites
                                </h1>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                >
                                    Add Jobsite
                                </button>
                            </div>
                        </header>
                        <main>
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    {loading ? (
                                        <div className="text-center py-10">Loading jobsites...</div>
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
                                                            Client
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Location
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Dates
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {jobsites.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                                                No jobsites found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        jobsites.map((jobsite) => (
                                                            <tr key={jobsite._id}>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {jobsite.name}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-500">
                                                                        {jobsite.client.firstName} {jobsite.client.lastName}
                                                                        {jobsite.client.companyName && (
                                                                            <span className="block text-xs text-gray-400">
                                                                                {jobsite.client.companyName}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-500">
                                                                        {jobsite.location?.address?.city && jobsite.location.address.state
                                                                            ? `${jobsite.location.address.city}, ${jobsite.location.address.state}`
                                                                            : '-'}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                        jobsite.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                        jobsite.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                                        jobsite.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {jobsite.status.charAt(0).toUpperCase() + jobsite.status.slice(1)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-500">
                                                                        <div>Start: {new Date(jobsite.startDate).toLocaleDateString()}</div>
                                                                        {jobsite.endDate && (
                                                                            <div>End: {new Date(jobsite.endDate).toLocaleDateString()}</div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <Link href={`/jobsites/${jobsite._id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                                                                        View
                                                                    </Link>
                                                                    <Link href={`/jobsites/edit/${jobsite._id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                                                        Edit
                                                                    </Link>
                                                                    <button
                                                                        className="text-red-600 hover:text-red-900"
                                                                        onClick={() => {
                                                                            if (window.confirm('Are you sure you want to delete this jobsite?')) {
                                                                                // Handle delete
                                                                            }
                                                                        }}
                                                                    >
                                                                        Delete
                                                                    </button>
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

                {/* Jobsite Form Modal */}
                <JobsiteFormModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchJobsites}
                />
            </ClientLayout>
        </ProtectedLayout>
    );
} 