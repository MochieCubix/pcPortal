'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedLayout from '@/components/Layouts/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';
import { EyeIcon, PencilIcon, ArrowDownTrayIcon, ChevronDownIcon, CalendarIcon, XMarkIcon, CheckIcon, DocumentMagnifyingGlassIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import JobsitesModal from '@/components/JobsitesModal';
import { AddInvoiceModal } from '@/components/AddInvoiceModal';
import ViewInvoiceModal from '@/components/ViewInvoiceModal';
import PDFViewerModal from '@/components/PDFViewerModal';
import { Popover, Transition } from '@headlessui/react';
import { DayPicker, DateRange } from 'react-day-picker';
import InvoiceTable from '@/components/InvoiceTable';
import 'react-day-picker/dist/style.css';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

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
    paymentTerms?: {
        days: number;
        type: 'days' | 'EOM';
        description: string;
    };
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
    status: 'pending' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
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
        status: 'pending' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
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
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
    const [isJobsitesModalOpen, setIsJobsitesModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [editingInvoices, setEditingInvoices] = useState<Set<string>>(new Set());
    const [editFormData, setEditFormData] = useState<EditFormData>({});
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isFilteringByDate, setIsFilteringByDate] = useState(false);
    const [selectedViewInvoice, setSelectedViewInvoice] = useState<Invoice | null>(null);
    const [isViewInvoiceModalOpen, setIsViewInvoiceModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: 'date',
        direction: 'desc'
    });
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfTitle, setPdfTitle] = useState<string>('');

    // Fetch jobsites for the client
    const fetchJobsites = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await fetch(`http://localhost:5000/api/clients/${clientId}/jobsites`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setJobsites(data);
            } else {
                console.error('Failed to fetch jobsites');
            }
        } catch (err) {
            console.error('Error fetching jobsites:', err);
        }
    };

    // Refresh invoices when the component mounts and when the invoice modal closes
    useEffect(() => {
        if (!isInvoiceModalOpen) {
            console.log('Invoice modal closed, refreshing invoices');
            fetchInvoices();
        }
    }, [isInvoiceModalOpen]);

    // Initial data fetch
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

                // Fetch jobsites for this client
                await fetchJobsites();

                // Fetch client invoices
                await fetchInvoices();

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

    // Update the filtering logic to include status filter
    useEffect(() => {
        // First, filter by date if date filter is active
        let filtered = invoices;
        
        if (isFilteringByDate && dateRange?.from) {
            filtered = filtered.filter(invoice => {
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
        }
        
        // Then, filter by search term if there is one
        if (searchTerm.trim()) {
            filtered = filterInvoicesBySearch(filtered, searchTerm);
        }
        
        // Then, filter by status if not 'all'
        if (statusFilter !== 'all') {
            filtered = filtered.filter(invoice => invoice.status === statusFilter);
        }
        
        setFilteredInvoices(filtered);
    }, [invoices, dateRange, isFilteringByDate, searchTerm, statusFilter]);

    const handleSelectAllInvoices = () => {
        if (selectedInvoices.length === filteredInvoices.length) {
            setSelectedInvoices([]);
        } else {
            setSelectedInvoices(filteredInvoices.map(invoice => invoice._id));
        }
    };

    const toggleInvoiceSelection = (invoiceId: string) => {
        setSelectedInvoices(prev => 
            prev.includes(invoiceId) 
                ? prev.filter(id => id !== invoiceId)
                : [...prev, invoiceId]
        );
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
                console.log('Invalid date for formatting:', dateString);
                return 'Invalid Date';
            }
            // Format as DD/MM/YYYY
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.log('Error formatting date:', error);
            return 'Invalid Date';
        }
    };

    // Function to handle double click on a cell
    const handleDoubleClick = (invoice: Invoice, field: keyof typeof invoice) => {
        // Add the invoice to the editing set
        const newEditingInvoices = new Set(editingInvoices);
        newEditingInvoices.add(invoice._id);
        setEditingInvoices(newEditingInvoices);
        
        // Initialize edit form data for this invoice if not exists
        if (!editFormData[invoice._id]) {
            // For date fields, we need to convert from DD/MM/YYYY to YYYY-MM-DD
            let htmlDateFormat = '';
            
            // Try to parse the date
            try {
                // Check if it's in DD/MM/YYYY format
                const dateParts = invoice.date.split('/');
                if (dateParts.length === 3) {
                    // Convert DD/MM/YYYY to YYYY-MM-DD
                    htmlDateFormat = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                } else {
                    // Try to parse as a regular date
                    const dateObj = new Date(invoice.date);
                    if (!isNaN(dateObj.getTime())) {
                        htmlDateFormat = dateObj.toISOString().split('T')[0];
                    } else {
                        // Default to today if parsing fails
                        htmlDateFormat = new Date().toISOString().split('T')[0];
                    }
                }
            } catch (error) {
                console.error('Error parsing date:', error);
                htmlDateFormat = new Date().toISOString().split('T')[0];
            }
            
            console.log('Date for editing:', invoice.date, 'converted to:', htmlDateFormat);
            
            // Set the edit form data
            setEditFormData(prev => ({
                ...prev,
                [invoice._id]: {
                    invoiceNumber: invoice.invoiceNumber || '',
                    date: htmlDateFormat,
                    amount: Number(invoice.amount) || 0,
                    status: (invoice.status || 'pending') as 'pending' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
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
            await fetchInvoices();
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
            if (!editFormData[invoiceId]) {
                console.error('No edit data found for invoice:', invoiceId);
                return;
            }

            // Get the date from the form (in YYYY-MM-DD format from the HTML date input)
            const formattedDate = editFormData[invoiceId].date;
            console.log('Date from form (YYYY-MM-DD):', formattedDate);

            const invoiceData = {
                invoiceNumber: editFormData[invoiceId].invoiceNumber,
                date: formattedDate, // Send in YYYY-MM-DD format to the API
                amount: Number(editFormData[invoiceId].amount) || 0,
                status: editFormData[invoiceId].status as 'pending' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
            };

            console.log('Sending data to API:', invoiceData);

            const response = await fetch(`http://localhost:5000/api/invoices/${invoiceId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invoiceData)
            });

            if (!response.ok) {
                throw new Error('Failed to update invoice');
            }

            // Update local state
            setInvoices(prevInvoices => 
                prevInvoices.map(invoice => {
                    if (invoice._id === invoiceId) {
                        const updatedInvoice: Invoice = {
                            ...invoice,
                            invoiceNumber: invoiceData.invoiceNumber,
                            date: invoiceData.date,
                            amount: invoiceData.amount,
                            status: invoiceData.status
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

    // Handle marking invoice as paid
    const handleMarkAsPaid = async (invoice: Invoice) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`http://localhost:5000/api/invoices/${invoice._id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'paid' })
            });

            if (!response.ok) {
                throw new Error('Failed to update invoice status');
            }

            // Update local state
            setInvoices(prevInvoices => 
                prevInvoices.map(inv => {
                    if (inv._id === invoice._id) {
                        return { ...inv, status: 'paid' };
                    }
                    return inv;
                })
            );

            // Refresh invoices to ensure we have the latest data
            await fetchInvoices();
        } catch (error) {
            console.error('Error marking invoice as paid:', error);
            alert(error instanceof Error ? error.message : 'Failed to update invoice status');
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
            console.log('Refreshing invoices for client:', clientId);
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            // Fetch jobsites first to ensure they're available
            await fetchJobsites();

            // Fetch invoices using the client-specific endpoint
            console.log('Fetching invoices for client ID:', clientId);
            const response = await fetch(`http://localhost:5000/api/invoices/client/${clientId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                router.push('/login');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch invoices');
            }

            const data = await response.json();
            console.log('Client-specific invoices received:', data.length);
            
            // Map the invoices to our expected format
            const clientInvoices = data.map((invoice: any) => ({
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber || '',
                date: invoice.issueDate || invoice.date || new Date().toISOString(),
                amount: typeof invoice.total === 'number' ? invoice.total : 
                       typeof invoice.amount === 'number' ? invoice.amount : 0,
                status: (invoice.status || 'pending') as 'pending' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
                fileUrl: invoice.fileUrl || '',
                jobsite: invoice.jobsite
            }));
            
            console.log('Processed invoices for client:', clientInvoices.length);
            
            // Update the state with the new invoices
            setInvoices(clientInvoices);
            setFilteredInvoices(clientInvoices);
            
            console.log('Invoice state updated successfully');
        } catch (err) {
            setError('Failed to fetch invoices');
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle view invoice
    const handleViewInvoice = (invoice: Invoice) => {
        if (invoice.fileUrl) {
            // Show PDF in modal
            setPdfUrl(invoice.fileUrl);
            setPdfTitle(`Invoice #${invoice.invoiceNumber}`);
            setShowPdfModal(true);
        } else {
            // Show invoice details if no PDF is available
            setSelectedViewInvoice(invoice);
            setIsViewInvoiceModalOpen(true);
        }
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

    // Calculate total amount owing
    const calculateTotalOwing = () => {
        return filteredInvoices
            .filter(invoice => invoice.status !== 'paid')
            .reduce((total, invoice) => total + (invoice.amount || 0), 0);
    };

    // Format currency as $xxx,xxx.xx
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Add a function to filter invoices based on search term
    const filterInvoicesBySearch = (invoices: Invoice[], term: string) => {
        if (!term.trim()) return invoices;
        
        const lowerCaseTerm = term.toLowerCase().trim();
        
        return invoices.filter(invoice => {
            // Search in invoice number
            if (invoice.invoiceNumber.toLowerCase().includes(lowerCaseTerm)) {
                return true;
            }
            
            // Search in jobsite name
            if (invoice.jobsite?.name.toLowerCase().includes(lowerCaseTerm)) {
                return true;
            }
            
            // Search in amount (convert to string for searching)
            const amountStr = formatCurrency(invoice.amount || 0);
            if (amountStr.toLowerCase().includes(lowerCaseTerm)) {
                return true;
            }
            
            // Search in status
            if (invoice.status.toLowerCase().includes(lowerCaseTerm)) {
                return true;
            }
            
            return false;
        });
    };

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
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-bold text-gray-900">{client?.companyName}</h1>
                            <span className="text-2xl font-semibold text-blue-600">
                                {formatCurrency(calculateTotalOwing())}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsJobsitesModalOpen(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                                Manage Jobsites
                            </button>
                            <Link
                                href={`/clients/${clientId}/edit`}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <PencilIcon className="h-4 w-4 mr-2" />
                                Edit Client
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div className="px-4 py-5 sm:px-6 flex flex-col space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-semibold text-gray-900">Invoices</h3>
                                <button
                                    onClick={() => setIsInvoiceModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Add Invoice
                                </button>
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                <div className="relative w-full max-w-md">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        name="search"
                                        id="search"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Search invoices..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-500 mr-2">Status:</span>
                                        <select
                                            className="inline-block w-auto py-1 border-gray-300 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="all">All</option>
                                            <option value="pending">Pending</option>
                                            <option value="paid">Paid</option>
                                            <option value="overdue">Overdue</option>
                                            <option value="draft">Draft</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-500 mr-2">Date:</span>
                                        <Popover className="relative inline-block">
                                            {({ open }: { open: boolean }) => (
                                                <>
                                                    <Popover.Button
                                                    className="inline-flex items-center h-full px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        {isFilteringByDate && dateRange?.from
                                                            ? `${dateRange.from ? formatDate(dateRange.from.toISOString()) : ''} ${dateRange.to ? ' - ' + formatDate(dateRange.to.toISOString()) : ''}`
                                                            : 'Select range'}
                                                        <CalendarIcon className="ml-2 h-4 w-4 text-gray-400" />
                                                        {isFilteringByDate && (
                                                            <XMarkIcon 
                                                                className="ml-1 h-4 w-4 text-gray-400 hover:text-gray-600" 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    clearDateFilter();
                                                                }}
                                                            />
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
                                                        <Popover.Panel className="absolute z-50 mt-1 transform">
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
                                                                                    className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
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
                                    </div>
                                    
                                    {selectedInvoices.length > 0 && (
                                        <div className="flex items-center gap-2 ml-auto">
                                            <button
                                                onClick={handleMultiDownload}
                                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                                                Download ({selectedInvoices.length})
                                            </button>
                                            <button
                                                onClick={handleMultiSend}
                                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                Send ({selectedInvoices.length})
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                                <InvoiceTable 
                                    invoices={filteredInvoices}
                                    onViewInvoice={handleViewInvoice}
                                    onDownloadInvoice={handleDownloadInvoice}
                                    onEditInvoice={(invoice) => handleDoubleClick(invoice, 'invoiceNumber')}
                                    onParsePdf={handlePdfParse}
                                    onMarkAsPaid={handleMarkAsPaid}
                                    formatDate={formatDate}
                                    formatCurrency={formatCurrency}
                                    showClient={false}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <JobsitesModal 
                isOpen={isJobsitesModalOpen}
                onClose={() => setIsJobsitesModalOpen(false)}
                clientId={clientId}
            />

            <AddInvoiceModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                clientId={clientId}
                onSuccess={() => {
                    console.log('AddInvoiceModal onSuccess callback triggered');
                    fetchInvoices();
                }}
            />

            <ViewInvoiceModal
                isOpen={isViewInvoiceModalOpen}
                onClose={() => setIsViewInvoiceModalOpen(false)}
                invoice={selectedViewInvoice}
            />

            <PDFViewerModal
                isOpen={showPdfModal}
                onClose={() => setShowPdfModal(false)}
                pdfUrl={pdfUrl}
                title={pdfTitle}
            />
        </ClientLayout>
    );
} 