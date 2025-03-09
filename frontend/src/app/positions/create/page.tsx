'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import Link from 'next/link';

interface PositionFormData {
    name: string;
    description?: string;
    department?: string;
    requirements?: string[];
    responsibilities?: string[];
    minSalary?: number;
    maxSalary?: number;
    status: 'active' | 'inactive';
}

export default function CreatePositionPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [formData, setFormData] = useState<PositionFormData>({
        name: '',
        description: '',
        department: '',
        requirements: [],
        responsibilities: [],
        minSalary: undefined,
        maxSalary: undefined,
        status: 'active'
    });
    const [requirement, setRequirement] = useState('');
    const [responsibility, setResponsibility] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddRequirement = () => {
        if (requirement.trim()) {
            setFormData({
                ...formData,
                requirements: [...(formData.requirements || []), requirement.trim()]
            });
            setRequirement('');
        }
    };

    const handleRemoveRequirement = (index: number) => {
        setFormData({
            ...formData,
            requirements: formData.requirements?.filter((_, i) => i !== index)
        });
    };

    const handleAddResponsibility = () => {
        if (responsibility.trim()) {
            setFormData({
                ...formData,
                responsibilities: [...(formData.responsibilities || []), responsibility.trim()]
            });
            setResponsibility('');
        }
    };

    const handleRemoveResponsibility = (index: number) => {
        setFormData({
            ...formData,
            responsibilities: formData.responsibilities?.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/positions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to create position');
            }

            router.push('/positions');
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
                                        Create New Position
                                    </h1>
                                </div>
                                <div className="mt-4 flex md:mt-0 md:ml-4">
                                    <Link
                                        href="/positions"
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Back to Positions
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
                                                    Position Name
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

                                            <div>
                                                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                                                    Department
                                                </label>
                                                <input
                                                    type="text"
                                                    name="department"
                                                    id="department"
                                                    value={formData.department}
                                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label htmlFor="minSalary" className="block text-sm font-medium text-gray-700">
                                                    Minimum Salary
                                                </label>
                                                <input
                                                    type="number"
                                                    name="minSalary"
                                                    id="minSalary"
                                                    min="0"
                                                    step="1000"
                                                    value={formData.minSalary || ''}
                                                    onChange={(e) => setFormData({ ...formData, minSalary: e.target.value ? Number(e.target.value) : undefined })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="maxSalary" className="block text-sm font-medium text-gray-700">
                                                    Maximum Salary
                                                </label>
                                                <input
                                                    type="number"
                                                    name="maxSalary"
                                                    id="maxSalary"
                                                    min="0"
                                                    step="1000"
                                                    value={formData.maxSalary || ''}
                                                    onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value ? Number(e.target.value) : undefined })}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Requirements</h3>
                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        <input
                                                            type="text"
                                                            value={requirement}
                                                            onChange={(e) => setRequirement(e.target.value)}
                                                            placeholder="Enter requirement"
                                                            className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddRequirement}
                                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {formData.requirements && formData.requirements.length > 0 && (
                                                        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                            {formData.requirements.map((req, index) => (
                                                                <li key={index} className="flex items-center justify-between py-2 px-4">
                                                                    <span className="text-sm text-gray-900">{req}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveRequirement(index)}
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

                                            <div className="sm:col-span-2">
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Responsibilities</h3>
                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        <input
                                                            type="text"
                                                            value={responsibility}
                                                            onChange={(e) => setResponsibility(e.target.value)}
                                                            placeholder="Enter responsibility"
                                                            className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAddResponsibility}
                                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    {formData.responsibilities && formData.responsibilities.length > 0 && (
                                                        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                            {formData.responsibilities.map((resp, index) => (
                                                                <li key={index} className="flex items-center justify-between py-2 px-4">
                                                                    <span className="text-sm text-gray-900">{resp}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveResponsibility(index)}
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
                                                onClick={() => router.push('/positions')}
                                                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                {loading ? 'Creating...' : 'Create Position'}
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