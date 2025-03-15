"use client";

import { useState, useEffect, Fragment } from "react";
import { useAuth } from "@/hooks/useAuth";
import ClientLayout from "@/components/Layouts/ClientLayout";
import { AddInvoiceModal } from '@/components/AddInvoiceModal';
import ViewInvoiceModal from "@/components/ViewInvoiceModal";
import PDFViewerModal from "@/components/PDFViewerModal";
import InvoiceTable from "@/components/InvoiceTable";
import Link from 'next/link';
import {
  EyeIcon,
  PaperAirplaneIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Popover, Transition } from "@headlessui/react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientId: string;
  clientName?: string;
  jobsiteId?: string;
  jobsiteName?: string;
  total: number;
  status: string;
  dueDate: string;
  createdAt: string;
  fileUrl?: string;
}

interface Jobsite {
  _id: string;
  name: string;
}

interface ViewInvoiceData {
  _id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  status: string;
  fileUrl?: string;
  clientName?: string;
  jobsiteName?: string;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobsites, setJobsites] = useState<Jobsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ViewInvoiceData | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isFilteringByDate, setIsFilteringByDate] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>("");

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // First make sure we have all jobsites loaded
      if (jobsites.length === 0) {
        console.log("[FRONTEND DEBUG] No jobsites in cache, fetching jobsites first");
        await fetchJobsites();
      }
      
      const response = await fetch("http://localhost:5000/api/invoices", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }
      const data = await response.json();
      console.log("Fetched invoices:", data);
      
      // Debug the client data specifically to understand what we're getting
      data.forEach((invoice: any, index: number) => {
        console.log(`[FRONTEND DEBUG] Invoice #${index + 1} - ${invoice.invoiceNumber}:`, {
          hasClientObj: !!invoice.client,
          clientType: invoice.client ? typeof invoice.client : 'null',
          clientValue: invoice.client,
          clientId: invoice.client?._id,
          companyName: invoice.client?.companyName,
          firstName: invoice.client?.firstName,
          lastName: invoice.client?.lastName
        });
      });
      
      // Process the invoices to ensure client and jobsite names are available
      const processedInvoices = data.map((invoice: any) => {
        // Prepare a standard invoice object
        const processedInvoice: Invoice = {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          clientId: invoice.client?._id || invoice.client || "",
          jobsiteId: invoice.jobsite?._id || invoice.jobsite || "",
          total: invoice.amount || 0,
          status: invoice.status || "pending",
          dueDate: invoice.dueDate || "",
          createdAt: invoice.createdAt || "",
          fileUrl: invoice.fileUrl || "",
        };
        
        // Extract client name with proper fallbacks
        if (invoice.client) {
          // Client was found and returned as an object
          if (typeof invoice.client === 'object') {
            if (invoice.client.notFound) {
              // Backend found the ID but no matching client in either model
              processedInvoice.clientName = `ID Not Found: ${invoice.client._id.substring(0, 6)}...`;
              console.log(`[FRONTEND DEBUG] Client ID not found:`, invoice.client._id);
            } else if (invoice.client.error) {
              // There was an error fetching the client data
              processedInvoice.clientName = `Error: ${invoice.client._id.substring(0, 6)}...`;
              console.log(`[FRONTEND DEBUG] Error fetching client:`, invoice.client._id);
            } else if (invoice.client.companyName) {
              // Company name is available
              processedInvoice.clientName = invoice.client.companyName;
              console.log(`[FRONTEND DEBUG] Using company name:`, invoice.client.companyName);
            } else if (invoice.client.firstName || invoice.client.lastName) {
              // Individual name is available
              const firstName = invoice.client.firstName || '';
              const lastName = invoice.client.lastName || '';
              processedInvoice.clientName = `${firstName} ${lastName}`.trim();
              console.log(`[FRONTEND DEBUG] Using person name:`, processedInvoice.clientName);
            } else if (invoice.client.email) {
              // Email is available as fallback
              processedInvoice.clientName = invoice.client.email;
              console.log(`[FRONTEND DEBUG] Using email:`, invoice.client.email);
            } else {
              // Object exists but no useful information
              processedInvoice.clientName = "Client Data Incomplete";
              console.log(`[FRONTEND DEBUG] Client object has no useful data:`, invoice.client);
            }
          } else {
            // Client is not an object
            processedInvoice.clientName = `ID: ${String(invoice.client).substring(0, 6)}...`;
            console.log(`[FRONTEND DEBUG] Client is not an object:`, invoice.client);
          }
        } else {
          processedInvoice.clientName = "No Client Data";
          console.log(`[FRONTEND DEBUG] No client data for invoice:`, invoice._id);
        }
        
        // Debug the jobsite data
        console.log(`[FRONTEND DEBUG] Jobsite for invoice ${invoice.invoiceNumber}:`, {
          hasJobsiteObj: !!invoice.jobsite,
          jobsiteType: invoice.jobsite ? typeof invoice.jobsite : 'null',
          jobsiteValue: invoice.jobsite,
          jobsiteId: invoice.jobsite?._id,
          jobsiteName: invoice.jobsite?.name
        });
        
        // Extract jobsite name with proper fallbacks
        if (invoice.jobsite) {
          if (typeof invoice.jobsite === 'object') {
            if (invoice.jobsite.notFound) {
              // Backend found the ID but no matching jobsite
              processedInvoice.jobsiteName = `Jobsite Not Found`;
              console.log(`[FRONTEND DEBUG] Jobsite ID not found:`, invoice.jobsite._id);
            } else if (invoice.jobsite.error) {
              // There was an error fetching the jobsite data
              processedInvoice.jobsiteName = `Error Loading Jobsite`;
              console.log(`[FRONTEND DEBUG] Error fetching jobsite:`, invoice.jobsite._id);
            } else if (invoice.jobsite.name) {
              processedInvoice.jobsiteName = invoice.jobsite.name;
              console.log(`[FRONTEND DEBUG] Using jobsite name:`, invoice.jobsite.name);
            } else {
              processedInvoice.jobsiteName = "Unnamed Jobsite";
              console.log(`[FRONTEND DEBUG] Jobsite object has no name:`, invoice.jobsite);
            }
          } else {
            // If it's not an object, it's likely an ID string
            // Get the ID either directly from the string or from jobsiteId
            const jobsiteId = typeof invoice.jobsite === 'string' ? invoice.jobsite : invoice.jobsiteId;
            
            // Try to find this jobsite in the jobsites state
            console.log(`[FRONTEND DEBUG] Looking for jobsite ID in cache:`, jobsiteId);
            console.log(`[FRONTEND DEBUG] Jobsites in cache:`, jobsites.length);
            
            // Look for exact match first
            let foundJobsite = jobsites.find((j: Jobsite) => j._id === jobsiteId);
            
            // If not found, try a more flexible matching approach
            if (!foundJobsite && typeof jobsiteId === 'string') {
              console.log(`[FRONTEND DEBUG] Exact match not found, trying substring match`);
              foundJobsite = jobsites.find((j: Jobsite) => 
                jobsiteId.includes(j._id) || j._id.includes(jobsiteId)
              );
            }
            
            if (foundJobsite && foundJobsite.name) {
              processedInvoice.jobsiteName = foundJobsite.name;
              console.log(`[FRONTEND DEBUG] Found jobsite name from cache:`, foundJobsite.name);
            } else {
              // Not found in cache, use a clear placeholder
              processedInvoice.jobsiteName = "Loading jobsite...";
              // Store the ID for later lookup
              processedInvoice.jobsiteId = jobsiteId;
              console.log(`[FRONTEND DEBUG] Jobsite not found in cache, using placeholder`);
            }
          }
        } else {
          processedInvoice.jobsiteName = "No Jobsite Assigned";
          console.log(`[FRONTEND DEBUG] No jobsite data for invoice:`, invoice._id);
        }
        
        return processedInvoice;
      });
      
      console.log("Processed invoices:", processedInvoices.length);
      setInvoices(processedInvoices);
    } catch (err) {
      console.error("Error in fetchInvoices:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobsites = async () => {
    try {
      console.log("[FRONTEND DEBUG] Fetching jobsites");
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/jobsites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch jobsites");
      }
      const data = await response.json();
      console.log("[FRONTEND DEBUG] Fetched jobsites:", data.length);
      setJobsites(data);
      
      // If we already have invoices loaded, update any with missing or placeholder jobsite names
      if (invoices.length > 0) {
        console.log("[FRONTEND DEBUG] Updating invoices with jobsite names, invoices count:", invoices.length);
        const updatedInvoices = invoices.map(invoice => {
          // If invoice has a jobsite ID but not a proper name or it has a placeholder name
          if (invoice.jobsiteId && 
             (invoice.jobsiteName?.startsWith('Jobsite ') || 
              invoice.jobsiteName === 'Loading jobsite...' ||
              !invoice.jobsiteName)) {
            
            console.log(`[FRONTEND DEBUG] Checking jobsite for invoice ${invoice.invoiceNumber}, ID: ${invoice.jobsiteId}`);
            
            // First try an exact match
            let foundJobsite = data.find((j: Jobsite) => j._id === invoice.jobsiteId);
            
            // If not found, try more flexible matching
            if (!foundJobsite && invoice.jobsiteId) {
              console.log(`[FRONTEND DEBUG] Exact match not found, trying substring match for ${invoice.jobsiteId}`);
              foundJobsite = data.find((j: Jobsite) => 
                invoice.jobsiteId?.includes(j._id) || j._id.includes(invoice.jobsiteId || '')
              );
            }
            
            if (foundJobsite && foundJobsite.name) {
              console.log(`[FRONTEND DEBUG] Found jobsite name: ${foundJobsite.name} for invoice ${invoice.invoiceNumber}`);
              return {
                ...invoice,
                jobsiteName: foundJobsite.name
              };
            } else {
              console.log(`[FRONTEND DEBUG] Still could not find jobsite for ID: ${invoice.jobsiteId}`);
            }
          }
          return invoice;
        });
        
        console.log("[FRONTEND DEBUG] Updated invoices with jobsite names");
        setInvoices(updatedInvoices);
      }
    } catch (err) {
      console.error("Error fetching jobsites:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchJobsites();
      await fetchInvoices();
    };
    
    loadData();
  }, []);

  const handleSendEmail = async (invoiceId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/invoices/${invoiceId}/send-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to send invoice email");
      }
      alert("Invoice email sent successfully");
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to send invoice email",
      );
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    console.log("Viewing invoice:", invoice);
    
    if (invoice.fileUrl) {
      // Show PDF in modal
      setPdfUrl(invoice.fileUrl);
      setPdfTitle(`Invoice #${invoice.invoiceNumber}`);
      setShowPdfModal(true);
    } else {
      // Create the view data object with all required fields
      const viewData: ViewInvoiceData = {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.createdAt,
        amount: invoice.total || 0,
        status: invoice.status,
        fileUrl: invoice.fileUrl || "",
        clientName: invoice.clientName || "Unknown Client",
        jobsiteName: invoice.jobsiteName || "No Jobsite",
      };
      setSelectedInvoice(viewData);
      setShowViewModal(true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const clearDateFilter = () => {
    setDateRange(undefined);
    setIsFilteringByDate(false);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.clientName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (invoice.jobsiteName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      );
    const matchesStatus =
      statusFilter === "all" || invoice.status === statusFilter;
    // Date filtering
    let matchesDate = true;
    if (isFilteringByDate && dateRange?.from) {
      const invoiceDate = new Date(invoice.createdAt);
      invoiceDate.setHours(0, 0, 0, 0); // Normalize time part
      if (dateRange.from && !dateRange.to) {
        return invoiceDate >= dateRange.from;
      }
      // If both from and to dates are set
      if (dateRange.from && dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999); // End of day
        return invoiceDate >= dateRange.from && invoiceDate <= toDate;
      }
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Handle checkbox selection
  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices((prev) => {
      if (prev.includes(invoiceId)) {
        return prev.filter((id) => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map((invoice) => invoice._id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkAction = (action: "email" | "delete") => {
    if (selectedInvoices.length === 0) {
      alert("Please select at least one invoice");
      return;
    }
    if (action === "email") {
      if (
        confirm(
          `Send email for ${selectedInvoices.length} selected invoice(s)?`,
        )
      ) {
        // Implement bulk email sending
        selectedInvoices.forEach((id) => handleSendEmail(id));
      }
    } else if (action === "delete") {
      if (confirm(`Delete ${selectedInvoices.length} selected invoice(s)?`)) {
        // Implement bulk delete
        alert("Bulk delete functionality to be implemented");
      }
    }
  };

  // Reset selected invoices when filters change
  useEffect(() => {
    setSelectedInvoices([]);
    setSelectAll(false);
  }, [searchTerm, statusFilter, isFilteringByDate, dateRange]);
  
  // Check for any invoices with missing jobsite names and update them
  useEffect(() => {
    const refreshMissingJobsiteNames = async () => {
      if (invoices.length > 0 && jobsites.length > 0) {
        let needsUpdate = false;
        
        // Check if any invoices have placeholder or missing jobsite names
        invoices.forEach(invoice => {
          if (invoice.jobsiteId && 
             (invoice.jobsiteName === 'Loading jobsite...' || 
              invoice.jobsiteName?.startsWith('Jobsite ')) && 
              !needsUpdate) {
            console.log('[FRONTEND DEBUG] Found invoices with missing jobsite names');
            needsUpdate = true;
          }
        });
        
        if (needsUpdate) {
          console.log('[FRONTEND DEBUG] Refreshing jobsite names for invoices');
          await fetchJobsites();
        }
      }
    };
    
    refreshMissingJobsiteNames();
  }, [invoices, jobsites]);

  // Add the handleMarkAsPaid function before the JSX return
  const handleMarkAsPaid = async (invoice: any) => {
    try {
      if (!confirm(`Mark invoice ${invoice.invoiceNumber} as paid?`)) {
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`http://localhost:5000/api/invoices/${invoice._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'paid' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update invoice status');
      }
      
      // Update local state
      setInvoices(prevInvoices => 
        prevInvoices.map(inv => {
          if (inv._id === invoice._id) {
            return { ...inv, status: 'paid' };
          }
          return inv;
        })
      );
      
      // Show success message
      alert(`Invoice ${invoice.invoiceNumber} marked as paid successfully`);
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert(error instanceof Error ? error.message : 'Failed to update invoice status');
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <p className="text-red-600">Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-100">
        <div className="py-6">
          <header className="mb-6">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                  Invoices
                </h1>
                <div className="mt-4 sm:mt-0">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150"
                  >
                    Add Invoice
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main>
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
              {/* Search and filters */}
              <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center">
                    <div className="relative flex-grow max-w-md">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <input
                        type="text"
                        name="search"
                        id="search"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 flex flex-wrap items-center gap-3 bg-gray-50">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Status:</span>
                    <select
                      className="inline-block w-auto border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Date:</span>
                    <Popover className="relative">
                      {({ open }) => (
                        <>
                          <Popover.Button
                            className={`inline-flex items-center rounded-md border ${
                              isFilteringByDate 
                                ? "border-blue-500 bg-blue-50 text-blue-700" 
                                : "border-gray-200 bg-white text-gray-700"
                            } px-3 py-1.5 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          >
                            {isFilteringByDate && dateRange?.from
                              ? `${dateRange.from ? formatDate(dateRange.from.toISOString()) : ""} ${dateRange.to ? " - " + formatDate(dateRange.to.toISOString()) : ""}`
                              : "Select range"}
                            {isFilteringByDate ? (
                              <XMarkIcon 
                                className="ml-2 h-4 w-4 text-gray-500 hover:text-gray-700" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearDateFilter();
                                }}
                              />
                            ) : (
                              <CalendarIcon className="ml-2 h-4 w-4 text-gray-400" />
                            )}
                          </Popover.Button>

                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="opacity-0 translate-y-1"
                            enterTo="opacity-100 translate-y-0"
                            leave="transition ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0"
                            leaveTo="opacity-0 translate-y-1"
                          >
                            <Popover.Panel className="absolute z-50 mt-1 transform">
                              <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                                <div className="relative bg-white p-4">
                                  <DayPicker
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    footer={
                                      <div className="mt-2 text-center">
                                        <button
                                          onClick={() => {
                                            setIsFilteringByDate(!!dateRange?.from);
                                          }}
                                          className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                                        >
                                          Apply Filter
                                        </button>
                                      </div>
                                    }
                                  />
                                </div>
                              </div>
                            </Popover.Panel>
                          </Transition>
                        </>
                      )}
                    </Popover>
                  </div>

                  {selectedInvoices.length > 0 && (
                    <div className="flex items-center ml-auto">
                      <span className="text-sm text-gray-500 mr-3">
                        {selectedInvoices.length} selected
                      </span>
                      <button
                        onClick={() => handleBulkAction("email")}
                        className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 mr-2"
                      >
                        <PaperAirplaneIcon className="mr-1.5 h-4 w-4" />
                        Email
                      </button>
                      <button
                        onClick={() => handleBulkAction("delete")}
                        className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        <TrashIcon className="mr-1.5 h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 border-t-2 border-t-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading invoices...</p>
                </div>
              ) : error ? (
                <div className="text-center py-10">
                  <div className="text-red-500 font-medium">{error}</div>
                  <p className="mt-2 text-gray-600">Please try again later</p>
                </div>
              ) : (
                <InvoiceTable 
                  invoices={filteredInvoices}
                  onViewInvoice={handleViewInvoice}
                  onSendInvoice={handleSendEmail}
                  onEditInvoice={(invoice) => {
                    // Handle edit - you can implement this functionality
                    console.log("Edit invoice:", invoice._id);
                  }}
                  onDeleteInvoice={(invoice) => {
                    // Handle delete - you can implement this functionality
                    if (confirm(`Delete invoice ${invoice.invoiceNumber}?`)) {
                      console.log("Delete invoice:", invoice._id);
                    }
                  }}
                  onMarkAsPaid={handleMarkAsPaid}
                  formatDate={(dateString) => new Date(dateString).toLocaleDateString()}
                  showClient={true}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {showAddModal && (
        <AddInvoiceModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            fetchInvoices();
            setShowAddModal(false);
          }}
        />
      )}
      {showViewModal && selectedInvoice && (
        <ViewInvoiceModal
          isOpen={showViewModal}
          invoice={selectedInvoice}
          onClose={() => {
            setShowViewModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
      
      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        pdfUrl={pdfUrl}
        title={pdfTitle}
      />
    </ClientLayout>
  );
}
