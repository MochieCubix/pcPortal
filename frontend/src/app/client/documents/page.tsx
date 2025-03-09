'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';
import Link from 'next/link';

interface Document {
    _id: string;
    title: string;
    type: string;
    fileName: string;
    fileUrl: string;
    uploadDate: string;
    metadata: {
        period?: string;
        amount?: number;
        status?: string;
    };
}

export default function ClientDocumentsPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'documents' | 'invoices' | 'timesheets' | 'statements'>('all');

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:5000/api/clients/${user?._id}/documents`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch documents');
                }

                const data = await response.json();
                setDocuments(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (user && (user.role === 'client' || user.role === 'admin')) {
            fetchDocuments();
        }
    }, [user]);

    if (!user || (user.role !== 'client' && user.role !== 'admin')) {
        return (
            <ProtectedLayout>
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
            </ProtectedLayout>
        );
    }

    const filteredDocuments = documents.filter(doc => {
        if (activeTab === 'all') return true;
        return doc.type === activeTab.slice(0, -1); // Remove 's' from the end
    });

    return (
        <ProtectedLayout>
            <ClientLayout>
                <div className="min-h-screen bg-gray-100">
                    <div className="py-10">
                        <header>
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                    My Documents
                                </h1>
                            </div>
                        </header>
                        <main>
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    {/* Tabs */}
                                    <div className="border-b border-gray-200 mb-6">
                                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                            <button
                                                onClick={() => setActiveTab('all')}
                                                className={`${
                                                    activeTab === 'all'
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                            >
                                                All
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('documents')}
                                                className={`${
                                                    activeTab === 'documents'
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                            >
                                                Documents
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('invoices')}
                                                className={`${
                                                    activeTab === 'invoices'
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                            >
                                                Invoices
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('timesheets')}
                                                className={`${
                                                    activeTab === 'timesheets'
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                            >
                                                Timesheets
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('statements')}
                                                className={`${
                                                    activeTab === 'statements'
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                            >
                                                Statements
                                            </button>
                                        </nav>
                                    </div>

                                    {loading ? (
                                        <div className="text-center py-10">Loading documents...</div>
                                    ) : error ? (
                                        <div className="text-center py-10 text-red-500">{error}</div>
                                    ) : filteredDocuments.length === 0 ? (
                                        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
                                            <p className="text-gray-500">No documents found</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Title
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Type
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Date
                                                        </th>
                                                        {(activeTab === 'all' || activeTab === 'invoices' || activeTab === 'statements') && (
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Amount
                                                            </th>
                                                        )}
                                                        {(activeTab === 'all' || activeTab === 'invoices') && (
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Status
                                                            </th>
                                                        )}
                                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {filteredDocuments.map((document) => (
                                                        <tr key={document._id}>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {document.title}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                    document.type === 'invoice' ? 'bg-yellow-100 text-yellow-800' :
                                                                    document.type === 'timesheet' ? 'bg-blue-100 text-blue-800' :
                                                                    document.type === 'statement' ? 'bg-purple-100 text-purple-800' :
                                                                    'bg-green-100 text-green-800'
                                                                }`}>
                                                                    {document.type.charAt(0).toUpperCase() + document.type.slice(1)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-500">
                                                                    {new Date(document.uploadDate).toLocaleDateString()}
                                                                </div>
                                                            </td>
                                                            {(activeTab === 'all' || activeTab === 'invoices' || activeTab === 'statements') && (
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-500">
                                                                        {document.metadata.amount 
                                                                            ? `$${document.metadata.amount.toFixed(2)}` 
                                                                            : '-'}
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {(activeTab === 'all' || activeTab === 'invoices') && (
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    {document.metadata.status && (
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                            document.metadata.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                                            document.metadata.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                                            'bg-yellow-100 text-yellow-800'
                                                                        }`}>
                                                                            {document.metadata.status.charAt(0).toUpperCase() + document.metadata.status.slice(1)}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            )}
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <a 
                                                                    href={document.fileUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                                                >
                                                                    View
                                                                </a>
                                                                <a 
                                                                    href={document.fileUrl} 
                                                                    download={document.fileName}
                                                                    className="text-green-600 hover:text-green-900"
                                                                >
                                                                    Download
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </ClientLayout>
        </ProtectedLayout>
    );
} 