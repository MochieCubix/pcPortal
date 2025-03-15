'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [clientName, setClientName] = useState<string | null>(null);
  const [jobsiteName, setJobsiteName] = useState<string | null>(null);

  // Fetch client or jobsite name if needed
  useEffect(() => {
    const fetchEntityName = async () => {
      const pathSegments = pathname.split('/').filter(segment => segment !== '');
      
      // Check if we're on a client page
      if (pathSegments[0] === 'clients' && pathSegments[1] && pathSegments[1].length > 10) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:5000/api/clients/${pathSegments[1]}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setClientName(data.companyName);
          }
        } catch (error) {
          console.error('Error fetching client name:', error);
        }
      }
      
      // Check if we're on a jobsite page
      if (pathSegments[0] === 'jobsites' && pathSegments[1] && pathSegments[1].length > 10) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:5000/api/jobsites/${pathSegments[1]}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setJobsiteName(data.name);
          }
        } catch (error) {
          console.error('Error fetching jobsite name:', error);
        }
      }
    };
    
    fetchEntityName();
  }, [pathname]);

  useEffect(() => {
    const generateBreadcrumbs = () => {
      // Split the pathname into segments
      const pathSegments = pathname.split('/').filter(segment => segment !== '');
      
      // Start with home
      const breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard', isCurrent: pathname === '/dashboard' }
      ];
      
      // Build up the breadcrumb path
      let currentPath = '';
      
      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        
        // Check if this is an ID segment (contains only alphanumeric and hyphens)
        const isIdSegment = /^[a-zA-Z0-9-]+$/.test(segment) && segment.length > 10;
        
        // Format the label
        let label = '';
        if (isIdSegment) {
          // If we're on a client page and have the client name
          if (pathSegments[0] === 'clients' && index === 1 && clientName) {
            label = clientName;
          }
          // If we're on a jobsite page and have the jobsite name
          else if (pathSegments[0] === 'jobsites' && index === 1 && jobsiteName) {
            label = jobsiteName;
          }
          // If previous segment exists, use it as a singular label (e.g., "clients/123" becomes "Client")
          else if (index > 0) {
            const prevSegment = pathSegments[index - 1];
            // Remove trailing 's' to make singular
            label = prevSegment.charAt(0).toUpperCase() + prevSegment.slice(1, -1);
          } else {
            label = 'Item';
          }
        } else if (segment === 'edit') {
          label = 'Edit';
        } else if (segment === 'create') {
          label = 'Create';
        } else if (segment === 'supervisors') {
          label = 'Supervisors';
        } else {
          // Capitalize first letter and the rest
          label = segment.charAt(0).toUpperCase() + segment.slice(1);
        }
        
        // Special case for supervisors page
        if (segment === 'supervisors' || (isIdSegment && pathSegments[0] === 'supervisors')) {
          label = 'Supervisors';
        }
        
        breadcrumbItems.push({
          label,
          href: currentPath,
          isCurrent: currentPath === pathname
        });
      });
      
      return breadcrumbItems;
    };
    
    setBreadcrumbs(generateBreadcrumbs());
  }, [pathname, clientName, jobsiteName]);

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs on the dashboard
  }

  return (
    <nav className="flex px-5 py-3 text-gray-700 bg-gray-50 rounded-lg mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
            <HomeIcon className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </li>
        
        {breadcrumbs.slice(1).map((breadcrumb, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              {breadcrumb.isCurrent ? (
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">{breadcrumb.label}</span>
              ) : (
                <Link href={breadcrumb.href} className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2">
                  {breadcrumb.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
} 