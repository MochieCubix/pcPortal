'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedLayout from '@/components/Layouts/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import { EyeIcon, PencilIcon, ArrowDownTrayIcon, ChevronDownIcon, CalendarIcon, XMarkIcon, CheckIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import JobsiteFormModal from '@/components/JobsiteFormModal';
import AddInvoiceModal from '@/components/AddInvoiceModal';
import ViewInvoiceModal from '@/components/ViewInvoiceModal';
import { Popover, Transition } from '@headlessui/react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface Address {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
}

interface ClientData {
    _id: string;
    companyName: string;
    abn: string;
    phone: string;
    address: Address | string;
    suburb?: string;
    postcode?: string;
}

interface Supervisor {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface Jobsite {
    _id: string;
    name: string;
    address: string;
    status: string;
    supervisors: Supervisor[];
}

interface Invoice {
    _id: string;
    invoiceNumber: string;
    date: string;
    amount: number;
    status: string;
    fileUrl?: string;
    jobsite?: {
        _id: string;
        name: string;
    };
}

interface EditFormData {
    [key: string]: {
        invoiceNumber: string;
        date: string;
        amount: number;
        status: string;
    };
}

interface SortConfig {
    key: 'invoiceNumber' | 'date' | 'amount' | 'status' | 'jobsite';
    direction: 'asc' | 'desc';
}

export default function ClientDetailPage() {
    const params = useParams();
    const clientId = params.id as string;
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [client, setClient] = useState<ClientData | null>(null);
    const [jobsites, setJobsites] = useState<Jobsite[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
    const [expandedJobsites, setExpandedJobsites] = useState<Record<string, boolean>>({});
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
    const [isJobsiteModalOpen, setIsJobsiteModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [editingInvoices, setEditingInvoices] = useState<Set<string>>(new Set());
    const [editFormData, setEditFormData] = useState<EditFormData>({});
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isFilteringByDate, setIsFilteringByDate] = useState(false);
    const [selectedViewInvoice, setSelectedViewInvoice] = useState<Invoice | null>(null);
    const [isViewInvoiceModalOpen, setIsViewInvoiceModalOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: 'date',
        direction: 'desc'
    });

    useEffect(() => {
        if (selectedTab === 1) { // 1 is the index for the Invoices tab
            fetchInvoices();
        }
    }, [selectedTab]);

    // Format address for display
    const formatAddress = (address: Address | string | undefined) => {
        if (!address) return 'No address provided';
        if (typeof address === 'string') return address;
        
        const { street, city, state, zipCode, country } = address;
        const parts = [];
        if (street) parts.push(street);
        if (city) parts.push(city);
        if (state) parts.push(state);
        if (zipCode) parts.push(zipCode);
        if (country) parts.push(country);
        
        return parts.length > 0 ? parts.join(', ') : 'No address provided';
    };

    useEffect(() => {
        const fetchClientData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                // Fetch client details
                const clientResponse = await fetch(`http://localhost:5000/api/clients/${clientId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (clientResponse.status === 401) {
                    localStorage.removeItem('token');
                    router.push('/login');
                    return;
                }

                if (!clientResponse.ok) {
                    throw new Error('Failed to fetch client');
                }

                const clientData = await clientResponse.json();
                setClient(clientData);

                // Fetch client jobsites - this endpoint is correct
                const jobsitesResponse = await fetch(`http://localhost:5000/api/clients/${clientId}/jobsites`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (jobsitesResponse.ok) {
                    const jobsitesData = await jobsitesResponse.json();
                    setJobsites(jobsitesData);
                }

                // Fetch client invoices - using the correct endpoint
                const invoicesResponse = await fetch(`http://localhost:5000/api/invoices`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (invoicesResponse.ok) {
                    const data = await invoicesResponse.json();
                    // Filter invoices for this client and normalize the data
                    const clientInvoices = data
                        .filter((invoice: any) => invoice.clientId === clientId || invoice.client === clientId)
                        .map((invoice: any) => ({
                            _id: invoice._id || `temp-${Date.now()}`,
                            invoiceNumber: invoice.invoiceNumber || '',
                            date: invoice.issueDate || invoice.date || new Date().toISOString(),
                            amount: typeof invoice.total === 'number' ? invoice.total : 
                                   typeof invoice.amount === 'number' ? invoice.amount : 0,
                            status: invoice.status || 'draft',
                            fileUrl: invoice.fileUrl || '',
                            jobsite: invoice.jobsite
                        }));
                    setInvoices(clientInvoices);
                } else if (invoicesResponse.status === 404) {
                    // If the endpoint is not found yet (during development), use mock data
                    console.warn('Invoices API endpoint not found, using mock data');
                    const mockInvoices = [
                        {
                            _id: '1',
                            invoiceNumber: 'INV-001',
                            date: new Date().toISOString(),
                            amount: 1500.00,
                            status: 'paid',
                            fileUrl: '',
                            jobsite: {
                                _id: '1',
                                name: 'Job Site 1'
                            }
                        },
                        {
                            _id: '2',
                            invoiceNumber: 'INV-002',
                            date: new Date().toISOString(),
                            amount: 2500.00,
                            status: 'pending',
                            fileUrl: '',
                            jobsite: {
                                _id: '2',
                                name: 'Job Site 2'
                            }
                        },
                        {
                            _id: '3',
                            invoiceNumber: 'INV-003',
                            date: new Date().toISOString(),
                            amount: 3500.00,
                            status: 'overdue',
                            fileUrl: '',
                            jobsite: {
                                _id: '3',
                                name: 'Job Site 3'
                            }
                        }
                    ];
                    
                    setInvoices(mockInvoices);
                }

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch client data');
            } finally {
                setLoading(false);
            }
        };

        if (clientId) {
            fetchClientData();
        }
    }, [clientId, router]);

    // Filter invoices by date range
    useEffect(() => {
        if (!isFilteringByDate || !dateRange?.from) {
            setFilteredInvoices(invoices);
            return;
        }

        const filtered = invoices.filter(invoice => {
            const invoiceDate = new Date(invoice.date);
            
            // If only "from" date is selected
            if (dateRange.from && !dateRange.to) {
                return invoiceDate >= dateRange.from;
            }
            
            // If both "from" and "to" dates are selected
            if (dateRange.from && dateRange.to) {
                return invoiceDate >= dateRange.from && invoiceDate <= dateRange.to;
            }
            
            return true;
        });
        
        setFilteredInvoices(filtered);
    }, [invoices, dateRange, isFilteringByDate]);

    const toggleJobsiteExpand = (jobsiteId: string) => {
        setExpandedJobsites(prev => ({
            ...prev,
            [jobsiteId]: !prev[jobsiteId]
        }));
    };

    const toggleInvoiceSelection = (invoiceId: string) => {
        setSelectedInvoices(prev => 
            prev.includes(invoiceId) 
                ? prev.filter(id => id !== invoiceId)
                : [...prev, invoiceId]
        );
    };

    const handleSelectAllInvoices = () => {
        if (selectedInvoices.length === invoices.length) {
            setSelectedInvoices([]);
        } else {
            setSelectedInvoices(invoices.map(invoice => invoice._id));
        }
    };

    const handleMultiDownload = () => {
        // Implement multi-download functionality
        alert(`Downloading ${selectedInvoices.length} invoices`);
    };

    const handleMultiSend = () => {
        // Implement multi-send functionality
        alert(`Sending ${selectedInvoices.length} invoices`);
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            return date.toLocaleDateString();
        } catch (error) {
            return 'Invalid Date';
        }
    };

    // Function to handle double click on a cell
    const handleDoubleClick = (invoice: Invoice, field: keyof typeof invoice) => {
        const newEditingInvoices = new Set(editingInvoices);
        newEditingInvoices.add(invoice._id);
        setEditingInvoices(newEditingInvoices);
        
        // Initialize edit form data for this invoice if not exists
        if (!editFormData[invoice._id]) {
            let formattedDate;
            try {
                const date = new Date(invoice.date);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toISOString().split('T')[0];
                } else {
                    formattedDate = new Date().toISOString().split('T')[0];
                }
            } catch (error) {
                formattedDate = new Date().toISOString().split('T')[0];
            }
            
            setEditFormData(prev => ({
                ...prev,
                [invoice._id]: {
                    invoiceNumber: invoice.invoiceNumber || '',
                    date: formattedDate,
                    amount: Number(invoice.amount) || 0,
                    status: invoice.status || 'draft'
                }
            }));
        }
    };

    // Function to handle key press in editable cell
    const handleKeyPress = async (e: React.KeyboardEvent, invoiceId: string) => {
        if (e.key === 'Enter') {
            await saveInvoice(invoiceId);
        } else if (e.key === 'Escape') {
            cancelEditing(invoiceId);
        }
    };

    // Function to save all edited invoices
    const saveAllInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const promises = Array.from(editingInvoices).map(invoiceId => 
                fetch(`http://localhost:5000/api/invoices/${invoiceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(editFormData[invoiceId])
                })
            );

            await Promise.all(promises);
            
            // Update local state
            setInvoices(prevInvoices => 
                prevInvoices.map(invoice => 
                    editingInvoices.has(invoice._id) 
                        ? { ...invoice, ...editFormData[invoice._id] }
                        : invoice
                )
            );
            
            // Clear editing state
            setEditingInvoices(new Set());
            setEditFormData({});
            
            // Refresh invoices
            fetchInvoices();
        } catch (error) {
            console.error('Error saving invoices:', error);
        }
    };

    // Cancel editing for a specific invoice
    const cancelEditing = (invoiceId: string) => {
        const newEditingInvoices = new Set(editingInvoices);
        newEditingInvoices.delete(invoiceId);
        setEditingInvoices(newEditingInvoices);
        
        setEditFormData(prev => {
            const newData = { ...prev };
            delete newData[invoiceId];
            return newData;
        });
    };

    // Cancel all edits
    const cancelAllEdits = () => {
        setEditingInvoices(new Set());
        setEditFormData({});
    };

    // Save edited invoice
    const saveInvoice = async (invoiceId: string) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            // Format the data before sending
            const dateValue = editFormData[invoiceId].date;
            let formattedDate;
            try {
                // Handle both date string formats (YYYY-MM-DD and ISO)
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toISOString();
                } else {
                    throw new Error('Invalid date');
                }
            } catch (error) {
                console.error('Date conversion error:', error);
                alert('Please enter a valid date');
                return;
            }

            const formData = {
                invoiceNumber: editFormData[invoiceId].invoiceNumber,
                issueDate: formattedDate,
                amount: Number(editFormData[invoiceId].amount) || 0,
                status: editFormData[invoiceId].status
            };

            console.log('Sending data:', formData);

            const response = await fetch(`http://localhost:5000/api/invoices/${invoiceId}`, {
                method: 'PUT',
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
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update invoice');
            }

            // Update the invoice in the local state
            setInvoices(prevInvoices => 
                prevInvoices.map(invoice => {
                    if (invoice._id === invoiceId) {
                        const updatedInvoice: Invoice = {
                            ...invoice,
                            invoiceNumber: formData.invoiceNumber,
                            date: formData.issueDate,
                            amount: formData.amount,
                            status: formData.status
                        };
                        return updatedInvoice;
                    }
                    return invoice;
                })
            );

            // Stop editing
            cancelEditing(invoiceId);
            
            // Refresh invoices to ensure we have the latest data
            await fetchInvoices();
        } catch (err) {
            console.error('Error updating invoice:', err);
            alert(err instanceof Error ? err.message : 'Failed to update invoice');
        }
    };

    // Handle PDF parse
    const handlePdfParse = async (invoice: Invoice) => {
        try {
            const token = localStorage.getItem('token');
            if (!token || !invoice.fileUrl) {
                alert('No file URL available for this invoice');
                return;
            }

            // Extract filename from fileUrl
            const filename = invoice.fileUrl.split('/').pop();
            if (!filename) {
                alert('Invalid file URL');
                return;
            }

            console.log('Parsing file:', filename);

            const response = await fetch(`http://localhost:5000/api/invoices/parse-existing`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename,
                    clientId: clientId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to parse PDF');
            }

            const data = await response.json();
            console.log('Parsed data:', data);

            if (data.success && data.data) {
                // Initialize edit mode with parsed data
                handleDoubleClick(invoice, 'invoiceNumber');
                setEditFormData(prev => ({
                    ...prev,
                    [invoice._id]: {
                        ...prev[invoice._id],
                        invoiceNumber: data.data.invoiceNumber || prev[invoice._id]?.invoiceNumber || '',
                        amount: data.data.amount || prev[invoice._id]?.amount || 0,
                        date: data.data.date || prev[invoice._id]?.date || new Date().toISOString().split('T')[0]
                    }
                }));
            } else {
                throw new Error('No data found in PDF');
            }
        } catch (error) {
            console.error('Error parsing PDF:', error);
            alert(error instanceof Error ? error.message : 'Failed to parse PDF');
        }
    };

    // Clear date filter
    const clearDateFilter = () => {
        setDateRange(undefined);
        setIsFilteringByDate(false);
    };

    // Fetch invoices function
    const fetchInvoices = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await fetch(`http://localhost:5000/api/invoices`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Filter invoices for this client, accepting both object and string client IDs
                const clientInvoices = data.filter((invoice: any) => {
                    if (invoice.client && typeof invoice.client === 'object') {
                        return invoice.client._id === clientId;
                    }
                    return invoice.client === clientId;
                });

                console.log('Filtered invoices:', clientInvoices);
                setInvoices(clientInvoices);
                setFilteredInvoices(clientInvoices);
            }
        } catch (err) {
            console.error('Failed to fetch invoices:', err);
        }
    };

    // Handle view invoice
    const handleViewInvoice = (invoice: Invoice) => {
        setSelectedViewInvoice(invoice);
        setIsViewInvoiceModalOpen(true);
    };

    // Handle download invoice
    const handleDownloadInvoice = (invoice: Invoice) => {
        if (invoice.fileUrl) {
            // Create a link element
            const link = document.createElement('a');
            link.href = invoice.fileUrl;
            link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Add handleSort function
    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Add sorting effect
    useEffect(() => {
        const sortedInvoices = [...filteredInvoices].sort((a, b) => {
            if (sortConfig.key === 'jobsite') {
                const aName = a.jobsite?.name || '';
                const bName = b.jobsite?.name || '';
                return sortConfig.direction === 'asc' 
                    ? aName.localeCompare(bName)
                    : bName.localeCompare(aName);
            }
            
            if (sortConfig.key === 'date') {
                const aDate = new Date(a.date).getTime();
                const bDate = new Date(b.date).getTime();
                return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
            }
            
            if (sortConfig.key === 'amount') {
                return sortConfig.direction === 'asc' 
                    ? a.amount - b.amount
                    : b.amount - a.amount;
            }
            
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            
            return 0;
        });
        
        setFilteredInvoices(sortedInvoices);
    }, [sortConfig]);

    // Access denied state
    if (!user || user.role !== 'admin') {
        return (
            <ClientLayout>
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-lg shadow-md">
                        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                        <p className="mt-2">You do not have permission to view this page.</p>
                        <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            </ClientLayout>
        );
    }

    if (loading) {
        return (
            <ClientLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </ClientLayout>
        );
    }

    return (
        <ClientLayout>
            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">{client?.companyName}</h1>
                        <Link
                            href={`/clients/${clientId}/edit`}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Edit Client
                        </Link>
                    </div>

                    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                        <div className="px-4 py-5 sm:px-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Client Information</h3>
                        </div>
                        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                            <dl className="sm:divide-y sm:divide-gray-200">
                                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Company name</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client?.companyName}</dd>
                                </div>
                                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">ABN</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client?.abn}</dd>
                                </div>
                                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Contact number</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client?.phone}</dd>
                                </div>
                                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                        {formatAddress(client?.address)}
                                    </dd>
                                </div>
                                {client?.suburb && (
                                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-gray-500">Suburb</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client.suburb}</dd>
                                    </div>
                                )}
                                {client?.postcode && (
                                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-gray-500">Postcode</dt>
                                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client.postcode}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>

                    <Tab.Group onChange={setSelectedTab}>
                        <Tab.List className="flex space-x-1 rounded-xl bg-blue-50 p-1 mb-6">
                            <Tab className={({ selected }) =>
                                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                                ${selected 
                                    ? 'bg-white text-blue-700 shadow' 
                                    : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
                                }`
                            }>
                                Jobsites
                            </Tab>
                            <Tab className={({ selected }) =>
                                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                                ${selected 
                                    ? 'bg-white text-blue-700 shadow' 
                                    : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
                                }`
                            }>
                                Invoices
                            </Tab>
                        </Tab.List>
                        <Tab.Panels>
                            <Tab.Panel>
                                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                    <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">Assigned Jobsites</h3>
                                        <button
                                            onClick={() => setIsJobsiteModalOpen(true)}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                        >
                                            Add Jobsite
                                        </button>
                                    </div>
                                    <div className="border-t border-gray-200">
                                        {jobsites.length === 0 ? (
                                            <div className="text-center py-6 text-gray-500">
                                                No jobsites assigned to this client
                                            </div>
                                        ) : (
                                            <ul className="divide-y divide-gray-200">
                                                {jobsites.map((jobsite) => (
                                                    <li key={jobsite._id} className="px-4 py-4">
                                                        <div 
                                                            className="flex justify-between items-center cursor-pointer"
                                                            onClick={() => toggleJobsiteExpand(jobsite._id)}
                                                        >
                                                            <div>
                                                                <h4 className="text-lg font-medium text-gray-900">{jobsite.name}</h4>
                                                                <p className="text-sm text-gray-500">{jobsite.address}</p>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                    jobsite.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {jobsite.status}
                                                                </span>
                                                                <ChevronDownIcon 
                                                                    className={`h-5 w-5 ml-2 text-gray-500 transition-transform ${expandedJobsites[jobsite._id] ? 'transform rotate-180' : ''}`} 
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        {expandedJobsites[jobsite._id] && (
                                                            <div className="mt-4 pl-4 border-l-2 border-gray-200">
                                                                <h5 className="text-sm font-medium text-gray-700 mb-2">Assigned Supervisors:</h5>
                                                                {jobsite.supervisors.length === 0 ? (
                                                                    <p className="text-sm text-gray-500">No supervisors assigned</p>
                                                                ) : (
                                                                    <ul className="space-y-2">
                                                                        {jobsite.supervisors.map((supervisor) => (
                                                                            <li key={supervisor._id} className="text-sm text-gray-600">
                                                                                {supervisor.firstName} {supervisor.lastName} ({supervisor.email})
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </Tab.Panel>
                            <Tab.Panel>
                                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                    <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">Invoices</h3>
                                        <div className="flex space-x-2">
                                            {editingInvoices.size > 0 && (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={saveAllInvoices}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                                                    >
                                                        Save All Changes
                                                    </button>
                                                    <button
                                                        onClick={cancelAllEdits}
                                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                                    >
                                                        Cancel All
                                                    </button>
                                                </div>
                                            )}
                                            <Popover className="relative">
                                                {({ open }: { open: boolean }) => (
                                                    <>
                                                        <Popover.Button
                                                        className={`inline-flex items-center px-3 py-1.5 border ${isFilteringByDate ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50`}
                                                        >
                                                            <CalendarIcon className="h-4 w-4 mr-1" />
                                                            <span>
                                                                {isFilteringByDate && dateRange?.from
                                                                    ? `${dateRange.from ? formatDate(dateRange.from.toISOString()) : ''} ${dateRange.to ? ' - ' + formatDate(dateRange.to.toISOString()) : ''}`
                                                                    : 'Filter by Date'}
                                                            </span>
                                                            {isFilteringByDate && (
                                                                <span 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        clearDateFilter();
                                                                    }}
                                                                    className="ml-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                                                                >
                                                                    <XMarkIcon className="h-4 w-4" />
                                                                </span>
                                                            )}
                                                        </Popover.Button>
                                                        <Transition
                                                            as={Fragment}
                                                            enter="transition ease-out duration-200"
                                                            enterFrom="opacity-0 translate-y-1"
                                                            enterTo="opacity-100 translate-y-0"
                                                            leave="transition ease-in duration-150"
                                                            leaveFrom="opacity-100 translate-y-0"
                                                            leaveTo="opacity-0 translate-y-1"
                                                        >
                                                            <Popover.Panel className="absolute z-10 mt-1 transform px-4 sm:px-0 lg:max-w-3xl right-0">
                                                                <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                                                                    <div className="relative bg-white p-4">
                                                                        <DayPicker
                                                                            mode="range"
                                                                            selected={dateRange}
                                                                            onSelect={setDateRange}
                                                                            footer={
                                                                                <div className="mt-2 text-center">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setIsFilteringByDate(!!dateRange?.from);
                                                                                        }}
                                                                                        className="px-2 py-1 bg-blue-500 text-white text-sm rounded"
                                                                                    >
                                                                                        Apply Filter
                                                                                    </button>
                                                                                </div>
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </Popover.Panel>
                                                        </Transition>
                                                    </>
                                                )}
                                            </Popover>

                                            {selectedInvoices.length > 0 && (
                                                <>
                                                    <button
                                                        onClick={handleMultiDownload}
                                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                                    >
                                                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                                                        Download ({selectedInvoices.length})
                                                    </button>
                                                    <button
                                                        onClick={handleMultiSend}
                                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                                    >
                                                        Send ({selectedInvoices.length})
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setIsInvoiceModalOpen(true)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                            >
                                                Add Invoice
                                            </button>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-200">
                                        {loading ? (
                                            <div className="text-center py-6 text-gray-500">
                                                Loading invoices...
                                            </div>
                                        ) : filteredInvoices.length === 0 ? (
                                            <div className="text-center py-6 text-gray-500">
                                                {isFilteringByDate 
                                                    ? 'No invoices found for the selected date range' 
                                                    : 'No invoices found for this client'}
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                                                        checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                                                                        onChange={handleSelectAllInvoices}
                                                                    />
                                                                </div>
                                                            </th>
                                                            <th 
                                                                scope="col" 
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                                onClick={() => handleSort('invoiceNumber')}
                                                            >
                                                                <div className="flex items-center">
                                                                    Inv No.
                                                                    {sortConfig.key === 'invoiceNumber' && (
                                                                        <span className="ml-2">
                                                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                            <th 
                                                                scope="col" 
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                                onClick={() => handleSort('jobsite')}
                                                            >
                                                                <div className="flex items-center">
                                                                    Jobsite
                                                                    {sortConfig.key === 'jobsite' && (
                                                                        <span className="ml-2">
                                                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                            <th 
                                                                scope="col" 
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                                onClick={() => handleSort('date')}
                                                            >
                                                                <div className="flex items-center">
                                                                    Date
                                                                    {sortConfig.key === 'date' && (
                                                                        <span className="ml-2">
                                                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                            <th 
                                                                scope="col" 
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                                onClick={() => handleSort('amount')}
                                                            >
                                                                <div className="flex items-center">
                                                                    Amount
                                                                    {sortConfig.key === 'amount' && (
                                                                        <span className="ml-2">
                                                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                            <th 
                                                                scope="col" 
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                                onClick={() => handleSort('status')}
                                                            >
                                                                <div className="flex items-center">
                                                                    Status
                                                                    {sortConfig.key === 'status' && (
                                                                        <span className="ml-2">
                                                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                            <th scope="col" className="relative px-6 py-3">
                                                                <span className="sr-only">Actions</span>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {filteredInvoices.map((invoice) => (
                                                            <tr key={invoice._id}>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                                                        checked={selectedInvoices.includes(invoice._id)}
                                                                        onChange={() => toggleInvoiceSelection(invoice._id)}
                                                                    />
                                                                </td>
                                                                <td 
                                                                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                                                                    onDoubleClick={() => handleDoubleClick(invoice, 'invoiceNumber')}
                                                                >
                                                                    {editingInvoices.has(invoice._id) ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editFormData[invoice._id].invoiceNumber}
                                                                            onChange={(e) => setEditFormData(prev => ({
                                                                                ...prev,
                                                                                [invoice._id]: {
                                                                                    ...prev[invoice._id],
                                                                                    invoiceNumber: e.target.value
                                                                                }
                                                                            }))}
                                                                            onKeyDown={(e) => handleKeyPress(e, invoice._id)}
                                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                                            autoFocus
                                                                        />
                                                                    ) : (
                                                                        invoice.invoiceNumber
                                                                    )}
                                                                </td>
                                                                <td 
                                                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                                                >
                                                                    {invoice.jobsite?.name || 'No jobsite'}
                                                                </td>
                                                                <td 
                                                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                                                                    onDoubleClick={() => handleDoubleClick(invoice, 'date')}
                                                                >
                                                                    {editingInvoices.has(invoice._id) ? (
                                                                        <input
                                                                            type="date"
                                                                            value={editFormData[invoice._id].date}
                                                                            onChange={(e) => setEditFormData(prev => ({
                                                                                ...prev,
                                                                                [invoice._id]: {
                                                                                    ...prev[invoice._id],
                                                                                    date: e.target.value
                                                                                }
                                                                            }))}
                                                                            onKeyDown={(e) => handleKeyPress(e, invoice._id)}
                                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                                        />
                                                                    ) : (
                                                                        formatDate(invoice.date)
                                                                    )}
                                                                </td>
                                                                <td 
                                                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                                                                    onDoubleClick={() => handleDoubleClick(invoice, 'amount')}
                                                                >
                                                                    {editingInvoices.has(invoice._id) ? (
                                                                        <div className="relative rounded-md shadow-sm">
                                                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                                                <span className="text-gray-500 sm:text-sm">$</span>
                                                                            </div>
                                                                            <input
                                                                                type="number"
                                                                                value={editFormData[invoice._id].amount}
                                                                                onChange={(e) => setEditFormData(prev => ({
                                                                                    ...prev,
                                                                                    [invoice._id]: {
                                                                                        ...prev[invoice._id],
                                                                                        amount: Number(e.target.value) || 0
                                                                                    }
                                                                                }))}
                                                                                onKeyDown={(e) => handleKeyPress(e, invoice._id)}
                                                                                className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                                                step="0.01"
                                                                                min="0"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        `$${(invoice.amount || 0).toFixed(2)}`
                                                                    )}
                                                                </td>
                                                                <td 
                                                                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                                                                    onDoubleClick={() => handleDoubleClick(invoice, 'status')}
                                                                >
                                                                    {editingInvoices.has(invoice._id) ? (
                                                                        <select
                                                                            value={editFormData[invoice._id].status}
                                                                            onChange={(e) => setEditFormData(prev => ({
                                                                                ...prev,
                                                                                [invoice._id]: {
                                                                                    ...prev[invoice._id],
                                                                                    status: e.target.value
                                                                                }
                                                                            }))}
                                                                            onKeyDown={(e) => handleKeyPress(e, invoice._id)}
                                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                                        >
                                                                            <option value="draft">Draft</option>
                                                                            <option value="sent">Sent</option>
                                                                            <option value="paid">Paid</option>
                                                                            <option value="overdue">Overdue</option>
                                                                            <option value="cancelled">Cancelled</option>
                                                                        </select>
                                                                    ) : (
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                                                            invoice.status === 'pending' || invoice.status === 'sent' ? 'bg-yellow-100 text-yellow-800' : 
                                                                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                        }`}>
                                                                            {invoice.status}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    {editingInvoices.has(invoice._id) ? (
                                                                        <div className="flex justify-end space-x-2">
                                                                            <button 
                                                                                onClick={() => saveInvoice(invoice._id)}
                                                                                className="text-green-600 hover:text-green-900"
                                                                                title="Save"
                                                                            >
                                                                                <CheckIcon className="h-5 w-5" />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => cancelEditing(invoice._id)}
                                                                                className="text-red-600 hover:text-red-900"
                                                                                title="Cancel"
                                                                            >
                                                                                <XMarkIcon className="h-5 w-5" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex justify-end space-x-2">
                                                                            <button 
                                                                                onClick={() => handleViewInvoice(invoice)}
                                                                                className="text-blue-600 hover:text-blue-900"
                                                                                title="View Invoice"
                                                                            >
                                                                                <EyeIcon className="h-5 w-5" />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleDownloadInvoice(invoice)}
                                                                                className="text-blue-600 hover:text-blue-900"
                                                                                title="Download Invoice"
                                                                            >
                                                                                <ArrowDownTrayIcon className="h-5 w-5" />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handlePdfParse(invoice)}
                                                                                className="text-blue-600 hover:text-blue-900"
                                                                                title="Parse PDF"
                                                                            >
                                                                                <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleDoubleClick(invoice, 'invoiceNumber')}
                                                                                className="text-blue-600 hover:text-blue-900"
                                                                                title="Edit Invoice"
                                                                            >
                                                                                <PencilIcon className="h-5 w-5" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Tab.Panel>
                        </Tab.Panels>
                    </Tab.Group>
                </div>
            </div>

            <JobsiteFormModal 
                isOpen={isJobsiteModalOpen} 
                onClose={() => setIsJobsiteModalOpen(false)} 
                clientId={clientId}
                onSuccess={() => {
                    // Refetch jobsites after adding a new one
                    const fetchJobsites = async () => {
                        try {
                            const token = localStorage.getItem('token');
                            if (!token) return;
                            
                            // This endpoint is correct
                            const response = await fetch(`http://localhost:5000/api/clients/${clientId}/jobsites`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                setJobsites(data);
                            }
                        } catch (err) {
                            console.error('Failed to fetch jobsites:', err);
                        }
                    };
                    
                    fetchJobsites();
                }}
            />

            <AddInvoiceModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                clientId={clientId}
                jobsites={jobsites}
                onSuccess={fetchInvoices}
            />

            <ViewInvoiceModal
                isOpen={isViewInvoiceModalOpen}
                onClose={() => setIsViewInvoiceModalOpen(false)}
                invoice={selectedViewInvoice}
            />
        </ClientLayout>
    );
} 