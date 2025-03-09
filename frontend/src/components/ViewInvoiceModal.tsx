'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ViewInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: {
        _id: string;
        invoiceNumber: string;
        date: string;
        amount: number;
        status: string;
        fileUrl?: string;
    } | null;
}

export default function ViewInvoiceModal({ isOpen, onClose, invoice }: ViewInvoiceModalProps) {
    if (!invoice) return null;

    const handleDownload = () => {
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
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
                                <div>
                                    <div className="mt-3 text-center sm:mt-0 sm:text-left">
                                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900 flex justify-between items-center">
                                            <span>Invoice {invoice.invoiceNumber}</span>
                                            {invoice.fileUrl && (
                                                <button
                                                    onClick={handleDownload}
                                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                                                    Download
                                                </button>
                                            )}
                                        </Dialog.Title>
                                        <div className="mt-4">
                                            {invoice.fileUrl ? (
                                                <div className="aspect-[8.5/11] w-full border border-gray-200 rounded-md overflow-hidden">
                                                    <iframe 
                                                        src={`${invoice.fileUrl}#toolbar=0&navpanes=0`} 
                                                        className="w-full h-full"
                                                        title={`Invoice ${invoice.invoiceNumber}`}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="bg-gray-100 p-8 text-center rounded-md">
                                                    <p className="text-gray-500">No PDF available for this invoice</p>
                                                    <div className="mt-4 p-4 bg-white rounded-md shadow-sm">
                                                        <h4 className="font-medium text-gray-900">Invoice Details</h4>
                                                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-gray-500">Invoice Number</p>
                                                                <p className="font-medium">{invoice.invoiceNumber}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500">Date</p>
                                                                <p className="font-medium">{new Date(invoice.date).toLocaleDateString()}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500">Amount</p>
                                                                <p className="font-medium">${typeof invoice.amount === 'number' ? invoice.amount.toFixed(2) : '0.00'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500">Status</p>
                                                                <p className={`font-medium ${
                                                                    invoice.status === 'paid' ? 'text-green-600' : 
                                                                    invoice.status === 'pending' || invoice.status === 'sent' ? 'text-yellow-600' : 
                                                                    invoice.status === 'overdue' ? 'text-red-600' :
                                                                    'text-gray-600'
                                                                }`}>
                                                                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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