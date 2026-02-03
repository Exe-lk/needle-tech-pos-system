'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import { Eye, Pencil, X, Plus, Download, FileText, Trash2, Printer } from 'lucide-react';
import { LetterheadDocument } from '@/src/components/letterhead/letterhead-document';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';

interface InvoiceItem {
  id: string;
  itemCode: string;
  description: string;
  serialNumber?: string;
  brand: string;
  model: string;
  type: MachineType;
  numberOfMachines: number;
  monthlyRentPerMachine: number;
  subtotal: number;
}

interface PaymentDetails {
  paymentMethod: string;
  paymentDate: string;
  receiptNumber?: string;
  receiptFile?: File | string;
  amount: number;
  status: 'pending' | 'paid' | 'partial';
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceType: 'VAT' | 'Non-VAT';
  customerName: string;
  customerAddress: string;
  vatTinNic: string;
  invoiceDate: string;
  periodFrom: string;
  periodTo: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paymentDetails: PaymentDetails;
  status: 'draft' | 'issued' | 'paid' | 'overdue';
}

// Mock customers for dropdown
const mockCustomers = [
  { id: 'C001', name: 'ABC Holdings (Pvt) Ltd', type: 'Company', vatTinNic: 'VAT-123456789', address: '123 Main Street, Colombo 05' },
  { id: 'C002', name: 'John Perera', type: 'Individual', vatTinNic: 'NIC-123456789V', address: '45 Galle Road, Mount Lavinia' },
  { id: 'C003', name: 'XYZ Engineering', type: 'Company', vatTinNic: 'VAT-987654321', address: '78 Kandy Road, Kurunegala' },
  { id: 'C004', name: 'Kamal Silva', type: 'Individual', vatTinNic: 'NIC-987654321V', address: '12 Negombo Road, Wattala' },
  { id: 'C005', name: 'Mega Constructions', type: 'Company', vatTinNic: 'VAT-456789123', address: '90 Jaffna Road, Anuradhapura' },
];

// Mock brands and types for dropdowns (matching machines page)
const mockBrands = ['Brother', 'Singer', 'Janome', 'Juki', 'Pfaff', 'Bernina', 'Other'];

const mockModels: Record<string, string[]> = {
  Brother: ['XL2600i', 'SE600', 'CS6000i', 'Other'],
  Singer: ['Heavy Duty 4423', 'Buttonhole 160', 'Other'],
  Janome: ['HD3000', 'MB-4S', 'Other'],
  Juki: ['MO-654DE', 'LK1900A-SS', 'LX-1900B-SS', 'Other'],
  Pfaff: ['Other'],
  Bernina: ['Other'],
  Other: ['Other'],
};

const mockTypes: { label: string; value: MachineType }[] = [
  { label: 'Industrial', value: 'Industrial' },
  { label: 'Domestic', value: 'Domestic' },
  { label: 'Embroidery', value: 'Embroidery' },
  { label: 'Overlock', value: 'Overlock' },
  { label: 'Buttonhole', value: 'Buttonhole' },
  { label: 'Other', value: 'Other' },
];

// Mock invoice data
const initialMockInvoices: Invoice[] = [
  {
    id: 1,
    invoiceNumber: '00415',
    invoiceType: 'VAT',
    customerName: 'ABC Holdings (Pvt) Ltd',
    customerAddress: '123 Main Street, Colombo 05',
    vatTinNic: 'VAT-123456789',
    invoiceDate: '2024-12-31',
    periodFrom: '2024-12-01',
    periodTo: '2024-12-31',
    items: [
      {
        id: '1',
        itemCode: '212WG00032',
        description: 'JUKI LK1900A-SS-ELECTRONIC BAR TACK MACHINE',
        brand: 'Juki',
        model: 'LK1900A-SS',
        type: 'Industrial',
        numberOfMachines: 1,
        monthlyRentPerMachine: 15000,
        subtotal: 15000,
      },
    ],
    subtotal: 15000,
    vatAmount: 2700,
    totalAmount: 17700,
    paymentDetails: {
      paymentMethod: 'Bank Transfer',
      paymentDate: '2024-01-20',
      receiptNumber: 'RCP-2024-001',
      amount: 17700,
      status: 'paid',
    },
    status: 'paid',
  },
  {
    id: 2,
    invoiceNumber: '056832',
    invoiceType: 'Non-VAT',
    customerName: 'John Perera',
    customerAddress: '45 Galle Road, Mount Lavinia',
    vatTinNic: 'NIC-123456789V',
    invoiceDate: '2024-12-01',
    periodFrom: '2024-12-01',
    periodTo: '2024-12-31',
    items: [
      {
        id: '1',
        itemCode: '212WG00033',
        description: 'JUKI LX-1900B-SS - ELECTRONIC BAR TACK MACHINE',
        serialNumber: '2LIHK00181',
        brand: 'Juki',
        model: 'LX-1900B-SS',
        type: 'Industrial',
        numberOfMachines: 1,
        monthlyRentPerMachine: 17000,
        subtotal: 17000,
      },
    ],
    subtotal: 17000,
    vatAmount: 0,
    totalAmount: 17000,
    paymentDetails: {
      paymentMethod: 'Cash',
      paymentDate: '2024-02-12',
      receiptNumber: 'RCP-2024-002',
      amount: 17000,
      status: 'paid',
    },
    status: 'paid',
  },
];

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'invoiceNumber',
    label: 'Invoice Number',
    sortable: true,
    filterable: true,
  },
  {
    key: 'invoiceType',
    label: 'Type',
    sortable: true,
    filterable: true,
    render: (value: string) => (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          value === 'VAT'
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}
      >
        {value}
      </span>
    ),
  },
  {
    key: 'customerName',
    label: 'Customer Name',
    sortable: true,
    filterable: true,
  },
  {
    key: 'invoiceDate',
    label: 'Invoice Date',
    sortable: true,
    filterable: false,
    render: (value: string) => {
      const date = new Date(value);
      return (
        <span className="text-gray-900 dark:text-white">
          {date.toLocaleDateString('en-LK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      );
    },
  },
  {
    key: 'totalAmount',
    label: 'Total Amount',
    sortable: true,
    filterable: false,
    render: (value: number, row: Invoice) => (
      <span className="text-gray-900 dark:text-white font-medium">
        LKR {value.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value: string) => {
      const statusColors: Record<string, string> = {
        draft: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
        issued: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
        paid: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
        overdue: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      };
      return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[value] || statusColors.draft}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      );
    },
  },
];

const InvoicePage: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>(initialMockInvoices);

  // Create form state
  const [customerId, setCustomerId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'VAT' | 'Non-VAT'>('VAT');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'subtotal'>[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Update form state - only status
  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'issued' | 'paid' | 'overdue'>('draft');

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleCreateInvoice = () => {
    setIsCreateModalOpen(true);
    // Reset form
    setCustomerId('');
    setInvoiceType('VAT');
    setInvoiceDate('');
    setPeriodFrom('');
    setPeriodTo('');
    setItems([]);
    setPaymentMethod('');
    setPaymentDate('');
    setReceiptNumber('');
    setReceiptFile(null);
    setFormErrors({});
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCustomerId('');
    setInvoiceType('VAT');
    setInvoiceDate('');
    setPeriodFrom('');
    setPeriodTo('');
    setItems([]);
    setPaymentMethod('');
    setPaymentDate('');
    setReceiptNumber('');
    setReceiptFile(null);
    setFormErrors({});
  };

  const handleCustomerChange = (customerId: string) => {
    setCustomerId(customerId);
    const customer = mockCustomers.find((c) => c.id === customerId);
    if (customer) {
      setInvoiceType(customer.type === 'Company' ? 'VAT' : 'Non-VAT');
    }
  };

  const generateItemCode = (index: number): string => {
    return `212WG${String(index + 1).padStart(5, '0')}`;
  };

  const generateDescription = (brand: string, model: string, type: MachineType): string => {
    if (brand === 'Juki' && (model.includes('LK1900A-SS') || model.includes('LX-1900B-SS'))) {
      return `${brand.toUpperCase()} ${model}-ELECTRONIC BAR TACK MACHINE`;
    }
    return `${brand.toUpperCase()} ${model} - ${type}`;
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        itemCode: generateItemCode(items.length),
        description: '',
        brand: '',
        model: '',
        type: 'Domestic',
        numberOfMachines: 1,
        monthlyRentPerMachine: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    // Regenerate item codes
    const updatedItems = items.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      itemCode: generateItemCode(idx),
    }));
    setItems(updatedItems);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If brand or model changes, update description
    if (field === 'brand' || field === 'model' || field === 'type') {
      if (updatedItems[index].brand && updatedItems[index].model && updatedItems[index].type) {
        updatedItems[index].description = generateDescription(
          updatedItems[index].brand,
          updatedItems[index].model,
          updatedItems[index].type
        );
      }
    }
    
    // If brand changes, reset model
    if (field === 'brand') {
      updatedItems[index].model = '';
      updatedItems[index].description = '';
    }
    
    setItems(updatedItems);
  };

  const getAvailableModels = (brand: string): string[] => {
    return mockModels[brand] || ['Other'];
  };

  const calculateItemSubtotal = (item: Omit<InvoiceItem, 'id' | 'subtotal'>): number => {
    return item.numberOfMachines * item.monthlyRentPerMachine;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
    const vatAmount = invoiceType === 'VAT' ? subtotal * 0.18 : 0;
    const totalAmount = subtotal + vatAmount;
    return { subtotal, vatAmount, totalAmount };
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!customerId) errors.customerId = 'Customer is required';
    if (!invoiceDate) errors.invoiceDate = 'Invoice Date is required';
    if (!periodFrom) errors.periodFrom = 'Period From is required';
    if (!periodTo) errors.periodTo = 'Period To is required';
    if (items.length === 0) errors.items = 'At least one item is required';
    
    items.forEach((item, index) => {
      if (!item.brand) errors[`item_${index}_brand`] = 'Brand is required';
      if (!item.model) errors[`item_${index}_model`] = 'Model is required';
      if (!item.type) errors[`item_${index}_type`] = 'Type is required';
      if (item.numberOfMachines <= 0) errors[`item_${index}_machines`] = 'Number of machines must be greater than 0';
      if (item.monthlyRentPerMachine <= 0) errors[`item_${index}_rent`] = 'Monthly rent must be greater than 0';
    });

    if (!paymentMethod) errors.paymentMethod = 'Payment Method is required';
    if (!paymentDate) errors.paymentDate = 'Payment Date is required';
    if (!receiptFile && !receiptNumber) {
      errors.receipt = 'Payment receipt (file or receipt number) is required before dispatch';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const customer = mockCustomers.find((c) => c.id === customerId);
      const { subtotal, vatAmount, totalAmount } = calculateTotals();
      
      const invoiceItems: InvoiceItem[] = items.map((item, index) => ({
        id: String(index + 1),
        ...item,
        subtotal: calculateItemSubtotal(item),
      }));

      const newInvoice: Invoice = {
        id: invoices.length > 0 ? Math.max(...invoices.map(i => i.id)) + 1 : 1,
        invoiceNumber: String(invoices.length + 1).padStart(5, '0'),
        invoiceType,
        customerName: customer?.name || '',
        customerAddress: customer?.address || '',
        vatTinNic: customer?.vatTinNic || '',
        invoiceDate,
        periodFrom,
        periodTo,
        items: invoiceItems,
        subtotal,
        vatAmount,
        totalAmount,
        paymentDetails: {
          paymentMethod,
          paymentDate,
          receiptNumber: receiptNumber || undefined,
          receiptFile: receiptFile?.name || undefined,
          amount: totalAmount,
          status: 'paid' as const,
        },
        status: 'issued' as const,
      };

      setInvoices([...invoices, newInvoice]);
      console.log('Create invoice payload:', newInvoice);
      alert(`Invoice created successfully.`);
      handleCloseCreateModal();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceStatus(invoice.status);
    setIsUpdateModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedInvoice(null);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedInvoice(null);
    setInvoiceStatus('draft');
  };

  const handleSubmitUpdate = async () => {
    if (!selectedInvoice) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedInvoice: Invoice = {
        ...selectedInvoice,
        status: invoiceStatus,
      };

      setInvoices(invoices.map(inv => inv.id === selectedInvoice.id ? updatedInvoice : inv));
      console.log('Update invoice payload:', updatedInvoice);
      alert(`Invoice status updated successfully.`);
      handleCloseUpdateModal();
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Failed to update invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Action buttons
  const actions: ActionButton[] = [
    {
      label: '',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewInvoice,
      tooltip: 'View Invoice',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
    {
      label: '',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleEditInvoice,
      tooltip: 'Edit Invoice',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
    },
  ];

  /** Invoice body content only (customer, period, table, total) — used inside LetterheadDocument */
  const renderInvoiceBodyContent = (invoice: Invoice) => {
    const { subtotal, vatAmount, totalAmount } = invoice;
    const isVAT = invoice.invoiceType === 'VAT';
    const dateStr = (d: string) =>
      new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
      <div className="space-y-4 print:space-y-3" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {/* Invoice number and date — right-aligned (matches letterhead invoice layout) */}
        <div className="text-right text-sm print:text-xs text-gray-700">
          <div className="mb-0.5">
            <span className="text-gray-600">Invoice: </span>
            <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
          </div>
          <div>
            <span className="text-gray-600">Date of Issue: </span>
            <span className="font-medium text-gray-900">{dateStr(invoice.invoiceDate)}</span>
          </div>
        </div>
        <div className="border-b border-gray-800" />

        {/* Customer and period */}
        <div className="text-sm print:text-xs text-gray-900">
          <div className="mb-1">
            <span className="text-gray-600 font-medium">Customer: </span>
            <span>{invoice.customerName}</span>
          </div>
          <div className="mb-1">
            <span className="text-gray-600 font-medium">Address: </span>
            <span>{invoice.customerAddress}</span>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Period: </span>
            <span>
              {dateStr(invoice.periodFrom)} to {dateStr(invoice.periodTo)}
            </span>
          </div>
          {isVAT && (
            <div className="mt-1">
              <span className="text-gray-600 font-medium">Customer VAT No: </span>
              <span>{invoice.vatTinNic}</span>
            </div>
          )}
          {!isVAT && invoice.vatTinNic && (
            <div className="mt-1">
              <span className="text-gray-600 font-medium">NIC: </span>
              <span>{invoice.vatTinNic}</span>
            </div>
          )}
        </div>
        <div className="border-b border-gray-800" />

        {/* Items table — Non-VAT: Description | Serial No | Monthly Rental (matches image); VAT: full columns */}
        <div className="mb-4 print:mb-3">
          {!isVAT ? (
            <table className="w-full border-collapse print:text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-700">Description</th>
                  <th className="text-center py-2 px-2 text-xs font-semibold text-gray-700">Serial No</th>
                  <th className="text-right py-2 pl-4 text-xs font-semibold text-gray-700">Monthly Rental</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-2 pr-4 text-sm text-gray-900 print:text-xs">
                      {item.numberOfMachines} {item.description}
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-900 print:text-xs text-center">
                      {item.serialNumber || '-'}
                    </td>
                    <td className="py-2 pl-4 text-sm text-gray-900 print:text-xs text-right">
                      {item.monthlyRentPerMachine.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse border border-gray-300 print:text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700">Item</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-700">Rate</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-700">Qty</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 print:text-xs">{item.itemCode}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 print:text-xs">{item.description}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-right print:text-xs">
                      {item.monthlyRentPerMachine.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-right print:text-xs">{item.numberOfMachines}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 text-right font-medium print:text-xs">
                      {item.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Total row — matches image: "Total Amount" left, amount right */}
          <div className={`flex justify-between items-center mt-2 ${!isVAT ? 'border-t border-gray-800 pt-2' : ''}`}>
            <span className="text-sm font-bold text-gray-900 print:text-xs">Total Amount</span>
            <span className="text-sm font-bold text-gray-900 print:text-xs">
              {totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {isVAT && (subtotal !== totalAmount || vatAmount > 0) && (
            <div className="mt-2 space-y-1 text-sm print:text-xs text-gray-700">
              <div className="flex justify-end gap-4">
                <span>Sub Amount: Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
              {vatAmount > 0 && (
                <div className="flex justify-end gap-4">
                  <span>VAT (18%): Rs. {vatAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /** Signatures block for letterhead footerContent */
  const renderInvoiceSignatures = () => (
    <div className="mt-8 print:mt-6 flex justify-between">
      <div className="w-48 print:w-40">
        <div className="border-t border-gray-300 pt-1 mt-12 print:mt-8">
          <p className="text-xs text-gray-600 print:text-xs">Authorized By</p>
        </div>
      </div>
      <div className="w-48 print:w-40">
        <div className="border-t border-gray-300 pt-1 mt-12 print:mt-8">
          <p className="text-xs text-gray-600 print:text-xs">Received By</p>
        </div>
      </div>
    </div>
  );

  /** Full invoice in letterhead layout (logo, INVOICE title, body, signatures, footer) */
  const renderInvoiceWithLetterhead = (invoice: Invoice) => {
    const isVAT = invoice.invoiceType === 'VAT';
    return (
      <div className="bg-white text-black max-w-[210mm] mx-auto p-6 sm:p-8 print:p-8 print:max-w-none" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <LetterheadDocument
          documentTitle={isVAT ? 'TAX INVOICE' : 'INVOICE'}
          footerStyle="full"
          footerContent={renderInvoiceSignatures()}
          className="print:p-0"
        >
          {renderInvoiceBodyContent(invoice)}
        </LetterheadDocument>
      </div>
    );
  };

  // View Invoice Content - Formatted like actual invoice (no duplicate title; Print is in modal header)
  const renderInvoiceDetails = () => {
    if (!selectedInvoice) return null;

    return (
      <div>
        {/* Screen View - invoice document only; "Invoice Details" and Print are in modal header */}
        <div className="print:hidden">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 border border-gray-200 dark:border-slate-700 overflow-auto">
            {renderInvoiceWithLetterhead(selectedInvoice)}
          </div>
        </div>
      </div>
    );
  };

  // Create form content — layout matches printed TAX INVOICE for familiar UX
  const renderInvoiceForm = () => {
    const { subtotal, vatAmount, totalAmount } = calculateTotals();
    const selectedCustomer = mockCustomers.find((c) => c.id === customerId);

    return (
      <div className="bg-white text-gray-900 max-w-[210mm] mx-auto" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <LetterheadDocument
          documentTitle={invoiceType === 'VAT' ? 'TAX INVOICE' : 'INVOICE'}
          footerStyle="full"
        >
          {/* Invoice number and date — right-aligned (matches print) */}
          <div className="text-right text-sm text-gray-700 mb-1">
            <div>
              <span className="text-gray-600 font-medium">Invoice: </span>
              <span className="font-medium text-gray-900">(Auto-generated on save)</span>
            </div>
            <div className="mt-1">
              <span className="text-gray-600 font-medium">Date of Issue: </span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={`inline-block ml-1 px-2 py-1 border rounded text-gray-900 ${
                  formErrors.invoiceDate ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
            </div>
            {formErrors.invoiceDate && (
              <p className="text-right text-xs text-red-500 mt-0.5">{formErrors.invoiceDate}</p>
            )}
          </div>
          <div className="border-b border-gray-800 my-3" />

          {/* Customer block — left-aligned (matches print) */}
          <div className="text-sm text-gray-900 space-y-1">
            <div>
              <span className="text-gray-600 font-medium">Customer: </span>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`inline-block min-w-[200px] px-2 py-1 border rounded text-gray-900 ${
                  formErrors.customerId ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">Select Customer</option>
                {mockCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.type})
                  </option>
                ))}
              </select>
              {formErrors.customerId && (
                <span className="ml-2 text-xs text-red-500">{formErrors.customerId}</span>
              )}
            </div>
            <div>
              <span className="text-gray-600 font-medium">Address: </span>
              <span className="text-gray-900">{selectedCustomer?.address || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Period: </span>
              <input
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className={`inline-block w-32 px-2 py-1 border rounded text-gray-900 ${
                  formErrors.periodFrom ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
              <span className="mx-1 text-gray-600"> to </span>
              <input
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className={`inline-block w-32 px-2 py-1 border rounded text-gray-900 ${
                  formErrors.periodTo ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
              {formErrors.periodFrom && (
                <span className="ml-2 text-xs text-red-500">{formErrors.periodFrom}</span>
              )}
              {formErrors.periodTo && (
                <span className="ml-2 text-xs text-red-500">{formErrors.periodTo}</span>
              )}
            </div>
            <div>
              <span className="text-gray-600 font-medium">Customer VAT No: </span>
              <span className="text-gray-900">{selectedCustomer?.vatTinNic || '—'}</span>
            </div>
          </div>
          <div className="border-b border-gray-800 my-3" />

          {/* Itemized table — matches print: Item | Description | Rate | Qty | Amount */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Itemised details</span>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            {formErrors.items && (
              <p className="mb-2 text-sm text-red-500">{formErrors.items}</p>
            )}

            {items.length === 0 ? (
              <div className="text-center py-6 text-gray-500 border border-dashed border-gray-300 rounded">
                No items added. Click &quot;Add Item&quot; to add items to the invoice.
              </div>
            ) : (
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700">Item</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700">Description</th>
                    <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">Rate</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700">Qty</th>
                    <th className="border border-gray-300 px-2 py-2 text-right font-semibold text-gray-700">Amount</th>
                    <th className="border border-gray-300 px-2 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <React.Fragment key={index}>
                      <tr className="border-b border-gray-200">
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-900 align-top">
                          <input
                            type="text"
                            value={item.itemCode}
                            readOnly
                            className="w-full bg-gray-50 border-0 p-0 text-gray-900 text-sm"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 align-top">
                          <input
                            type="text"
                            value={item.description}
                            readOnly
                            className="w-full bg-gray-50 border-0 p-0 text-gray-900 text-sm"
                          />
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            <select
                              value={item.brand}
                              onChange={(e) => updateItem(index, 'brand', e.target.value)}
                              className={`px-1.5 py-0.5 border rounded ${
                                formErrors[`item_${index}_brand`] ? 'border-red-500' : 'border-gray-300'
                              } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                              <option value="">Brand</option>
                              {mockBrands.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                            <select
                              value={item.model}
                              onChange={(e) => updateItem(index, 'model', e.target.value)}
                              disabled={!item.brand}
                              className="px-1.5 py-0.5 border rounded border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">Model</option>
                              {item.brand && getAvailableModels(item.brand).map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <select
                              value={item.type}
                              onChange={(e) => updateItem(index, 'type', e.target.value as MachineType)}
                              className={`px-1.5 py-0.5 border rounded ${
                                formErrors[`item_${index}_type`] ? 'border-red-500' : 'border-gray-300'
                              } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                              {mockTypes.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                            {invoiceType === 'Non-VAT' && (
                              <input
                                type="text"
                                value={item.serialNumber || ''}
                                onChange={(e) => updateItem(index, 'serialNumber', e.target.value)}
                                placeholder="Serial"
                                className="w-20 px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                          </div>
                          {(formErrors[`item_${index}_brand`] || formErrors[`item_${index}_model`] || formErrors[`item_${index}_type`]) && (
                            <p className="text-xs text-red-500 mt-0.5">
                              {formErrors[`item_${index}_brand`] || formErrors[`item_${index}_model`] || formErrors[`item_${index}_type`]}
                            </p>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.monthlyRentPerMachine || ''}
                            onChange={(e) => updateItem(index, 'monthlyRentPerMachine', parseFloat(e.target.value) || 0)}
                            className={`w-20 text-right px-1.5 py-0.5 border rounded ${
                              formErrors[`item_${index}_rent`] ? 'border-red-500' : 'border-gray-300'
                            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          />
                          {formErrors[`item_${index}_rent`] && (
                            <p className="text-xs text-red-500 mt-0.5">{formErrors[`item_${index}_rent`]}</p>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center align-top">
                          <input
                            type="number"
                            min="1"
                            value={item.numberOfMachines}
                            onChange={(e) => updateItem(index, 'numberOfMachines', parseInt(e.target.value) || 0)}
                            className={`w-14 text-center px-1.5 py-0.5 border rounded ${
                              formErrors[`item_${index}_machines`] ? 'border-red-500' : 'border-gray-300'
                            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          />
                          {formErrors[`item_${index}_machines`] && (
                            <p className="text-xs text-red-500 mt-0.5">{formErrors[`item_${index}_machines`]}</p>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right font-medium text-gray-900 align-top">
                          {calculateItemSubtotal(item).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border border-gray-300 px-1 py-1.5 align-top">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 text-red-600 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400 rounded"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}

            {/* Totals — matches print: Total Amount left label, value right */}
            {items.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900">Total Amount</span>
                  <span className="font-bold text-gray-900 text-lg">
                    {totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {invoiceType === 'VAT' && vatAmount > 0 && (
                  <>
                    <div className="flex justify-end text-sm text-gray-700">
                      Sub Amount: Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex justify-end text-sm text-gray-700">
                      VAT (18%): Rs. {vatAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="border-b border-gray-800 my-3" />

          {/* Authorized By / Received By — matches print */}
          <div className="flex justify-between text-xs text-gray-600 my-4">
            <div className="w-40">
              <div className="border-b border-gray-400 pt-6">Authorized By</div>
            </div>
            <div className="w-40">
              <div className="border-b border-gray-400 pt-6">Received By</div>
            </div>
          </div>
          <div className="border-b border-gray-300 my-2" />

          {/* Payment & Billing — compact section (required for validation) */}
          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Payment & Billing Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Payment Method <span className="text-red-500">*</span></label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={`w-full px-2 py-1.5 border rounded text-gray-900 ${
                    formErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="">Select</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
                {formErrors.paymentMethod && (
                  <p className="text-xs text-red-500 mt-0.5">{formErrors.paymentMethod}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Payment Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={`w-full px-2 py-1.5 border rounded text-gray-900 ${
                    formErrors.paymentDate ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {formErrors.paymentDate && (
                  <p className="text-xs text-red-500 mt-0.5">{formErrors.paymentDate}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Receipt Number</label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Receipt (File) <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className={`w-full px-2 py-1.5 border rounded text-gray-900 text-xs ${
                    formErrors.receipt ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {receiptFile && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{receiptFile.name}</p>
                )}
                {formErrors.receipt && (
                  <p className="text-xs text-red-500 mt-0.5">{formErrors.receipt}</p>
                )}
              </div>
            </div>
          </div>
        </LetterheadDocument>
      </div>
    );
  };

  // Simplified update form - only shows read-only fields and editable status
  const renderUpdateForm = () => {
    if (!selectedInvoice) return null;

    const customer = mockCustomers.find((c) => c.name === selectedInvoice.customerName);

    return (
      <div className="space-y-6">
        {/* Customer Information - Read Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company/Individual Name
            </label>
            <input
              type="text"
              value={selectedInvoice.customerName}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Address
            </label>
            <input
              type="text"
              value={selectedInvoice.customerAddress}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              VAT/TIN/NIC Number
            </label>
            <input
              type="text"
              value={selectedInvoice.vatTinNic}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invoice Type
            </label>
            <input
              type="text"
              value={selectedInvoice.invoiceType}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invoice Date
            </label>
            <input
              type="text"
              value={new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-LK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period From
            </label>
            <input
              type="text"
              value={new Date(selectedInvoice.periodFrom).toLocaleDateString('en-LK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period To
            </label>
            <input
              type="text"
              value={new Date(selectedInvoice.periodTo).toLocaleDateString('en-LK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={invoiceStatus}
              onChange={(e) => setInvoiceStatus(e.target.value as 'draft' | 'issued' | 'paid' | 'overdue')}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
            >
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Print-only invoice in letterhead — hidden on screen, visible when printing */}
      {selectedInvoice && (
        <div className="hidden print:block print:fixed print:inset-0 print:z-[9999] print:bg-white print:p-0 print:m-0">
          {renderInvoiceWithLetterhead(selectedInvoice)}
        </div>
      )}

      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 print:hidden">
        {/* Top navbar */}
        <Navbar onMenuClick={handleMenuClick} />

        {/* Left sidebar */}
        <Sidebar
          onLogout={handleLogout}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={handleMobileSidebarClose}
          onExpandedChange={setIsSidebarExpanded}
        />

        {/* Main content area */}
        <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
          isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
        }`}>
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Invoice & Payments</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage invoices, payments, and generate printable invoices for VAT and Non-VAT invoices.
                </p>
              </div>
            </div>

            {/* Invoice table card */}
            <Table
              data={invoices}
              columns={columns}
              actions={actions}
              itemsPerPage={10}
              searchable
              filterable
              onCreateClick={handleCreateInvoice}
              createButtonLabel="Create Invoice"
              emptyMessage="No invoices found."
            />
          </div>
        </main>

        {/* Create Invoice Modal — document-style layout matching printed TAX INVOICE */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-[210mm] max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
              {/* Modal Header — minimal; title is inside letterhead */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
                <button
                  onClick={handleCloseCreateModal}
                  className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content — scrollable invoice-style form */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100/50">
                {renderInvoiceForm()}
              </div>

              {/* Modal Footer — actions */}
              <div className="flex-shrink-0 flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCreate}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Invoice Modal - Simplified */}
        {isUpdateModalOpen && selectedInvoice && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Update Invoice</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Invoice Number: {selectedInvoice.invoiceNumber}
                  </p>
                </div>
                <button
                  onClick={handleCloseUpdateModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                {renderUpdateForm()}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCloseUpdateModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitUpdate}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update Invoice'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Invoice Modal - Header fixed (sticky); Print button stays visible when scrolling */}
        {isViewModalOpen && selectedInvoice && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header - Fixed; "Invoice Details" + Print + Close (stays visible when content scrolls) */}
              <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Invoice Details</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={handleCloseViewModal}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content - Scrollable invoice; header and Print stay fixed above */}
              <div className="flex-1 overflow-y-auto p-6">
                {renderInvoiceDetails()}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default InvoicePage;