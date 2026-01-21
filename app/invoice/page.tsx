'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import { Eye, Pencil, X, Plus, Download, FileText, Trash2 } from 'lucide-react';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';

interface InvoiceItem {
  id: string;
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
  vatTinNic: string;
  invoiceDate: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paymentDetails: PaymentDetails;
  status: 'draft' | 'issued' | 'paid' | 'overdue';
}

// Mock customers for dropdown
const mockCustomers = [
  { id: 'C001', name: 'ABC Holdings (Pvt) Ltd', type: 'Company', vatTinNic: 'VAT-123456789' },
  { id: 'C002', name: 'John Perera', type: 'Individual', vatTinNic: 'NIC-123456789V' },
  { id: 'C003', name: 'XYZ Engineering', type: 'Company', vatTinNic: 'VAT-987654321' },
  { id: 'C004', name: 'Kamal Silva', type: 'Individual', vatTinNic: 'NIC-987654321V' },
  { id: 'C005', name: 'Mega Constructions', type: 'Company', vatTinNic: 'VAT-456789123' },
];

// Mock brands and types for dropdowns (matching machines page)
const mockBrands = ['Brother', 'Singer', 'Janome', 'Juki', 'Pfaff', 'Bernina', 'Other'];

const mockModels: Record<string, string[]> = {
  Brother: ['XL2600i', 'SE600', 'CS6000i', 'Other'],
  Singer: ['Heavy Duty 4423', 'Buttonhole 160', 'Other'],
  Janome: ['HD3000', 'MB-4S', 'Other'],
  Juki: ['MO-654DE', 'Other'],
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
const mockInvoices: Invoice[] = [
  {
    id: 1,
    invoiceNumber: 'INV-2024-001',
    invoiceType: 'VAT',
    customerName: 'ABC Holdings (Pvt) Ltd',
    vatTinNic: 'VAT-123456789',
    invoiceDate: '2024-01-15',
    items: [
      {
        id: '1',
        brand: 'Brother',
        model: 'XL2600i',
        type: 'Domestic',
        numberOfMachines: 3,
        monthlyRentPerMachine: 5000,
        subtotal: 15000,
      },
      {
        id: '2',
        brand: 'Singer',
        model: 'Heavy Duty 4423',
        type: 'Industrial',
        numberOfMachines: 2,
        monthlyRentPerMachine: 8000,
        subtotal: 16000,
      },
    ],
    subtotal: 31000,
    vatAmount: 5580,
    totalAmount: 36580,
    paymentDetails: {
      paymentMethod: 'Bank Transfer',
      paymentDate: '2024-01-20',
      receiptNumber: 'RCP-2024-001',
      amount: 36580,
      status: 'paid',
    },
    status: 'paid',
  },
  {
    id: 2,
    invoiceNumber: 'INV-2024-002',
    invoiceType: 'Non-VAT',
    customerName: 'John Perera',
    vatTinNic: 'NIC-123456789V',
    invoiceDate: '2024-02-10',
    items: [
      {
        id: '1',
        brand: 'Janome',
        model: 'HD3000',
        type: 'Domestic',
        numberOfMachines: 1,
        monthlyRentPerMachine: 3000,
        subtotal: 3000,
      },
    ],
    subtotal: 3000,
    vatAmount: 0,
    totalAmount: 3000,
    paymentDetails: {
      paymentMethod: 'Cash',
      paymentDate: '2024-02-12',
      receiptNumber: 'RCP-2024-002',
      amount: 3000,
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [customerId, setCustomerId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'VAT' | 'Non-VAT'>('VAT');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'subtotal'>[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const addItem = () => {
    setItems([
      ...items,
      {
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
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If brand changes, reset model
    if (field === 'brand') {
      updatedItems[index].model = '';
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

      const payload = {
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(mockInvoices.length + 1).padStart(3, '0')}`,
        invoiceType,
        customerName: customer?.name || '',
        vatTinNic: customer?.vatTinNic || '',
        invoiceDate,
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

      console.log('Create invoice payload:', payload);
      alert(`Invoice created successfully (frontend only).`);
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

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedInvoice(null);
  };

  

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedInvoice(null);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    // TODO: Implement PDF generation using a library like jsPDF or react-pdf
    // For now, we'll create a simple downloadable text representation
    const invoiceText = `
INVOICE
Invoice Number: ${invoice.invoiceNumber}
Invoice Type: ${invoice.invoiceType}
Customer: ${invoice.customerName}
VAT/TIN/NIC: ${invoice.vatTinNic}
Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-LK')}

ITEMS:
${invoice.items.map((item, idx) => `
${idx + 1}. ${item.brand} ${item.model} - ${item.type}
   Number of Machines: ${item.numberOfMachines}
   Monthly Rent per Machine: LKR ${item.monthlyRentPerMachine.toLocaleString()}
   Subtotal: LKR ${item.subtotal.toLocaleString()}
`).join('')}

SUBTOTAL: LKR ${invoice.subtotal.toLocaleString()}
${invoice.vatAmount > 0 ? `VAT (18%): LKR ${invoice.vatAmount.toLocaleString()}` : ''}
TOTAL: LKR ${invoice.totalAmount.toLocaleString()}

PAYMENT DETAILS:
Payment Method: ${invoice.paymentDetails.paymentMethod}
Payment Date: ${new Date(invoice.paymentDetails.paymentDate).toLocaleDateString('en-LK')}
${invoice.paymentDetails.receiptNumber ? `Receipt Number: ${invoice.paymentDetails.receiptNumber}` : ''}
Amount: LKR ${invoice.paymentDetails.amount.toLocaleString()}
Status: ${invoice.paymentDetails.status}
    `.trim();

    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // In production, replace this with actual PDF generation
    alert('PDF download initiated. In production, this will generate a proper PDF file.');
  };

  // Action buttons
  const actions: ActionButton[] = [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewInvoice,
    },
    {
      label: 'Download PDF',
      icon: <Download className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleDownloadPDF,
    }
    
  ];

  // View Invoice Content
  const renderInvoiceDetails = () => {
    if (!selectedInvoice) return null;

    const { subtotal, vatAmount, totalAmount } = selectedInvoice;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Invoice Details</h3>
          <button
            onClick={() => handleDownloadPDF(selectedInvoice)}
            className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>

        {/* Invoice Header */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Invoice Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Invoice Number:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedInvoice.invoiceNumber}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Invoice Type:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedInvoice.invoiceType}
                {selectedInvoice.invoiceType === 'VAT' && ' (18%)'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Invoice Date:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-LK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Customer Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Customer Name:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedInvoice.customerName}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">VAT/TIN/NIC:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedInvoice.vatTinNic}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Items
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-slate-600">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Brand
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Model
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    No. of Machines
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Monthly Rent/Machine
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                {selectedInvoice.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.brand}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.model}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ${
                          item.type === 'Industrial'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : item.type === 'Domestic'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : item.type === 'Embroidery'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : item.type === 'Overlock'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                            : item.type === 'Buttonhole'
                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.numberOfMachines}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">
                      LKR {item.monthlyRentPerMachine.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-medium text-right">
                      LKR {item.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Payment & Billing Details
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                LKR {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {vatAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">VAT (18%):</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  LKR {vatAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-slate-600">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Amount:</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                LKR {totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Payment Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Payment Method:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedInvoice.paymentDetails.paymentMethod}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Payment Date:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {new Date(selectedInvoice.paymentDetails.paymentDate).toLocaleDateString('en-LK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {selectedInvoice.paymentDetails.receiptNumber && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Receipt Number:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {selectedInvoice.paymentDetails.receiptNumber}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-500 dark:text-gray-400">Payment Status:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {selectedInvoice.paymentDetails.status.charAt(0).toUpperCase() + selectedInvoice.paymentDetails.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const { subtotal, vatAmount, totalAmount } = calculateTotals();
  const selectedCustomer = mockCustomers.find((c) => c.id === customerId);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      {/* Top navbar */}
      <Navbar onMenuClick={handleMenuClick} />

      {/* Left sidebar */}
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
      />

      {/* Main content area */}
      <main className="pt-[70px] lg:ml-[300px] p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Invoice & Payments</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage invoices, payments, and generate downloadable PDFs for VAT and Non-VAT invoices.
              </p>
            </div>
            <button
              onClick={handleCreateInvoice}
              className="px-6 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
            >
              Create Invoice
            </button>
          </div>

          {/* Invoice table card */}
          <Table
            data={mockInvoices}
            columns={columns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            emptyMessage="No invoices found."
          />
        </div>
      </main>

      {/* Create Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Invoice</h2>
              <button
                onClick={handleCloseCreateModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company/Individual Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={customerId}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.customerId
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    >
                      <option value="">Select Customer</option>
                      {mockCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.type})
                        </option>
                      ))}
                    </select>
                    {formErrors.customerId && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.customerId}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      VAT/TIN/NIC Number
                    </label>
                    <input
                      type="text"
                      value={selectedCustomer?.vatTinNic || ''}
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
                      value={invoiceType}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Invoice Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.invoiceDate
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.invoiceDate && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.invoiceDate}</p>
                    )}
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h3>
                    <button
                      type="button"
                      onClick={addItem}
                      className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>
                  {formErrors.items && (
                    <p className="mb-2 text-sm text-red-500">{formErrors.items}</p>
                  )}

                  {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No items added. Click "Add Item" to add items to the invoice.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-700/50"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Item {index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Brand <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={item.brand}
                                onChange={(e) => updateItem(index, 'brand', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm ${
                                  formErrors[`item_${index}_brand`]
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                              >
                                <option value="">Select Brand</option>
                                {mockBrands.map((brand) => (
                                  <option key={brand} value={brand}>
                                    {brand}
                                  </option>
                                ))}
                              </select>
                              {formErrors[`item_${index}_brand`] && (
                                <p className="mt-1 text-xs text-red-500">
                                  {formErrors[`item_${index}_brand`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Model <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={item.model}
                                onChange={(e) => updateItem(index, 'model', e.target.value)}
                                disabled={!item.brand}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm ${
                                  !item.brand
                                    ? 'bg-gray-100 dark:bg-slate-600 cursor-not-allowed'
                                    : ''
                                } ${
                                  formErrors[`item_${index}_model`]
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                              >
                                <option value="">Select Model</option>
                                {item.brand && getAvailableModels(item.brand).map((model) => (
                                  <option key={model} value={model}>
                                    {model}
                                  </option>
                                ))}
                              </select>
                              {formErrors[`item_${index}_model`] && (
                                <p className="mt-1 text-xs text-red-500">
                                  {formErrors[`item_${index}_model`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Type <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={item.type}
                                onChange={(e) => updateItem(index, 'type', e.target.value as MachineType)}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm ${
                                  formErrors[`item_${index}_type`]
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                              >
                                {mockTypes.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                              {formErrors[`item_${index}_type`] && (
                                <p className="mt-1 text-xs text-red-500">
                                  {formErrors[`item_${index}_type`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Number of Machines <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.numberOfMachines}
                                onChange={(e) => updateItem(index, 'numberOfMachines', parseInt(e.target.value) || 0)}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm ${
                                  formErrors[`item_${index}_machines`]
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                              />
                              {formErrors[`item_${index}_machines`] && (
                                <p className="mt-1 text-xs text-red-500">
                                  {formErrors[`item_${index}_machines`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Monthly Rent per Machine <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.monthlyRentPerMachine}
                                onChange={(e) => updateItem(index, 'monthlyRentPerMachine', parseFloat(e.target.value) || 0)}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm ${
                                  formErrors[`item_${index}_rent`]
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                              />
                              {formErrors[`item_${index}_rent`] && (
                                <p className="mt-1 text-xs text-red-500">
                                  {formErrors[`item_${index}_rent`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Subtotal
                              </label>
                              <input
                                type="text"
                                value={`LKR ${calculateItemSubtotal(item).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}
                                disabled
                                className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed text-sm font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment & Billing Details */}
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Payment & Billing Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                          formErrors.paymentMethod
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-slate-600'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                      >
                        <option value="">Select Payment Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Credit Card">Credit Card</option>
                      </select>
                      {formErrors.paymentMethod && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.paymentMethod}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payment Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                          formErrors.paymentDate
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-slate-600'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                      />
                      {formErrors.paymentDate && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.paymentDate}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Receipt Number
                      </label>
                      <input
                        type="text"
                        value={receiptNumber}
                        onChange={(e) => setReceiptNumber(e.target.value)}
                        placeholder="Enter receipt number"
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payment Receipt (File) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                          formErrors.receipt
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-slate-600'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                      />
                      {receiptFile && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Selected: {receiptFile.name}
                        </p>
                      )}
                      {formErrors.receipt && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.receipt}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Payment receipt is required before dispatch (PDF, JPG, or PNG)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-blue-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-indigo-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Invoice Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        LKR {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {vatAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">VAT (18%):</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          LKR {vatAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-indigo-800">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        Total Amount:
                      </span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        LKR {totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCreate}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create & Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {isViewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Invoice Details</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedInvoice.invoiceNumber}
                </p>
              </div>
              <button
                onClick={handleCloseViewModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">{renderInvoiceDetails()}</div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default InvoicePage;