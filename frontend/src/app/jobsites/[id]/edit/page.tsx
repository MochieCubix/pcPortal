'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import Link from 'next/link';

interface JobsiteFormData {
    name: string;
    description?: string;
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
    client: string;
    supervisors: string[];
    startDate: string;
    endDate?: string;
    status: 'active' | 'completed' | 'on-hold' | 'cancelled';
    budget?: number;
    notes?: string[];
}

export default function EditJobsitePage() {
    const router = useRouter();
    const params = useParams();
    const jobsiteId = params.id as string;
    const { user } = useAuth();
    const [formData, setFormData] = useState<JobsiteFormData>({
        name: '',
        description: '',
        location: {
            address: {
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: ''
            },
            coordinates: {
                latitude: undefined,
                longitude: undefined
            }
        },
        client: '',
        supervisors: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'active',
        budget: undefined,
        notes: []
    });
    const [clients, setClients] = useState<any[]>([]);
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            router.push('/dashboard');
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                // Fetch jobsite data
                const jobsiteResponse = await fetch(`http://localhost:5000/api/jobsites/${jobsiteId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!jobsiteResponse.ok) {
                    throw new Error('Failed to fetch jobsite data');
                }

                const jobsiteData = await jobsiteResponse.json();
                
                // Fetch clients
                const clientsResponse = await fetch('http://localhost:5000/api/clients', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!clientsResponse.ok) {
                    throw new Error('Failed to fetch clients');
                }

                const clientsData = await clientsResponse.json();
                setClients(clientsData);

                // Fetch supervisors
                const supervisorsResponse = await fetch('http://localhost:5000/api/supervisors', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!supervisorsResponse.ok) {
                    throw new Error('Failed to fetch supervisors');
                }

                const supervisorsData = await supervisorsResponse.json();
                setSupervisors(supervisorsData);

                // Set form data from jobsite data
                setFormData({
                    name: jobsiteData.name || '',
                    description: jobsiteData.description || '',
                    location: jobsiteData.location || {
                        address: {
                            street: '',
                            city: '',
                            state: '',
                            zipCode: '',
                            country: ''
                        },
                        coordinates: {
                            latitude: undefined,
                            longitude: undefined
                        }
                    },
                    client: jobsiteData.client?._id || '',
                    supervisors: jobsiteData.supervisors?.map((s: any) => s._id) || [],
                    startDate: jobsiteData.startDate ? new Date(jobsiteData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    endDate: jobsiteData.endDate ? new Date(jobsiteData.endDate).toISOString().split('T')[0] : '',
                    status: jobsiteData.status || 'active',
                    budget: jobsiteData.budget,
                    notes: jobsiteData.notes || []
                });
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load jobsite data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, router, jobsiteId]);

    const handleAddNote = () => {
        if (note.trim()) {
            setFormData({
                ...formData,
                notes: [...(formData.notes || []), note]
            });
            setNote('');
        }
    };

    const handleRemoveNote = (index: number) => {
        const updatedNotes = [...(formData.notes || [])];
        updatedNotes.splice(index, 1);
        setFormData({
            ...formData,
            notes: updatedNotes
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch(`http://localhost:5000/api/jobsites/${jobsiteId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update jobsite');
            }

            setSuccess('Jobsite updated successfully');
            
            // Redirect after a short delay
            setTimeout(() => {
                router.push(`/jobsites/${jobsiteId}`);
            }, 1500);
        } catch (error) {
            console.error('Error updating jobsite:', error);
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user || user.role !== 'admin') {
        return (
            <ProtectedLayout>
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-lg shadow-md">
                        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                        <p className="mt-2">You do not have permission to view this page.</p>
                        <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <div className="min-h-screen bg-gray-100">
                <div className="py-10">
                    <header>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h1 className="text-3xl font-bold leading-tight text-gray-900">Edit Jobsite</h1>
                        </div>
                    </header>
                    <main>
                        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                            <div className="px-4 py-8 sm:px-0">
                                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                    {loading ? (
                                        <div className="p-6 text-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                                            <p className="mt-4 text-gray-600">Loading jobsite data...</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-6 p-6">
                                            {error && (
                                                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                                                    <div className="flex">
                                                        <div className="flex-shrink-0">
                                                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm text-red-700">{error}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {success && (
                                                <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                                                    <div className="flex">
                                                        <div className="flex-shrink-0">
                                                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm text-green-700">{success}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                                <div className="sm:col-span-3">
                                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                        Jobsite Name
                                                    </label>
                                                    <div className="mt-1">
                                                        <input
                                                            type="text"
                                                            name="name"
                                                            id="name"
                                                            value={formData.name}
                                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-3">
                                                    <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                                                        Client
                                                    </label>
                                                    <div className="mt-1">
                                                        <select
                                                            id="client"
                                                            name="client"
                                                            value={formData.client}
                                                            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            required
                                                        >
                                                            <option value="">Select a client</option>
                                                            {clients.map((client) => (
                                                                <option key={client._id} value={client._id}>
                                                                    {client.companyName || `${client.firstName} ${client.lastName}`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-6">
                                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                                        Description
                                                    </label>
                                                    <div className="mt-1">
                                                        <textarea
                                                            id="description"
                                                            name="description"
                                                            rows={3}
                                                            value={formData.description || ''}
                                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-6">
                                                    <h3 className="text-lg font-medium leading-6 text-gray-900">Location</h3>
                                                </div>

                                                <div className="sm:col-span-6">
                                                    <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                                                        Street Address
                                                    </label>
                                                    <div className="mt-1">
                                                        <input
                                                            type="text"
                                                            name="street"
                                                            id="street"
                                                            value={formData.location?.address?.street || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                location: {
                                                                    ...formData.location,
                                                                    address: {
                                                                        ...formData.location?.address,
                                                                        street: e.target.value
                                                                    }
                                                                }
                                                            })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-2">
                                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                                        City
                                                    </label>
                                                    <div className="mt-1">
                                                        <input
                                                            type="text"
                                                            name="city"
                                                            id="city"
                                                            value={formData.location?.address?.city || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                location: {
                                                                    ...formData.location,
                                                                    address: {
                                                                        ...formData.location?.address,
                                                                        city: e.target.value
                                                                    }
                                                                }
                                                            })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-2">
                                                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                                                        State / Province
                                                    </label>
                                                    <div className="mt-1">
                                                        <input
                                                            type="text"
                                                            name="state"
                                                            id="state"
                                                            value={formData.location?.address?.state || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                location: {
                                                                    ...formData.location,
                                                                    address: {
                                                                        ...formData.location?.address,
                                                                        state: e.target.value
                                                                    }
                                                                }
                                                            })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-2">
                                                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                                                        ZIP / Postal Code
                                                    </label>
                                                    <div className="mt-1">
                                                        <input
                                                            type="text"
                                                            name="zipCode"
                                                            id="zipCode"
                                                            value={formData.location?.address?.zipCode || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                location: {
                                                                    ...formData.location,
                                                                    address: {
                                                                        ...formData.location?.address,
                                                                        zipCode: e.target.value
                                                                    }
                                                                }
                                                            })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-3">
                                                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                                                        Country
                                                    </label>
                                                    <div className="mt-1">
                                                        <input
                                                            type="text"
                                                            name="country"
                                                            id="country"
                                                            value={formData.location?.address?.country || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                location: {
                                                                    ...formData.location,
                                                                    address: {
                                                                        ...formData.location?.address,
                                                                        country: e.target.value
                                                                    }
                                                                }
                                                            })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-3">
                                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                                        Status
                                                    </label>
                                                    <div className="mt-1">
                                                        <select
                                                            id="status"
                                                            name="status"
                                                            value={formData.status}
                                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="completed">Completed</option>
                                                            <option value="on-hold">On Hold</option>
                                                            <option value="cancelled">Cancelled</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-3">
                                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                                                        Start Date
                                                    </label>
                                                    <div className="mt-1">
                                                        <input
                                                            type="date"
                                                            name="startDate"
                                                            id="startDate"
                                                            value={formData.startDate}
                                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-3">
                                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                                                        End Date (Optional)
                                                    </label>
                                                    <div className="mt-1">
                                                        <input
                                                            type="date"
                                                            name="endDate"
                                                            id="endDate"
                                                            value={formData.endDate || ''}
                                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-3">
                                                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                                                        Budget (Optional)
                                                    </label>
                                                    <div className="mt-1">
                                                        <input
                                                            type="number"
                                                            name="budget"
                                                            id="budget"
                                                            value={formData.budget || ''}
                                                            onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-6">
                                                    <label htmlFor="supervisors" className="block text-sm font-medium text-gray-700">
                                                        Supervisors
                                                    </label>
                                                    <div className="mt-1">
                                                        <select
                                                            id="supervisors"
                                                            name="supervisors"
                                                            multiple
                                                            value={formData.supervisors || []}
                                                            onChange={(e) => {
                                                                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                                                setFormData({ ...formData, supervisors: selectedOptions });
                                                            }}
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            size={5}
                                                        >
                                                            {supervisors.map((supervisor) => (
                                                                <option key={supervisor._id} value={supervisor._id}>
                                                                    {supervisor.firstName} {supervisor.lastName} ({supervisor.email})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <p className="mt-1 text-xs text-gray-500">Hold Ctrl (or Cmd) to select multiple supervisors</p>
                                                    </div>
                                                </div>

                                                <div className="sm:col-span-6">
                                                    <h3 className="text-lg font-medium leading-6 text-gray-900">Notes</h3>
                                                    <div className="mt-2 flex">
                                                        <input
                                                            type="text"
                                                            value={note}
                                                            onChange={(e) => setNote(e.target.value)}
                                                            placeholder="Add a note"
                                                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddNote}
                                                            className="ml-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {formData.notes && formData.notes.length > 0 && (
                                                        <div className="mt-2">
                                                            <ul className="divide-y divide-gray-200">
                                                                {formData.notes.map((noteText, index) => (
                                                                    <li key={index} className="py-2 flex justify-between">
                                                                        <span className="text-sm text-gray-700">{noteText}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveNote(index)}
                                                                            className="text-red-600 hover:text-red-900"
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-5">
                                                <div className="flex justify-end">
                                                    <Link
                                                        href={`/jobsites/${jobsiteId}`}
                                                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Cancel
                                                    </Link>
                                                    <button
                                                        type="submit"
                                                        disabled={submitting}
                                                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        {submitting ? 'Saving...' : 'Save Changes'}
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedLayout>
    );
} 