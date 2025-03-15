'use client';

import { useState } from 'react';
import ProtectedLayout from '@/components/Layouts/ProtectedLayout';
import { ChevronDownIcon, ChevronUpIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';

interface Person {
  id: number;
  name: string;
  title: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastActive: string;
}

export default function TablesExamplePage() {
  const [sortField, setSortField] = useState<keyof Person>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const people: Person[] = [
    { id: 1, name: 'Jane Cooper', title: 'Regional Paradigm Technician', email: 'jane.cooper@example.com', role: 'Admin', status: 'active', lastActive: '2023-01-23' },
    { id: 2, name: 'Cody Fisher', title: 'Product Directives Officer', email: 'cody.fisher@example.com', role: 'Owner', status: 'active', lastActive: '2023-02-15' },
    { id: 3, name: 'Esther Howard', title: 'Forward Response Developer', email: 'esther.howard@example.com', role: 'Member', status: 'inactive', lastActive: '2022-12-08' },
    { id: 4, name: 'Jenny Wilson', title: 'Central Security Manager', email: 'jenny.wilson@example.com', role: 'Member', status: 'active', lastActive: '2023-03-10' },
    { id: 5, name: 'Kristin Watson', title: 'Lead Implementation Liaison', email: 'kristin.watson@example.com', role: 'Admin', status: 'pending', lastActive: '2023-01-30' },
    { id: 6, name: 'Cameron Williamson', title: 'Internal Applications Engineer', email: 'cameron.williamson@example.com', role: 'Member', status: 'active', lastActive: '2023-02-28' },
    { id: 7, name: 'Leslie Alexander', title: 'Product Security Coordinator', email: 'leslie.alexander@example.com', role: 'Owner', status: 'inactive', lastActive: '2022-11-20' },
    { id: 8, name: 'Michael Foster', title: 'Senior Data Analyst', email: 'michael.foster@example.com', role: 'Member', status: 'active', lastActive: '2023-03-05' },
    { id: 9, name: 'Dries Vincent', title: 'Human Resources Manager', email: 'dries.vincent@example.com', role: 'Admin', status: 'pending', lastActive: '2023-01-15' },
    { id: 10, name: 'Lindsay Walton', title: 'Front-end Developer', email: 'lindsay.walton@example.com', role: 'Member', status: 'active', lastActive: '2023-02-10' },
  ];

  const handleSort = (field: keyof Person) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedPeople.length === filteredPeople.length) {
      setSelectedPeople([]);
    } else {
      setSelectedPeople(filteredPeople.map(person => person.id));
    }
  };

  const handleSelectPerson = (id: number) => {
    if (selectedPeople.includes(id)) {
      setSelectedPeople(selectedPeople.filter(personId => personId !== id));
    } else {
      setSelectedPeople([...selectedPeople, id]);
    }
  };

  const filteredPeople = people.filter(person => 
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedPeople = [...filteredPeople].sort((a, b) => {
    if (a[sortField] < b[sortField]) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (a[sortField] > b[sortField]) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const getSortIcon = (field: keyof Person) => {
    if (field !== sortField) {
      return <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 text-gray-700" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 text-gray-700" />
    );
  };

  const getStatusColor = (status: Person['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-8">Table Examples</h1>

          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                  <h2 className="text-lg font-medium text-gray-900">Users</h2>
                  <p className="mt-2 text-sm text-gray-700">
                    A list of all the users in your account including their name, title, email and role.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                  >
                    Add user
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                    <div className="relative overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      {selectedPeople.length > 0 && (
                        <div className="absolute top-0 left-12 flex h-12 items-center space-x-3 bg-gray-50 sm:left-16">
                          <button
                            type="button"
                            className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            Bulk edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            Delete all
                          </button>
                        </div>
                      )}
                      <table className="min-w-full table-fixed divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                              <input
                                type="checkbox"
                                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:left-6"
                                checked={selectedPeople.length === filteredPeople.length && filteredPeople.length > 0}
                                onChange={handleSelectAll}
                              />
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                              onClick={() => handleSort('name')}
                            >
                              <div className="group inline-flex items-center">
                                Name
                                <span className="ml-2 flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                                  {getSortIcon('name')}
                                </span>
                              </div>
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                              onClick={() => handleSort('title')}
                            >
                              <div className="group inline-flex items-center">
                                Title
                                <span className="ml-2 flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                                  {getSortIcon('title')}
                                </span>
                              </div>
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                              onClick={() => handleSort('email')}
                            >
                              <div className="group inline-flex items-center">
                                Email
                                <span className="ml-2 flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                                  {getSortIcon('email')}
                                </span>
                              </div>
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                              onClick={() => handleSort('role')}
                            >
                              <div className="group inline-flex items-center">
                                Role
                                <span className="ml-2 flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                                  {getSortIcon('role')}
                                </span>
                              </div>
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                              onClick={() => handleSort('status')}
                            >
                              <div className="group inline-flex items-center">
                                Status
                                <span className="ml-2 flex-none rounded text-gray-400 group-hover:visible group-focus:visible">
                                  {getSortIcon('status')}
                                </span>
                              </div>
                            </th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {sortedPeople.map((person) => (
                            <tr key={person.id} className={selectedPeople.includes(person.id) ? 'bg-gray-50' : undefined}>
                              <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                                <input
                                  type="checkbox"
                                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:left-6"
                                  checked={selectedPeople.includes(person.id)}
                                  onChange={() => handleSelectPerson(person.id)}
                                />
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                                {person.name}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.title}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.email}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.role}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(person.status)}`}>
                                  {person.status.charAt(0).toUpperCase() + person.status.slice(1)}
                                </span>
                              </td>
                              <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <a href="#" className="text-blue-600 hover:text-blue-900">
                                  Edit<span className="sr-only">, {person.name}</span>
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
} 