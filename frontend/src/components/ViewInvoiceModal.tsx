'use client';

import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import BaseModal from './modals/BaseModal';

interface ViewInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: {
        _id: string;
        invoiceNumber: string;
        date: string;
        amount: number;
        status: string;
        items?: Array<{
            description: string;
            quantity: number;
            unitPrice: number;
        }>;
        notes?: string;
        clientName?: string;
        jobsiteName?: string;
    } | null;
}

export default function ViewInvoiceModal({ isOpen, onClose, invoice }: ViewInvoiceModalProps) {
    // If invoice is null, don't render the modal
    if (!invoice) return null;
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Invoice #${invoice.invoiceNumber}`}
            maxWidth="4xl"
        >
            <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h4 className="text-sm font-medium text-gray-500">Invoice Details</h4>
                        <div className="mt-2 text-sm text-gray-900">
                            <p><span className="font-medium">Date:</span> {new Date(invoice.date).toLocaleDateString()}</p>
                            <p><span className="font-medium">Status:</span> {invoice.status}</p>
                            <p><span className="font-medium">Amount:</span> {formatCurrency(invoice.amount)}</p>
                            {invoice.clientName && (
                                <p><span className="font-medium">Client:</span> {invoice.clientName}</p>
                            )}
                            {invoice.jobsiteName && (
                                <p><span className="font-medium">Jobsite:</span> {invoice.jobsiteName}</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500">Payment Information</h4>
                        <div className="mt-2 text-sm text-gray-900">
                            <p>Please include the invoice number with your payment.</p>
                            <p className="mt-2"><span className="font-medium">Total Due:</span> {formatCurrency(invoice.amount)}</p>
                        </div>
                    </div>
                </div>

                {invoice.items && invoice.items.length > 0 && (
                    <div className="mt-8">
                        <h4 className="text-sm font-medium text-gray-500 mb-4">Invoice Items</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Quantity
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Unit Price
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {item.quantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {formatCurrency(item.unitPrice)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {formatCurrency(item.quantity * item.unitPrice)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th scope="row" colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                                            Total
                                        </th>
                                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                                            {formatCurrency(invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {invoice.notes && (
                    <div className="mt-8">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                        <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-900">
                            {invoice.notes}
                        </div>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Close
                    </button>
                </div>
            </div>
        </BaseModal>
    );
} 