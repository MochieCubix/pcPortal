import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ResizableBox } from 'react-resizable';
import { EyeIcon, PencilIcon, ArrowDownTrayIcon, PaperAirplaneIcon, TrashIcon, DocumentMagnifyingGlassIcon, CheckIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import 'react-resizable/css/styles.css';

// Types for the component props and internal data
interface InvoiceTableProps {
  invoices: any[];
  onViewInvoice: (invoice: any) => void;
  onEditInvoice?: (invoice: any) => void;
  onDownloadInvoice?: (invoice: any) => void;
  onSendInvoice?: (invoice: any) => void;
  onDeleteInvoice?: (invoice: any) => void;
  onParsePdf?: (invoice: any) => void;
  onMarkAsPaid?: (invoice: any) => void;
  onAttachTimesheet?: (invoice: any) => void;
  formatDate?: (date: string) => string;
  formatCurrency?: (amount: number) => string;
  showClient?: boolean;
  customActions?: (invoice: any) => React.ReactNode;
}

interface Column {
  key: string;
  header: string;
  width: number;
  render?: (value: any, invoice: any) => React.ReactNode;
  getValue?: (invoice: any) => any;
  sortable?: boolean;
  textAlign?: 'left' | 'right' | 'center';
}

interface ContextMenuPosition {
  x: number;
  y: number;
  visible: boolean;
  invoiceId: string | null;
}

// Helper function to default format date if not provided
const defaultFormatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

// Helper function to default format currency if not provided
const defaultFormatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Main component
const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  onViewInvoice,
  onEditInvoice,
  onDownloadInvoice,
  onSendInvoice,
  onDeleteInvoice,
  onParsePdf,
  onMarkAsPaid,
  onAttachTimesheet,
  formatDate = defaultFormatDate,
  formatCurrency = defaultFormatCurrency,
  showClient = true,
  customActions
}) => {
  // State for column widths
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  
  // State for selected rows
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // Track last selected row for SHIFT-click functionality
  const [lastSelectedRow, setLastSelectedRow] = useState<string | null>(null);
  
  // State for sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });

  // State for context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition>({
    x: 0,
    y: 0,
    visible: false,
    invoiceId: null
  });

  // Store sorted row indices
  const [sortedIndices, setSortedIndices] = useState<string[]>([]);

  // Ref for table container - used to detect clicks outside the context menu
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Memoize selected invoice objects for better performance
  const selectedInvoiceObjects = useMemo(() => {
    return invoices.filter(inv => selectedRows.includes(inv._id));
  }, [invoices, selectedRows]);

  // Set default column widths on first render
  const defaultColumns = useMemo<Column[]>(() => [
    { 
      key: 'select', 
      header: '', 
      width: 50,
      sortable: false
    },
    { 
      key: 'date', 
      header: 'Date', 
      width: 120,
      render: (value: any, invoice: any) => (
        <div className="text-sm text-gray-500">
          {formatDate(invoice.date || invoice.createdAt)}
        </div>
      ),
      getValue: (invoice: any) => new Date(invoice.date || invoice.createdAt).getTime(),
      sortable: true
    },
    { 
      key: 'invoiceNumber', 
      header: 'Invoice #', 
      width: 150,
      render: (value: any) => (
        <div className="text-sm font-medium text-gray-900">
          {value}
        </div>
      ),
      sortable: true
    },
    { 
      key: 'jobsite', 
      header: 'Jobsite', 
      width: 180,
      render: (value: any, invoice: any) => (
        <div className="flex flex-col">
          {invoice.jobsite?.name ? (
            <span className="text-sm text-gray-500">{invoice.jobsite.name}</span>
          ) : invoice.jobsiteName ? (
            <span className="text-sm text-gray-500">{invoice.jobsiteName}</span>
          ) : (
            <span className="text-sm text-gray-400">No Jobsite</span>
          )}
        </div>
      ),
      getValue: (invoice: any) => invoice.jobsite?.name || invoice.jobsiteName || '',
      sortable: true
    },
    ...(showClient ? [{
      key: 'client',
      header: 'Client',
      width: 180,
      render: (value: any, invoice: any) => (
        <div className="flex flex-col">
          {invoice.clientName ? (
            <span className="text-sm text-gray-500">{invoice.clientName}</span>
          ) : (
            <span className="text-sm text-gray-400">No Client</span>
          )}
        </div>
      ),
      getValue: (invoice: any) => invoice.clientName || '',
      sortable: true
    }] : []),
    { 
      key: 'amount', 
      header: 'Amount', 
      width: 120,
      render: (value: any, invoice: any) => (
        <div className="text-sm font-medium text-gray-900">
          {formatCurrency(invoice.amount || invoice.total || 0)}
        </div>
      ),
      getValue: (invoice: any) => invoice.amount || invoice.total || 0,
      sortable: true,
      textAlign: 'right'
    },
    { 
      key: 'status', 
      header: 'Status', 
      width: 120,
      render: (value: any) => (
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            value === "paid" ? 'bg-green-500' :
            value === "overdue" ? 'bg-red-500' :
            value === "pending" ? 'bg-yellow-500' :
            value === "draft" ? 'bg-gray-400' :
            'bg-blue-500'
          }`}></div>
          <span className={`text-xs font-medium ${
            value === "paid" ? 'text-green-800' :
            value === "overdue" ? 'text-red-800' :
            value === "pending" ? 'text-yellow-800' :
            value === "draft" ? 'text-gray-800' :
            'text-blue-800'
          }`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        </div>
      ),
      sortable: true
    },
    { 
      key: 'actions', 
      header: 'Actions', 
      width: 120,
      sortable: false,
      textAlign: 'right'
    }
  ], [showClient, formatDate, formatCurrency]);

  // Initialize column widths with defaults
  useEffect(() => {
    const initialWidths: { [key: string]: number } = {};
    defaultColumns.forEach(col => {
      initialWidths[col.key] = col.width;
    });
    setColumnWidths(initialWidths);
  }, [defaultColumns]);

  // Handle column resize
  const handleResize = useCallback((key: string) => (e: any, { size }: { size: { width: number } }) => {
    setColumnWidths(prev => ({
      ...prev,
      [key]: Math.max(size.width, 50) // Minimum width of 50px
    }));
  }, []);

  // Handle row selection with CTRL and SHIFT keys - improved to prevent text selection
  const handleRowSelect = useCallback((invoiceId: string, event: React.MouseEvent) => {
    // Always prevent default browser behavior to avoid text selection
    event.preventDefault();
    
    // Explicitly clear any existing text selection when clicking rows
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    }
    
    // CTRL/CMD key for toggling single items
    if (event.ctrlKey || event.metaKey) {
      setSelectedRows(prev => {
        const newSelection = prev.includes(invoiceId)
          ? prev.filter(id => id !== invoiceId)
          : [...prev, invoiceId];
        
        // Update last selected row
        if (!prev.includes(invoiceId)) {
          setLastSelectedRow(invoiceId);
        }
        
        return newSelection;
      });
    }
    // SHIFT key for selecting ranges based on sorted order
    else if (event.shiftKey && lastSelectedRow) {
      // Prevent text selection when using SHIFT-click
      window.getSelection()?.removeAllRanges();
      
      // Use the sortedIndices for range selection
      const currentIndex = sortedIndices.indexOf(invoiceId);
      const lastIndex = sortedIndices.indexOf(lastSelectedRow);
      
      if (currentIndex >= 0 && lastIndex >= 0) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = sortedIndices.slice(start, end + 1);
        
        setSelectedRows(prev => {
          // Keep previously selected rows and add the range
          const newSelection = Array.from(new Set([...prev, ...rangeIds]));
          return newSelection;
        });
      }
    }
    // Normal click - select only this row
    else {
      setSelectedRows([invoiceId]);
      setLastSelectedRow(invoiceId);
    }
  }, [lastSelectedRow, sortedIndices]);

  // Handle right-click to show context menu with improved positioning
  const handleContextMenu = useCallback((event: React.MouseEvent, invoiceId: string) => {
    event.preventDefault();
    
    // Calculate position for the context menu - exactly where the cursor is
    const position = {
      x: event.clientX,
      y: event.clientY,
      visible: true,
      invoiceId
    };
    
    // If right-clicking on an already selected row, keep the selection
    // Otherwise, clear the selection and select only this row
    if (!selectedRows.includes(invoiceId)) {
      setSelectedRows([invoiceId]);
      setLastSelectedRow(invoiceId);
    }
    
    // Set context menu position
    setContextMenu(position);
  }, [selectedRows]);

  // Handle column sort
  const handleSort = useCallback((key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Handle bulk actions button
  const handleGetSelectedInvoicesJSON = useCallback(() => {
    const result = { selectedInvoices: selectedRows };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }, [selectedRows]);

  // Handle context menu actions
  const handleContextMenuAction = useCallback((action: string) => {
    // If we have multiple rows selected and context menu was opened on one of them,
    // apply the action to all selected rows
    if (selectedRows.length > 0 && contextMenu.invoiceId && selectedRows.includes(contextMenu.invoiceId)) {
      // Process each selected invoice
      const selectedInvoiceObjects = invoices.filter(inv => selectedRows.includes(inv._id));
        
        switch (action) {
          case 'view':
          if (selectedRows.length === 1) {
            const invoice = invoices.find(inv => inv._id === selectedRows[0]);
            if (invoice) onViewInvoice(invoice);
          }
            break;
          case 'edit':
          if (onEditInvoice && selectedRows.length === 1) {
            const invoice = invoices.find(inv => inv._id === selectedRows[0]);
            if (invoice) onEditInvoice(invoice);
          }
            break;
          case 'paid':
          if (onMarkAsPaid) {
            if (selectedInvoiceObjects.length > 0) {
              onMarkAsPaid(selectedInvoiceObjects);
            }
          }
            break;
          case 'delete':
          if (onDeleteInvoice) {
            selectedInvoiceObjects.forEach(invoice => {
              onDeleteInvoice(invoice);
            });
          }
            break;
          case 'download':
          if (onDownloadInvoice) {
            selectedInvoiceObjects.forEach(invoice => {
              onDownloadInvoice(invoice);
            });
          }
            break;
          case 'send':
          if (onSendInvoice) {
            onSendInvoice(selectedInvoiceObjects);
          }
            break;
          case 'parse':
          if (onParsePdf && selectedRows.length === 1) {
            const invoice = invoices.find(inv => inv._id === selectedRows[0]);
            if (invoice) onParsePdf(invoice);
          }
          break;
        case 'attachTimesheet':
          if (onAttachTimesheet && selectedRows.length === 1) {
            const invoice = invoices.find(inv => inv._id === selectedRows[0]);
            if (invoice) onAttachTimesheet(invoice);
          }
            break;
          default:
            break;
        }
    }
    
    // Hide the context menu after action
    setContextMenu({
      x: 0,
      y: 0,
      visible: false,
      invoiceId: null
    });
  }, [contextMenu.invoiceId, invoices, selectedRows, onViewInvoice, onEditInvoice, onMarkAsPaid, onDeleteInvoice, onDownloadInvoice, onSendInvoice, onParsePdf, onAttachTimesheet]);

  // Close context menu when clicking outside or inside the table (left click only)
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (contextMenu.visible) {
        // Check if the click is inside the context menu itself
        const contextMenuElement = document.querySelector('[data-context-menu="true"]');
        if (contextMenuElement && contextMenuElement.contains(event.target as Node)) {
          return;
        }
        
        // Close menu on any click outside the context menu
        setContextMenu({
          x: 0,
          y: 0,
          visible: false,
          invoiceId: null
        });
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [contextMenu.visible]);

  // Sort the invoices using memoization for performance
  const sortedInvoices = useMemo(() => {
    if (!sortConfig.key || sortConfig.key === 'select' || sortConfig.key === 'actions') {
      return [...invoices];
    }
    
    return [...invoices].sort((a, b) => {
      const column = defaultColumns.find(col => col.key === sortConfig.key);
      if (!column) return 0;
      
      let aValue, bValue;
      
      if (column.getValue) {
        aValue = column.getValue(a);
        bValue = column.getValue(b);
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }
      
      // Handle null or undefined values
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      
      // Sort strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Sort numbers
      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [invoices, sortConfig, defaultColumns]);

  // Update sortedIndices whenever sortedInvoices changes
  useEffect(() => {
    setSortedIndices(sortedInvoices.map(invoice => invoice._id));
  }, [sortedInvoices]);

  // Memoize table row rendering for better performance
  const renderTableRows = useMemo(() => {
    if (sortedInvoices.length === 0) {
  return (
              <tr>
                <td colSpan={defaultColumns.length} className="px-6 py-4 text-center text-sm text-gray-500">
                  No invoices found
                </td>
              </tr>
      );
    }
    
    return sortedInvoices.map((invoice) => (
                <tr
                  key={invoice._id}
                  className={`${selectedRows.includes(invoice._id) ? 'bg-blue-100' : ''} hover:bg-gray-50 transition-colors duration-150`}
                  onClick={(e) => handleRowSelect(invoice._id, e)}
                  onContextMenu={(e) => handleContextMenu(e, invoice._id)}
                  onMouseDown={(e) => {
                    // Prevent text selection when clicking on rows
                    if (e.ctrlKey || e.shiftKey) {
                      e.preventDefault();
                    }
                  }}
                >
                  {defaultColumns.map((column, colIndex) => (
                    <td
                      key={`${invoice._id}-${column.key}`}
                      className={`whitespace-nowrap ${colIndex === 0 ? 'pl-4' : 'pl-2'} pr-1 py-1 ${column.textAlign === 'right' ? 'text-right' : ''}`}
                    >
                      {column.key === 'select' ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(invoice._id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (selectedRows.includes(invoice._id)) {
                                setSelectedRows(prev => prev.filter(id => id !== invoice._id));
                              } else {
                                setSelectedRows(prev => [...prev, invoice._id]);
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                          />
                        </div>
                      ) : column.key === 'actions' ? (
                        <div className="flex justify-end space-x-1 pr-2">
                          {customActions ? (
                            customActions(invoice)
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewInvoice(invoice);
                                }}
                                className="p-1 rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                title="View Invoice"
                              >
                                <EyeIcon className="h-3 w-3" />
                              </button>
                              
                              {onDownloadInvoice && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDownloadInvoice(invoice);
                                  }}
                                  className="p-1 rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  title="Download Invoice"
                                >
                                  <ArrowDownTrayIcon className="h-3 w-3" />
                                </button>
                              )}
                              
                              {onSendInvoice && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                          onSendInvoice([invoice]);
                                  }}
                                  className="p-1 rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  title="Send Invoice"
                                >
                                  <PaperAirplaneIcon className="h-3 w-3" />
                                </button>
                              )}
                              
                              {onParsePdf && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onParsePdf(invoice);
                                  }}
                                  className="p-1 rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  title="Parse PDF"
                                >
                                  <DocumentMagnifyingGlassIcon className="h-3 w-3" />
                                </button>
                              )}
                              
                              {onEditInvoice && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditInvoice(invoice);
                                  }}
                                  className="p-1 rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  title="Edit Invoice"
                                >
                                  <PencilIcon className="h-3 w-3" />
                                </button>
                              )}
                              
                              {onDeleteInvoice && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteInvoice(invoice);
                                  }}
                                  className="p-1 rounded-md text-gray-500 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                                  title="Delete Invoice"
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ) : column.render ? (
                        column.render(invoice[column.key], invoice)
                      ) : (
                        invoice[column.key]
                      )}
                    </td>
                  ))}
                </tr>
    ));
  }, [sortedInvoices, defaultColumns, selectedRows, handleRowSelect, handleContextMenu, customActions, onViewInvoice, onDownloadInvoice, onSendInvoice, onParsePdf, onEditInvoice, onDeleteInvoice]);

  // Context Menu Component with enhanced positioning
  const ContextMenu = useMemo(() => {
    if (!contextMenu.visible) return null;
    
    return (
      <div 
        className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 w-48"
        style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        data-context-menu="true"
      >
        <button
          onClick={() => handleContextMenuAction('view')}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <EyeIcon className="h-4 w-4 mr-2 text-gray-500" />
          View Invoice
        </button>
        {onEditInvoice && (
          <button
            onClick={() => handleContextMenuAction('edit')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <PencilIcon className="h-4 w-4 mr-2 text-gray-500" />
            Edit Invoice
          </button>
        )}
        {onMarkAsPaid && (
          <button
            onClick={() => handleContextMenuAction('paid')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <CheckIcon className="h-4 w-4 mr-2 text-gray-500" />
            Mark as Paid
          </button>
        )}
        {onDownloadInvoice && (
          <button
            onClick={() => handleContextMenuAction('download')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2 text-gray-500" />
            Download Invoice
          </button>
        )}
        {onSendInvoice && (
          <button
            onClick={() => handleContextMenuAction('send')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-2 text-gray-500" />
            Send Invoice
          </button>
        )}
        {onAttachTimesheet && (
          <button
            onClick={() => handleContextMenuAction('attachTimesheet')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-500" />
            Attach Timesheet
          </button>
        )}
        {onParsePdf && (
          <button
            onClick={() => handleContextMenuAction('parse')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <DocumentMagnifyingGlassIcon className="h-4 w-4 mr-2 text-gray-500" />
            Parse PDF
          </button>
        )}
        {onDeleteInvoice && (
          <button
            onClick={() => handleContextMenuAction('delete')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <TrashIcon className="h-4 w-4 mr-2 text-gray-500" />
            Delete Invoice
          </button>
        )}
      </div>
    );
  }, [contextMenu, handleContextMenuAction, onViewInvoice, onEditInvoice, onMarkAsPaid, onDeleteInvoice, onDownloadInvoice, onSendInvoice, onParsePdf, onAttachTimesheet]);

  // Render the table with performance optimizations
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden" ref={tableRef}>
      <div className="overflow-x-auto">
        {selectedRows.length > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedRows.length} {selectedRows.length === 1 ? 'invoice' : 'invoices'} selected
            </span>
            <div className="flex gap-2">
              {onMarkAsPaid && selectedRows.length > 0 && (
                <button
                  onClick={() => handleContextMenuAction('paid')}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center"
                >
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Mark as Paid
                </button>
              )}
              {onSendInvoice && selectedRows.length > 0 && (
                <button
                  onClick={() => handleContextMenuAction('send')}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
                >
                  <PaperAirplaneIcon className="h-3 w-3 mr-1" />
                  Send
                </button>
              )}
              {onDownloadInvoice && selectedRows.length > 0 && (
                <button
                  onClick={() => handleContextMenuAction('download')}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center"
                >
                  <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                  Download
                </button>
              )}
            </div>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {defaultColumns.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`relative ${index === 0 ? 'pl-4' : 'pl-0'} pr-0 py-2 text-${column.textAlign || 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider ${column.sortable ? 'cursor-pointer' : ''}`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <ResizableBox
                    width={columnWidths[column.key] || column.width}
                    height={30}
                    handle={
                      <div
                        className="absolute right-0 top-0 h-full w-3 cursor-col-resize group hover:bg-blue-500 hover:opacity-50"
                        onClick={e => e.stopPropagation()}
                      />
                    }
                    onResize={handleResize(column.key)}
                    axis="x"
                    minConstraints={[50, 30]}
                  >
                    <div className="flex h-full items-center truncate">
                      {column.key === 'select' ? (
                        <div className="flex items-center px-2">
                          <input
                            type="checkbox"
                            checked={selectedRows.length === invoices.length && invoices.length > 0}
                            onChange={() => {
                              if (selectedRows.length === invoices.length) {
                                setSelectedRows([]);
                              } else {
                                setSelectedRows(invoices.map(i => i._id));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                          />
                        </div>
                      ) : (
                        <div className={`flex items-center ${column.textAlign === 'right' ? 'justify-end w-full pr-3' : 'pl-2'}`}>
                          {column.header}
                          {column.sortable && sortConfig.key === column.key && (
                            <span className="ml-2">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </ResizableBox>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {renderTableRows}
          </tbody>
        </table>
        
        {/* Context Menu */}
        {ContextMenu}
      </div>
    </div>
  );
};

export default InvoiceTable; 