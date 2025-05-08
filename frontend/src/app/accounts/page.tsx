'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ClientLayout from '@/components/Layouts/ClientLayout';
import { Input } from '@/components/ui/input';
import { ChevronUpIcon, ChevronDownIcon, PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';
import React from 'react';

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Comment {
  _id: string;
  date: string;
  time: string;
  comment: string;
  file?: {
    name: string;
    path: string;
    type: string;
  };
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

interface Client {
  _id: string;
  companyName: string;
  abn: string;
  accountEmail: string;
  accountsPhone: string;
  officeAddress: Address | string;
  comments: Comment[];
}

type SortDirection = 'asc' | 'desc' | null;

// Function to get the correct file URL
const getFileUrl = (filePath: string) => {
  if (!filePath) return '';
  
  // If path already starts with http, use it directly
  if (filePath.startsWith('http')) return filePath;
  
  // Otherwise, prepend the API base URL
  // Remove any leading slashes from the path
  const cleanPath = filePath.replace(/^\/+/, '');
  
  // Make sure to use http://localhost:5000 or equivalent
  return `http://localhost:5000/${cleanPath}`;
};

export default function AccountsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortedClients, setSortedClients] = useState<Client[]>([]);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    commentId: string;
    field: 'date' | 'time' | 'comment';
  } | null>(null);
  const [cellValue, setCellValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editCellRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [newComment, setNewComment] = useState({
    comment: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    file: undefined as File | undefined
  });

  const formatAddress = (address: Address | string | undefined) => {
    if (!address) return 'No address provided';
    if (typeof address === 'string') return address;
    
    const { street, city, state, zipCode, country } = address;
    if (!street && !city && !state && !zipCode && !country) return 'No address provided';
    
    const parts = [];
    if (street) parts.push(street);
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (zipCode) parts.push(zipCode);
    if (country) parts.push(country);
    
    return parts.join(', ');
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/clients', {
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
        throw new Error('Failed to fetch clients');
      }

      const data = await response.json();
      setClients(data.map((client: any) => ({
        ...client,
        comments: []
      })));
      setSortedClients(data.map((client: any) => ({
        ...client,
        comments: []
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (!clients.length) return;

    let sorted = [...clients];
    
    if (sortDirection === 'asc') {
      sorted.sort((a, b) => a.companyName.localeCompare(b.companyName));
    } else if (sortDirection === 'desc') {
      sorted.sort((a, b) => b.companyName.localeCompare(a.companyName));
    }
    
    setSortedClients(sorted);
  }, [sortDirection, clients]);

  const toggleSort = () => {
    if (sortDirection === null) {
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortDirection(null);
    }
  };

  const fetchComments = async (clientId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/comments/client/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const comments = await response.json();
      setClients(clients.map(client => {
        if (client._id === clientId) {
          return {
            ...client,
            comments
          };
        }
        return client;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    }
  };

  const addComment = async (clientId: string) => {
    if (!newComment.comment) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const formData = new FormData();
      formData.append('date', newComment.date);
      formData.append('time', newComment.time);
      formData.append('comment', newComment.comment);
      if (newComment.file) {
        formData.append('file', newComment.file);
      }

      const response = await fetch(`http://localhost:5000/api/comments/client/${clientId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add comment');
      }

      await fetchComments(clientId);
      setNewComment({
        ...newComment,
        comment: '',
        file: undefined
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    }
  };

  const updateComment = async (clientId: string, commentId: string, field: string, value: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const formData = new FormData();
      formData.append(field, value);

      const response = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update comment');
      }

      await fetchComments(clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    }
  };

  const uploadFile = async (clientId: string, commentId: string, file: File) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }

      await fetchComments(clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    }
  };

  const toggleClient = async (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientId);
      await fetchComments(clientId);
    }
  };

  const handleCellClick = (commentId: string, field: 'date' | 'time' | 'comment', value: string) => {
    setEditingCell({ commentId, field });
    setCellValue(value);
    
    // Focus the cell after rendering
    setTimeout(() => {
      if (editCellRef.current) {
        editCellRef.current.focus();
      }
    }, 0);
  };

  const handleCellBlur = (clientId: string, commentId: string, field: string) => {
    updateComment(clientId, commentId, field, cellValue);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, clientId: string, commentId: string, field: string) => {
    if (e.key === 'Enter' && field !== 'comment') {
      e.preventDefault();
      updateComment(clientId, commentId, field, cellValue);
      setEditingCell(null);
    } else if (e.key === 'Enter' && !e.shiftKey && field === 'comment') {
      e.preventDefault();
      updateComment(clientId, commentId, field, cellValue);
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleNewCommentKeyDown = (e: React.KeyboardEvent, clientId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newComment.comment.trim()) {
        addComment(clientId);
      }
    }
  };

  const deleteComment = async (clientId: string, commentId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete comment');
      }

      await fetchComments(clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="mt-2">You do not have permission to view this page.</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">
              Client Accounts
            </h1>
          </div>
        </header>

        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              {loading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No clients found.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th 
                            scope="col" 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group"
                            onClick={toggleSort}
                          >
                            <div className="flex items-center">
                              Company Name
                              <span className="ml-2">
                                {sortDirection === 'asc' ? (
                                  <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                                ) : sortDirection === 'desc' ? (
                                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <span className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100">
                                    <ChevronUpIcon className="h-4 w-4" />
                                  </span>
                                )}
                              </span>
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ABN
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Office Address
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedClients.map((client) => (
                          <React.Fragment key={client._id}>
                            <tr 
                              onClick={() => toggleClient(client._id)}
                              className="cursor-pointer hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {client.companyName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {client.abn}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {client.accountEmail}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatAddress(client.officeAddress)}
                              </td>
                            </tr>
                            {expandedClient === client._id && (
                              <tr>
                                <td colSpan={4} className="px-0 py-0">
                                  {/* Comments table in spreadsheet style */}
                                  <div className="border-t border-gray-200">
                                    <div className="overflow-hidden">
                                      <table className="min-w-full divide-y-0 divide-gray-200">
                                        <thead className="bg-gray-50">
                                          <tr className="divide-x divide-gray-200">
                                            <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                                              Date
                                            </th>
                                            <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                                              Time
                                            </th>
                                            <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Comment
                                            </th>
                                            <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px]">
                                              Created By
                                            </th>
                                            <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                                              File
                                            </th>
                                            <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[70px]">
                                              Actions
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                          {client.comments.map((comment) => (
                                            <tr key={comment._id} className="hover:bg-gray-50 divide-x divide-gray-200">
                                              <td 
                                                className={`px-2 py-2 text-sm text-gray-900 ${editingCell?.commentId === comment._id && editingCell?.field === 'date' ? 'p-0' : ''}`}
                                                onClick={() => handleCellClick(comment._id, 'date', comment.date)}
                                              >
                                                {editingCell?.commentId === comment._id && editingCell?.field === 'date' ? (
                                                  <Input
                                                    ref={editCellRef as React.RefObject<HTMLInputElement>}
                                                    type="date"
                                                    value={cellValue}
                                                    onChange={(e) => setCellValue(e.target.value)}
                                                    onBlur={() => handleCellBlur(client._id, comment._id, 'date')}
                                                    onKeyDown={(e) => handleKeyDown(e, client._id, comment._id, 'date')}
                                                    className="w-full h-full border-0 focus:ring-1 focus:ring-blue-500 p-2"
                                                  />
                                                ) : (
                                                  <div className="h-8 flex items-center">
                                                    {new Date(comment.date).toLocaleDateString()}
                                                  </div>
                                                )}
                                              </td>
                                              <td 
                                                className={`px-2 py-2 text-sm text-gray-900 ${editingCell?.commentId === comment._id && editingCell?.field === 'time' ? 'p-0' : ''}`}
                                                onClick={() => handleCellClick(comment._id, 'time', comment.time)}
                                              >
                                                {editingCell?.commentId === comment._id && editingCell?.field === 'time' ? (
                                                  <Input
                                                    ref={editCellRef as React.RefObject<HTMLInputElement>}
                                                    type="time"
                                                    value={cellValue}
                                                    onChange={(e) => setCellValue(e.target.value)}
                                                    onBlur={() => handleCellBlur(client._id, comment._id, 'time')}
                                                    onKeyDown={(e) => handleKeyDown(e, client._id, comment._id, 'time')}
                                                    className="w-full h-full border-0 focus:ring-1 focus:ring-blue-500 p-2"
                                                  />
                                                ) : (
                                                  <div className="h-8 flex items-center">
                                                    {comment.time}
                                                  </div>
                                                )}
                                              </td>
                                              <td 
                                                className={`px-2 py-2 text-sm text-gray-900 ${editingCell?.commentId === comment._id && editingCell?.field === 'comment' ? 'p-0' : ''}`}
                                                onClick={() => handleCellClick(comment._id, 'comment', comment.comment)}
                                              >
                                                {editingCell?.commentId === comment._id && editingCell?.field === 'comment' ? (
                                                  <textarea
                                                    ref={editCellRef as React.RefObject<HTMLTextAreaElement>}
                                                    value={cellValue}
                                                    onChange={(e) => setCellValue(e.target.value)}
                                                    onBlur={() => handleCellBlur(client._id, comment._id, 'comment')}
                                                    onKeyDown={(e) => handleKeyDown(e, client._id, comment._id, 'comment')}
                                                    className="w-full h-full min-h-[40px] border-0 focus:ring-1 focus:ring-blue-500 p-2 resize-none"
                                                  />
                                                ) : (
                                                  <div className="min-h-[40px] whitespace-pre-wrap">
                                                    {comment.comment}
                                                  </div>
                                                )}
                                              </td>
                                              <td className="px-2 py-2 text-sm text-gray-900">
                                                <div className="h-8 flex items-center">
                                                  {`${comment.createdBy.firstName} ${comment.createdBy.lastName}`}
                                                </div>
                                              </td>
                                              <td className="px-2 py-2 text-sm text-gray-900">
                                                <div className="h-8 flex items-center space-x-2">
                                                  <input
                                                    type="file"
                                                    id={`file-upload-${comment._id}`}
                                                    className="hidden"
                                                    onChange={(e) => {
                                                      if (e.target.files?.[0]) {
                                                        uploadFile(client._id, comment._id, e.target.files[0]);
                                                      }
                                                    }}
                                                  />
                                                  <label
                                                    htmlFor={`file-upload-${comment._id}`}
                                                    className="cursor-pointer"
                                                  >
                                                    <PaperClipIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                                  </label>
                                                  {comment.file && (
                                                    <a
                                                      href={getFileUrl(comment.file.path)}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="truncate max-w-[100px] text-blue-500 hover:text-blue-700"
                                                    >
                                                      {comment.file.name}
                                                    </a>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-2 py-2 text-sm text-gray-900">
                                                <div className="h-8 flex items-center justify-center">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation(); // Prevent row click event
                                                      if (window.confirm('Are you sure you want to delete this comment?')) {
                                                        deleteComment(client._id, comment._id);
                                                      }
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 focus:outline-none"
                                                    title="Delete comment"
                                                  >
                                                    <TrashIcon className="h-4 w-4" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                          {/* New comment row - always visible for quick input */}
                                          <tr className="hover:bg-gray-50 divide-x divide-gray-200 border-t border-gray-200">
                                            <td className="p-0">
                                              <Input
                                                type="date"
                                                value={newComment.date}
                                                onChange={(e) => setNewComment({ ...newComment, date: e.target.value })}
                                                className="w-full h-full border-0 focus:ring-1 focus:ring-blue-500 p-2 text-sm"
                                              />
                                            </td>
                                            <td className="p-0">
                                              <Input
                                                type="time"
                                                value={newComment.time}
                                                onChange={(e) => setNewComment({ ...newComment, time: e.target.value })}
                                                className="w-full h-full border-0 focus:ring-1 focus:ring-blue-500 p-2 text-sm"
                                              />
                                            </td>
                                            <td className="p-0">
                                              <textarea
                                                placeholder="Type comment and press Enter..."
                                                value={newComment.comment}
                                                onChange={(e) => setNewComment({ ...newComment, comment: e.target.value })}
                                                onKeyDown={(e) => handleNewCommentKeyDown(e, client._id)}
                                                className="w-full h-full min-h-[40px] border-0 focus:ring-1 focus:ring-blue-500 p-2 resize-none text-sm"
                                              />
                                            </td>
                                            <td className="px-2 py-2 text-sm text-gray-500">
                                              <div className="h-8 flex items-center">
                                                {user?.firstName} {user?.lastName}
                                              </div>
                                            </td>
                                            <td className="px-2 py-2 text-sm text-gray-900">
                                              <div className="h-8 flex items-center space-x-2">
                                                <input
                                                  type="file"
                                                  id={`new-file-upload-${client._id}`}
                                                  className="hidden"
                                                  onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                      setNewComment({ ...newComment, file: e.target.files[0] });
                                                    }
                                                  }}
                                                />
                                                <label
                                                  htmlFor={`new-file-upload-${client._id}`}
                                                  className="cursor-pointer"
                                                >
                                                  <PaperClipIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                                </label>
                                                {newComment.file && (
                                                  <span className="truncate max-w-[100px] text-gray-500">
                                                    {newComment.file.name}
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-2 py-2 text-sm text-gray-900">
                                              {/* No actions for new comment input row */}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ClientLayout>
  );
} 