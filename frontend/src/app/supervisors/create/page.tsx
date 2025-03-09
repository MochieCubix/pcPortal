'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import Link from 'next/link';

interface SupervisorFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    specialization?: string;
    startDate: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    certifications?: string[];
}

export default function CreateSupervisorPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [formData, setFormData] = useState<SupervisorFormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        specialization: '',
        startDate: new Date().toISOString().split('T')[0],
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        },
        certifications: []
    });
    const [certification, setCertification] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddCertification = () => {
        if (certification.trim()) {
            setFormData({
                ...formData,
                certifications: [...(formData.certifications || []), certification.trim()]
            });
            setCertification('');
        }
    };

    const handleRemoveCertification = (index: number) => {
        setFormData({
            ...formData,
            certifications: formData.certifications?.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/supervisors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to create supervisor');
            }

            router.push('/supervisors');
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
                                        Create New Supervisor
                                    </h1>
                                </div>
                                <div className="mt-4 flex md:mt-0 md:ml-4">
                                    <Link
                                        href="/supervisors"
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Back to Supervisors
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
                                            <div>
                                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                                    First Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    id="firstName"
                                                    required
                                                    value={formData.firstName}
                                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                                    Last Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    id="lastName"
                                                    required
                                                    value={formData.lastName}
                                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    id="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                                    Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    id="phone"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="specialization" className="block text-sm font-medium text-gray-700">
                                                    Specialization
                                                </label>
                                                <input
                                                    type="text"
                                                    name="specialization"
                                                    id="specialization"
                                                    value={formData.specialization}
                                                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
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

                                            <div className="sm:col-span-2">
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
                                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                                    <div className="sm:col-span-2">
                                                        <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                                                            Street Address
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="street"
                                                            id="street"
                                                            value={formData.address?.street}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                address: { ...formData.address, street: e.target.value }
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
                                                            value={formData.address?.city}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                address: { ...formData.address, city: e.target.value }
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
                                                            value={formData.address?.state}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                address: { ...formData.address, state: e.target.value }
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
                                                            value={formData.address?.zipCode}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                address: { ...formData.address, zipCode: e.target.value }
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
                                                            value={formData.address?.country}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                address: { ...formData.address, country: e.target.value }
                                                            })}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Certifications</h3>
                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        <input
                                                            type="text"
                                                            value={certification}
                                                            onChange={(e) => setCertification(e.target.value)}
                                                            placeholder="Enter certification"
                                                            className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddCertification}
                                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {formData.certifications && formData.certifications.length > 0 && (
                                                        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                            {formData.certifications.map((cert, index) => (
                                                                <li key={index} className="flex items-center justify-between py-2 px-4">
                                                                    <span className="text-sm text-gray-900">{cert}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveCertification(index)}
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
                                                onClick={() => router.push('/supervisors')}
                                                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                {loading ? 'Creating...' : 'Create Supervisor'}
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