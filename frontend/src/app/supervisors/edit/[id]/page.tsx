'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';

interface SupervisorFormData {
    firstName: string;
    lastName: string;
    email: string;
    contactNumber?: string;
    position?: string;
    hireDate: string;
    terminationDate?: string;
    status?: string;
    address?: string;
}

export default function EditSupervisorPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { user } = useAuth();
    const [formData, setFormData] = useState<SupervisorFormData>({
        firstName: '',
        lastName: '',
        email: '',
        contactNumber: '',
        position: '',
        hireDate: new Date().toISOString().split('T')[0],
        terminationDate: '',
        status: 'active',
        address: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [positions, setPositions] = useState<Array<{ _id: string, name: string }>>([]);

    useEffect(() => {
        const fetchSupervisor = async () => {
            try {
                setFetchLoading(true);
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
                setFormData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    contactNumber: data.contactNumber || '',
                    position: data.position?._id || '',
                    hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    terminationDate: data.terminationDate ? new Date(data.terminationDate).toISOString().split('T')[0] : '',
                    status: data.status || 'active',
                    address: data.address || ''
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setFetchLoading(false);
            }
        };

        const fetchPositions = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/api/positions', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch positions');
                }

                const data = await response.json();
                setPositions(data);
            } catch (err) {
                console.error('Error fetching positions:', err);
            }
        };

        if (user?.role === 'admin') {
            fetchSupervisor();
            fetchPositions();
        }
    }, [user, params.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            setError('');
            
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/supervisors/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update supervisor');
            }
            
            router.push('/supervisors');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update supervisor');
        } finally {
            setLoading(false);
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
                    <div className="py-10">
                        <header>
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                    Edit Supervisor
                                </h1>
                            </div>
                        </header>
                        <main>
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                                        {fetchLoading ? (
                                            <div className="text-center py-10">Loading supervisor details...</div>
                                        ) : error ? (
                                            <div className="text-center py-10 text-red-500">{error}</div>
                                        ) : (
                                            <form onSubmit={handleSubmit} className="space-y-6">
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

                                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                                                    <div>
                                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                                                        <input
                                                            type="text"
                                                            name="firstName"
                                                            id="firstName"
                                                            value={formData.firstName}
                                                            onChange={handleChange}
                                                            required
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                                                        <input
                                                            type="text"
                                                            name="lastName"
                                                            id="lastName"
                                                            value={formData.lastName}
                                                            onChange={handleChange}
                                                            required
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            id="email"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            required
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                                                        <input
                                                            type="text"
                                                            name="contactNumber"
                                                            id="contactNumber"
                                                            value={formData.contactNumber}
                                                            onChange={handleChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="position" className="block text-sm font-medium text-gray-700">Position</label>
                                                        <select
                                                            name="position"
                                                            id="position"
                                                            value={formData.position}
                                                            onChange={handleChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        >
                                                            <option value="">Select a position</option>
                                                            {positions.map(position => (
                                                                <option key={position._id} value={position._id}>
                                                                    {position.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700">Hire Date</label>
                                                        <input
                                                            type="date"
                                                            name="hireDate"
                                                            id="hireDate"
                                                            value={formData.hireDate}
                                                            onChange={handleChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="terminationDate" className="block text-sm font-medium text-gray-700">Termination Date (if applicable)</label>
                                                        <input
                                                            type="date"
                                                            name="terminationDate"
                                                            id="terminationDate"
                                                            value={formData.terminationDate}
                                                            onChange={handleChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                                                        <select
                                                            name="status"
                                                            id="status"
                                                            value={formData.status}
                                                            onChange={handleChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                            <option value="terminated">Terminated</option>
                                                        </select>
                                                    </div>

                                                    <div className="sm:col-span-2">
                                                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                                                        <textarea
                                                            name="address"
                                                            id="address"
                                                            rows={3}
                                                            value={formData.address}
                                                            onChange={handleChange}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex justify-end space-x-3">
                                                    <Link
                                                        href="/supervisors"
                                                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Cancel
                                                    </Link>
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                                    >
                                                        {loading ? 'Updating...' : 'Update Supervisor'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </ClientLayout>
        </ProtectedLayout>
    );
} 