'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, UserGroupIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon } from '@heroicons/react/24/outline';
import JobsiteFormModal from './JobsiteFormModal';
import SupervisorAssignmentModal from './SupervisorAssignmentModal';
import { useModal } from '@/contexts/ModalContext';
import Link from 'next/link';

interface Supervisor {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
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
            country?: string;
        }
    };
    status: string;
    supervisors: Supervisor[];
}

interface JobsitesModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
}

export default function JobsitesModal({ isOpen, onClose, clientId }: JobsitesModalProps) {
    const [jobsites, setJobsites] = useState<Jobsite[]>([]);
    const [expandedJobsites, setExpandedJobsites] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { openModal, closeModal } = useModal();

    const fetchJobsites = async () => {
        try {
            console.log('Fetching jobsites for client:', clientId);
            setLoading(true);
            
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found');
                setLoading(false);
                return;
            }
            
            const response = await fetch(`http://localhost:5000/api/clients/${clientId}/jobsites`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
            
            if (response.ok) {
                const responseText = await response.text();
                console.log('Raw response text:', responseText);
                
                try {
                    const data = JSON.parse(responseText);
                    console.log('Parsed jobsites data:', data);
                    
                    if (Array.isArray(data)) {
                        console.log('Data is an array with length:', data.length);
                        setJobsites(data);
                    } else {
                        console.error('API response is not an array:', data);
                        setError('API response is not in the expected format');
                    }
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError);
                    setError('Error parsing server response');
                }
            } else {
                console.error('Failed to fetch jobsites:', response.status);
                setError('Failed to fetch jobsites: ' + response.status);
            }
        } catch (err) {
            setError('Failed to fetch jobsites');
            console.error('Failed to fetch jobsites:', err);
        } finally {
            console.log('Setting loading to false');
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('Jobsites state updated:', jobsites);
        // Check if jobsites is an array and has the expected structure
        if (Array.isArray(jobsites)) {
            console.log('Jobsites is an array with length:', jobsites.length);
            if (jobsites.length > 0) {
                console.log('First jobsite structure:', JSON.stringify(jobsites[0], null, 2));
            }
        } else {
            console.error('Jobsites is not an array:', typeof jobsites);
        }
    }, [jobsites]);

    useEffect(() => {
        if (isOpen) {
            console.log('Modal opened, fetching jobsites...');
            fetchJobsites();
        }
    }, [isOpen, clientId]);

    useEffect(() => {
        console.log('Loading state:', loading);
    }, [loading]);

    const toggleJobsiteExpand = (jobsiteId: string) => {
        setExpandedJobsites(prev => ({
            ...prev,
            [jobsiteId]: !prev[jobsiteId]
        }));
    };

    const handleRemoveJobsite = async (jobsiteId: string) => {
        if (!confirm('Are you sure you want to remove this jobsite?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`http://localhost:5000/api/jobsites/${jobsiteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setJobsites(prevJobsites => prevJobsites.filter(jobsite => jobsite._id !== jobsiteId));
            } else {
                throw new Error('Failed to delete jobsite');
            }
        } catch (err) {
            console.error('Error removing jobsite:', err);
            alert('Failed to remove jobsite');
        }
    };

    const handleOpenJobsiteFormModal = (jobsiteId?: string, jobsiteData?: Jobsite) => {
        const modalId = jobsiteId ? `edit-jobsite-${jobsiteId}` : 'add-jobsite';
        openModal(modalId, 
            <JobsiteFormModal 
                isOpen={true} 
                onClose={() => closeModal(modalId)} 
                clientId={clientId}
                jobsiteId={jobsiteId}
                jobsiteData={jobsiteData}
                onSuccess={() => {
                    closeModal(modalId);
                    fetchJobsites();
                }}
            />
        );
    };

    const handleOpenSupervisorAssignmentModal = (jobsiteId: string, jobsiteName: string, currentSupervisors: Supervisor[]) => {
        const modalId = `assign-supervisors-${jobsiteId}`;
        openModal(modalId, 
            <SupervisorAssignmentModal 
                isOpen={true} 
                onClose={() => closeModal(modalId)} 
                jobsiteId={jobsiteId}
                jobsiteName={jobsiteName}
                currentSupervisors={currentSupervisors}
                onSuccess={() => {
                    closeModal(modalId);
                    fetchJobsites();
                }}
            />
        );
    };

    const forceRenderJobsites = () => {
        console.log('Force rendering jobsites:', jobsites);
        setJobsites([...jobsites]);
    };

    // Direct rendering instead of using BaseModal
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

                {/* This element is to trick the browser into centering the modal contents. */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                    <div className="bg-white px-6 pt-5 pb-6 sm:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl leading-6 font-semibold text-gray-900" id="modal-title">
                                Manage Jobsites
                            </h3>
                            <button
                                type="button"
                                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={onClose}
                            >
                                <span className="sr-only">Close</span>
                                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>

                        {/* Debug information & buttons */}
                        {(() => { console.log('Rendering modal, loading:', loading, 'jobsites:', jobsites.length); return null; })()}
                        <div className="flex justify-between mb-4">
                            <div>
                                {/* Debug buttons */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log('Current state:', { loading, jobsites, error });
                                        setLoading(false); // Force loading to false
                                    }}
                                    className="mr-2 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Debug: Set Loading False
                                </button>
                                <button
                                    type="button"
                                    onClick={forceRenderJobsites}
                                    className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Debug: Force Render
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleOpenJobsiteFormModal()}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add Jobsite
                            </button>
                        </div>

                        {/* Content section */}
                        <div className="mt-4">
                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                    <p className="mt-2 text-sm text-gray-500">Loading jobsites...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center text-red-600 py-4">{error}</div>
                            ) : !Array.isArray(jobsites) ? (
                                <div className="text-center text-red-600 py-4">
                                    Error: Jobsites data is not in the expected format
                                </div>
                            ) : jobsites.length === 0 ? (
                                <div className="text-center text-gray-500 py-4">
                                    No jobsites found for this client
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {(() => { console.log('Rendering jobsites list:', jobsites); return null; })()}
                                    {jobsites.map((jobsite) => (
                                        <div key={jobsite._id} className="py-4">
                                            <div className="flex justify-between items-center">
                                                <div 
                                                    className="flex-grow cursor-pointer"
                                                    onClick={() => toggleJobsiteExpand(jobsite._id)}
                                                >
                                                    <div className="flex items-center">
                                                        {expandedJobsites[jobsite._id] ? (
                                                            <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-1" />
                                                        ) : (
                                                            <ChevronRightIcon className="h-5 w-5 text-gray-400 mr-1" />
                                                        )}
                                                        <h4 className="text-lg font-medium text-gray-900">
                                                            <Link href={`/jobsites/${jobsite._id}`} className="text-blue-600 hover:text-blue-900">
                                                                {jobsite.name}
                                                            </Link>
                                                        </h4>
                                                    </div>
                                                    <p className="text-sm text-gray-500 ml-6">
                                                        {jobsite.location?.address?.street || 
                                                            (jobsite.location?.address?.city && jobsite.location.address?.state && 
                                                            `${jobsite.location.address.city}, ${jobsite.location.address.state}`) || 
                                                            'No address provided'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenSupervisorAssignmentModal(jobsite._id, jobsite.name, jobsite.supervisors || []);
                                                        }}
                                                        className="text-gray-600 hover:text-gray-900"
                                                        title="Assign Supervisors"
                                                    >
                                                        <UserGroupIcon className="h-5 w-5" />
                                                    </button>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenJobsiteFormModal(jobsite._id, jobsite);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900"
                                                            title="Edit Jobsite"
                                                        >
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveJobsite(jobsite._id);
                                                        }}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Remove Jobsite"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {expandedJobsites[jobsite._id] && (
                                                <div className="mt-2 ml-6">
                                                    <div className="text-sm text-gray-500">
                                                        <p><strong>Status:</strong> {jobsite.status}</p>
                                                        <p><strong>Supervisors:</strong></p>
                                                        {jobsite.supervisors && jobsite.supervisors.length > 0 ? (
                                                            <ul className="list-disc list-inside ml-4">
                                                                {jobsite.supervisors.map(supervisor => (
                                                                    <li key={supervisor._id}>
                                                                        {supervisor.firstName} {supervisor.lastName} ({supervisor.email})
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="ml-4">No supervisors assigned</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}