'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon, Bars3Icon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface SidebarItem {
  title: string;
  icon: React.ReactNode;
  path: string;
  role: 'all' | 'admin' | 'client' | 'supervisor' | 'employee';
  children?: SidebarItem[];
}

// Create a context to manage sidebar state globally
export const SidebarContext = React.createContext<{
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sidebarExpanded: boolean;
  setSidebarExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  sidebarOpen: true,
  setSidebarOpen: () => {},
  sidebarExpanded: true,
  setSidebarExpanded: () => {},
});

export function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Default to open for admin users, closed for others
  const [sidebarOpen, setSidebarOpen] = useState(isAdmin);
  
  // Track if sidebar is expanded (full width) or collapsed (icons only)
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
  // Track expanded menu items
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    'Management': true // Keep Management menu open by default
  });
  
  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);
  const pathname = usePathname();

  // Update sidebar state when user role changes
  useEffect(() => {
    if (isAdmin) {
      setSidebarOpen(true);
    }
    
    // Initialize Management menu as open
    setExpandedItems(prev => ({
      ...prev,
      'Management': true
    }));
  }, [isAdmin]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // Store sidebar state in localStorage
  useEffect(() => {
    const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
    setSidebarExpanded(
      storedSidebarExpanded === null ? true : storedSidebarExpanded === 'true'
    );
  }, []);

  // Update localStorage when sidebar expanded state changes
  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
  }, [sidebarExpanded]);

  const toggleMenuItem = (title: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const sidebarItems: SidebarItem[] = [
    // Common items for all users
    {
      title: 'Dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      path: '/dashboard',
      role: 'all'
    },
    // Management section - admin only
    {
      title: 'Management',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      path: '#',
      role: 'admin',
      children: [
        {
          title: 'Clients',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
          path: '/clients',
          role: 'admin'
        },
        {
          title: 'Jobsites',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
          path: '/jobsites',
          role: 'admin'
        },
        {
          title: 'Document Processing',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          path: '/textract',
          role: 'admin'
        },
        {
          title: 'Accounts',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
          path: '/accounts',
          role: 'admin'
        },
        {
          title: 'Supervisors',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
          path: '/supervisors',
          role: 'admin'
        },
        {
          title: 'Employees',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
          path: '/employees',
          role: 'admin'
        }
      ]
    },
    // Invoices - admin and client
    {
      title: 'Invoices',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      path: '/invoices',
      role: 'all'
    },
    // Examples section for design ideas
    {
      title: 'Examples',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      path: '#',
      role: 'all',
      children: [
        {
          title: 'Dashboard Examples',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
          path: '/examples/dashboard',
          role: 'all'
        },
        {
          title: 'Form Examples',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
          path: '/examples/forms',
          role: 'all'
        },
        {
          title: 'Table Examples',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ),
          path: '/examples/tables',
          role: 'all'
        }
      ]
    }
  ];

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-72 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${sidebarExpanded ? 'lg:w-72' : 'lg:w-20'}`}
    >
      {/* SIDEBAR HEADER */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <Link href="/">
          <div className={`flex items-center gap-2 ${!sidebarExpanded && 'lg:justify-center'}`}>
            {sidebarExpanded ? (
              <div className="h-10 relative w-40 flex items-center">
                <Image 
                  src="/assets/logos/px.svg" 
                  alt="PC Portal Logo" 
                  width={160} 
                  height={40} 
                  className="object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="h-10 w-40 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xl">PC Portal</div>';
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-10 w-10 relative flex items-center justify-center">
                <Image 
                  src="/assets/logos/px.svg" 
                  alt="PC" 
                  width={40} 
                  height={40} 
                  className="object-contain p-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="h-10 w-10 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xl">PC</div>';
                    }
                  }}
                />
              </div>
            )}
          </div>
        </Link>

        {/* Toggle button for expanded/collapsed state */}
        <div className="flex items-center">
          <button
            className={`hidden lg:block text-white hover:text-gray-300`}
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
          >
            {sidebarExpanded ? (
              <ChevronLeftIcon className="h-6 w-6" />
            ) : (
              <ChevronRightIcon className="h-6 w-6" />
            )}
          </button>

          <button
            ref={trigger}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
            className="block lg:hidden text-white ml-2"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
      </div>
      {/* SIDEBAR HEADER */}

      <div className="flex flex-col justify-between h-[calc(100%-60px)]">
        {/* Sidebar Menu */}
        <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
          <nav className={`mt-5 px-4 py-4 lg:mt-9 lg:px-6 ${!sidebarExpanded && 'lg:px-2'}`}>
            <div>
              <ul className="mb-6 flex flex-col gap-1.5">
                {/* Menu Items */}
                {sidebarItems.map((item, index) => {
                  if (!shouldShowMenuItem(item)) return null;

                  // Check if item has children
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = expandedItems[item.title] || false;

                  return (
                    <li key={index}>
                      {hasChildren ? (
                        // Item with submenu
                        <div>
                          <button
                            onClick={() => toggleMenuItem(item.title)}
                            className={`group relative flex items-center justify-between gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                              isMenuItemActive(item) && 'bg-graydark dark:bg-meta-4'
                            } ${!sidebarExpanded && 'lg:justify-center lg:px-2'}`}
                          >
                            <div className="flex items-center gap-2.5">
                              {item.icon}
                              {(sidebarExpanded || !sidebar) && <span>{item.title}</span>}
                            </div>
                            
                            {(sidebarExpanded || !sidebar) && (
                              isExpanded ? (
                                <ChevronUpIcon className="h-4 w-4" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4" />
                              )
                            )}
                            
                            {/* Show tooltip when sidebar is collapsed */}
                            {!sidebarExpanded && (
                              <div className="absolute left-full top-1/2 z-20 ml-4 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs font-semibold text-white opacity-0 group-hover:opacity-100">
                                {item.title}
                              </div>
                            )}
                          </button>
                          
                          {/* Submenu */}
                          {isExpanded && (sidebarExpanded || !sidebar) && (
                            <ul className="mt-2 mb-4 flex flex-col gap-2 pl-10">
                              {item.children?.map((child, childIndex) => {
                                if (!shouldShowMenuItem(child)) return null;
                                
                                return (
                                  <li key={childIndex}>
                                    <Link
                                      href={child.path}
                                      className={`group relative flex items-center gap-2.5 rounded-md px-4 py-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ${
                                        pathname === child.path && 'text-white'
                                      }`}
                                    >
                                      {child.icon}
                                      <span>{child.title}</span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ) : (
                        // Regular menu item
                        <Link
                          href={item.path}
                          className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                            isMenuItemActive(item) && 'bg-graydark dark:bg-meta-4'
                          } ${!sidebarExpanded && 'lg:justify-center lg:px-2'}`}
                        >
                          {item.icon}
                          {(sidebarExpanded || !sidebar) && <span>{item.title}</span>}
                          
                          {/* Show tooltip when sidebar is collapsed */}
                          {!sidebarExpanded && (
                            <div className="absolute left-full top-1/2 z-20 ml-4 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs font-semibold text-white opacity-0 group-hover:opacity-100">
                              {item.title}
                            </div>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>

        {/* User info at bottom of sidebar */}
        {user && (
          <div className={`mt-auto px-6 py-4 border-t border-gray-700 ${!sidebarExpanded && 'lg:px-2'}`}>
            <div className={`flex items-center ${!sidebarExpanded && 'lg:justify-center'}`}>
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold text-lg">
                  {user.firstName?.charAt(0) || 'U'}
                </div>
              </div>
              {(sidebarExpanded || !sidebar) && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs font-medium text-gray-400 capitalize">
                    {user.role || 'User'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  function shouldShowMenuItem(item: SidebarItem) {
    if (item.role === 'all') return true;
    if (!user) return false;
    if (item.role === user.role) return true;
    if (user.role === 'admin') return true; // Admin can see all items
    return false;
  }

  function isMenuItemActive(item: SidebarItem) {
    return pathname === item.path || 
           (item.children?.some(child => pathname === child.path) ?? false);
  }
} 