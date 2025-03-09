'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function CreateJobsitePage() {
    const router = useRouter();
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
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Array<{ _id: string; firstName: string; lastName: string; companyName?: string }>>([]);
    const [supervisors, setSupervisors] = useState<Array<{ _id: string; firstName: string; lastName: string }>>([]);

    // Fetch clients and supervisors on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };

                // Fetch clients
                const clientsResponse = await fetch('http://localhost:5000/api/clients', { headers });
                if (clientsResponse.ok) {
                    const clientsData = await clientsResponse.json();
                    setClients(clientsData);
                }

                // Fetch supervisors
                const supervisorsResponse = await fetch('http://localhost:5000/api/supervisors', { headers });
                if (supervisorsResponse.ok) {
                    const supervisorsData = await supervisorsResponse.json();
                    setSupervisors(supervisorsData);
                }
            } catch (err) {
                setError('Failed to fetch clients and supervisors');
            }
        };

        if (user?.role === 'admin') {
            fetchData();
        }
    }, [user]);

    const handleAddNote = () => {
        if (note.trim()) {
            setFormData({
                ...formData,
                notes: [...(formData.notes || []), note.trim()]
            });
            setNote('');
        }
    };

    const handleRemoveNote = (index: number) => {
        setFormData({
            ...formData,
            notes: formData.notes?.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/jobsites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to create jobsite');
            }

            router.push('/jobsites');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
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
                            <div className="md:flex md:items-center md:justify-between">
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                        Create New Jobsite
                                    </h1>
                                </div>
                                <div className="mt-4 flex md:mt-0 md:ml-4">
                                    <Link
                                        href="/jobsites"
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
                                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                    <form onSubmit={handleSubmit} className="space-y-6 p-6">
                                        {error && (
                                            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
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

                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                            <div className="sm:col-span-2">
                                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                    Jobsite Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    id="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                                    Description
                                                </label>
                                                <textarea
                                                    name="description"
                                                    id="description"
                                                    rows={4}
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
                                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                                    <div className="sm:col-span-2">
                                                        <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                                                            Street Address
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="street"
                                                            id="street"
                                                            value={formData.location?.address?.street}
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
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                                            City
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="city"
                                                            id="city"
                                                            value={formData.location?.address?.city}
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
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                                                            State
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="state"
                                                            id="state"
                                                            value={formData.location?.address?.state}
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
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                                                            ZIP Code
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="zipCode"
                                                            id="zipCode"
                                                            value={formData.location?.address?.zipCode}
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
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                                                            Country
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="country"
                                                            id="country"
                                                            value={formData.location?.address?.country}
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
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                                                            Latitude
                                                        </label>
                                                        <input
                                                            type="number"
                                                            name="latitude"
                                                            id="latitude"
                                                            step="any"
                                                            value={formData.location?.coordinates?.latitude || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                location: {
                                                                    ...formData.location,
                                                                    coordinates: {
                                                                        ...formData.location?.coordinates,
                                                                        latitude: e.target.value ? Number(e.target.value) : undefined
                                                                    }
                                                                }
                                                            })}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                                                            Longitude
                                                        </label>
                                                        <input
                                                            type="number"
                                                            name="longitude"
                                                            id="longitude"
                                                            step="any"
                                                            value={formData.location?.coordinates?.longitude || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                location: {
                                                                    ...formData.location,
                                                                    coordinates: {
                                                                        ...formData.location?.coordinates,
                                                                        longitude: e.target.value ? Number(e.target.value) : undefined
                                                                    }
                                                                }
                                                            })}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                                                    Client
                                                </label>
                                                <select
                                                    name="client"
                                                    id="client"
                                                    required
                                                    value={formData.client}
                                                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                >
                                                    <option value="">Select a client</option>
                                                    {clients.map((client) => (
                                                        <option key={client._id} value={client._id}>
                                                            {client.firstName} {client.lastName}{client.companyName ? ` (${client.companyName})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label htmlFor="supervisors" className="block text-sm font-medium text-gray-700">
                                                    Supervisors
                                                </label>
                                                <select
                                                    name="supervisors"
                                                    id="supervisors"
                                                    multiple
                                                    value={formData.supervisors}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        supervisors: Array.from(e.target.selectedOptions, option => option.value)
                                                    })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                >
                                                    {supervisors.map((supervisor) => (
                                                        <option key={supervisor._id} value={supervisor._id}>
                                                            {supervisor.firstName} {supervisor.lastName}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple supervisors</p>
                                            </div>

                                            <div>
                                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                                                    Start Date
                                                </label>
                                                <input
                                                    type="date"
                                                    name="startDate"
                                                    id="startDate"
                                                    required
                                                    value={formData.startDate}
                                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                                                    End Date
                                                </label>
                                                <input
                                                    type="date"
                                                    name="endDate"
                                                    id="endDate"
                                                    value={formData.endDate}
                                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                                    Status
                                                </label>
                                                <select
                                                    name="status"
                                                    id="status"
                                                    required
                                                    value={formData.status}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as JobsiteFormData['status'] })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="on-hold">On Hold</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                                                    Budget
                                                </label>
                                                <input
                                                    type="number"
                                                    name="budget"
                                                    id="budget"
                                                    min="0"
                                                    step="1000"
                                                    value={formData.budget || ''}
                                                    onChange={(e) => setFormData({ ...formData, budget: e.target.value ? Number(e.target.value) : undefined })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        <input
                                                            type="text"
                                                            value={note}
                                                            onChange={(e) => setNote(e.target.value)}
                                                            placeholder="Enter note"
                                                            className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddNote}
                                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {formData.notes && formData.notes.length > 0 && (
                                                        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                            {formData.notes.map((noteText, index) => (
                                                                <li key={index} className="flex items-center justify-between py-2 px-4">
                                                                    <span className="text-sm text-gray-900">{noteText}</span>
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
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => router.push('/jobsites')}
                                                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                {loading ? 'Creating...' : 'Create Jobsite'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedLayout>
    );
} 