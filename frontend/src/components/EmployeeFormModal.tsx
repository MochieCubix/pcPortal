'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface Position {
    _id: string;
    name: string;
}

interface Supervisor {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface EmployeeFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    supervisor: string;
    status: string;
    hireDate: string;
}

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function EmployeeFormModal({ isOpen, onClose }: EmployeeFormModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [positions, setPositions] = useState<Position[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [formData, setFormData] = useState<EmployeeFormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        supervisor: '',
        status: 'active',
        hireDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                // Fetch positions
                const positionsResponse = await fetch('http://localhost:5000/api/positions', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (positionsResponse.ok) {
                    const positionsData = await positionsResponse.json();
                    setPositions(positionsData);
                }

                // Fetch supervisors
                const supervisorsResponse = await fetch('http://localhost:5000/api/supervisors', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (supervisorsResponse.ok) {
                    const supervisorsData = await supervisorsResponse.json();
                    setSupervisors(supervisorsData);
                }
            } catch (err) {
                console.error('Error fetching options:', err);
            }
        };

        if (isOpen) {
            fetchOptions();
        }
    }, [isOpen]);

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

            const response = await fetch('http://localhost:5000/api/employees', {
                method: 'POST',
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
                throw new Error('Failed to create employee');
            }

            router.refresh(); // Refresh the page data
            onClose(); // Close the modal
            setFormData({ // Reset the form
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                position: '',
                supervisor: '',
                status: 'active',
                hireDate: new Date().toISOString().split('T')[0]
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create employee');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog className="relative z-50" onClose={onClose}>
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                                <div className="absolute right-0 top-0 pr-4 pt-4">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div>
                                    <Dialog.Title>
                                        <h3 className="text-xl font-semibold leading-6 text-gray-900 mb-6">Add New Employee</h3>
                                    </Dialog.Title>

                                    <div className="mt-4">
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            {error && (
                                                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                                                    <p className="text-sm text-red-700">{error}</p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                                        First Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="firstName"
                                                        value={formData.firstName}
                                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Last Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="lastName"
                                                        value={formData.lastName}
                                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        id="email"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Phone
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        id="phone"
                                                        value={formData.phone}
                                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Position
                                                    </label>
                                                    <select
                                                        id="position"
                                                        value={formData.position}
                                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                                                        required
                                                    >
                                                        <option value="">Select a position</option>
                                                        {positions.map((position) => (
                                                            <option key={position._id} value={position._id}>
                                                                {position.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor="supervisor" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Supervisor
                                                    </label>
                                                    <select
                                                        id="supervisor"
                                                        value={formData.supervisor}
                                                        onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                                                    >
                                                        <option value="">Select a supervisor</option>
                                                        {supervisors.map((supervisor) => (
                                                            <option key={supervisor._id} value={supervisor._id}>
                                                                {supervisor.firstName} {supervisor.lastName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Status
                                                    </label>
                                                    <select
                                                        id="status"
                                                        value={formData.status}
                                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                                                        required
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                        <option value="terminated">Terminated</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Hire Date
                                                    </label>
                                                    <input
                                                        type="date"
                                                        id="hireDate"
                                                        value={formData.hireDate}
                                                        onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-8 flex justify-end">
                                                <button
                                                    type="button"
                                                    className="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                    onClick={onClose}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Creating...' : 'Create Employee'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
} 