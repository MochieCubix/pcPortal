'use client';

import { useState } from 'react';
import ProtectedLayout from '@/components/Layouts/ProtectedLayout';
import { ChartBarIcon, UsersIcon, CurrencyDollarIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function DashboardExamplePage() {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { name: 'Total Clients', value: '24', icon: UsersIcon, color: 'bg-blue-500' },
    { name: 'Active Jobsites', value: '38', icon: ChartBarIcon, color: 'bg-green-500' },
    { name: 'Revenue (MTD)', value: '$24,500', icon: CurrencyDollarIcon, color: 'bg-purple-500' },
    { name: 'Hours Logged', value: '1,284', icon: ClockIcon, color: 'bg-yellow-500' },
  ];

  const recentActivity = [
    { id: 1, user: 'John Smith', action: 'created a new invoice', time: '2 hours ago', client: 'Acme Corp' },
    { id: 2, user: 'Sarah Johnson', action: 'added a new jobsite', time: '4 hours ago', client: 'TechStart Inc' },
    { id: 3, user: 'Mike Williams', action: 'completed a job', time: '1 day ago', client: 'Global Services' },
    { id: 4, user: 'Emily Davis', action: 'updated client information', time: '2 days ago', client: 'Bright Future LLC' },
  ];

  return (
    <ProtectedLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard Example</h1>
            <div className="mt-4 md:mt-0">
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'overview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'analytics'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'reports'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Reports
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                      <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">{stat.value}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main content based on active tab */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
                <div className="flow-root">
                  <ul className="-my-5 divide-y divide-gray-200">
                    {recentActivity.map((item) => (
                      <li key={item.id} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              {item.user.charAt(0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.user} <span className="font-normal">{item.action}</span>
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {item.client} • {item.time}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6">
                  <a
                    href="#"
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View all activity
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics Dashboard</h2>
                <p className="text-gray-500">
                  This is a placeholder for the analytics dashboard. In a real application, this would display charts and
                  graphs showing key performance indicators.
                </p>
                <div className="mt-6 bg-gray-100 p-6 rounded-md">
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-400">Analytics charts would appear here</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Reports</h2>
                <p className="text-gray-500">
                  This is a placeholder for the reports section. In a real application, this would allow users to
                  generate and download various reports.
                </p>
                <div className="mt-6 space-y-4">
                  {['Financial Summary', 'Client Activity', 'Employee Performance', 'Jobsite Status'].map(
                    (report, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">{report}</h3>
                          <button className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">
                            Generate
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
} 