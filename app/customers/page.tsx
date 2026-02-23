'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import CreateForm, { FormField, CreateFormRef } from '@/src/components/form-popup/create';
import UpdateForm from '@/src/components/form-popup/update';
import DeleteForm from '@/src/components/form-popup/delete';
import { Eye, Pencil, Trash2, X, Plus } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { validateVATTIN, validateNICNumber, validateEmail, validatePhoneNumber } from '@/src/utils/validation';
import { authFetch, clearAuth, redirectToLogin } from '@/lib/auth-client';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Type Definitions
type CustomerType = 'Business' | 'Customer';
type CustomerStatus = 'Active' | 'Inactive' | 'Blocked';
type ApiCustomerType = 'GARMENT_FACTORY' | 'INDIVIDUAL';
type ApiCustomerStatus = 'ACTIVE' | 'INACTIVE';

interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  outstandingBalance: number;
  status: CustomerStatus;
  code?: string;
}

interface CustomerLocationItem {
  id?: string;
  name: string;
  addressLine1?: string | null;
}

interface ApiCustomer {
  id: string;
  code: string;
  type: ApiCustomerType;
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
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingRegion?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  vatRegistrationNumber?: string;
  currentBalance: number;
  status: ApiCustomerStatus;
  createdAt: string;
  updatedAt: string;
  locations?: CustomerLocationItem[];
}

interface CustomerInfo {
  id: string;
  name: string;
  type: CustomerType;
  nicNumber?: string;
  vatTin?: string;
  address: string;
  phone: string;
  email: string;
  creditStatus: 'Active' | 'Locked';
  totalOutstanding: number;
  contactPerson?: string;
}

interface RentalHistory {
  id: string;
  agreementNumber: string;
  status: string;
  startDate: string;
  expectedEndDate: string | null;
  actualEndDate?: string;
  total: number;
  balance: number;
}

// Helper Functions
const mapApiTypeToFrontend = (apiType: ApiCustomerType): CustomerType => {
  return apiType === 'GARMENT_FACTORY' ? 'Business' : 'Customer';
};

const mapFrontendTypeToApi = (frontendType: CustomerType): ApiCustomerType => {
  return frontendType === 'Business' ? 'GARMENT_FACTORY' : 'INDIVIDUAL';
};

const mapApiStatusToFrontend = (apiStatus: ApiCustomerStatus): CustomerStatus => {
  return apiStatus === 'ACTIVE' ? 'Active' : 'Inactive';
};

const mapFrontendStatusToApi = (frontendStatus: CustomerStatus): ApiCustomerStatus => {
  return frontendStatus === 'Blocked' ? 'INACTIVE' : frontendStatus.toUpperCase() as ApiCustomerStatus;
};

const formatAddress = (customer: ApiCustomer, type: 'billing' | 'shipping' = 'billing'): string => {
  const prefix = type === 'billing' ? 'billing' : 'shipping';
  const parts = [
    customer[`${prefix}AddressLine1` as keyof ApiCustomer],
    customer[`${prefix}AddressLine2` as keyof ApiCustomer],
    customer[`${prefix}City` as keyof ApiCustomer],
    customer[`${prefix}Region` as keyof ApiCustomer],
    customer[`${prefix}PostalCode` as keyof ApiCustomer],
    customer[`${prefix}Country` as keyof ApiCustomer],
  ].filter(Boolean);
  
  return parts.join(', ') || 'N/A';
};

const parseAddress = (address: string) => {
  const parts = address.split(',').map(p => p.trim());
  return {
    line1: parts[0] || '',
    line2: parts[1] || '',
    city: parts[2] || '',
    region: parts[3] || '',
    postalCode: parts[4] || '',
    country: parts[5] || 'Sri Lanka',
  };
};

// API Functions (authFetch handles 401 → refresh → redirect to login)
const fetchCustomers = async (): Promise<Customer[]> => {
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

    return apiCustomers.map(apiCustomer => ({
      id: apiCustomer.id,
      code: apiCustomer.code,
      name: apiCustomer.name,
      type: mapApiTypeToFrontend(apiCustomer.type),
      outstandingBalance: Number(apiCustomer.currentBalance),
      status: mapApiStatusToFrontend(apiCustomer.status),
    }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
};

const fetchCustomerById = async (customerId: string): Promise<ApiCustomer | null> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/customers/${customerId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch customer');
    }

    const data = await response.json();
    return data.data as ApiCustomer;
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
};

const fetchCustomerRentalHistory = async (customerId: string): Promise<RentalHistory[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/customers/${customerId}/rental-history`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch rental history');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching rental history:', error);
    return [];
  }
};

const createCustomer = async (customerData: any): Promise<{ success: boolean; error?: string; data?: ApiCustomer }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(customerData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to create customer',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

const updateCustomer = async (customerId: string, customerData: any): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/customers/${customerId}`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify(customerData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to update customer',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

const deleteCustomer = async (customerId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/customers/${customerId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to delete customer',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

// Generate unique customer code
const generateCustomerCode = async (): Promise<string> => {
  const prefix = 'CUST';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}${random}`;
};

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'code',
    label: 'Customer Code',
    sortable: true,
    filterable: false,
  },
  {
    key: 'name',
    label: 'Customer Name',
    sortable: true,
    filterable: false,
  },
  {
    key: 'type',
    label: 'Type',
    sortable: true,
    filterable: true,
  },
  {
    key: 'outstandingBalance',
    label: 'Outstanding Balance',
    sortable: true,
    filterable: false,
    render: (value: number) => (
      <span className={value > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400 font-medium'}>
        Rs. {value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value: CustomerStatus) => {
      const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      if (value === 'Active') {
        return (
          <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
            Active
          </span>
        );
      }
      if (value === 'Inactive') {
        return (
          <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
            Inactive
          </span>
        );
      }
      return (
        <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
          Blocked
        </span>
      );
    },
  },
];

const CustomerListPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<ApiCustomer | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'rental-history' | 'payments' | 'damage-records'>('overview');
  const [activeCreateTab, setActiveCreateTab] = useState<'company' | 'individual'>('company');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rentalHistory, setRentalHistory] = useState<RentalHistory[]>([]);
  const createFormRef = useRef<CreateFormRef>(null);
  // Locations (optional) for Business create – each item: { name, address }
  const [businessLocations, setBusinessLocations] = useState<{ name: string; address: string }[]>([{ name: '', address: '' }]);
  // Locations for Business update (loaded from API)
  const [updateBusinessLocations, setUpdateBusinessLocations] = useState<{ name: string; address: string }[]>([]);

  // Fetch customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Sync update modal locations when business details load (only when details match selected customer)
  useEffect(() => {
    if (
      isUpdateModalOpen &&
      selectedCustomer?.type === 'Business' &&
      selectedCustomerDetails &&
      selectedCustomerDetails.id === selectedCustomer.id
    ) {
      const locs = selectedCustomerDetails.locations ?? [];
      setUpdateBusinessLocations(
        locs.length > 0
          ? locs.map((loc) => ({ name: loc.name ?? '', address: loc.addressLine1 ?? '' }))
          : [{ name: '', address: '' }]
      );
    }
  }, [isUpdateModalOpen, selectedCustomer?.id, selectedCustomer?.type, selectedCustomerDetails?.id, selectedCustomerDetails?.locations]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerDetails = async (customerId: string) => {
    try {
      const details = await fetchCustomerById(customerId);
      setSelectedCustomerDetails(details);
    } catch (error) {
      console.error('Error loading customer details:', error);
    }
  };

  const loadRentalHistory = async (customerId: string) => {
    try {
      const history = await fetchCustomerRentalHistory(customerId);
      setRentalHistory(history);
    } catch (error) {
      console.error('Error loading rental history:', error);
    }
  };

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    clearAuth();
    redirectToLogin();
  };

  const handleCreateCustomer = () => {
    setIsCreateModalOpen(true);
    setActiveCreateTab('company');
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setActiveCreateTab('company');
    setBusinessLocations([{ name: '', address: '' }]);
  };

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
    setActiveProfileTab('overview');
    await loadCustomerDetails(customer.id);
    await loadRentalHistory(customer.id);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedCustomer(null);
    setSelectedCustomerDetails(null);
    setActiveProfileTab('overview');
  };

  const handleUpdateCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await loadCustomerDetails(customer.id);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedCustomer(null);
    setSelectedCustomerDetails(null);
    setUpdateBusinessLocations([]);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;

    setIsSubmitting(true);
    try {
      const result = await deleteCustomer(selectedCustomer.id);
      
      if (result.success) {
        alert(`Customer "${selectedCustomer.name}" deleted successfully.`);
        handleCloseDeleteModal();
        await loadCustomers(); // Refresh the list
      } else {
        alert(`Failed to delete customer: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form fields for Business
  const companyFields: FormField[] = [
    {
      name: 'companyName',
      label: 'Business Name',
      type: 'text',
      placeholder: 'Enter business name',
      required: true,
    },
    {
      name: 'vatTin',
      label: 'VAT / TIN Number',
      type: 'text',
      placeholder: 'Enter VAT or TIN number',
      required: false,
      validation: validateVATTIN,
    },
    {
      name: 'businessAddress',
      label: 'Business Address',
      type: 'textarea',
      placeholder: 'Enter full business address',
      required: true,
      rows: 3,
    },
    {
      name: 'contactPerson',
      label: 'Contact Person',
      type: 'text',
      placeholder: 'Enter contact person name',
      required: true,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'phone',
      placeholder: 'Enter contact number',
      required: true,
      validation: validatePhoneNumber,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter contact email',
      required: true,
      validation: validateEmail,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Select status',
      required: true,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
    },
  ];

  // Form fields for Customer
  const individualFields: FormField[] = [
    {
      name: 'fullName',
      label: 'Full Name',
      type: 'text',
      placeholder: 'Enter full name',
      required: true,
    },
    {
      name: 'nicNumber',
      label: 'NIC Number',
      type: 'text',
      placeholder: 'Enter NIC number',
      required: false,
      validation: validateNICNumber,
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea',
      placeholder: 'Enter full address',
      required: true,
      rows: 3,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'phone',
      placeholder: 'Enter contact number',
      required: true,
      validation: validatePhoneNumber,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter email address',
      required: true,
      validation: validateEmail,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Select status',
      required: true,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
    },
  ];

  // Get initial data for update form
  const getUpdateInitialData = (customer: Customer | null) => {
    if (!customer || !selectedCustomerDetails) return {};

    const address = formatAddress(selectedCustomerDetails, 'billing');

    if (customer.type === 'Business') {
      return {
        companyName: selectedCustomerDetails.name,
        vatTin: selectedCustomerDetails.vatRegistrationNumber || '',
        businessAddress: address,
        contactPerson: selectedCustomerDetails.contactPerson || '',
        phone: selectedCustomerDetails.phones[0] || '',
        email: selectedCustomerDetails.emails[0] || '',
        status: customer.status,
      };
    } else {
      return {
        fullName: selectedCustomerDetails.name,
        nicNumber: '', // NIC is not stored separately in the schema
        address: address,
        phone: selectedCustomerDetails.phones[0] || '',
        email: selectedCustomerDetails.emails[0] || '',
        status: customer.status,
      };
    }
  };

  // Get delete confirmation details
  const getDeleteDetails = (customer: Customer | null) => {
    if (!customer) return [];

    return [
      { label: 'Customer Code', value: customer.code || 'N/A' },
      { label: 'Type', value: customer.type },
      { label: 'Status', value: customer.status },
      {
        label: 'Outstanding Balance',
        value: `Rs. ${customer.outstandingBalance.toLocaleString('en-LK', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      },
    ];
  };

  const handleCompanySubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const addressParts = parseAddress(data.businessAddress);
      const code = await generateCustomerCode();

      const locationsPayload = businessLocations
        .filter((loc) => (loc.name && loc.name.trim()) || (loc.address && loc.address.trim()))
        .map((loc) => ({ name: (loc.name || '').trim(), address: (loc.address || '').trim() }));

      const payload = {
        code,
        type: mapFrontendTypeToApi('Business'),
        name: data.companyName,
        contactPerson: data.contactPerson,
        phones: [data.phone],
        emails: [data.email],
        billingAddressLine1: addressParts.line1,
        billingAddressLine2: addressParts.line2,
        billingCity: addressParts.city,
        billingRegion: addressParts.region,
        billingPostalCode: addressParts.postalCode,
        billingCountry: addressParts.country,
        vatRegistrationNumber: data.vatTin || null,
        status: mapFrontendStatusToApi(data.status),
        ...(locationsPayload.length > 0 && { locations: locationsPayload }),
      };

      const result = await createCustomer(payload);
      
      if (result.success) {
        alert(`Business "${data.companyName}" created successfully.`);
        handleCloseCreateModal();
        await loadCustomers(); // Refresh the list
      } else {
        alert(`Failed to create business: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating business:', error);
      alert('Failed to create business. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIndividualSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const addressParts = parseAddress(data.address);
      const code = await generateCustomerCode();

      const payload = {
        code,
        type: mapFrontendTypeToApi('Customer'),
        name: data.fullName,
        contactPerson: data.fullName,
        phones: [data.phone],
        emails: [data.email],
        billingAddressLine1: addressParts.line1,
        billingAddressLine2: addressParts.line2,
        billingCity: addressParts.city,
        billingRegion: addressParts.region,
        billingPostalCode: addressParts.postalCode,
        billingCountry: addressParts.country,
        status: mapFrontendStatusToApi(data.status),
      };

      const result = await createCustomer(payload);
      
      if (result.success) {
        alert(`Customer "${data.fullName}" created successfully.`);
        handleCloseCreateModal();
        await loadCustomers(); // Refresh the list
      } else {
        alert(`Failed to create customer: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanyUpdate = async (data: Record<string, any>) => {
    if (!selectedCustomer) return;

    setIsSubmitting(true);
    try {
      const addressParts = parseAddress(data.businessAddress);

      const locationsPayload = updateBusinessLocations
        .filter((loc) => (loc.name && loc.name.trim()) || (loc.address && loc.address.trim()))
        .map((loc) => ({ name: (loc.name || '').trim(), address: (loc.address || '').trim() }));

      const payload = {
        name: data.companyName,
        contactPerson: data.contactPerson,
        phones: [data.phone],
        emails: [data.email],
        billingAddressLine1: addressParts.line1,
        billingAddressLine2: addressParts.line2,
        billingCity: addressParts.city,
        billingRegion: addressParts.region,
        billingPostalCode: addressParts.postalCode,
        billingCountry: addressParts.country,
        vatRegistrationNumber: data.vatTin || null,
        status: mapFrontendStatusToApi(data.status),
        locations: locationsPayload,
      };

      const result = await updateCustomer(selectedCustomer.id, payload);
      
      if (result.success) {
        alert(`Business "${data.companyName}" updated successfully.`);
        handleCloseUpdateModal();
        await loadCustomers(); // Refresh the list
      } else {
        alert(`Failed to update business: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating business:', error);
      alert('Failed to update business. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIndividualUpdate = async (data: Record<string, any>) => {
    if (!selectedCustomer) return;

    setIsSubmitting(true);
    try {
      const addressParts = parseAddress(data.address);

      const payload = {
        name: data.fullName,
        contactPerson: data.fullName,
        phones: [data.phone],
        emails: [data.email],
        billingAddressLine1: addressParts.line1,
        billingAddressLine2: addressParts.line2,
        billingCity: addressParts.city,
        billingRegion: addressParts.region,
        billingPostalCode: addressParts.postalCode,
        billingCountry: addressParts.country,
        status: mapFrontendStatusToApi(data.status),
      };

      const result = await updateCustomer(selectedCustomer.id, payload);
      
      if (result.success) {
        alert(`Customer "${data.fullName}" updated successfully.`);
        handleCloseUpdateModal();
        await loadCustomers(); // Refresh the list
      } else {
        alert(`Failed to update customer: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    if (activeCreateTab === 'company') {
      setBusinessLocations([{ name: '', address: '' }]);
    }
  };

  const getRowClassName = (customer: Customer) => {
    if (customer.status === 'Blocked') return 'bg-red-50/60 dark:bg-red-950/40';
    if (customer.status === 'Inactive') return 'bg-gray-50 dark:bg-slate-900/40';
    return '';
  };

  // Action buttons
  const actions: ActionButton[] = [
    {
      label: '',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewCustomer,
      tooltip: 'View Customer',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
    {
      label: '',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleUpdateCustomer,
      tooltip: 'Update Customer',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
    },
    {
      label: '',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger',
      onClick: handleDeleteCustomer,
      tooltip: 'Delete Customer',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-500',
    },
  ];

  // Profile Content Components
  const renderProfileContent = () => {
    if (!selectedCustomer || !selectedCustomerDetails) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading customer details...</div>
        </div>
      );
    }

    const customerInfo: CustomerInfo = {
      id: selectedCustomerDetails.id,
      name: selectedCustomerDetails.name,
      type: mapApiTypeToFrontend(selectedCustomerDetails.type),
      vatTin: selectedCustomerDetails.vatRegistrationNumber,
      nicNumber: undefined, // Not stored separately in schema
      address: formatAddress(selectedCustomerDetails, 'billing'),
      phone: selectedCustomerDetails.phones[0] || 'N/A',
      email: selectedCustomerDetails.emails[0] || 'N/A',
      creditStatus: selectedCustomerDetails.status === 'ACTIVE' ? 'Active' : 'Locked',
      totalOutstanding: Number(selectedCustomerDetails.currentBalance),
      contactPerson: selectedCustomerDetails.contactPerson,
    };

    // Overview Content
    const overviewContent = (
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Customer Info
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Customer Code:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {selectedCustomerDetails.code}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Name:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.name}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.type}
                </span>
              </div>
              {customerInfo.vatTin && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">VAT/TIN:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {customerInfo.vatTin}
                  </span>
                </div>
              )}
              {customerInfo.contactPerson && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Contact Person:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {customerInfo.contactPerson}
                  </span>
                </div>
              )}
              <div className="md:col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Address:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.address}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.phone}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.email}
                </span>
              </div>
            </div>
          </div>

          {/* Credit Status */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Credit Status
            </h4>
            <div>
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-semibold inline-flex items-center ${
                  customerInfo.creditStatus === 'Active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}
              >
                {customerInfo.creditStatus}
              </span>
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Total Outstanding
            </h4>
            <div>
              <span
                className={`text-2xl font-bold ${
                  customerInfo.totalOutstanding > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                Rs. {customerInfo.totalOutstanding.toLocaleString('en-LK', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );

    // Rental History Columns
    const rentalHistoryColumns: TableColumn[] = [
      {
        key: 'agreementNumber',
        label: 'Agreement Number',
        sortable: true,
      },
      {
        key: 'startDate',
        label: 'Start Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'expectedEndDate',
        label: 'Expected End Date',
        sortable: true,
        render: (value: string | null) => value ? new Date(value).toLocaleDateString('en-LK') : 'Open-ended',
      },
      {
        key: 'actualEndDate',
        label: 'Actual End Date',
        sortable: true,
        render: (value: string | null) =>
          value ? new Date(value).toLocaleDateString('en-LK') : 'Active',
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
          const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
          if (value === 'ACTIVE') {
            return (
              <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>
                Active
              </span>
            );
          }
          if (value === 'COMPLETED') {
            return (
              <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
                Completed
              </span>
            );
          }
          return (
            <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
              Cancelled
            </span>
          );
        },
      },
      {
        key: 'total',
        label: 'Total Amount',
        sortable: true,
        render: (value: number) => (
          <span className="font-medium text-gray-900 dark:text-white">
            Rs. {Number(value).toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        key: 'balance',
        label: 'Balance',
        sortable: true,
        render: (value: number) => (
          <span className={`font-medium ${Number(value) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            Rs. {Number(value).toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
    ];

    const rentalHistoryContent = (
      <div className="space-y-4">
        <Table
          data={rentalHistory}
          columns={rentalHistoryColumns}
          itemsPerPage={10}
          searchable={false}
          filterable={false}
          emptyMessage="No rental history found."
        />
      </div>
    );

    const paymentsContent = (
      <div className="space-y-4">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Payment history feature coming soon...
        </div>
      </div>
    );

    const damageRecordsContent = (
      <div className="space-y-4">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Damage records feature coming soon...
        </div>
      </div>
    );

    switch (activeProfileTab) {
      case 'rental-history':
        return rentalHistoryContent;
      case 'payments':
        return paymentsContent;
      case 'damage-records':
        return damageRecordsContent;
      default:
        return overviewContent;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
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
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Customer Management
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Overview of all customers with their type, outstanding balances, and status.
              </p>
            </div>
          </div>

          {/* Customer table card */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Loading customers...</div>
            </div>
          ) : (
            <Table
              data={customers}
              columns={columns}
              actions={actions}
              itemsPerPage={10}
              searchable
              filterable
              onCreateClick={handleCreateCustomer}
              createButtonLabel="Create Customer"
              getRowClassName={getRowClassName}
              emptyMessage="No customers found."
            />
          )}
        </div>
      </main>

      {/* Create Customer Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Create Customer
              </h2>
              <Tooltip content="Close">
                <button
                  onClick={handleCloseCreateModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700 px-6">
              <div className="flex space-x-4">
                <Tooltip content="Business">
                  <button
                    onClick={() => setActiveCreateTab('company')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeCreateTab === 'company'
                        ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Business
                  </button>
                </Tooltip>
                <Tooltip content="Customer">
                  <button
                    onClick={() => setActiveCreateTab('individual')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeCreateTab === 'individual'
                        ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Customer
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeCreateTab === 'company' ? (
                <>
                  <CreateForm
                    ref={createFormRef}
                    title="Business Details"
                    fields={companyFields}
                    onSubmit={handleCompanySubmit}
                    onClear={handleClear}
                    submitButtonLabel="Save"
                    clearButtonLabel="Clear"
                    loading={isSubmitting}
                    enableDynamicSpecs={false}
                    hideFooterActions
                    formId="create-customer-form-company"
                    className="shadow-none border-0 p-0"
                  />
                  {/* Locations (optional) – same grid as form, integrated after Email/Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Locations (optional)
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add one or more locations for this customer (e.g. delivery or site addresses).
                      </p>
                    </div>
                    {businessLocations.map((loc, index) => (
                      <React.Fragment key={index}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Location name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Main Factory"
                            value={loc.name}
                            onChange={(e) =>
                              setBusinessLocations((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], name: e.target.value };
                                return next;
                              })
                            }
                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                          />
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 min-w-0">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Address (optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Address"
                              value={loc.address}
                              onChange={(e) =>
                                setBusinessLocations((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], address: e.target.value };
                                  return next;
                                })
                              }
                              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setBusinessLocations((prev) =>
                                prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ name: '', address: '' }]
                              )
                            }
                            className="shrink-0 p-3 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            aria-label="Remove location"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </React.Fragment>
                    ))}
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => setBusinessLocations((prev) => [...prev, { name: '', address: '' }])}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-indigo-400 hover:underline focus:outline-none"
                      >
                        <Plus className="w-4 h-4" />
                        Add location
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <CreateForm
                  ref={createFormRef}
                  title="Customer Details"
                  fields={individualFields}
                  onSubmit={handleIndividualSubmit}
                  onClear={handleClear}
                  submitButtonLabel="Save"
                  clearButtonLabel="Clear"
                  loading={isSubmitting}
                  enableDynamicSpecs={false}
                  hideFooterActions
                  formId="create-customer-form-individual"
                  className="shadow-none border-0 p-0"
                />
              )}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => createFormRef.current?.clear()}
                    className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 transition-colors duration-200 font-medium"
                    disabled={isSubmitting}
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    form={activeCreateTab === 'company' ? 'create-customer-form-company' : 'create-customer-form-individual'}
                    className="px-6 py-3 bg-[#4154F1] dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Customer Modal */}
      {isUpdateModalOpen && selectedCustomer && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {selectedCustomer.type === 'Business' ? 'Update Business' : 'Update Customer'}
              </h2>
              <Tooltip content="Close">
                <button
                  onClick={handleCloseUpdateModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedCustomerDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500 dark:text-gray-400">Loading customer details...</div>
                </div>
              ) : selectedCustomer.type === 'Business' ? (
                <>
                  <UpdateForm
                    title="Update Business Details"
                    fields={companyFields}
                    onSubmit={handleCompanyUpdate}
                    onClear={handleClear}
                    submitButtonLabel="Update"
                    clearButtonLabel="Reset"
                    loading={isSubmitting}
                    initialData={getUpdateInitialData(selectedCustomer)}
                    className="shadow-none border-0 p-0"
                  />
                  {/* Locations (optional) – same grid as form, integrated after Email/Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Locations (optional)
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add one or more locations for this customer (e.g. delivery or site addresses).
                      </p>
                    </div>
                    {updateBusinessLocations.map((loc, index) => (
                      <React.Fragment key={index}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Location name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Main Factory"
                            value={loc.name}
                            onChange={(e) =>
                              setUpdateBusinessLocations((prev) => {
                                const next = [...prev];
                                next[index] = { ...next[index], name: e.target.value };
                                return next;
                              })
                            }
                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                          />
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 min-w-0">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Address (optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Address"
                              value={loc.address}
                              onChange={(e) =>
                                setUpdateBusinessLocations((prev) => {
                                  const next = [...prev];
                                  next[index] = { ...next[index], address: e.target.value };
                                  return next;
                                })
                              }
                              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setUpdateBusinessLocations((prev) =>
                                prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ name: '', address: '' }]
                              )
                            }
                            className="shrink-0 p-3 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            aria-label="Remove location"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </React.Fragment>
                    ))}
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => setUpdateBusinessLocations((prev) => [...prev, { name: '', address: '' }])}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-indigo-400 hover:underline focus:outline-none"
                      >
                        <Plus className="w-4 h-4" />
                        Add location
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <UpdateForm
                  title="Update Customer Details"
                  fields={individualFields}
                  onSubmit={handleIndividualUpdate}
                  onClear={handleClear}
                  submitButtonLabel="Update"
                  clearButtonLabel="Reset"
                  loading={isSubmitting}
                  initialData={getUpdateInitialData(selectedCustomer)}
                  className="shadow-none border-0 p-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Modal */}
      {isDeleteModalOpen && selectedCustomer && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Delete Customer
              </h2>
              <Tooltip content="Close">
                <button
                  onClick={handleCloseDeleteModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <DeleteForm
                title="Delete Customer"
                message="This will permanently delete the customer and all associated data. This action cannot be undone."
                itemName={selectedCustomer.name}
                itemDetails={getDeleteDetails(selectedCustomer)}
                onConfirm={handleConfirmDelete}
                onCancel={handleCloseDeleteModal}
                confirmButtonLabel="Delete Customer"
                cancelButtonLabel="Cancel"
                loading={isSubmitting}
                className="shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* View Customer Profile Modal */}
      {isViewModalOpen && selectedCustomer && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Customer Profile
                </h2>
              </div>
              <Tooltip content="Close">
                <button
                  onClick={handleCloseViewModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            {/* Profile Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700 px-6">
              <div className="flex space-x-4">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'rental-history', label: 'Rental History' },
                  { key: 'payments', label: 'Payments' },
                  { key: 'damage-records', label: 'Damage Records' },
                ].map((tab) => (
                  <Tooltip key={tab.key} content={tab.label}>
                    <button
                      onClick={() => setActiveProfileTab(tab.key as any)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeProfileTab === tab.key
                          ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderProfileContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerListPage;