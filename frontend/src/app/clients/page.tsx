'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

interface Client {
    _id: string;
    companyName: string;
    abn: string;
    phone: string;
    address: Address | string;
}

type SortDirection = 'asc' | 'desc' | null;

export default function ClientsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [sortedClients, setSortedClients] = useState<Client[]>([]);

    const formatAddress = (address: Address | string | undefined) => {
        if (!address) return 'No address provided';
        if (typeof address === 'string') return address;
        
        const { street, city, state, zipCode, country } = address;
        if (!street && !city && !state && !zipCode && !country) return 'No address provided';
        
        const parts = [];
        if (street) parts.push(street);
        if (city) parts.push(city);
        if (state) parts.push(state);
        if (zipCode) parts.push(zipCode);
        if (country) parts.push(country);
        
        return parts.join(', ');
    };

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch('http://localhost:5000/api/clients', {
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
                throw new Error('Failed to fetch clients');
            }

            const data = await response.json();
            setClients(data);
            setSortedClients(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch clients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    // Sort clients when sortDirection changes or when clients array changes
    useEffect(() => {
        if (!clients.length) return;

        let sorted = [...clients];
        
        if (sortDirection === 'asc') {
            sorted.sort((a, b) => a.companyName.localeCompare(b.companyName));
        } else if (sortDirection === 'desc') {
            sorted.sort((a, b) => b.companyName.localeCompare(a.companyName));
        }
        
        setSortedClients(sorted);
    }, [sortDirection, clients]);

    const toggleSort = () => {
        if (sortDirection === null) {
            setSortDirection('asc');
        } else if (sortDirection === 'asc') {
            setSortDirection('desc');
        } else {
            setSortDirection(null);
        }
    };

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
            <div className="py-10">
                <header>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <h1 className="text-3xl font-bold leading-tight text-gray-900">
                            Manage Clients
                        </h1>
                        <Link
                            href="/clients/create"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                        >
                            Add Client
                        </Link>
                    </div>
                </header>
                <main>
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="px-4 py-8 sm:px-0">
                            {loading ? (
                                <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                                </div>
                            ) : error ? (
                                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            ) : clients.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">No clients found. Add your first client to get started.</p>
                                </div>
                            ) : (
                                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th 
                                                        scope="col" 
                                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                                                        onClick={toggleSort}
                                                    >
                                                        <div className="flex items-center">
                                                            Company Name
                                                            <span className="ml-2">
                                                                {sortDirection === 'asc' ? (
                                                                    <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                                                                ) : sortDirection === 'desc' ? (
                                                                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                                                ) : (
                                                                    <span className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100">
                                                                        <ChevronUpIcon className="h-4 w-4" />
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        ABN
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Phone
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Address
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {sortedClients.map((client) => (
                                                    <tr key={client._id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {client.companyName}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {client.abn}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {client.phone}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatAddress(client.address)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <Link
                                                                href={`/clients/${client._id}`}
                                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                            >
                                                                View
                                                            </Link>
                                                            <Link
                                                                href={`/clients/${client._id}/edit`}
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                Edit
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </ClientLayout>
    );
} 