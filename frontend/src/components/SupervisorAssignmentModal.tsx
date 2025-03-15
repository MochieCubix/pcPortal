'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import SupervisorFormModal from './SupervisorFormModal';
import { useModal } from '@/contexts/ModalContext';

interface Supervisor {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface Client {
    _id: string;
    companyName: string;
}

interface Jobsite {
    _id: string;
    name: string;
    client: string;
}

interface SupervisorAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobsiteId: string;
    jobsiteName?: string;
    currentSupervisors: Supervisor[];
    onSuccess: () => void;
}

export default function SupervisorAssignmentModal({
    isOpen,
    onClose,
    jobsiteId,
    jobsiteName = "Jobsite",
    currentSupervisors,
    onSuccess
}: SupervisorAssignmentModalProps) {
    const { openModal, closeModal } = useModal();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
    const [loadingSupervisors, setLoadingSupervisors] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [jobsites, setJobsites] = useState<Jobsite[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [clientJobsites, setClientJobsites] = useState<Jobsite[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Reset form and fetch supervisors when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchSupervisors();
            fetchClients();
            // Set initially selected supervisors, filtering out any null or invalid supervisors
            setSelectedSupervisors(
                currentSupervisors
                    .filter(sup => sup && sup._id) // Filter out null or invalid supervisors
                    .map(sup => sup._id)
            );
            setError('');
        }
    }, [isOpen, currentSupervisors]);

    // Filter jobsites when client changes
    useEffect(() => {
        if (selectedClientId) {
            const filteredJobsites = jobsites.filter(jobsite => jobsite.client === selectedClientId);
            setClientJobsites(filteredJobsites);
        } else {
            setClientJobsites([]);
        }
    }, [selectedClientId, jobsites]);

    const fetchSupervisors = async () => {
        try {
            setLoadingSupervisors(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('http://localhost:5000/api/supervisors', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSupervisors(data);
            }
        } catch (err) {
            console.error('Failed to fetch supervisors:', err);
        } finally {
            setLoadingSupervisors(false);
        }
    };

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const clientsResponse = await fetch('http://localhost:5000/api/clients', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (clientsResponse.ok) {
                const clientsData = await clientsResponse.json();
                setClients(clientsData);
            }

            const jobsitesResponse = await fetch('http://localhost:5000/api/jobsites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (jobsitesResponse.ok) {
                const jobsitesData = await jobsitesResponse.json();
                setJobsites(jobsitesData);
            }
        } catch (err) {
            console.error('Failed to fetch clients or jobsites:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required');
                return;
            }

            // Handle the current jobsite assignment
            const jobsiteResponse = await fetch(`http://localhost:5000/api/jobsites/${jobsiteId}/supervisors`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    supervisors: selectedSupervisors
                })
            });

            if (jobsiteResponse.status === 401) {
                setError('Authentication required');
                return;
            }

            if (!jobsiteResponse.ok) {
                const errorData = await jobsiteResponse.json();
                throw new Error(errorData.error || 'Failed to assign supervisors to current jobsite');
            }

            onClose();
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to assign supervisors');
            console.error('Error assigning supervisors:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSupervisorToggle = (supervisorId: string) => {
        setSelectedSupervisors(prev => {
            if (prev.includes(supervisorId)) {
                return prev.filter(id => id !== supervisorId);
            } else {
                return [...prev, supervisorId];
            }
        });
    };

    const handleOpenSupervisorFormModal = () => {
        openModal('supervisorForm', 
            <SupervisorFormModal 
                isOpen={true} 
                onClose={() => closeModal('supervisorForm')} 
                onSuccess={() => {
                    closeModal('supervisorForm');
                    fetchSupervisors();
                }}
            />
        );
    };

    // Filter supervisors based on search term
    const filteredSupervisors = supervisors.filter(supervisor => 
        searchTerm === '' ||
        `${supervisor.firstName} ${supervisor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supervisor.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Direct rendering instead of using BaseModal
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[65] overflow-y-auto" 
            aria-labelledby="modal-title" 
            role="dialog" 
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div 
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                    aria-hidden="true"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                ></div>

                {/* This element is to trick the browser into centering the modal contents. */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal panel */}
                <div 
                    className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                Assign Supervisors - {jobsiteName}
                            </h3>
                            <button
                                type="button"
                                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                            >
                                <span className="sr-only">Close</span>
                                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.stopPropagation();
                            handleSubmit(e);
                        }} className="mt-4">
                            {error && (
                                <div className="rounded-md bg-red-50 p-4 mb-4">
                                    <div className="text-sm text-red-700">{error}</div>
                                </div>
                            )}

                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                                        Search Supervisors
                                    </label>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenSupervisorFormModal();
                                        }}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <PlusIcon className="h-4 w-4 mr-1" />
                                        Add New Supervisor
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    id="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                    placeholder="Search by name or email"
                                />
                            </div>

                            <div className="mt-4 max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                                {loadingSupervisors ? (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                                    </div>
                                ) : filteredSupervisors.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">
                                        {searchTerm ? 'No supervisors found matching your search' : 'No supervisors found'}
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {filteredSupervisors.map(supervisor => (
                                            <li key={supervisor._id} className="px-4 py-2 hover:bg-gray-50">
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`supervisor-${supervisor._id}`}
                                                        checked={selectedSupervisors.includes(supervisor._id)}
                                                        onChange={() => handleSupervisorToggle(supervisor._id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <label htmlFor={`supervisor-${supervisor._id}`} className="ml-3 block cursor-pointer">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {supervisor.firstName} {supervisor.lastName}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{supervisor.email}</div>
                                                    </label>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="mt-8 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
} 