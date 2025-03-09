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
    phone: string;
    address: string;
    suburb: string;
    postcode: string;
}

export default function EditClientPage() {
    const params = useParams();
    const clientId = params.id as string;
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState<ClientFormData>({
        companyName: '',
        abn: '',
        phone: '',
        address: '',
        suburb: '',
        postcode: ''
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
                if (typeof data.address === 'object' && data.address !== null) {
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
                    phone: data.phone || '',
                    address: addressStr,
                    suburb: data.suburb || '',
                    postcode: data.postcode || ''
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
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                    </div>
                </div>
            </div>
        </ClientLayout>
    );
} 