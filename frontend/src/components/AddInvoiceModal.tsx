'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon, DocumentTextIcon, CheckIcon } from '@heroicons/react/24/outline';
import FileUpload from './FileUpload';

interface Jobsite {
    _id: string;
    name: string;
}

interface InvoiceItem {
    id: string;
    file: File;
    invoiceNumber: string;
    date: string;
    jobsiteId: string;
    amount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    notes?: string;
    extracting: boolean;
    fileUrl?: string;
    error?: string;
}

interface AddInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    jobsites: Jobsite[];
    onSuccess?: () => void;
}

export default function AddInvoiceModal({ isOpen, onClose, clientId, jobsites, onSuccess }: AddInvoiceModalProps) {
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setInvoiceItems([]);
            setError('');
            setSuccess('');
        }
    }, [isOpen]);

    const handleFileSelect = async (file: File) => {
        // Create a new invoice item with default values and extracting flag
        const newItemId = Date.now().toString();
        const newItem: InvoiceItem = {
            id: newItemId,
            file,
            invoiceNumber: '',
            date: new Date().toISOString().split('T')[0],
            jobsiteId: jobsites.length > 0 ? jobsites[0]._id : '',
            amount: 0,
            status: 'draft' as const,
            extracting: true
        };

        // Add the item to the list
        setInvoiceItems(prev => [...prev, newItem]);

        try {
            // Create form data for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('clientId', clientId);

            // Upload and parse the PDF
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch('http://localhost:5000/api/invoices/upload-parse', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to process invoice');
            }

            const result = await response.json();
            
            // Update the invoice item with extracted data
            setInvoiceItems(prev => prev.map(item => {
                if (item.id === newItemId) {
                    return {
                        ...item,
                        invoiceNumber: result.data.invoiceNumber || item.invoiceNumber,
                        date: result.data.date || item.date,
                        amount: result.data.amount || item.amount,
                        jobsiteId: result.data.jobsiteId || item.jobsiteId,
                        fileUrl: result.data.fileUrl,
                        extracting: false
                    };
                }
                return item;
            }));
        } catch (error) {
            console.error('Error processing invoice:', error);
            // Update the item to show it's no longer extracting, but keep default values
            setInvoiceItems(prev => prev.map(item => {
                if (item.id === newItemId) {
                    return {
                        ...item,
                        extracting: false
                    };
                }
                return item;
            }));
            setError('Failed to extract invoice data. Please fill in the details manually.');
        }
    };

    const updateInvoiceItem = (id: string, updates: Partial<InvoiceItem>) => {
        setInvoiceItems(prev => 
            prev.map(item => 
                item.id === id ? { ...item, ...updates } : item
            )
        );
    };

    const removeInvoiceItem = (id: string) => {
        setInvoiceItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        // Clear previous errors
        setInvoiceItems(prev => prev.map(item => ({ ...item, error: undefined })));

        // Validate all items
        const invalidItems = invoiceItems.filter(item => 
            !item.invoiceNumber || !item.date || !item.jobsiteId || item.amount <= 0
        );

        if (invalidItems.length > 0) {
            setError('Please fill in all required fields for all invoices');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required');
                setLoading(false);
                return;
            }

            // Process each invoice item
            for (const item of invoiceItems) {
                const formData = new FormData();
                formData.append('file', item.file);
                formData.append('clientId', clientId.toString().trim());
                formData.append('jobsiteId', item.jobsiteId);
                formData.append('invoiceNumber', item.invoiceNumber);
                formData.append('date', item.date);
                formData.append('amount', item.amount.toString());
                formData.append('status', item.status);
                if (item.notes) {
                    formData.append('notes', item.notes);
                }

                try {
                    const response = await fetch('http://localhost:5000/api/invoices', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        
                        // Check if it's a duplicate invoice number error
                        if (response.status === 400 && errorData.code === 11000) {
                            // Update the specific invoice item with the error
                            setInvoiceItems(prev => prev.map(invoice => 
                                invoice.id === item.id 
                                    ? { ...invoice, error: `Invoice number "${item.invoiceNumber}" already exists` }
                                    : invoice
                            ));
                            throw new Error(`Duplicate invoice number: ${item.invoiceNumber}`);
                        }
                        
                        throw new Error(errorData.error || `Failed to save invoice: ${item.file.name}`);
                    }
                } catch (error) {
                    // If it's a duplicate error, we want to continue processing other invoices
                    if (error instanceof Error && error.message.includes('Duplicate invoice number')) {
                        continue;
                    }
                    throw error; // Re-throw other errors
                }
            }

            // Check if any invoices had errors
            const hasErrors = invoiceItems.some(item => item.error);
            if (hasErrors) {
                setError('Some invoices could not be added due to duplicate invoice numbers');
            } else {
                setSuccess('All invoices added successfully');
                if (onSuccess) {
                    onSuccess();
                }
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add invoices');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-5xl sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                
                                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                                    <Dialog.Title as={"h3" as const} className="text-lg font-semibold leading-6 text-gray-900">
                                        Add Invoices
                                    </Dialog.Title>
                                    <div className="mt-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                                        {error && (
                                            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                                                <p className="text-sm text-red-700">{error}</p>
                                            </div>
                                        )}
                                        
                                        {success && (
                                            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                                                <p className="text-sm text-green-700">{success}</p>
                                            </div>
                                        )}
                                        
                                        {/* File Upload Section */}
                                        <div className="mb-6">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Invoice PDF</h4>
                                            <FileUpload onFileSelect={handleFileSelect} acceptedFileTypes=".pdf" />
                                        </div>
                                        
                                        {/* Invoice List */}
                                        {invoiceItems.length > 0 && (
                                            <div className="mb-6">
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Invoices to Add</h4>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-300">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">File</th>
                                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Invoice #</th>
                                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Jobsite</th>
                                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                                                    <span className="sr-only">Actions</span>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 bg-white">
                                                            {invoiceItems.map((item) => (
                                                                <tr key={item.id} className={item.error ? 'bg-red-50' : undefined}>
                                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                                        <div className="flex items-center">
                                                                            <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                                                                            <span className="truncate max-w-[120px]">{item.file.name}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                        <input
                                                                            type="text"
                                                                            value={item.invoiceNumber}
                                                                            onChange={(e) => updateInvoiceItem(item.id, { invoiceNumber: e.target.value })}
                                                                            className={`block w-full rounded-md shadow-sm focus:ring-blue-500 sm:text-sm ${
                                                                                item.error 
                                                                                    ? 'border-red-300 focus:border-red-500 text-red-900 placeholder-red-300' 
                                                                                    : 'border-gray-300 focus:border-blue-500'
                                                                            }`}
                                                                            placeholder="INV-001"
                                                                            required
                                                                        />
                                                                        {item.error && (
                                                                            <p className="mt-1 text-xs text-red-600">{item.error}</p>
                                                                        )}
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                        <input
                                                                            type="date"
                                                                            value={item.date}
                                                                            onChange={(e) => updateInvoiceItem(item.id, { date: e.target.value })}
                                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                                            required
                                                                        />
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                        <select
                                                                            value={item.jobsiteId}
                                                                            onChange={(e) => updateInvoiceItem(item.id, { jobsiteId: e.target.value })}
                                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                                            required
                                                                        >
                                                                            <option value="">Select Jobsite</option>
                                                                            {jobsites.map((jobsite) => (
                                                                                <option key={jobsite._id} value={jobsite._id}>
                                                                                    {jobsite.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                        <div className="relative rounded-md shadow-sm">
                                                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                                                <span className="text-gray-500 sm:text-sm">$</span>
                                                                            </div>
                                                                            <input
                                                                                type="number"
                                                                                value={item.amount || ''}
                                                                                onChange={(e) => updateInvoiceItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                                                                                className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                                                placeholder="0.00"
                                                                                step="0.01"
                                                                                min="0"
                                                                                required
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                        <select
                                                                            value={item.status}
                                                                            onChange={(e) => updateInvoiceItem(item.id, { status: e.target.value as any })}
                                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                                        >
                                                                            <option value="draft">Draft</option>
                                                                            <option value="sent">Sent</option>
                                                                            <option value="paid">Paid</option>
                                                                            <option value="overdue">Overdue</option>
                                                                            <option value="cancelled">Cancelled</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeInvoiceItem(item.id)}
                                                                            className="text-red-600 hover:text-red-900"
                                                                        >
                                                                            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                        <button
                                            type="button"
                                            disabled={loading || invoiceItems.length === 0}
                                            className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 sm:col-start-2"
                                            onClick={handleSubmit}
                                        >
                                            {loading ? 'Processing...' : 'Record Invoices'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
} 