'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import BaseModal from './modals/BaseModal';

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

interface ClientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClientCreated?: () => void;
    client?: {
        _id: string;
        companyName: string;
        abn: string;
        accountEmail: string;
        accountsPhone: string;
        officeAddress: string;
        suburb: string;
        postcode: string;
        paymentTerms?: {
            days: number;
            type: 'days' | 'EOM';
            description: string;
        };
    } | null;
}

export default function ClientFormModal({ isOpen, onClose, onClientCreated, client }: ClientFormModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const isEditMode = !!client;

    const defaultValues: ClientFormData = {
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
    };

    const [formData, setFormData] = useState<ClientFormData>(defaultValues);

    useEffect(() => {
        if (isOpen) {
            if (client) {
                setFormData({
                    companyName: client.companyName || '',
                    abn: client.abn || '',
                    accountEmail: client.accountEmail || '',
                    accountsPhone: client.accountsPhone || '',
                    officeAddress: client.officeAddress || '',
                    suburb: client.suburb || '',
                    postcode: client.postcode || '',
                    paymentTerms: {
                        days: client.paymentTerms?.days || 30,
                        type: client.paymentTerms?.type || 'days',
                        description: client.paymentTerms?.description || ''
                    }
                });
            } else {
                setFormData(defaultValues);
            }
        }
    }, [isOpen, client]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name.startsWith('paymentTerms.')) {
            const field = name.replace('paymentTerms.', '');
            setFormData(prev => ({
                ...prev,
                paymentTerms: {
                    ...prev.paymentTerms,
                    [field]: field === 'days' ? parseInt(value) || 0 : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const endpoint = isEditMode ? `${apiUrl}/api/clients/${client?._id}` : `${apiUrl}/api/clients`;
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save client');
            }

            const savedClient = await response.json();
            toast.success(`Client ${isEditMode ? 'updated' : 'created'} successfully!`);
            
            if (onClientCreated) {
                onClientCreated();
            }
            
            onClose();
        } catch (error) {
            console.error('Error saving client:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while saving the client');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? `Edit Client: ${client?.companyName}` : 'Add New Client'}
            maxWidth="2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Client Information</h3>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                            Company Name
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="companyName"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="abn" className="block text-sm font-medium text-gray-700">
                            ABN
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="abn"
                                name="abn"
                                value={formData.abn}
                                onChange={handleChange}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="accountEmail" className="block text-sm font-medium text-gray-700">
                            Account Email
                        </label>
                        <div className="mt-1">
                            <input
                                type="email"
                                id="accountEmail"
                                name="accountEmail"
                                value={formData.accountEmail}
                                onChange={handleChange}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="accountsPhone" className="block text-sm font-medium text-gray-700">
                            Accounts Phone
                        </label>
                        <div className="mt-1">
                            <input
                                type="tel"
                                id="accountsPhone"
                                name="accountsPhone"
                                value={formData.accountsPhone}
                                onChange={handleChange}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Address</h3>
                    </div>

                    <div className="sm:col-span-4">
                        <label htmlFor="officeAddress" className="block text-sm font-medium text-gray-700">
                            Office Address
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="officeAddress"
                                name="officeAddress"
                                value={formData.officeAddress}
                                onChange={handleChange}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="suburb" className="block text-sm font-medium text-gray-700">
                            Suburb
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="suburb"
                                name="suburb"
                                value={formData.suburb}
                                onChange={handleChange}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">
                            Postcode
                        </label>
                        <div className="mt-1">
                            <input
                                type="text"
                                id="postcode"
                                name="postcode"
                                value={formData.postcode}
                                onChange={handleChange}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Payment Terms</h3>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="paymentTerms.days" className="block text-sm font-medium text-gray-700">
                            Payment Days
                        </label>
                        <div className="mt-1">
                            <input
                                type="number"
                                id="paymentTerms.days"
                                name="paymentTerms.days"
                                min="0"
                                value={formData.paymentTerms.days}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="paymentTerms.type" className="block text-sm font-medium text-gray-700">
                            Payment Type
                        </label>
                        <div className="mt-1">
                            <select
                                id="paymentTerms.type"
                                name="paymentTerms.type"
                                value={formData.paymentTerms.type}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="days">Days</option>
                                <option value="EOM">End of Month</option>
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <label htmlFor="paymentTerms.description" className="block text-sm font-medium text-gray-700">
                            Payment Terms Description
                        </label>
                        <div className="mt-1">
                            <textarea
                                id="paymentTerms.description"
                                name="paymentTerms.description"
                                rows={2}
                                value={formData.paymentTerms.description}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                placeholder="e.g., Net 30, Payment due by end of month"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {isLoading ? 'Saving...' : isEditMode ? 'Update Client' : 'Create Client'}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
} 