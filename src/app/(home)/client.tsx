'use client';

import React from 'react';

export default function HomeClient() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Overview</h2>
          <p>Summary information dashboard</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Analytics</h2>
          <p>Performance and metrics</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
          <p>Latest updates and changes</p>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Main Dashboard</h2>
        <p className="mb-4">Welcome to your dashboard. Here you can view and manage all your project information.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded p-4">
            <h3 className="font-medium mb-2">Quick Actions</h3>
            <p>Access common tasks and frequent operations</p>
          </div>
          <div className="border border-gray-200 rounded p-4">
            <h3 className="font-medium mb-2">Notifications</h3>
            <p>View your latest notifications and alerts</p>
          </div>
        </div>
      </div>
    </div>
  );
} 