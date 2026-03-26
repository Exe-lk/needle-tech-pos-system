'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import { Eye, Pencil, X, Plus, Download, FileText, Trash2, Printer, Calendar } from 'lucide-react';
import { LetterheadDocument, LETTERHEAD_COMPANY_INFO } from '@/src/components/letterhead/letterhead-document';
import { authFetch } from '@/lib/auth-client';
import { Swal, toast } from '@/src/lib/swal';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

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
  id: string;
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

interface MonthlyInvoicePreview {
  month: string;
  year: number;
  periodFrom: string;
  periodTo: string;
  daysInPeriod: number;
  daysInMonth: number;
  isPartialMonth: boolean;
  /** When true, this month was calculated with full monthly fee (no proration) */
  usedFullMonthlyFee?: boolean;
  proratedItems: {
    item: InvoiceItem;
    originalRate: number;
    proratedRate: number;
    proratedSubtotal: number;
  }[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
}

// API Response Types
interface ApiCustomer {
  id: string;
  code: string;
  type: 'GARMENT_FACTORY' | 'INDIVIDUAL';
  name: string;
  contactPerson: string;
  phones: string[];
  emails: string[];
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingRegion?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  vatRegistrationNumber?: string;
  currentBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
}

interface Brand {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

interface Model {
  id: string;
  name: string;
  code: string;
  brandId: string;
  description?: string;
  isActive: boolean;
  brand?: Brand;
}

interface MachineTypeData {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

interface ApiInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  rentalId?: string;
  type: string;
  taxCategory: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  issueDate: string;
  dueDate: string;
  lineItems: any[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  balance: number;
  customer?: ApiCustomer;
  rental?: any;
}

// Customer dropdown type
interface CustomerOption {
  id: string;
  name: string;
  type: 'Company' | 'Individual';
  vatTinNic: string;
  address: string;
}

// Helper Functions
const mapApiTypeToFrontend = (apiType: 'GARMENT_FACTORY' | 'INDIVIDUAL'): 'Company' | 'Individual' => {
  return apiType === 'GARMENT_FACTORY' ? 'Company' : 'Individual';
};

const mapApiStatusToFrontend = (apiStatus: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED'): 'draft' | 'issued' | 'paid' | 'overdue' => {
  const statusMap: Record<string, 'draft' | 'issued' | 'paid' | 'overdue'> = {
    'DRAFT': 'draft',
    'ISSUED': 'issued',
    'PAID': 'paid',
    'OVERDUE': 'overdue',
    'CANCELLED': 'draft'
  };
  return statusMap[apiStatus] || 'draft';
};

const mapFrontendStatusToApi = (status: 'draft' | 'issued' | 'paid' | 'overdue'): 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' => {
  const statusMap: Record<string, 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE'> = {
    'draft': 'DRAFT',
    'issued': 'ISSUED',
    'paid': 'PAID',
    'overdue': 'OVERDUE'
  };
  return statusMap[status] || 'DRAFT';
};

const buildCustomerAddress = (customer: ApiCustomer): string => {
  const parts = [
    customer.billingAddressLine1,
    customer.billingAddressLine2,
    customer.billingCity,
    customer.billingRegion,
    customer.billingPostalCode,
    customer.billingCountry || 'Sri Lanka'
  ].filter(Boolean);
  
  return parts.join(', ');
};

// API Functions
const fetchCustomers = async (): Promise<CustomerOption[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/customers?limit=1000`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }

    const data = await response.json();
    const apiCustomers: ApiCustomer[] = data.data?.items || [];

    return apiCustomers.map(customer => ({
      id: customer.id,
      name: customer.name,
      type: mapApiTypeToFrontend(customer.type),
      vatTinNic: customer.vatRegistrationNumber || customer.code,
      address: buildCustomerAddress(customer),
    }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
};

const fetchBrands = async (): Promise<Brand[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/brands/active`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch brands');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
};

const fetchModels = async (brandId?: string): Promise<Model[]> => {
  try {
    const url = brandId 
      ? `${API_BASE_URL}/models/active?brandId=${brandId}`
      : `${API_BASE_URL}/models/active`;
    
    const response = await authFetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
};

const fetchMachineTypes = async (): Promise<MachineTypeData[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/machine-types/active`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch machine types');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching machine types:', error);
    return [];
  }
};

const fetchInvoices = async (): Promise<Invoice[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/invoices?limit=1000`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch invoices');
    }

    const data = await response.json();
    const apiInvoices: ApiInvoice[] = data.data?.items || [];

    return apiInvoices.map(invoice => {
      const customer = invoice.customer;
      const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
      
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.taxCategory === 'VAT' ? 'VAT' : 'Non-VAT',
        customerName: customer?.name || 'Unknown Customer',
        customerAddress: customer ? buildCustomerAddress(customer) : '',
        vatTinNic: customer?.vatRegistrationNumber || customer?.code || '',
        invoiceDate: invoice.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        periodFrom: invoice.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        periodTo: invoice.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        items: lineItems.map((item: any, index: number) => ({
          id: String(index + 1),
          itemCode: item.itemCode || `212WG${String(index + 1).padStart(5, '0')}`,
          description: item.description || '',
          serialNumber: item.serialNumber,
          brand: item.brand || '',
          model: item.model || '',
          type: item.type || 'Industrial',
          numberOfMachines: item.quantity || 1,
          monthlyRentPerMachine: Number(item.unitPrice) || 0,
          subtotal: Number(item.quantity || 1) * Number(item.unitPrice || 0),
        })),
        subtotal: Number(invoice.subtotal) || 0,
        vatAmount: Number(invoice.vatAmount) || 0,
        totalAmount: Number(invoice.grandTotal) || 0,
        paymentDetails: {
          paymentMethod: '',
          paymentDate: invoice.dueDate?.split('T')[0] || '',
          amount: Number(invoice.grandTotal) || 0,
          status: invoice.paymentStatus === 'PAID' ? 'paid' : 'pending',
        },
        status: mapApiStatusToFrontend(invoice.status),
      };
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
};

const createInvoice = async (invoiceData: any): Promise<Invoice | null> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/invoices`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create invoice');
    }

    const data = await response.json();
    const apiInvoice: ApiInvoice = data.data;
    const customer = apiInvoice.customer;
    const lineItems = Array.isArray(apiInvoice.lineItems) ? apiInvoice.lineItems : [];

    return {
      id: apiInvoice.id,
      invoiceNumber: apiInvoice.invoiceNumber,
      invoiceType: apiInvoice.taxCategory === 'VAT' ? 'VAT' : 'Non-VAT',
      customerName: customer?.name || 'Unknown Customer',
      customerAddress: customer ? buildCustomerAddress(customer) : '',
      vatTinNic: customer?.vatRegistrationNumber || customer?.code || '',
      invoiceDate: apiInvoice.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      periodFrom: apiInvoice.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      periodTo: apiInvoice.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      items: lineItems.map((item: any, index: number) => ({
        id: String(index + 1),
        itemCode: item.itemCode || `212WG${String(index + 1).padStart(5, '0')}`,
        description: item.description || '',
        serialNumber: item.serialNumber,
        brand: item.brand || '',
        model: item.model || '',
        type: item.type || 'Industrial',
        numberOfMachines: item.quantity || 1,
        monthlyRentPerMachine: Number(item.unitPrice) || 0,
        subtotal: Number(item.quantity || 1) * Number(item.unitPrice || 0),
      })),
      subtotal: Number(apiInvoice.subtotal) || 0,
      vatAmount: Number(apiInvoice.vatAmount) || 0,
      totalAmount: Number(apiInvoice.grandTotal) || 0,
      paymentDetails: {
        paymentMethod: '',
        paymentDate: apiInvoice.dueDate?.split('T')[0] || '',
        amount: Number(apiInvoice.grandTotal) || 0,
        status: apiInvoice.paymentStatus === 'PAID' ? 'paid' : 'pending',
      },
      status: mapApiStatusToFrontend(apiInvoice.status),
    };
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

const updateInvoice = async (invoiceId: string, updateData: any): Promise<Invoice | null> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update invoice');
    }

    const data = await response.json();
    const apiInvoice: ApiInvoice = data.data;
    const customer = apiInvoice.customer;
    const lineItems = Array.isArray(apiInvoice.lineItems) ? apiInvoice.lineItems : [];

    return {
      id: apiInvoice.id,
      invoiceNumber: apiInvoice.invoiceNumber,
      invoiceType: apiInvoice.taxCategory === 'VAT' ? 'VAT' : 'Non-VAT',
      customerName: customer?.name || 'Unknown Customer',
      customerAddress: customer ? buildCustomerAddress(customer) : '',
      vatTinNic: customer?.vatRegistrationNumber || customer?.code || '',
      invoiceDate: apiInvoice.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      periodFrom: apiInvoice.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      periodTo: apiInvoice.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      items: lineItems.map((item: any, index: number) => ({
        id: String(index + 1),
        itemCode: item.itemCode || `212WG${String(index + 1).padStart(5, '0')}`,
        description: item.description || '',
        serialNumber: item.serialNumber,
        brand: item.brand || '',
        model: item.model || '',
        type: item.type || 'Industrial',
        numberOfMachines: item.quantity || 1,
        monthlyRentPerMachine: Number(item.unitPrice) || 0,
        subtotal: Number(item.quantity || 1) * Number(item.unitPrice || 0),
      })),
      subtotal: Number(apiInvoice.subtotal) || 0,
      vatAmount: Number(apiInvoice.vatAmount) || 0,
      totalAmount: Number(apiInvoice.grandTotal) || 0,
      paymentDetails: {
        paymentMethod: '',
        paymentDate: apiInvoice.dueDate?.split('T')[0] || '',
        amount: Number(apiInvoice.grandTotal) || 0,
        status: apiInvoice.paymentStatus === 'PAID' ? 'paid' : 'pending',
      },
      status: mapApiStatusToFrontend(apiInvoice.status),
    };
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

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
    label: 'Monthly Amount',
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
  const [isMonthlyInvoiceModalOpen, setIsMonthlyInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [monthlyInvoicePreviews, setMonthlyInvoicePreviews] = useState<MonthlyInvoicePreview[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  /** When true, monthly invoice generation uses full monthly rental fee for all months (no proration for partial months). */
  const [useFullMonthlyFee, setUseFullMonthlyFee] = useState(false);
  /** When set, a hidden print-only div shows multi-month invoice and print is triggered */
  const [monthlyPrintPreviews, setMonthlyPrintPreviews] = useState<MonthlyInvoicePreview[] | null>(null);
  const monthlyPrintTriggeredRef = useRef(false);

  // API Data
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [machineTypes, setMachineTypes] = useState<MachineTypeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Item form state for brand-model-type dropdowns
  const [selectedBrandIds, setSelectedBrandIds] = useState<Record<number, string>>({});
  const [availableModelsPerItem, setAvailableModelsPerItem] = useState<Record<number, Model[]>>({});

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [customersData, brandsData, typesData, invoicesData] = await Promise.all([
        fetchCustomers(),
        fetchBrands(),
        fetchMachineTypes(),
        fetchInvoices(),
      ]);
      
      setCustomers(customersData);
      setBrands(brandsData);
      setMachineTypes(typesData);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed to load data',
        text: 'Please refresh the page.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load models when brand is selected for an item
  const loadModelsForBrand = async (brandId: string, itemIndex: number) => {
    try {
      const modelsData = await fetchModels(brandId);
      setAvailableModelsPerItem(prev => ({
        ...prev,
        [itemIndex]: modelsData,
      }));
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

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
    setSelectedBrandIds({});
    setAvailableModelsPerItem({});
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
    setSelectedBrandIds({});
    setAvailableModelsPerItem({});
  };

  const handleCustomerChange = (customerId: string) => {
    setCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setInvoiceType(customer.type === 'Company' ? 'VAT' : 'Non-VAT');
    }
  };

  const generateItemCode = (index: number): string => {
    return `212WG${String(index + 1).padStart(5, '0')}`;
  };

  const generateDescription = (brandName: string, modelName: string, typeName: string): string => {
    if (brandName && modelName && typeName) {
      return `${brandName.toUpperCase()} ${modelName} - ${typeName.toUpperCase()}`;
    }
    return '';
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        itemCode: generateItemCode(items.length),
        description: '',
        brand: '',
        model: '',
        type: 'Industrial',
        numberOfMachines: 1,
        monthlyRentPerMachine: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    // Clean up brand/model state for this item
    const newSelectedBrandIds = { ...selectedBrandIds };
    const newAvailableModels = { ...availableModelsPerItem };
    delete newSelectedBrandIds[index];
    delete newAvailableModels[index];
    setSelectedBrandIds(newSelectedBrandIds);
    setAvailableModelsPerItem(newAvailableModels);
    
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
    
    // Handle brand change
    if (field === 'brand') {
      const brand = brands.find(b => b.name === value);
      if (brand) {
        setSelectedBrandIds(prev => ({ ...prev, [index]: brand.id }));
        loadModelsForBrand(brand.id, index);
        // Reset model when brand changes
        updatedItems[index].model = '';
        updatedItems[index].description = '';
      }
    }
    
    // Handle model or type change - update description
    if (field === 'model' || field === 'type') {
      if (updatedItems[index].brand && updatedItems[index].model && updatedItems[index].type) {
        updatedItems[index].description = generateDescription(
          updatedItems[index].brand,
          updatedItems[index].model,
          updatedItems[index].type
        );
      }
    }
    
    setItems(updatedItems);
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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const customer = customers.find((c) => c.id === customerId);
      const { subtotal, vatAmount, totalAmount } = calculateTotals();
      
      // Prepare line items for API
      const lineItems = items.map((item, index) => {
        const brand = brands.find(b => b.name === item.brand);
        const model = availableModelsPerItem[index]?.find(m => m.name === item.model);
        const type = machineTypes.find(t => t.name === item.type);
        
        return {
          description: item.description,
          quantity: item.numberOfMachines,
          unitPrice: item.monthlyRentPerMachine,
          machineId: null, // Optional, can be set if you have machine IDs
          brand: item.brand,
          model: item.model,
          type: item.type,
          brandId: brand?.id,
          modelId: model?.id,
          machineTypeId: type?.id,
          itemCode: item.itemCode,
          serialNumber: item.serialNumber,
          vatRate: invoiceType === 'VAT' ? 0.18 : 0,
        };
      });

      const invoicePayload = {
        customerId: customerId,
        type: 'RENTAL', // or appropriate invoice type
        taxCategory: invoiceType === 'VAT' ? 'VAT' : 'NON_VAT',
        lineItems: lineItems,
        issueDate: invoiceDate,
        dueDate: periodTo,
        subtotal: subtotal,
        vatAmount: vatAmount,
        grandTotal: totalAmount,
      };

      const newInvoice = await createInvoice(invoicePayload);
      
      if (newInvoice) {
        setInvoices([newInvoice, ...invoices]);
        toast.fire({
          icon: 'success',
          title: 'Invoice created successfully',
        });
        handleCloseCreateModal();
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed to create invoice',
        text: error.message || 'Please try again.',
        confirmButtonColor: '#dc2626',
      });
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
      const updatePayload = {
        status: mapFrontendStatusToApi(invoiceStatus),
        paymentStatus: invoiceStatus === 'paid' ? 'PAID' : invoiceStatus === 'overdue' ? 'OVERDUE' : 'PENDING',
      };

      const updatedInvoice = await updateInvoice(selectedInvoice.id, updatePayload);
      
      if (updatedInvoice) {
        setInvoices(invoices.map(inv => inv.id === selectedInvoice.id ? updatedInvoice : inv));
        toast.fire({
          icon: 'success',
          title: 'Invoice status updated',
        });
        handleCloseUpdateModal();
      }
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed to update invoice',
        text: error.message || 'Please try again.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Monthly Invoice Generation Functions
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const calculateMonthlyInvoices = (invoice: Invoice, useFullFee = false): MonthlyInvoicePreview[] => {
    const startDate = new Date(invoice.periodFrom);
    const endDate = new Date(invoice.periodTo);
    const previews: MonthlyInvoicePreview[] = [];

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = getDaysInMonth(year, month);

      // Determine period start and end for this month
      const isFirstMonth = currentDate.getMonth() === startDate.getMonth() && currentDate.getFullYear() === startDate.getFullYear();
      const isLastMonth = currentDate.getMonth() === endDate.getMonth() && currentDate.getFullYear() === endDate.getFullYear();

      const periodStart = isFirstMonth ? startDate.getDate() : 1;
      const periodEnd = isLastMonth ? endDate.getDate() : daysInMonth;
      const daysInPeriod = periodEnd - periodStart + 1;

      const isPartialMonth = daysInPeriod < daysInMonth;
      const applyFullFee = useFullFee;

      // Calculate amounts: when useFullFee, always use full monthly rate; otherwise prorate partial months
      const proratedItems = invoice.items.map(item => {
        const originalRate = item.monthlyRentPerMachine;
        const proratedRate = applyFullFee
          ? originalRate
          : (isPartialMonth ? (originalRate / daysInMonth) * daysInPeriod : originalRate);
        const proratedSubtotal = proratedRate * item.numberOfMachines;

        return {
          item,
          originalRate,
          proratedRate: Math.round(proratedRate * 100) / 100,
          proratedSubtotal: Math.round(proratedSubtotal * 100) / 100,
        };
      });

      const subtotal = proratedItems.reduce((sum, pi) => sum + pi.proratedSubtotal, 0);
      const vatAmount = invoice.invoiceType === 'VAT' ? subtotal * 0.18 : 0;
      const totalAmount = subtotal + vatAmount;

      const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
      const periodFromStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(periodStart).padStart(2, '0')}`;
      const periodToStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(periodEnd).padStart(2, '0')}`;

      previews.push({
        month: monthName,
        year,
        periodFrom: periodFromStr,
        periodTo: periodToStr,
        daysInPeriod,
        daysInMonth,
        isPartialMonth,
        usedFullMonthlyFee: applyFullFee ? true : undefined,
        proratedItems,
        subtotal,
        vatAmount,
        totalAmount,
      });

      // Move to next month
      currentDate = new Date(year, month + 1, 1);
    }

    return previews;
  };

  const handleGenerateMonthlyInvoices = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const previews = calculateMonthlyInvoices(invoice, useFullMonthlyFee);
    setMonthlyInvoicePreviews(previews);
    setSelectedMonths(new Set(previews.map((_, idx) => idx))); // Select all by default
    setIsMonthlyInvoiceModalOpen(true);
  };

  const handleCloseMonthlyInvoiceModal = () => {
    setIsMonthlyInvoiceModalOpen(false);
    setSelectedInvoice(null);
    setMonthlyInvoicePreviews([]);
    setSelectedMonths(new Set());
    setMonthlyPrintPreviews(null);
    setUseFullMonthlyFee(false);
  };

  const toggleMonthSelection = (index: number) => {
    const newSelected = new Set(selectedMonths);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedMonths(newSelected);
  };

  const selectAllMonths = () => {
    setSelectedMonths(new Set(monthlyInvoicePreviews.map((_, idx) => idx)));
  };

  const deselectAllMonths = () => {
    setSelectedMonths(new Set());
  };

  const isAllMonthsSelected =
    monthlyInvoicePreviews.length > 0 && selectedMonths.size === monthlyInvoicePreviews.length;
  const isNoMonthSelected = selectedMonths.size === 0;
  const handleSelectAllCheckbox = () => {
    if (isAllMonthsSelected) deselectAllMonths();
    else selectAllMonths();
  };

  /** Print selected months as one document: per-month calculations + final total (no API call). */
  const handlePrintMonthlyInvoices = () => {
    if (!selectedInvoice || selectedMonths.size === 0) {
      void Swal.fire({
        icon: 'warning',
        title: 'Select months',
        text: 'Please select at least one month to print.',
      });
      return;
    }
    const ordered = Array.from(selectedMonths).sort().map((i) => monthlyInvoicePreviews[i]);
    setMonthlyPrintPreviews(ordered);
    monthlyPrintTriggeredRef.current = true;
  };

  // When monthly print content is set, render then trigger print and clear
  useEffect(() => {
    if (!monthlyPrintPreviews?.length || !monthlyPrintTriggeredRef.current) return;
    monthlyPrintTriggeredRef.current = false;
    const t = setTimeout(() => {
      window.print();
      setMonthlyPrintPreviews(null);
    }, 350);
    return () => clearTimeout(t);
  }, [monthlyPrintPreviews]);

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
    {
      label: '',
      icon: <Calendar className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleGenerateMonthlyInvoices,
      tooltip: 'Print Monthly Invoices',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-700 focus:ring-green-500 dark:focus:ring-green-500',
    },
  ];

  /** Invoice body content only (customer, period, table, total) — used inside LetterheadDocument. Tax invoice (VAT) uses two-column supplier/purchaser layout and "Amount Excluding VAT" table. */
  const renderInvoiceBodyContent = (invoice: Invoice) => {
    const { subtotal, vatAmount, totalAmount } = invoice;
    const isVAT = invoice.invoiceType === 'VAT';
    const dateStr = (d: string) =>
      new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const company = LETTERHEAD_COMPANY_INFO;

    if (isVAT) {
      /* Tax Invoice format matching official layout: row1 Date | Invoice No, row2 TIN boxes, row3 bordered address boxes, row4 Period | PO, then bordered table and bordered summary */
      const fmt = (n: number) => `Rs.${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
      return (
        <div className="text-sm print:text-xs">
          {/* Row 1: Date of Invoice (left) | Tax Invoice No (right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div>
              <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Date of Invoice : </span>
              <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{dateStr(invoice.invoiceDate)}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Tax Invoice No : </span>
              <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.invoiceNumber}</span>
            </div>
          </div>
          {/* Row 2: Supplier's TIN (left) | Purchaser's TIN (right) - bordered boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div>
              <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Supplier&apos;s TIN</span>
              <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 inline-block px-2 py-1 mt-0.5 min-w-[8rem] text-gray-900 dark:text-slate-100 print:text-gray-900">{company.tinNo}</div>
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Purchaser&apos;s TIN</span>
              <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 inline-block px-2 py-1 mt-0.5 min-w-[8rem] text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.vatTinNic || '—'}</div>
            </div>
          </div>
          {/* Row 3: Two bordered boxes - Supplier's Name & Address | Purchaser's Name & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 p-2">
              <div className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900 mb-1">Supplier&apos;s Name &amp; Address</div>
              <div className="text-gray-900 dark:text-slate-100 print:text-gray-900 leading-tight">
                {company.fullName}<br />
                {company.address}<br />
                Tel : {company.telephone.join(' / ')}<br />
                Email : {company.email}
              </div>
            </div>
            <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 p-2">
              <div className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900 mb-1">Purchaser&apos;s Name &amp; Address</div>
              <div className="text-gray-900 dark:text-slate-100 print:text-gray-900 leading-tight">
                {invoice.customerName}<br />
                {invoice.customerAddress}
              </div>
            </div>
          </div>
          {/* Row 4: Period From / To (left) | Purchase Order No (right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3 items-start">
            <div>
              <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Period From : </span>
              <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{dateStr(invoice.periodFrom)}</span>
              <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900 ml-1">To</span>
              <span className="ml-1 text-gray-900 dark:text-slate-100 print:text-gray-900">{dateStr(invoice.periodTo)}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Purchase Order No</span>
              <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 inline-block px-2 py-1 mt-0.5 min-w-[8rem] min-h-[1.5rem]"> </div>
            </div>
          </div>

          {/* Line items table - all cells with thin borders */}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full border-collapse border border-gray-800 dark:border-slate-500 print:border-gray-800 mb-4 print:mb-3 print:text-xs min-w-[32rem]">
              <thead>
                <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                  <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Serial No</th>
                  <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Description</th>
                  <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-right py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Rate</th>
                  <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-center py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Qty</th>
                  <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-right py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Amount Excluding VAT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-gray-900 dark:text-slate-100 print:text-gray-900">{String(index + 1).padStart(6, '0')}</td>
                    <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-gray-900 dark:text-slate-100 print:text-gray-900">{item.description}</td>
                    <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-right text-gray-900 dark:text-slate-100 print:text-gray-900">{item.monthlyRentPerMachine.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                    <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-center text-gray-900 dark:text-slate-100 print:text-gray-900">{item.numberOfMachines}</td>
                    <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-right text-gray-900 dark:text-slate-100 print:text-gray-900">{item.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary - three rows with thin borders (table-like) */}
          <table className="w-full border-collapse max-w-md ml-auto mb-4 print:mb-3">
            <tbody>
              <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Total Value of Supply</td>
                <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 text-right font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">{fmt(subtotal)}</td>
              </tr>
              {vatAmount > 0 && (
                <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                  <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">VAT Amount (18.0%)</td>
                  <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 text-right font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">{fmt(vatAmount)}</td>
                </tr>
              )}
              <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 font-bold text-gray-900 dark:text-slate-100 print:text-gray-900 text-base print:text-sm">Total Amount including VAT</td>
                <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-right font-bold text-gray-900 dark:text-slate-100 print:text-gray-900 text-base print:text-sm">{fmt(totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    /* Normal (Non-VAT) invoice: Customer, Address, Period, table Description | Serial No | Monthly Rental, Total Amount */
    return (
      <div>
        <div className="mb-4 text-sm print:text-xs">
          <div className="mb-1">
            <span className="text-gray-600 dark:text-slate-300 print:text-gray-600 font-medium">Customer: </span>
            <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.customerName}</span>
          </div>
          <div className="mb-1">
            <span className="text-gray-600 dark:text-slate-300 print:text-gray-600 font-medium">Address: </span>
            <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.customerAddress}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-slate-300 print:text-gray-600 font-medium">Period: </span>
            <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">
              {dateStr(invoice.periodFrom)} to {dateStr(invoice.periodTo)}
            </span>
          </div>
          {invoice.vatTinNic && (
            <div className="mt-1">
              <span className="text-gray-600 dark:text-slate-300 print:text-gray-600 font-medium">NIC: </span>
              <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.vatTinNic}</span>
            </div>
          )}
        </div>

        <div className="border-b border-gray-800 dark:border-slate-500 print:border-gray-800" />

        <div className="mb-4 print:mb-3 overflow-x-auto">
          <table className="w-full border-collapse print:text-xs min-w-[20rem]">
            <thead>
              <tr className="border-b border-gray-800 dark:border-slate-500 print:border-gray-800">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-700 dark:text-slate-200 print:text-gray-700">Description</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-gray-700 dark:text-slate-200 print:text-gray-700">Serial No</th>
                <th className="text-right py-2 pl-4 text-xs font-semibold text-gray-700 dark:text-slate-200 print:text-gray-700">Monthly Rental</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-slate-600 print:border-gray-200">
                  <td className="py-2 pr-4 text-sm text-gray-900 dark:text-slate-100 print:text-gray-900 print:text-xs">
                    {item.numberOfMachines} {item.description}
                  </td>
                  <td className="py-2 px-2 text-sm text-center text-gray-900 dark:text-slate-100 print:text-gray-900 print:text-xs">
                    {item.serialNumber || '—'}
                  </td>
                  <td className="py-2 pl-4 text-sm text-right text-gray-900 dark:text-slate-100 print:text-gray-900 print:text-xs">
                    {item.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-b border-gray-800 dark:border-slate-500 print:border-gray-800" />

        <div className="mt-3 space-y-1 text-sm print:text-xs">
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-gray-900 dark:text-slate-100 print:text-gray-900">Total Amount</span>
            <span className="font-bold text-gray-900 dark:text-slate-100 print:text-gray-900 text-base print:text-sm">
              {totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /** Bank/cheque details + signatures for invoice letterhead footerContent. Matches official tax invoice: cheque text, bank details, then Authorized By : / Received By : with dotted lines. */
  const renderInvoiceSignatures = (invoice?: Invoice) => {
    const company = LETTERHEAD_COMPANY_INFO;
    return (
      <>
        {invoice && (
          <div className="text-xs text-gray-700 dark:text-slate-200 print:text-gray-700 print:text-xs space-y-1 mb-4 print:mb-3">
            <p>All cheques to be drawn in favour of &quot;{company.fullName}&quot;</p>
            <p><span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Bank Details :</span> A/C 1420027865, Commercial Bank, Kaduwela.</p>
            <p>Kindly mention your invoice number for the reference.</p>
          </div>
        )}
        <div className="mt-8 print:mt-6 flex flex-col sm:flex-row justify-between gap-6 sm:gap-8">
          <div className="w-full sm:w-48 print:w-40">
            <p className="text-xs text-gray-900 dark:text-slate-100 print:text-gray-900 font-semibold print:text-xs">Authorized By :</p>
            <div className="border-b border-dotted border-gray-800 dark:border-slate-500 print:border-gray-800 mt-1 min-h-[1.5rem]" />
          </div>
          <div className="w-full sm:w-48 print:w-40 text-left sm:text-right">
            <p className="text-xs text-gray-900 dark:text-slate-100 print:text-gray-900 font-semibold print:text-xs">Received By :</p>
            <div className="border-b border-dotted border-gray-800 dark:border-slate-500 print:border-gray-800 mt-1 min-h-[1.5rem]" />
          </div>
        </div>
      </>
    );
  };

  /** Full invoice in letterhead layout. Tax invoice: vat_logo, no tagline, official format. Normal: non_vat_logo with tagline. */
  const renderInvoiceWithLetterhead = (invoice: Invoice) => {
    const isVAT = invoice.invoiceType === 'VAT';
    return (
      <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 max-w-[210mm] mx-auto p-4 sm:p-6 md:p-8 print:p-8 print:bg-white print:text-black print:max-w-none" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <LetterheadDocument
          documentTitle={isVAT ? 'TAX INVOICE' : 'INVOICE'}
          footerStyle="full"
          footerContent={renderInvoiceSignatures(invoice)}
          logoPath={isVAT ? '/vat_logo.jpeg' : '/non_vat_logo.jpeg'}
          hideTagline={isVAT}
          className="print:p-0"
        >
          {renderInvoiceBodyContent(invoice)}
        </LetterheadDocument>
      </div>
    );
  };

  /** Multi-month print: same format as view form (renderInvoiceBodyContent) — VAT: TIN/address boxes, bordered table, summary table; Non-VAT: customer block, same table and Total Amount. Per-month sections then grand total. */
  const renderMultiMonthInvoiceForPrint = (invoice: Invoice, previews: MonthlyInvoicePreview[]) => {
    if (!previews.length) return null;
    const dateStr = (d: string) =>
      new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const isVAT = invoice.invoiceType === 'VAT';
    const periodFrom = previews[0].periodFrom;
    const periodTo = previews[previews.length - 1].periodTo;
    const grandTotal = previews.reduce((sum, p) => sum + p.totalAmount, 0);
    const grandSubtotal = previews.reduce((sum, p) => sum + p.subtotal, 0);
    const grandVat = previews.reduce((sum, p) => sum + p.vatAmount, 0);
    const company = LETTERHEAD_COMPANY_INFO;
    const fmt = (n: number) => `Rs.${n.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

    return (
      <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 max-w-[210mm] mx-auto p-4 sm:p-6 md:p-8 print:p-8 print:bg-white print:text-black print:max-w-none" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <LetterheadDocument
          documentTitle={isVAT ? 'TAX INVOICE' : 'INVOICE'}
          footerStyle="full"
          footerContent={renderInvoiceSignatures(invoice)}
          logoPath={isVAT ? '/vat_logo.jpeg' : '/non_vat_logo.jpeg'}
          hideTagline={isVAT}
          className="print:p-0"
        >
          {isVAT ? (
            /* VAT: same layout as view form — Date | Tax Invoice No, TIN row, Supplier/Purchaser boxes, Period | PO, then per-month bordered table + summary table, then grand total */
            <div className="text-sm print:text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Date of Invoice : </span>
                  <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{dateStr(periodFrom)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Tax Invoice No : </span>
                  <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.invoiceNumber}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Supplier&apos;s TIN</span>
                  <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 inline-block px-2 py-1 mt-0.5 min-w-[8rem] text-gray-900 dark:text-slate-100 print:text-gray-900">{company.tinNo}</div>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Purchaser&apos;s TIN</span>
                  <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 inline-block px-2 py-1 mt-0.5 min-w-[8rem] text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.vatTinNic || '—'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 p-2">
                  <div className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900 mb-1">Supplier&apos;s Name &amp; Address</div>
                  <div className="text-gray-900 dark:text-slate-100 print:text-gray-900 leading-tight">
                    {company.fullName}<br />
                    {company.address}<br />
                    Tel : {company.telephone.join(' / ')}<br />
                    Email : {company.email}
                  </div>
                </div>
                <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 p-2">
                  <div className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900 mb-1">Purchaser&apos;s Name &amp; Address</div>
                  <div className="text-gray-900 dark:text-slate-100 print:text-gray-900 leading-tight">
                    {invoice.customerName}<br />
                    {invoice.customerAddress}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3 items-start">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Period From : </span>
                  <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{dateStr(periodFrom)}</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900 ml-1">To</span>
                  <span className="ml-1 text-gray-900 dark:text-slate-100 print:text-gray-900">{dateStr(periodTo)}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Purchase Order No</span>
                  <div className="border border-gray-800 dark:border-slate-500 print:border-gray-800 inline-block px-2 py-1 mt-0.5 min-w-[8rem] min-h-[1.5rem]"> </div>
                </div>
              </div>

              {previews.map((preview, sectionIndex) => (
                <div key={sectionIndex} className="mt-6 print:mt-4 print:break-inside-avoid">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900 mb-2 print:text-xs">
                    {preview.month} {preview.year} — Period: {dateStr(preview.periodFrom)} to {dateStr(preview.periodTo)}
                    {preview.usedFullMonthlyFee && (
                      <span className="ml-1 font-normal text-gray-600 dark:text-slate-400 print:text-gray-600">(Full monthly fee)</span>
                    )}
                    {preview.isPartialMonth && !preview.usedFullMonthlyFee && (
                      <span className="ml-1 font-normal text-gray-600 dark:text-slate-400 print:text-gray-600">(Prorated: {preview.daysInPeriod}/{preview.daysInMonth} days)</span>
                    )}
                  </h3>
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full border-collapse border border-gray-800 dark:border-slate-500 print:border-gray-800 mb-4 print:mb-3 print:text-xs min-w-[32rem]">
                      <thead>
                        <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                          <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Serial No</th>
                          <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-left py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Description</th>
                          <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-right py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Rate</th>
                          <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-center py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Qty</th>
                          <th className="border border-gray-800 dark:border-slate-500 print:border-gray-800 text-right py-2 px-2 text-xs font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Amount Excluding VAT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.proratedItems.map((pi, idx) => (
                          <tr key={idx}>
                            <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-gray-900 dark:text-slate-100 print:text-gray-900">{String(idx + 1).padStart(6, '0')}</td>
                            <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-gray-900 dark:text-slate-100 print:text-gray-900">{pi.item.description}</td>
                            <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-right text-gray-900 dark:text-slate-100 print:text-gray-900">{pi.proratedRate.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                            <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-center text-gray-900 dark:text-slate-100 print:text-gray-900">{pi.item.numberOfMachines}</td>
                            <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-right text-gray-900 dark:text-slate-100 print:text-gray-900">{pi.proratedSubtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <table className="w-full border-collapse max-w-md ml-auto mb-4 print:mb-3">
                    <tbody>
                      <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                        <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Total Value of Supply</td>
                        <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 text-right font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">{fmt(preview.subtotal)}</td>
                      </tr>
                      {preview.vatAmount > 0 && (
                        <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                          <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">VAT Amount (18.0%)</td>
                          <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 text-right font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">{fmt(preview.vatAmount)}</td>
                        </tr>
                      )}
                      <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                        <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 font-bold text-gray-900 dark:text-slate-100 print:text-gray-900 text-base print:text-sm">Total Amount including VAT</td>
                        <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-right font-bold text-gray-900 dark:text-slate-100 print:text-gray-900 text-base print:text-sm">{fmt(preview.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="mt-4 pt-3 border-t-2 border-gray-800 dark:border-slate-500 print:border-gray-800 print:break-inside-avoid">
                <table className="w-full border-collapse max-w-md ml-auto mb-4 print:mb-3">
                  <tbody>
                    {grandVat > 0 && (
                      <>
                        <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                          <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">Total Value of Supply</td>
                          <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 text-right font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">{fmt(grandSubtotal)}</td>
                        </tr>
                        <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                          <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">VAT Amount (18.0%)</td>
                          <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-1.5 px-2 text-right font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900">{fmt(grandVat)}</td>
                        </tr>
                      </>
                    )}
                    <tr className="border border-gray-800 dark:border-slate-500 print:border-gray-800">
                      <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 font-bold text-gray-900 dark:text-slate-100 print:text-gray-900 text-base print:text-sm">Total Amount including VAT</td>
                      <td className="border border-gray-800 dark:border-slate-500 print:border-gray-800 py-2 px-2 text-right font-bold text-gray-900 dark:text-slate-100 print:text-gray-900 text-base print:text-sm">{fmt(grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Non-VAT: same layout as view form — Customer, Address, Period, NIC, then per-month table (Description | Serial No | Monthly Rental), Total Amount, then grand total */
            <div>
              <div className="mb-4 text-sm print:text-xs">
                <div className="mb-1">
                  <span className="text-gray-600 dark:text-slate-300 print:text-gray-600 font-medium">Customer: </span>
                  <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.customerName}</span>
                </div>
                <div className="mb-1">
                  <span className="text-gray-600 dark:text-slate-300 print:text-gray-600 font-medium">Address: </span>
                  <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.customerAddress}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-slate-300 print:text-gray-600 font-medium">Period: </span>
                  <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{dateStr(periodFrom)} to {dateStr(periodTo)}</span>
                </div>
                {invoice.vatTinNic && (
                  <div className="mt-1">
                    <span className="text-gray-600 dark:text-slate-300 print:text-gray-600 font-medium">NIC: </span>
                    <span className="text-gray-900 dark:text-slate-100 print:text-gray-900">{invoice.vatTinNic}</span>
                  </div>
                )}
              </div>
              <div className="border-b border-gray-800 dark:border-slate-500 print:border-gray-800" />

              {previews.map((preview, sectionIndex) => (
                <div key={sectionIndex} className="mt-6 print:mt-4 print:break-inside-avoid">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 print:text-gray-900 mb-2 print:text-xs">
                    {preview.month} {preview.year} — Period: {dateStr(preview.periodFrom)} to {dateStr(preview.periodTo)}
                    {preview.usedFullMonthlyFee && (
                      <span className="ml-1 font-normal text-gray-600 dark:text-slate-400 print:text-gray-600">(Full monthly fee)</span>
                    )}
                    {preview.isPartialMonth && !preview.usedFullMonthlyFee && (
                      <span className="ml-1 font-normal text-gray-600 dark:text-slate-400 print:text-gray-600">(Prorated: {preview.daysInPeriod}/{preview.daysInMonth} days)</span>
                    )}
                  </h3>
                  <div className="mb-4 print:mb-3 overflow-x-auto">
                    <table className="w-full border-collapse print:text-xs min-w-[20rem]">
                      <thead>
                        <tr className="border-b border-gray-800 dark:border-slate-500 print:border-gray-800">
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-700 dark:text-slate-200 print:text-gray-700">Description</th>
                          <th className="text-center py-2 px-2 text-xs font-semibold text-gray-700 dark:text-slate-200 print:text-gray-700">Serial No</th>
                          <th className="text-right py-2 pl-4 text-xs font-semibold text-gray-700 dark:text-slate-200 print:text-gray-700">Monthly Rental</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.proratedItems.map((pi, idx) => (
                          <tr key={idx} className="border-b border-gray-200 dark:border-slate-600 print:border-gray-200">
                            <td className="py-2 pr-4 text-sm text-gray-900 dark:text-slate-100 print:text-gray-900 print:text-xs">
                              {pi.item.numberOfMachines} {pi.item.description}
                            </td>
                            <td className="py-2 px-2 text-sm text-center text-gray-900 dark:text-slate-100 print:text-gray-900 print:text-xs">
                              {pi.item.serialNumber || '—'}
                            </td>
                            <td className="py-2 pl-4 text-sm text-right text-gray-900 dark:text-slate-100 print:text-gray-900 print:text-xs">
                              {pi.proratedSubtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 space-y-1 text-sm print:text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-gray-900 dark:text-slate-100 print:text-gray-900">Total Amount</span>
                      <span className="font-bold text-gray-900 dark:text-slate-100 print:text-gray-900 text-base print:text-sm">
                        {preview.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="border-b border-gray-800 dark:border-slate-500 print:border-gray-800 mt-3" />
                </div>
              ))}

              <div className="mt-4 pt-3 border-t-2 border-gray-800 dark:border-slate-500 print:border-gray-800 print:break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900 dark:text-slate-100 print:text-gray-900">Grand Total</span>
                  <span className="font-bold text-gray-900 dark:text-slate-100 print:text-gray-900 text-base print:text-sm">
                    {grandTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
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
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200 dark:border-slate-700 overflow-auto max-h-[85vh]">
            {renderInvoiceWithLetterhead(selectedInvoice)}
          </div>
        </div>
      </div>
    );
  };

  // Create form content — layout matches printed TAX INVOICE for familiar UX
  const renderInvoiceForm = () => {
    const { subtotal, vatAmount, totalAmount } = calculateTotals();
    const selectedCustomer = customers.find((c) => c.id === customerId);

    const inputBase = 'bg-white dark:bg-slate-700 dark:border-slate-500 dark:text-white dark:placeholder-gray-400';
    const inputError = 'border-red-500 dark:border-red-400';
    const inputBorder = 'border-gray-300 dark:border-slate-500';
    const focusRing = 'focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-indigo-400';

    return (
      <div className="bg-white dark:bg-transparent text-gray-900 dark:text-gray-100 max-w-[210mm] mx-auto" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <LetterheadDocument
          documentTitle={invoiceType === 'VAT' ? 'TAX INVOICE' : 'INVOICE'}
          footerStyle="simple"
          logoPath={invoiceType === 'VAT' ? '/vat_logo.jpeg' : '/non_vat_logo.jpeg'}
          hideTagline={invoiceType === 'VAT'}
        >
          {/* Invoice number and date — right-aligned (matches print) */}
          <div className="text-right text-sm text-gray-700 dark:text-gray-300 mb-1">
            <div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">Invoice: </span>
              <span className="text-gray-900 dark:text-white">Auto-generated</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">Date: </span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={`inline-block w-auto px-2 py-0.5 border rounded text-sm ${inputBase} ${
                  formErrors.invoiceDate ? inputError : inputBorder
                } ${focusRing}`}
              />
              {formErrors.invoiceDate && (
                <span className="block text-xs text-red-500 dark:text-red-400 mt-0.5">{formErrors.invoiceDate}</span>
              )}
            </div>
          </div>
          <div className="border-b border-gray-800 dark:border-slate-600 my-2" />

          {/* Customer and period info */}
          <div className="mb-3 text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
            <div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">Customer: </span>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`inline-block w-auto px-2 py-0.5 border rounded text-sm ${inputBase} ${
                  formErrors.customerId ? inputError : inputBorder
                } ${focusRing}`}
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formErrors.customerId && (
                <span className="ml-2 text-xs text-red-500 dark:text-red-400">{formErrors.customerId}</span>
              )}
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">Address: </span>
              <span className="text-gray-900 dark:text-white">{selectedCustomer?.address || '—'}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">Period From: </span>
              <input
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className={`inline-block w-auto px-2 py-0.5 border rounded text-sm ${inputBase} ${
                  formErrors.periodFrom ? inputError : inputBorder
                } ${focusRing}`}
              />
              {formErrors.periodFrom && (
                <span className="ml-2 text-xs text-red-500 dark:text-red-400">{formErrors.periodFrom}</span>
              )}
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">Period To: </span>
              <input
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className={`inline-block w-auto px-2 py-0.5 border rounded text-sm ${inputBase} ${
                  formErrors.periodTo ? inputError : inputBorder
                } ${focusRing}`}
              />
              {formErrors.periodTo && (
                <span className="ml-2 text-xs text-red-500 dark:text-red-400">{formErrors.periodTo}</span>
              )}
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">Customer VAT No: </span>
              <span className="text-gray-900 dark:text-white">{selectedCustomer?.vatTinNic || '—'}</span>
            </div>
          </div>
          <div className="border-b border-gray-800 dark:border-slate-600 my-3" />

          {/* Itemized table — matches print: Item | Description | Rate | Qty | Amount */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Itemised details</span>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-500 hover:bg-blue-700 dark:hover:bg-indigo-600 rounded border border-blue-700 dark:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-400"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            {formErrors.items && (
              <p className="mb-2 text-sm text-red-500 dark:text-red-400">{formErrors.items}</p>
            )}

            {items.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-slate-500 rounded-lg bg-gray-50/50 dark:bg-slate-700/30">
                No items added. Click &quot;Add Item&quot; to add items to the invoice.
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-800 dark:border-slate-600">
                    <th className="text-left py-2 pr-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Item</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Description</th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Rate</th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Qty</th>
                    <th className="text-right py-2 pl-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <React.Fragment key={index}>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <td className="py-2 pr-2 align-top">
                          <input
                            type="text"
                            value={item.itemCode}
                            readOnly
                            className="w-full bg-gray-50 dark:bg-slate-700/50 border-0 p-0 text-gray-900 dark:text-white text-sm"
                          />
                        </td>
                        <td className="py-2 px-2 align-top">
                          <input
                            type="text"
                            value={item.description}
                            readOnly
                            className="w-full bg-gray-50 dark:bg-slate-700/50 border-0 p-0 text-gray-900 dark:text-white text-sm"
                          />
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            <select
                              value={item.brand}
                              onChange={(e) => updateItem(index, 'brand', e.target.value)}
                              className={`px-1.5 py-0.5 border rounded ${inputBase} ${
                                formErrors[`item_${index}_brand`] ? inputError : inputBorder
                              } ${focusRing}`}
                            >
                              <option value="">Brand</option>
                              {brands.map((b) => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                              ))}
                            </select>
                            <select
                              value={item.model}
                              onChange={(e) => updateItem(index, 'model', e.target.value)}
                              disabled={!item.brand}
                              className={`px-1.5 py-0.5 border rounded ${inputBase} ${inputBorder} ${focusRing} disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:opacity-70`}
                            >
                              <option value="">Model</option>
                              {item.brand && availableModelsPerItem[index]?.map((m) => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                            <select
                              value={item.type}
                              onChange={(e) => updateItem(index, 'type', e.target.value as MachineType)}
                              className={`px-1.5 py-0.5 border rounded ${inputBase} ${
                                formErrors[`item_${index}_type`] ? inputError : inputBorder
                              } ${focusRing}`}
                            >
                              {machineTypes.map((t) => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                            {invoiceType === 'Non-VAT' && (
                              <input
                                type="text"
                                value={item.serialNumber || ''}
                                onChange={(e) => updateItem(index, 'serialNumber', e.target.value)}
                                placeholder="Serial No"
                                className={`px-1.5 py-0.5 border rounded ${inputBase} ${inputBorder} ${focusRing}`}
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center align-top">
                          <input
                            type="number"
                            value={item.monthlyRentPerMachine}
                            onChange={(e) => updateItem(index, 'monthlyRentPerMachine', Number(e.target.value))}
                            className={`w-20 px-1.5 py-0.5 border rounded text-center ${inputBase} ${
                              formErrors[`item_${index}_rent`] ? inputError : inputBorder
                            } ${focusRing}`}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 px-2 text-center align-top">
                          <input
                            type="number"
                            value={item.numberOfMachines}
                            onChange={(e) => updateItem(index, 'numberOfMachines', Number(e.target.value))}
                            className={`w-16 px-1.5 py-0.5 border rounded text-center ${inputBase} ${
                              formErrors[`item_${index}_machines`] ? inputError : inputBorder
                            } ${focusRing}`}
                            min="1"
                          />
                        </td>
                        <td className="py-2 pl-2 text-right align-top text-gray-900 dark:text-white">
                          {calculateItemSubtotal(item).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-center align-top">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
                  <span className="font-bold text-gray-900 dark:text-white">Total Amount</span>
                  <span className="font-bold text-gray-900 dark:text-white text-lg">
                    {totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {invoiceType === 'VAT' && vatAmount > 0 && (
                  <>
                    <div className="flex justify-end text-sm text-gray-700 dark:text-gray-300">
                      Sub Amount: Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex justify-end text-sm text-gray-700 dark:text-gray-300">
                      VAT (18%): Rs. {vatAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="border-b border-gray-800 dark:border-slate-600 my-3" />

          {/* Authorized By / Received By — matches print */}
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 my-4">
            <div className="w-40">
              <div className="border-b border-gray-400 dark:border-slate-500 pt-6">Authorized By</div>
            </div>
            <div className="w-40">
              <div className="border-b border-gray-400 dark:border-slate-500 pt-6">Received By</div>
            </div>
          </div>
          <div className="border-b border-gray-300 dark:border-slate-600 my-2" />

          {/* Payment Details Section */}
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-slate-600 pb-1">
              Payment Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method<span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={`w-full px-2 py-1.5 border rounded text-sm ${inputBase} ${
                    formErrors.paymentMethod ? inputError : inputBorder
                  } ${focusRing}`}
                >
                  <option value="">Select Method</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                </select>
                {formErrors.paymentMethod && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">{formErrors.paymentMethod}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Date<span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={`w-full px-2 py-1.5 border rounded text-sm ${inputBase} ${
                    formErrors.paymentDate ? inputError : inputBorder
                  } ${focusRing}`}
                />
                {formErrors.paymentDate && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">{formErrors.paymentDate}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receipt Number
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Enter receipt number"
                  className={`w-full px-2 py-1.5 border rounded text-sm ${inputBase} ${inputBorder} ${focusRing}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receipt File
                </label>
                <input
                  type="file"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  accept="image/*,.pdf"
                  className={`w-full px-2 py-1.5 border rounded text-sm ${inputBase} ${inputBorder} ${focusRing} file:mr-2 file:py-1 file:px-2 file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-indigo-900/30 file:text-blue-700 dark:file:text-indigo-300 hover:file:bg-blue-100 dark:hover:file:bg-indigo-900/50`}
                />
                {formErrors.receipt && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">{formErrors.receipt}</p>
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

    const customer = customers.find((c) => c.name === selectedInvoice.customerName);

    return (
      <div className="space-y-4">
        {/* Read-only fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invoice Number
            </label>
            <input
              type="text"
              value={selectedInvoice.invoiceNumber}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Name
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
              Total Amount
            </label>
            <input
              type="text"
              value={`LKR ${selectedInvoice.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}
              disabled
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 cursor-not-allowed"
            />
          </div>

          {/* Editable Status Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status<span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={invoiceStatus}
              onChange={(e) => setInvoiceStatus(e.target.value as 'draft' | 'issued' | 'paid' | 'overdue')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-500 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-400"
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

  // Monthly Invoice Generation Modal Content
  const renderMonthlyInvoiceModal = () => {
    if (!selectedInvoice) return null;

    const dateStr = (d: string) =>
      new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
      <div className="space-y-4">
        {/* Agreement Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Agreement Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-blue-700 dark:text-blue-300 font-medium">Customer:</span>
              <p className="text-blue-900 dark:text-blue-100">{selectedInvoice.customerName}</p>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300 font-medium">Invoice Type:</span>
              <p className="text-blue-900 dark:text-blue-100">{selectedInvoice.invoiceType}</p>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300 font-medium">Agreement Period:</span>
              <p className="text-blue-900 dark:text-blue-100">
                {dateStr(selectedInvoice.periodFrom)} to {dateStr(selectedInvoice.periodTo)}
              </p>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300 font-medium">Total Months:</span>
              <p className="text-blue-900 dark:text-blue-100">{monthlyInvoicePreviews.length}</p>
            </div>
          </div>
        </div>

        {/* Use full monthly fee option */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useFullMonthlyFee}
              onChange={(e) => {
                const checked = e.target.checked;
                setUseFullMonthlyFee(checked);
                if (selectedInvoice) {
                  const nextPreviews = calculateMonthlyInvoices(selectedInvoice, checked);
                  setMonthlyInvoicePreviews(nextPreviews);
                  setSelectedMonths(new Set(nextPreviews.map((_, idx) => idx)));
                }
              }}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use full monthly rental fee for all months (no proration)</span>
          </label>
        </div>

        {/* Select all months checkbox */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllMonthsSelected}
              onChange={handleSelectAllCheckbox}
              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select all months</span>
          </label>
        </div>

        {/* Monthly Invoice Previews */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {monthlyInvoicePreviews.map((preview, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedMonths.has(index)
                  ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
              }`}
              onClick={() => toggleMonthSelection(index)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  {preview.month} {preview.year}
                </h4>
                <input
                  type="checkbox"
                  checked={selectedMonths.has(index)}
                  onChange={() => toggleMonthSelection(index)}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <span className="font-medium">Period:</span> {dateStr(preview.periodFrom)} to {dateStr(preview.periodTo)}
                </div>
                <div>
                  <span className="font-medium">Days:</span> {preview.daysInPeriod}/{preview.daysInMonth}
                  {preview.usedFullMonthlyFee && <span className="ml-1 text-blue-600 dark:text-blue-400">(Full monthly fee)</span>}
                  {preview.isPartialMonth && !preview.usedFullMonthlyFee && <span className="ml-1 text-orange-600 dark:text-orange-400">(Prorated)</span>}
                </div>
                <div>
                  <span className="font-medium">Subtotal:</span> LKR {preview.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </div>
                <div>
                  <span className="font-medium">Total:</span> LKR {preview.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Note about prorated / full fee invoices */}
        <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {useFullMonthlyFee ? (
              <>
                <span className="font-semibold">Note:</span> Full monthly rental fee is applied to every month. Partial months are charged the full month rate (no proration).
              </>
            ) : (
              <>
                <span className="font-semibold">Note:</span> Prorated invoices are calculated as: 
                (Monthly Rate ÷ Days in Month) × Renting Days in that Month. VAT is applied to the prorated amount.
              </>
            )}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Print-only: single invoice (View modal) — hidden on screen, visible when printing */}
      {selectedInvoice && !monthlyPrintPreviews?.length && (
        <div className="hidden print:block print:fixed print:inset-0 print:z-[9999] print:bg-white print:p-0 print:m-0">
          {renderInvoiceWithLetterhead(selectedInvoice)}
        </div>
      )}
      {/* Print-only: multi-month invoice (Print Monthly modal) — full document, can span multiple pages */}
      {selectedInvoice && monthlyPrintPreviews && monthlyPrintPreviews.length > 0 && (
        <div className="hidden print:block print:z-[9999] print:bg-white print:w-full print:min-h-0">
          {renderMultiMonthInvoiceForPrint(selectedInvoice, monthlyPrintPreviews)}
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
              loading={isLoading}
              onCreateClick={handleCreateInvoice}
              createButtonLabel="Create Invoice"
              emptyMessage={isLoading ? 'Loading invoices...' : 'No invoices found.'}
            />
          </div>
        </main>

        {/* Create Invoice Modal — document-style layout matching printed TAX INVOICE */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-[210mm] max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-600">
              {/* Modal Header — minimal; title is inside letterhead */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Invoice</h2>
                <button
                  onClick={handleCloseCreateModal}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Modal Body — scrollable form */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {renderInvoiceForm()}
              </div>

              {/* Modal Footer */}
              <div className="flex-shrink-0 flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
                <button
                  onClick={handleCloseCreateModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCreate}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700 rounded border border-blue-700 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Create Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Invoice Modal - Header fixed (sticky); Print button stays visible when scrolling */}
        {isViewModalOpen && selectedInvoice && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-3 sm:p-4 print:hidden">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header - Fixed; "Invoice Details" + Print + Close (stays visible when content scrolls) */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white truncate pr-2">Invoice Details</h2>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-indigo-400 border border-blue-600 dark:border-indigo-400 rounded hover:bg-blue-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={handleCloseViewModal}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable invoice content */}
              <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6">
                {renderInvoiceDetails()}
              </div>
            </div>
          </div>
        )}

                {/* Update Invoice Modal */}
                {isUpdateModalOpen && selectedInvoice && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-600">
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Update Invoice Status</h2>
                <button
                  onClick={handleCloseUpdateModal}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {renderUpdateForm()}
              </div>
              <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
                <button
                  onClick={handleCloseUpdateModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded border border-gray-300 dark:border-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitUpdate}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#4154F1] hover:bg-blue-700 rounded border border-[#4154F1] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print Monthly Invoices Modal */}
        {isMonthlyInvoiceModalOpen && selectedInvoice && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-600">
              {/* Modal Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Print Monthly Invoices</h2>
                <button
                  onClick={handleCloseMonthlyInvoiceModal}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {renderMonthlyInvoiceModal()}
              </div>

              {/* Modal Footer */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedMonths.size} of {monthlyInvoicePreviews.length} month(s) selected
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCloseMonthlyInvoiceModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePrintMonthlyInvoices}
                    disabled={selectedMonths.size === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded border border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print {selectedMonths.size > 0 ? `(${selectedMonths.size} month${selectedMonths.size !== 1 ? 's' : ''})` : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default InvoicePage;