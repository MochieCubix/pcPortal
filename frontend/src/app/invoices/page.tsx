'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedLayout from '@/components/Layouts/ProtectedLayout';
import CreateInvoiceModal from '@/components/CreateInvoiceModal';
import ViewInvoiceModal from '@/components/ViewInvoiceModal';

interface Invoice {
    _id: string;
    invoiceNumber: string;
    clientId: string;
    clientName?: string;
    jobsiteId?: string;
    jobsiteName?: string;
    total: number;
    status: string;
    dueDate: string;
    createdAt: string;
}

interface Jobsite {
    _id: string;
    name: string;
}

export default function InvoicesPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [jobsites, setJobsites] = useState<Jobsite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/invoices', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch invoices');
            }

            const data = await response.json();

            // Fetch client and jobsite names for each invoice
            const invoicesWithNames = await Promise.all(data.map(async (invoice: Invoice) => {
                const clientResponse = await fetch(`http://localhost:5000/api/clients/${invoice.clientId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (clientResponse.ok) {
                    const clientData = await clientResponse.json();
                    invoice.clientName = clientData.name;
                }

                if (invoice.jobsiteId) {
                    const jobsiteResponse = await fetch(`http://localhost:5000/api/jobsites/${invoice.jobsiteId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (jobsiteResponse.ok) {
                        const jobsiteData = await jobsiteResponse.json();
                        invoice.jobsiteName = jobsiteData.name;
                    }
                }

                return invoice;
            }));

            setInvoices(invoicesWithNames);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    };

    const fetchJobsites = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/jobsites', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch jobsites');
            }

            const data = await response.json();
            setJobsites(data);
        } catch (err) {
            console.error('Error fetching jobsites:', err);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchJobsites();
    }, []);

    const handleSendEmail = async (invoiceId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/invoices/${invoiceId}/send-email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to send invoice email');
            }

            alert('Invoice email sent successfully');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to send invoice email');
        }
    };

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = (
            invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (invoice.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (invoice.jobsiteName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );

        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <p className="text-red-600">Access Denied</p>
                </div>
            </div>
        );
    }

    return (
        <ProtectedLayout>
            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Create Invoice
                        </button>
                    </div>

                    <div className="mb-6 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search invoices..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="overdue">Overdue</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <p>Loading invoices...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    ) : (
                        <div className="bg-white shadow overflow-hidden sm:rounded-md">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Invoice #
                                        </th>
                                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Client
                                        </th>
                                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Jobsite
                                        </th>
                                        <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Due Date
                                        </th>
                                        <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredInvoices.map((invoice) => (
                                        <tr key={invoice._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {invoice.invoiceNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {invoice.clientName || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {invoice.jobsiteName || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                ${invoice.total.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                    ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                    invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'}`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(invoice.dueDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => setSelectedInvoiceId(invoice._id)}
                                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleSendEmail(invoice._id)}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    Send Email
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showCreateModal && (
                <CreateInvoiceModal
                    clientId={user.clientId || ''}
                    jobsites={jobsites}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchInvoices();
                    }}
                />
            )}

            {selectedInvoiceId && (
                <ViewInvoiceModal
                    invoiceId={selectedInvoiceId}
                    onClose={() => setSelectedInvoiceId(null)}
                    onSendEmail={() => handleSendEmail(selectedInvoiceId)}
                />
            )}
        </ProtectedLayout>
    );
} 