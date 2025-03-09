'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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
        };
        coordinates?: {
            latitude?: number;
            longitude?: number;
        };
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
        contactNumber?: string;
    }>;
    employees: Array<{
        employee: {
            _id: string;
            firstName: string;
            lastName: string;
            position?: {
                name: string;
            };
        };
        assignedDate: string;
        endDate?: string;
    }>;
    notes?: Array<{
        content: string;
        createdBy: {
            firstName: string;
            lastName: string;
        };
        createdAt: string;
    }>;
}

interface Document {
    _id: string;
    title: string;
    type: string;
    fileName: string;
    fileUrl: string;
    uploadDate: string;
}

interface Timesheet {
    _id: string;
    employee: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    date: string;
    totalHours: number;
    status: string;
}

export default function JobsiteDetailPage() {
    const { user } = useAuth();
    const params = useParams();
    const jobsiteId = params.id as string;
    
    const [jobsite, setJobsite] = useState<Jobsite | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'timesheets'>('details');

    useEffect(() => {
        const fetchJobsiteData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                
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
                
                // Fetch jobsite documents
                const documentsResponse = await fetch(`http://localhost:5000/api/jobsites/${jobsiteId}/documents`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (documentsResponse.ok) {
                    const documentsData = await documentsResponse.json();
                    setDocuments(documentsData);
                }
                
                // Fetch jobsite timesheets
                const timesheetsResponse = await fetch(`http://localhost:5000/api/jobsites/${jobsiteId}/timesheets`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (timesheetsResponse.ok) {
                    const timesheetsData = await timesheetsResponse.json();
                    setTimesheets(timesheetsData);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (user && jobsiteId) {
            fetchJobsiteData();
        }
    }, [user, jobsiteId]);

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
                                <div className="md:flex md:items-center md:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                            {loading ? 'Loading...' : jobsite?.name || 'Jobsite Details'}
                                        </h1>
                                        {jobsite && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                {jobsite.location?.address?.city && jobsite.location.address.state
                                                    ? `${jobsite.location.address.city}, ${jobsite.location.address.state}`
                                                    : 'No location specified'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-4 flex md:mt-0 md:ml-4">
                                        <Link
                                            href="/client/jobsites"
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Back to Jobsites
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </header>
                        <main>
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    {loading ? (
                                        <div className="text-center py-10">Loading jobsite details...</div>
                                    ) : error ? (
                                        <div className="text-center py-10 text-red-500">{error}</div>
                                    ) : jobsite ? (
                                        <>
                                            {/* Tabs */}
                                            <div className="border-b border-gray-200 mb-6">
                                                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                                    <button
                                                        onClick={() => setActiveTab('details')}
                                                        className={`${
                                                            activeTab === 'details'
                                                                ? 'border-blue-500 text-blue-600'
                                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                                    >
                                                        Details
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('documents')}
                                                        className={`${
                                                            activeTab === 'documents'
                                                                ? 'border-blue-500 text-blue-600'
                                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                                    >
                                                        Documents
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('timesheets')}
                                                        className={`${
                                                            activeTab === 'timesheets'
                                                                ? 'border-blue-500 text-blue-600'
                                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                                    >
                                                        Timesheets
                                                    </button>
                                                </nav>
                                            </div>

                                            {/* Tab Content */}
                                            {activeTab === 'details' && (
                                                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                                    <div className="px-4 py-5 sm:px-6">
                                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                            Jobsite Information
                                                        </h3>
                                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                                            Details about the jobsite.
                                                        </p>
                                                    </div>
                                                    <div className="border-t border-gray-200">
                                                        <dl>
                                                            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                                <dt className="text-sm font-medium text-gray-500">
                                                                    Name
                                                                </dt>
                                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                                    {jobsite.name}
                                                                </dd>
                                                            </div>
                                                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                                <dt className="text-sm font-medium text-gray-500">
                                                                    Status
                                                                </dt>
                                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                        jobsite.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                        jobsite.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                                        jobsite.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {jobsite.status.charAt(0).toUpperCase() + jobsite.status.slice(1)}
                                                                    </span>
                                                                </dd>
                                                            </div>
                                                            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                                <dt className="text-sm font-medium text-gray-500">
                                                                    Address
                                                                </dt>
                                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                                    {jobsite.location?.address ? (
                                                                        <>
                                                                            {jobsite.location.address.street && <div>{jobsite.location.address.street}</div>}
                                                                            <div>
                                                                                {jobsite.location.address.city && `${jobsite.location.address.city}, `}
                                                                                {jobsite.location.address.state && `${jobsite.location.address.state} `}
                                                                                {jobsite.location.address.zipCode && jobsite.location.address.zipCode}
                                                                            </div>
                                                                            {jobsite.location.address.country && <div>{jobsite.location.address.country}</div>}
                                                                        </>
                                                                    ) : (
                                                                        'No address provided'
                                                                    )}
                                                                </dd>
                                                            </div>
                                                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                                <dt className="text-sm font-medium text-gray-500">
                                                                    Start Date
                                                                </dt>
                                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                                    {new Date(jobsite.startDate).toLocaleDateString()}
                                                                </dd>
                                                            </div>
                                                            {jobsite.endDate && (
                                                                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                                    <dt className="text-sm font-medium text-gray-500">
                                                                        End Date
                                                                    </dt>
                                                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                                        {new Date(jobsite.endDate).toLocaleDateString()}
                                                                    </dd>
                                                                </div>
                                                            )}
                                                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                                <dt className="text-sm font-medium text-gray-500">
                                                                    Description
                                                                </dt>
                                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                                    {jobsite.description || 'No description provided'}
                                                                </dd>
                                                            </div>
                                                            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                                <dt className="text-sm font-medium text-gray-500">
                                                                    Supervisors
                                                                </dt>
                                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                                    {jobsite.supervisors && jobsite.supervisors.length > 0 ? (
                                                                        <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                                                                            {jobsite.supervisors.map(supervisor => (
                                                                                <li key={supervisor._id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                                                                    <div className="w-0 flex-1 flex items-center">
                                                                                        <span className="ml-2 flex-1 w-0 truncate">
                                                                                            {supervisor.firstName} {supervisor.lastName}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="ml-4 flex-shrink-0">
                                                                                        <a href={`mailto:${supervisor.email}`} className="font-medium text-blue-600 hover:text-blue-500">
                                                                                            {supervisor.email}
                                                                                        </a>
                                                                                    </div>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        'No supervisors assigned'
                                                                    )}
                                                                </dd>
                                                            </div>
                                                        </dl>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'documents' && (
                                                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                                    <div className="px-4 py-5 sm:px-6">
                                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                            Jobsite Documents
                                                        </h3>
                                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                                            Documents related to this jobsite.
                                                        </p>
                                                    </div>
                                                    <div className="border-t border-gray-200">
                                                        {documents.length === 0 ? (
                                                            <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                                                                No documents available for this jobsite.
                                                            </div>
                                                        ) : (
                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                            Title
                                                                        </th>
                                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                            Type
                                                                        </th>
                                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                            Date
                                                                        </th>
                                                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                            Actions
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {documents.map((document) => (
                                                                        <tr key={document._id}>
                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                <div className="text-sm font-medium text-gray-900">
                                                                                    {document.title}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                                    document.type === 'invoice' ? 'bg-yellow-100 text-yellow-800' :
                                                                                    document.type === 'timesheet' ? 'bg-blue-100 text-blue-800' :
                                                                                    document.type === 'statement' ? 'bg-purple-100 text-purple-800' :
                                                                                    'bg-green-100 text-green-800'
                                                                                }`}>
                                                                                    {document.type.charAt(0).toUpperCase() + document.type.slice(1)}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                <div className="text-sm text-gray-500">
                                                                                    {new Date(document.uploadDate).toLocaleDateString()}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                                <a 
                                                                                    href={document.fileUrl} 
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                                                                >
                                                                                    View
                                                                                </a>
                                                                                <a 
                                                                                    href={document.fileUrl} 
                                                                                    download={document.fileName}
                                                                                    className="text-green-600 hover:text-green-900"
                                                                                >
                                                                                    Download
                                                                                </a>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'timesheets' && (
                                                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                                    <div className="px-4 py-5 sm:px-6">
                                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                            Jobsite Timesheets
                                                        </h3>
                                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                                            Timesheets submitted for this jobsite.
                                                        </p>
                                                    </div>
                                                    <div className="border-t border-gray-200">
                                                        {timesheets.length === 0 ? (
                                                            <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                                                                No timesheets available for this jobsite.
                                                            </div>
                                                        ) : (
                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                            Employee
                                                                        </th>
                                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                            Date
                                                                        </th>
                                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                            Hours
                                                                        </th>
                                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                            Status
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {timesheets.map((timesheet) => (
                                                                        <tr key={timesheet._id}>
                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                <div className="text-sm font-medium text-gray-900">
                                                                                    {timesheet.employee.firstName} {timesheet.employee.lastName}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                <div className="text-sm text-gray-500">
                                                                                    {new Date(timesheet.date).toLocaleDateString()}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                <div className="text-sm text-gray-500">
                                                                                    {timesheet.totalHours}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                                    timesheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                                                    timesheet.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                                    'bg-yellow-100 text-yellow-800'
                                                                                }`}>
                                                                                    {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
                                            <p className="text-gray-500">Jobsite not found</p>
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