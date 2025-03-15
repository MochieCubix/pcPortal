'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import { ChevronRightIcon, HomeIcon, PencilIcon } from '@heroicons/react/24/outline';
import SupervisorAssignmentModal from '@/components/SupervisorAssignmentModal';
import JobsiteFormModal from '@/components/JobsiteFormModal';
import { AddInvoiceModal } from '@/components/AddInvoiceModal';

interface Supervisor {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface Jobsite {
    _id: string;
    name: string;
    client?: {
        _id?: string;
        firstName?: string;
        lastName?: string;
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
    supervisors?: Supervisor[];
    description?: string;
}

interface Invoice {
    _id: string;
    invoiceNumber: string;
    date: string;
    amount: number;
    status: 'pending' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    jobsite?: {
        _id: string;
        name: string;
    };
    client?: {
        _id: string;
        firstName: string;
        lastName: string;
        companyName?: string;
    };
}

export default function JobsiteDetailPage() {
    const params = useParams();
    const jobsiteId = params.id as string;
    const router = useRouter();
    const { user } = useAuth();
    const [jobsite, setJobsite] = useState<Jobsite | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);

    useEffect(() => {
        const fetchJobsiteDetails = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                // Check if we should open edit modal from URL, but only on initial load
                const searchParams = new URLSearchParams(window.location.search);
                if (searchParams.get('edit') === 'true' && !isEditModalOpen) {
                    // Use setTimeout to ensure this happens after the component is fully mounted
                    setTimeout(() => {
                        setIsEditModalOpen(true);
                    }, 100);
                }

                // Fetch jobsite details
                const jobsiteResponse = await fetch(`http://localhost:5000/api/jobsites/${jobsiteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!jobsiteResponse.ok) {
                    throw new Error('Failed to fetch jobsite details');
                }

                const jobsiteData = await jobsiteResponse.json();
                setJobsite(jobsiteData);

                // Fetch invoices for this jobsite
                const invoicesResponse = await fetch(`http://localhost:5000/api/invoices?jobsite=${jobsiteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!invoicesResponse.ok) {
                    throw new Error('Failed to fetch invoices');
                }

                const invoicesData = await invoicesResponse.json();
                setInvoices(invoicesData);
                setError('');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                console.error('Error fetching jobsite details:', err);
            } finally {
                setLoading(false);
            }
        };

        if (jobsiteId) {
            fetchJobsiteDetails();
        }
    }, [jobsiteId, router]);

    const handleAssignSupervisors = () => {
        if (jobsite) {
            setIsSupervisorModalOpen(true);
        }
    };

    const refreshJobsiteData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`http://localhost:5000/api/jobsites/${jobsiteId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setJobsite(data);
            }
        } catch (err) {
            console.error('Error refreshing jobsite data:', err);
        }
    };

    const handleAddInvoice = () => {
        if (jobsite && jobsite.client) {
            setIsAddInvoiceModalOpen(true);
        } else {
            setError('Cannot add invoice: Missing client information');
        }
    };

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
                    <div className="py-6 sm:py-10">
                        <header>
                            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="md:flex md:items-center md:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-gray-900 break-words">
                                            {loading ? 'Loading...' : jobsite?.name || 'Jobsite Details'}
                                        </h1>
                                        {jobsite?.client && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                Client: {jobsite.client.firstName} {jobsite.client.lastName}
                                                {jobsite.client.companyName && ` (${jobsite.client.companyName})`}
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-4 flex md:mt-0 md:ml-4">
                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            <PencilIcon className="h-4 w-4 mr-1" />
                                            Edit Jobsite
                                        </button>
                                        <button
                                            onClick={handleAssignSupervisors}
                                            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Assign Supervisors
                                        </button>
                                        <button
                                            onClick={handleAddInvoice}
                                            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                            Add Invoice
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <main>
                            <div className="max-w-full mx-auto sm:px-6 lg:px-8">
                                {loading ? (
                                    <div className="text-center py-10">Loading jobsite details...</div>
                                ) : error ? (
                                    <div className="text-center py-10 text-red-500">{error}</div>
                                ) : (
                                    <div className="px-4 py-6 sm:py-8 sm:px-0">
                                        {/* Jobsite Details Card */}
                                        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                                            <div className="px-4 py-5 sm:px-6">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900">Jobsite Information</h3>
                                                <p className="mt-1 max-w-2xl text-sm text-gray-500">Details about the jobsite.</p>
                                            </div>
                                            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                                                <dl className="sm:divide-y sm:divide-gray-200">
                                                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                jobsite?.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                jobsite?.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                                jobsite?.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {jobsite?.status ? `${jobsite.status.charAt(0).toUpperCase()}${jobsite.status.slice(1)}` : 'Unknown'}
                                                            </span>
                                                        </dd>
                                                    </div>
                                                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Location</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            {jobsite?.location?.address?.city && jobsite.location.address.state
                                                                ? `${jobsite.location.address.city}, ${jobsite.location.address.state}`
                                                                : 'No location information'}
                                                        </dd>
                                                    </div>
                                                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Dates</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            <div>Start: {jobsite?.startDate ? new Date(jobsite.startDate).toLocaleDateString() : 'Not set'}</div>
                                                            {jobsite?.endDate && (
                                                                <div>End: {new Date(jobsite.endDate).toLocaleDateString()}</div>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                        <dt className="text-sm font-medium text-gray-500">Supervisors</dt>
                                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                            {jobsite?.supervisors && jobsite.supervisors.length > 0 ? (
                                                                <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                                                                    {jobsite.supervisors
                                                                        .filter(s => s && s.firstName && s.lastName)
                                                                        .map((supervisor) => (
                                                                            <li key={supervisor._id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                                                                <div className="w-0 flex-1 flex items-center">
                                                                                    <span className="ml-2 flex-1 w-0 truncate">
                                                                                        {supervisor.firstName} {supervisor.lastName} ({supervisor.email})
                                                                                    </span>
                                                                                </div>
                                                                            </li>
                                                                        ))}
                                                                </ul>
                                                            ) : (
                                                                <span className="text-yellow-500">No supervisors assigned</span>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    {jobsite?.description && (
                                                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                            <dt className="text-sm font-medium text-gray-500">Description</dt>
                                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                                {jobsite.description}
                                                            </dd>
                                                        </div>
                                                    )}
                                                </dl>
                                            </div>
                                        </div>

                                        {/* Invoices Section */}
                                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-lg leading-6 font-medium text-gray-900">Invoices</h3>
                                                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Invoices associated with this jobsite.</p>
                                                </div>
                                                <button 
                                                    onClick={() => setIsAddInvoiceModalOpen(true)}
                                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                                >
                                                    Add Invoice
                                                </button>
                                            </div>
                                            <div className="border-t border-gray-200">
                                                {invoices.length === 0 ? (
                                                    <div className="text-center py-6 text-gray-500">
                                                        No invoices found for this jobsite
                                                    </div>
                                                ) : (
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Invoice Number
                                                                </th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Date
                                                                </th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                    Amount
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
                                                            {invoices.map((invoice) => (
                                                                <tr key={invoice._id}>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm font-medium text-gray-900">
                                                                            {invoice.invoiceNumber}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-500">
                                                                            {new Date(invoice.date).toLocaleDateString()}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900">
                                                                            ${invoice.amount.toFixed(2)}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                                            invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                        }`}>
                                                                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                        <Link href={`/invoices/${invoice._id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                                                                            View
                                                                        </Link>
                                                                        <Link href={`/invoices/edit/${invoice._id}`} className="text-indigo-600 hover:text-indigo-900">
                                                                            Edit
                                                                        </Link>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </main>
                        {/* Development Info */}
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8 border-t border-gray-200">
                            <div className="text-sm text-gray-500">
                                <h4 className="font-medium">Development Information</h4>
                                <p>Page: Jobsite Profile</p>
                                <p>File: frontend/src/app/jobsites/[id]/page.tsx</p>
                                <p>Related Components:</p>
                                <ul className="list-disc list-inside ml-4">
                                    <li>JobsiteFormModal (frontend/src/components/JobsiteFormModal.tsx)</li>
                                    <li>SupervisorAssignmentModal (frontend/src/components/SupervisorAssignmentModal.tsx)</li>
                                    <li>AddInvoiceModal (frontend/src/components/AddInvoiceModal.tsx)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Supervisor Assignment Modal */}
                {isSupervisorModalOpen && jobsite && (
                    <SupervisorAssignmentModal
                        isOpen={isSupervisorModalOpen}
                        onClose={() => setIsSupervisorModalOpen(false)}
                        jobsiteId={jobsiteId}
                        jobsiteName={jobsite.name}
                        currentSupervisors={jobsite.supervisors || []}
                        onSuccess={refreshJobsiteData}
                    />
                )}

                {/* Edit Jobsite Modal */}
                {isEditModalOpen && jobsite && (
                    <JobsiteFormModal
                        isOpen={isEditModalOpen}
                        onClose={() => {
                            setIsEditModalOpen(false);
                            // Remove the edit parameter from URL
                            const url = new URL(window.location.href);
                            url.searchParams.delete('edit');
                            window.history.replaceState({}, '', url.toString());
                        }}
                        clientId={jobsite.client?._id}
                        jobsiteId={jobsiteId}
                        jobsiteData={jobsite}
                        onSuccess={() => {
                            setIsEditModalOpen(false);
                            // Remove the edit parameter from URL
                            const url = new URL(window.location.href);
                            url.searchParams.delete('edit');
                            window.history.replaceState({}, '', url.toString());
                            refreshJobsiteData();
                        }}
                    />
                )}

                {/* Add Invoice Modal */}
                {jobsite && jobsite.client && (
                    <AddInvoiceModal
                        isOpen={isAddInvoiceModalOpen}
                        onClose={() => setIsAddInvoiceModalOpen(false)}
                        clientId={jobsite.client._id || ''}
                        jobsiteId={jobsiteId}
                        onSuccess={() => {
                            setIsAddInvoiceModalOpen(false);
                            refreshJobsiteData();
                        }}
                    />
                )}
            </ClientLayout>
        </ProtectedLayout>
    );
} 