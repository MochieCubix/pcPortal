import { NextRequest, NextResponse } from 'next/server';
import { invoiceTimesheets } from './[invoiceId]/timesheets/route';

// Mock data for demo purposes
// In a real application, this would come from your database
const mockInvoices = [
  {
    _id: '1',
    invoiceNumber: 'INV-001',
    date: '2023-04-15T00:00:00.000Z',
    createdAt: '2023-04-15T10:30:00.000Z',
    jobsite: { name: 'Commercial Building A' },
    clientName: 'ABC Construction Ltd',
    amount: 5400,
    status: 'paid',
    fileKey: 'invoices/1/invoice-001.pdf',
    fileUrl: 'https://example.com/sample-invoice-1.pdf',
  },
  {
    _id: '2',
    invoiceNumber: 'INV-002',
    date: '2023-04-22T00:00:00.000Z',
    createdAt: '2023-04-22T14:45:00.000Z',
    jobsite: { name: 'Residential Project X' },
    clientName: 'Smith Family Trust',
    amount: 2300,
    status: 'pending',
    fileKey: 'invoices/2/invoice-002.pdf',
    fileUrl: 'https://example.com/sample-invoice-2.pdf',
  },
  {
    _id: '3',
    invoiceNumber: 'INV-003',
    date: '2023-05-03T00:00:00.000Z',
    createdAt: '2023-05-03T09:15:00.000Z',
    jobsite: { name: 'Office Renovation' },
    clientName: 'XYZ Corporate Services',
    amount: 8750,
    status: 'overdue',
    fileKey: 'invoices/3/invoice-003.pdf',
    fileUrl: 'https://example.com/sample-invoice-3.pdf',
  },
  {
    _id: '4',
    invoiceNumber: 'INV-004',
    date: '2023-05-10T00:00:00.000Z',
    createdAt: '2023-05-10T16:30:00.000Z',
    jobsite: { name: 'Commercial Building A' },
    clientName: 'ABC Construction Ltd',
    amount: 3200,
    status: 'draft',
    fileKey: 'invoices/4/invoice-004.pdf',
    fileUrl: 'https://example.com/sample-invoice-4.pdf',
  },
  {
    _id: '5',
    invoiceNumber: 'INV-005',
    date: '2023-05-17T00:00:00.000Z',
    createdAt: '2023-05-17T11:00:00.000Z',
    jobsite: { name: 'Highway Bridge Project' },
    clientName: 'State Infrastructure Department',
    amount: 12500,
    status: 'paid',
    fileKey: 'invoices/5/invoice-005.pdf',
    fileUrl: 'https://example.com/sample-invoice-5.pdf',
  },
  {
    _id: '6',
    invoiceNumber: 'INV-006',
    date: '2023-05-24T00:00:00.000Z',
    createdAt: '2023-05-24T13:20:00.000Z',
    jobsite: { name: 'School Renovation' },
    clientName: 'City Education Board',
    amount: 6750,
    status: 'pending',
    fileKey: 'invoices/6/invoice-006.pdf',
    fileUrl: 'https://example.com/sample-invoice-6.pdf',
  },
  {
    _id: '7',
    invoiceNumber: 'INV-007',
    date: '2023-06-01T00:00:00.000Z',
    createdAt: '2023-06-01T08:45:00.000Z',
    jobsite: { name: 'Residential Project Y' },
    clientName: 'Johnson Family',
    amount: 4200,
    status: 'paid',
    fileKey: 'invoices/7/invoice-007.pdf',
    fileUrl: 'https://example.com/sample-invoice-7.pdf',
  },
  {
    _id: '8',
    invoiceNumber: 'INV-008',
    date: '2023-06-08T00:00:00.000Z',
    createdAt: '2023-06-08T15:10:00.000Z',
    jobsite: { name: 'Shopping Mall Expansion' },
    clientName: 'Metro Retail Group',
    amount: 9800,
    status: 'overdue',
    fileKey: 'invoices/8/invoice-008.pdf',
    fileUrl: 'https://example.com/sample-invoice-8.pdf',
  }
];

export async function GET(request: NextRequest) {
  try {
    // Return the mock invoices with any attached timesheets
    const invoicesWithTimesheets = mockInvoices.map(invoice => ({
      ...invoice,
      timesheets: invoiceTimesheets[invoice._id] || []
    }));
    
    return NextResponse.json(invoicesWithTimesheets);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
} 