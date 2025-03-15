'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UploadInvoicesModal from './UploadInvoicesModal';
import CreateInvoiceModal from './CreateInvoiceModal';

interface Invoice {
    _id: string;
    invoiceNumber: string;
    date: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
    jobsite?: {
        _id: string;
        name: string;
        supervisors: Array<{
            _id: string;
            firstName: string;
            lastName: string;
            email: string;
        }>;
    };
    client: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        company?: string;
    };
    items: Array<{
        description: string;
        quantity: number;
        rate: number;
        amount: number;
    }>;
}

interface InvoiceManagementProps {
    clientId: string;
}

export default function InvoiceManagement({ clientId }: InvoiceManagementProps) {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [jobsites, setJobsites] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Fetch invoices
            const invoicesResponse = await fetch(`http://localhost:5000/api/invoices/client/${clientId}`, {
                headers
            });
            
            if (invoicesResponse.ok) {
                const invoicesData = await invoicesResponse.json();
                setInvoices(invoicesData);
            }

            // Fetch jobsites
            const jobsitesResponse = await fetch(`http://localhost:5000/api/jobsites/client/${clientId}`, {
                headers
            });

            if (jobsitesResponse.ok) {
                const jobsitesData = await jobsitesResponse.json();
                setJobsites(jobsitesData);
            }
        } catch (err) {
            setError('Failed to fetch data');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clientId]);

    const handleSendEmail = async (invoice: Invoice) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/invoices/${invoice._id}/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to send invoice');
            }

            // Show success message
            alert('Invoice sent successfully');
        } catch (err) {
            console.error('Error sending invoice:', err);
            alert('Failed to send invoice');
        }
    };

    const handleSendToJobsite = async (invoice: Invoice) => {
        if (!invoice.jobsite) {
            alert('No jobsite assigned to this invoice');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/invoices/${invoice._id}/send-to-jobsite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to send invoice to jobsite contacts');
            }

            // Show success message
            alert('Invoice sent to all jobsite contacts successfully');
        } catch (err) {
            console.error('Error sending invoice to jobsite:', err);
            alert('Failed to send invoice to jobsite contacts');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-600 text-center p-4">
                {error}
            </div>
        );
    }

    return (
        <div className="bg-white shadow-sm rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Invoices</h3>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Upload Invoices
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Create Invoice
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Invoice Number
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Jobsite
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {invoices.map((invoice) => (
                            <tr key={invoice._id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {invoice.invoiceNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(invoice.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${invoice.amount.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {invoice.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {invoice.jobsite?.name || 'Not assigned'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button
                                        onClick={() => handleSendEmail(invoice)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        Send Email
                                    </button>
                                    {invoice.jobsite && (
                                        <button
                                            onClick={() => handleSendToJobsite(invoice)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Send to Jobsite
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedInvoice(invoice)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreateModal && (
                <CreateInvoiceModal
                    clientId={clientId}
                    jobsites={jobsites}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchData();
                    }}
                />
            )}

            {showUploadModal && (
                <UploadInvoicesModal
                    clientId={clientId}
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={() => {
                        setShowUploadModal(false);
                        fetchData();
                    }}
                />
            )}

            {/* View Invoice Modal will be implemented separately */}
            {selectedInvoice && (
                <div className="fixed z-10 inset-0 overflow-y-auto">
                    {/* Modal implementation will be added */}
                </div>
            )}
        </div>
    );
} 