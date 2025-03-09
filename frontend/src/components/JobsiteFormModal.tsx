'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Client {
    _id: string;
    companyName: string;
}

interface JobsiteFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId?: string; // Make clientId optional
    onSuccess?: () => void;
}

export default function JobsiteFormModal({ isOpen, onClose, clientId, onSuccess }: JobsiteFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Today's date in YYYY-MM-DD format
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);

    // Fetch clients if no clientId is provided
    useEffect(() => {
        if (isOpen && !clientId) {
            fetchClients();
        }
        
        // Set the selected client if clientId is provided
        if (clientId) {
            setSelectedClientId(clientId);
        } else {
            setSelectedClientId('');
        }
    }, [isOpen, clientId]);

    const fetchClients = async () => {
        try {
            setLoadingClients(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('http://localhost:5000/api/clients', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setClients(data);
            }
        } catch (err) {
            console.error('Failed to fetch clients:', err);
        } finally {
            setLoadingClients(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate client selection if no clientId was provided
        if (!clientId && !selectedClientId) {
            setError('Please select a client');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required');
                return;
            }

            // Use the provided clientId or the selected one
            const effectiveClientId = clientId || selectedClientId;

            // Use the correct API endpoint
            const response = await fetch(`http://localhost:5000/api/jobsites`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    client: effectiveClientId, // Include client ID in the request body
                    location: {
                        address: {
                            street: address,
                            country: 'Australia'
                        }
                    },
                    status,
                    startDate, // Add the required startDate field
                    description: `Jobsite for client ${effectiveClientId}` // Add a default description
                })
            });

            if (response.status === 401) {
                setError('Authentication required');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create jobsite');
            }

            // Reset form
            setName('');
            setAddress('');
            setStatus('active');
            setStartDate(new Date().toISOString().split('T')[0]);
            if (!clientId) {
                setSelectedClientId('');
            }

            // Close modal and refresh data
            onClose();
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create jobsite');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                                            Add New Jobsite
                                        </Dialog.Title>
                                        <div className="mt-4">
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                {error && (
                                                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                                                        <p className="text-sm text-red-700">{error}</p>
                                                    </div>
                                                )}
                                                
                                                {/* Client selection dropdown (only shown when no clientId is provided) */}
                                                {!clientId && (
                                                    <div>
                                                        <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                                                            Client
                                                        </label>
                                                        <select
                                                            id="client"
                                                            value={selectedClientId}
                                                            onChange={(e) => setSelectedClientId(e.target.value)}
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                            required
                                                            disabled={loadingClients}
                                                        >
                                                            <option value="">Select a client</option>
                                                            {clients.map((client) => (
                                                                <option key={client._id} value={client._id}>
                                                                    {client.companyName}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {loadingClients && (
                                                            <p className="mt-1 text-sm text-gray-500">Loading clients...</p>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <div>
                                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                        Jobsite Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
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
                                                        value={address}
                                                        onChange={(e) => setAddress(e.target.value)}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                                                        Start Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        id="startDate"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                                        Status
                                                    </label>
                                                    <select
                                                        id="status"
                                                        value={status}
                                                        onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </select>
                                                </div>
                                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2 disabled:opacity-50"
                                                    >
                                                        {loading ? 'Creating...' : 'Create Jobsite'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={onClose}
                                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
} 