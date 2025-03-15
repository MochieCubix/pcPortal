'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';

interface Address {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
}

interface ClientFormData {
    companyName: string;
    abn: string;
    accountEmail: string;
    accountsPhone: string;
    officeAddress: string;
    suburb: string;
    postcode: string;
    paymentTerms: {
        days: number;
        type: 'days' | 'EOM';
        description: string;
    };
}

export default function EditClientPage() {
    const params = useParams();
    const clientId = params.id as string;
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState<ClientFormData>({
        companyName: '',
        abn: '',
        accountEmail: '',
        accountsPhone: '',
        officeAddress: '',
        suburb: '',
        postcode: '',
        paymentTerms: {
            days: 30,
            type: 'days',
            description: ''
        }
    });

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const response = await fetch(`http://localhost:5000/api/clients/${clientId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 401) {
                    localStorage.removeItem('token');
                    router.push('/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch client');
                }

                const data = await response.json();
                
                // Format address data
                let addressStr = '';
                if (typeof data.officeAddress === 'object' && data.officeAddress !== null) {
                    const { street, city, state, zipCode, country } = data.officeAddress;
                    const parts = [];
                    if (street) parts.push(street);
                    if (city) parts.push(city);
                    if (state) parts.push(state);
                    if (zipCode) parts.push(zipCode);
                    if (country) parts.push(country);
                    addressStr = parts.join(', ');
                } else if (typeof data.officeAddress === 'string') {
                    addressStr = data.officeAddress;
                } else if (typeof data.address === 'object' && data.address !== null) {
                    // Fallback for old data structure
                    const { street, city, state, zipCode, country } = data.address;
                    const parts = [];
                    if (street) parts.push(street);
                    if (city) parts.push(city);
                    if (state) parts.push(state);
                    if (zipCode) parts.push(zipCode);
                    if (country) parts.push(country);
                    addressStr = parts.join(', ');
                } else if (typeof data.address === 'string') {
                    addressStr = data.address;
                }
                
                setFormData({
                    companyName: data.companyName || '',
                    abn: data.abn || '',
                    accountEmail: data.accountEmail || '',
                    accountsPhone: data.accountsPhone || data.contactNumber || '',
                    officeAddress: addressStr,
                    suburb: data.suburb || '',
                    postcode: data.postcode || '',
                    paymentTerms: {
                        days: data.paymentTerms?.days || 30,
                        type: data.paymentTerms?.type || 'days',
                        description: data.paymentTerms?.description || ''
                    }
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch client');
            }
        };

        if (clientId) {
            fetchClient();
        }
    }, [clientId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch(`http://localhost:5000/api/clients/${clientId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                router.push('/login');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to update client');
            }

            router.push(`/clients/${clientId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update client');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClient = async () => {
        setDeleteLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch(`http://localhost:5000/api/clients/${clientId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                router.push('/login');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to delete client');
            }

            router.push('/clients');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete client');
            setDeleteLoading(false);
        }
    };

    // Access denied state
    if (!user || user.role !== 'admin') {
        return (
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
        );
    }

    return (
        <ClientLayout>
            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900">Edit Client</h1>
                        <Link
                            href={`/clients/${clientId}`}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Back to Client
                        </Link>
                    </div>

                    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-3xl">
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    id="companyName"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="abn" className="block text-sm font-medium text-gray-700">
                                    ABN
                                </label>
                                <input
                                    type="text"
                                    id="abn"
                                    value={formData.abn}
                                    onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="accountEmail" className="block text-sm font-medium text-gray-700">
                                    Account Email
                                </label>
                                <input
                                    type="email"
                                    id="accountEmail"
                                    value={formData.accountEmail}
                                    onChange={(e) => setFormData({ ...formData, accountEmail: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="accountsPhone" className="block text-sm font-medium text-gray-700">
                                    Accounts Phone
                                </label>
                                <input
                                    type="tel"
                                    id="accountsPhone"
                                    value={formData.accountsPhone}
                                    onChange={(e) => setFormData({ ...formData, accountsPhone: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="officeAddress" className="block text-sm font-medium text-gray-700">
                                    Office Address
                                </label>
                                <input
                                    type="text"
                                    id="officeAddress"
                                    value={formData.officeAddress}
                                    onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    placeholder="Street address"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="suburb" className="block text-sm font-medium text-gray-700">
                                        Suburb
                                    </label>
                                    <input
                                        type="text"
                                        id="suburb"
                                        value={formData.suburb}
                                        onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">
                                        Postcode
                                    </label>
                                    <input
                                        type="text"
                                        id="postcode"
                                        value={formData.postcode}
                                        onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 mt-4">
                                <h3 className="text-lg font-medium text-gray-900">Payment Terms</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="paymentDays" className="block text-sm font-medium text-gray-700">
                                            Payment Days
                                        </label>
                                        <input
                                            type="number"
                                            id="paymentDays"
                                            min="0"
                                            value={formData.paymentTerms.days}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                paymentTerms: {
                                                    ...formData.paymentTerms,
                                                    days: parseInt(e.target.value) || 0
                                                }
                                            })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700">
                                            Payment Type
                                        </label>
                                        <select
                                            id="paymentType"
                                            value={formData.paymentTerms.type}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                paymentTerms: {
                                                    ...formData.paymentTerms,
                                                    type: e.target.value as 'days' | 'EOM'
                                                }
                                            })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        >
                                            <option value="days">Days</option>
                                            <option value="EOM">End of Month</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="paymentDescription" className="block text-sm font-medium text-gray-700">
                                        Payment Terms Description
                                    </label>
                                    <textarea
                                        id="paymentDescription"
                                        value={formData.paymentTerms.description}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            paymentTerms: {
                                                ...formData.paymentTerms,
                                                description: e.target.value
                                            }
                                        })}
                                        rows={2}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        placeholder="e.g., Net 30, Payment due by end of month"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-200">
                            <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Once you delete a client, there is no going back. Please be certain.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Delete Client
                            </button>
                        </div>

                        {/* Delete Confirmation Modal */}
                        {showDeleteConfirm && (
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                                <div className="bg-white rounded-lg max-w-md w-full p-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Are you sure you want to delete this client? This action cannot be undone.
                                    </p>
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDeleteClient}
                                            disabled={deleteLoading}
                                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                        >
                                            {deleteLoading ? 'Deleting...' : 'Delete Client'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ClientLayout>
    );
} 