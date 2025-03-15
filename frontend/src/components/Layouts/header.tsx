'use client';

import { useContext } from 'react';
import { SidebarContext } from './sidebar';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { sidebarOpen, setSidebarOpen, sidebarExpanded, setSidebarExpanded } = useContext(SidebarContext);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="block lg:hidden"
          >
            {sidebarOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
          
          {/* Desktop sidebar toggle - only visible on larger screens */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
        
        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <span className="text-right">
              <span className="block text-sm font-medium text-black dark:text-white">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="block text-xs font-medium capitalize">
                {user?.role || 'User'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
} 