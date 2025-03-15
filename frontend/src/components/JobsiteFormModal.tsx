'use client';

import { useState, useEffect } from 'react';
import BaseModal from './modals/BaseModal';
import { toast } from 'react-hot-toast';

interface Client {
    _id: string;
    companyName: string;
}

interface Jobsite {
    _id: string;
    name: string;
    location?: {
        address?: {
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
        }
    };
    status?: string;
    startDate?: string;
    client?: {
        _id?: string;
    };
}

interface JobsiteFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId?: string;
    jobsiteId?: string;
    jobsiteData?: Jobsite;
    onSuccess?: () => void;
}

export default function JobsiteFormModal({ isOpen, onClose, clientId, jobsiteId, jobsiteData, onSuccess }: JobsiteFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [originalClientId, setOriginalClientId] = useState<string>('');
    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showConfirmClientChange, setShowConfirmClientChange] = useState(false);
    const [newClientId, setNewClientId] = useState<string>('');

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            // Check if we're in edit mode
            if (jobsiteId && jobsiteData) {
                setIsEditMode(true);
                setName(jobsiteData.name || '');
                setStreet(jobsiteData.location?.address?.street || '');
                setCity(jobsiteData.location?.address?.city || '');
                setState(jobsiteData.location?.address?.state || '');
                setZipCode(jobsiteData.location?.address?.zipCode || '');
                setStatus((jobsiteData.status as 'active' | 'inactive') || 'active');
                setStartDate(jobsiteData.startDate || new Date().toISOString().split('T')[0]);
                
                // Set client ID from jobsite data or from prop
                if (jobsiteData.client?._id) {
                    setSelectedClientId(jobsiteData.client._id);
                    setOriginalClientId(jobsiteData.client._id);
                } else if (clientId) {
                    setSelectedClientId(clientId);
                    setOriginalClientId(clientId);
                }
            } else {
                // New jobsite mode
                setIsEditMode(false);
                setName('');
                setStreet('');
                setCity('');
                setState('');
                setZipCode('');
                setStatus('active');
                setStartDate(new Date().toISOString().split('T')[0]);
                setError('');
                if (clientId) {
                    setSelectedClientId(clientId);
                    setOriginalClientId(clientId);
                } else {
                    setSelectedClientId('');
                    setOriginalClientId('');
                }
            }
            
            // Always fetch clients when modal opens
            fetchClients();
        }
    }, [isOpen, clientId, jobsiteId, jobsiteData]);

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

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        
        // If in edit mode and the client is being changed, show confirmation
        if (isEditMode && originalClientId && newId !== originalClientId) {
            setNewClientId(newId);
            setShowConfirmClientChange(true);
        } else {
            setSelectedClientId(newId);
        }
    };

    const confirmClientChange = () => {
        setSelectedClientId(newClientId);
        setShowConfirmClientChange(false);
    };

    const cancelClientChange = () => {
        setShowConfirmClientChange(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate client selection for new jobsites
        if (!selectedClientId) {
            setError('Please select a client');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required');
                setLoading(false);
                return;
            }

            const jobsiteData = {
                name,
                location: {
                    address: {
                        street,
                        city,
                        state,
                        zipCode
                    }
                },
                status,
                startDate,
                client: selectedClientId
            };

            // Determine if we're creating or updating
            const url = isEditMode 
                ? `http://localhost:5000/api/jobsites/${jobsiteId}` 
                : 'http://localhost:5000/api/jobsites';
            
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jobsiteData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save jobsite');
            }

            toast.success(`Jobsite ${isEditMode ? 'updated' : 'created'} successfully!`);
            
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save jobsite');
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Jobsite' : 'Add New Jobsite'}
            maxWidth="lg"
            preventOutsideClose={true}
        >
            {showConfirmClientChange ? (
                <div className="p-4 space-y-4">
                    <div className="text-lg font-medium">Change Client?</div>
                    <p className="text-gray-700">
                        Are you sure you want to change the client for this jobsite? This could affect existing invoices and other data.
                    </p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={cancelClientChange}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmClientChange}
                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Confirm Change
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="text-sm text-red-700">{error}</div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                            Client
                        </label>
                        <select
                            id="client"
                            value={selectedClientId}
                            onChange={handleClientChange}
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

                    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                        <div className="sm:col-span-2">
                            <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                                Street Address
                            </label>
                            <input
                                type="text"
                                id="street"
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                City
                            </label>
                            <input
                                type="text"
                                id="city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                                State
                            </label>
                            <input
                                type="text"
                                id="state"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                                ZIP Code
                            </label>
                            <input
                                type="text"
                                id="zipCode"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                required
                            />
                        </div>
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

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Jobsite'}
                        </button>
                    </div>
                </form>
            )}
        </BaseModal>
    );
} 