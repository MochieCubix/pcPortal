'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, SidebarContext } from './sidebar';
import Breadcrumbs from '../Breadcrumbs';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    
    // Check if user is admin from localStorage on component mount
    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                if (userData.role === 'admin') {
                    setSidebarOpen(true);
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
        
        // Get sidebar expanded state from localStorage
        const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
        setSidebarExpanded(
            storedSidebarExpanded === null ? true : storedSidebarExpanded === 'true'
        );
    }, []);

    return (
        <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen, sidebarExpanded, setSidebarExpanded }}>
            <div className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                <Sidebar />

                {/* Content area */}
                <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-gray-100 transition-all duration-300">
                    {/* Main content */}
                    <main className="flex-1">
                        <div className="mx-auto w-full max-w-screen-2xl p-4 md:p-6 2xl:p-10">
                            {/* Breadcrumbs */}
                            <Breadcrumbs />
                            
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarContext.Provider>
    );
} 