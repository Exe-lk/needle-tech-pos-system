'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import CreateForm, { FormField } from '@/src/components/form-popup/create';
import UpdateForm from '@/src/components/form-popup/update';
import DeleteForm from '@/src/components/form-popup/delete';
import { Eye, Pencil, Trash2, X } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { validateVATTIN, validateNICNumber, validateEmail, validatePhoneNumber } from '@/src/utils/validation';

type CustomerType = 'Business' | 'Customer';
type CustomerStatus = 'Active' | 'Inactive' | 'Blocked';

interface Customer {
  id: number;
  name: string;
  type: CustomerType;
  outstandingBalance: number;
  status: CustomerStatus;
}

// Customer Profile Data Types
interface CustomerInfo {
  id: number;
  name: string;
  type: 'Business' | 'Customer';
  nicNumber?: string;
  vatTin?: string;
  address: string;
  phone: string;
  email: string;
  creditStatus: 'Active' | 'Locked';
  totalOutstanding: number;
}

interface RentalHistory {
  id: number;
  machineName: string;
  rentalDate: string;
  returnDate: string | null;
  status: 'Active' | 'Completed' | 'Cancelled';
  totalAmount: number;
}

interface Payment {
  id: number;
  machineName: string;
  dueDate: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
}

interface DamageRecord {
  id: number;
  machineName: string;
  rentalDate: string;
  returnDate: string;
  damageDescription: string;
  repairCost: number;
  status: 'Repaired' | 'Pending';
}

interface Agreement {
  id: number;
  agreementNumber: string;
  machineName: string;
  startDate: string;
  endDate: string;
  rentalPeriod: string;
  monthlyRate: number;
  totalAmount: number;
  status: 'Active' | 'Expired' | 'Terminated';
}

interface OutstandingAlert {
  id: number;
  alertType: 'Payment Overdue' | 'High Balance' | 'Credit Limit Exceeded' | 'Agreement Expiring';
  description: string;
  amount: number;
  dueDate: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Active' | 'Resolved';
}

// Mock customer data
const mockCustomers: Customer[] = [
  {
    id: 1,
    name: 'ABC Holdings (Pvt) Ltd',
    type: 'Business',
    outstandingBalance: 120000.5,
    status: 'Active',
  },
  {
    id: 2,
    name: 'John Perera',
    type: 'Customer',
    outstandingBalance: 3500,
    status: 'Active',
  },
  {
    id: 3,
    name: 'XYZ Engineering',
    type: 'Business',
    outstandingBalance: 0,
    status: 'Inactive',
  },
  {
    id: 4,
    name: 'Kamal Silva',
    type: 'Customer',
    outstandingBalance: 78000,
    status: 'Blocked',
  },
  {
    id: 5,
    name: 'Mega Constructions',
    type: 'Business',
    outstandingBalance: 245000.75,
    status: 'Active',
  },
];

// Mock function to get customer profile data (replace with API call later)
const getCustomerProfileData = (customerId: number): CustomerInfo => {
  const customer = mockCustomers.find((c) => c.id === customerId);
  return {
    id: customer?.id || 0,
    name: customer?.name || '',
    type: customer?.type || 'Business',
    vatTin: customer?.type === 'Business' ? 'VAT-123456789' : undefined,
    nicNumber: customer?.type === 'Customer' ? '123456789V' : undefined,
    address: '123 Business Street, Colombo 05',
    phone: '+94 11 2345678',
    email: 'contact@example.lk',
    creditStatus: customer?.status === 'Blocked' ? 'Locked' : 'Active',
    totalOutstanding: customer?.outstandingBalance || 0,
  };
};

// Mock rental history data
const getRentalHistory = (customerId: number): RentalHistory[] => {
  return [
    {
      id: 1,
      machineName: 'Excavator CAT 320',
      rentalDate: '2024-01-15',
      returnDate: '2024-02-15',
      status: 'Completed',
      totalAmount: 150000,
    },
    {
      id: 2,
      machineName: 'Bulldozer CAT D6',
      rentalDate: '2024-03-01',
      returnDate: null,
      status: 'Active',
      totalAmount: 200000,
    },
  ];
};

// Mock payments data
const getPayments = (customerId: number): Payment[] => {
  return [
    {
      id: 1,
      machineName: 'Bulldozer CAT D6',
      dueDate: '2024-04-01',
      amount: 50000,
      status: 'Pending',
    },
    {
      id: 2,
      machineName: 'Bulldozer CAT D6',
      dueDate: '2024-05-01',
      amount: 50000,
      status: 'Pending',
    },
  ];
};

// Mock damage records data
const getDamageRecords = (customerId: number): DamageRecord[] => {
  return [
    {
      id: 1,
      machineName: 'Excavator CAT 320',
      rentalDate: '2024-01-15',
      returnDate: '2024-02-15',
      damageDescription: 'Minor scratch on hydraulic arm',
      repairCost: 5000,
      status: 'Repaired',
    },
  ];
};

// Mock agreements data
const getAgreements = (customerId: number): Agreement[] => {
  return [
    {
      id: 1,
      agreementNumber: 'AGR-2024-001',
      machineName: 'Excavator CAT 320',
      startDate: '2024-01-15',
      endDate: '2024-07-15',
      rentalPeriod: '6 months',
      monthlyRate: 25000,
      totalAmount: 150000,
      status: 'Active',
    },
    {
      id: 2,
      agreementNumber: 'AGR-2024-002',
      machineName: 'Bulldozer CAT D6',
      startDate: '2024-03-01',
      endDate: '2024-09-01',
      rentalPeriod: '6 months',
      monthlyRate: 33333.33,
      totalAmount: 200000,
      status: 'Active',
    },
    {
      id: 3,
      agreementNumber: 'AGR-2023-045',
      machineName: 'Loader CAT 950',
      startDate: '2023-06-01',
      endDate: '2023-12-01',
      rentalPeriod: '6 months',
      monthlyRate: 20000,
      totalAmount: 120000,
      status: 'Expired',
    },
  ];
};

// Mock outstanding alerts data
const getOutstandingAlerts = (customerId: number): OutstandingAlert[] => {
  return [
    {
      id: 1,
      alertType: 'Payment Overdue',
      description: 'Monthly payment for Bulldozer CAT D6 is overdue by 15 days',
      amount: 50000,
      dueDate: '2024-04-01',
      severity: 'High',
      status: 'Active',
    },
    {
      id: 2,
      alertType: 'High Balance',
      description: 'Total outstanding balance exceeds warning threshold',
      amount: 120000.5,
      dueDate: '2024-04-15',
      severity: 'Medium',
      status: 'Active',
    },
    {
      id: 3,
      alertType: 'Agreement Expiring',
      description: 'Agreement AGR-2024-001 will expire in 30 days',
      amount: 0,
      dueDate: '2024-07-15',
      severity: 'Low',
      status: 'Active',
    },
  ];
};

// Table column configuration
const columns: TableColumn[] = [
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
      const base =
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
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
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'rental-history' | 'payments' | 'damage-records'>('overview');
  const [activeCreateTab, setActiveCreateTab] = useState<'company' | 'individual'>('company');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleCreateCustomer = () => {
    setIsCreateModalOpen(true);
    setActiveCreateTab('company');
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setActiveCreateTab('company');
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
    setActiveProfileTab('overview');
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedCustomer(null);
    setActiveProfileTab('overview');
  };

  const handleUpdateCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedCustomer(null);
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
      console.log('Delete customer payload:', selectedCustomer);
      // Replace with actual API call
      // await deleteCustomerAPI(selectedCustomer.id);
      alert(`Customer "${selectedCustomer.name}" deleted (frontend only).`);
      handleCloseDeleteModal();
      // Optionally refresh the customer list here
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
      required: true,
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
      required: true,
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
        { label: 'Blocked', value: 'Blocked' },
      ],
    },
  ];

  // Get initial data for update form
  const getUpdateInitialData = (customer: Customer | null) => {
    if (!customer) return {};

    const customerInfo = getCustomerProfileData(customer.id);

    if (customer.type === 'Business') {
      return {
        companyName: customerInfo.name,
        vatTin: customerInfo.vatTin || '',
        businessAddress: customerInfo.address,
        contactPerson: 'Contact Person Name', // This should come from API
        phone: customerInfo.phone,
        email: customerInfo.email,
        status: customer.status,
      };
    } else {
      return {
        fullName: customerInfo.name,
        nicNumber: customerInfo.nicNumber || '',
        address: customerInfo.address,
        phone: customerInfo.phone,
        email: customerInfo.email,
        status: customer.status,
      };
    }
  };

  // Get delete confirmation details
  const getDeleteDetails = (customer: Customer | null) => {
    if (!customer) return [];

    return [
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
      console.log('Create business payload:', data);
      alert(`Business "${data.companyName}" created (frontend only).`);
      handleCloseCreateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIndividualSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      console.log('Create customer payload:', data);
      alert(`Customer "${data.fullName}" created (frontend only).`);
      handleCloseCreateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanyUpdate = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      console.log('Update business payload:', data);
      alert(`Business "${data.companyName}" updated (frontend only).`);
      handleCloseUpdateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIndividualUpdate = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      console.log('Update customer payload:', data);
      alert(`Customer "${data.fullName}" updated (frontend only).`);
      handleCloseUpdateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    console.log('Form cleared');
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
    if (!selectedCustomer) return null;

    const customerInfo = getCustomerProfileData(selectedCustomer.id);
    const rentalHistory = getRentalHistory(selectedCustomer.id);
    const payments = getPayments(selectedCustomer.id);
    const damageRecords = getDamageRecords(selectedCustomer.id);

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
              {customerInfo.nicNumber && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">NIC:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {customerInfo.nicNumber}
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
                className={`px-3 py-1.5 rounded-full text-sm font-semibold inline-flex items-center ${customerInfo.creditStatus === 'Active'
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
                className={`text-2xl font-bold ${customerInfo.totalOutstanding > 0
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
        key: 'machineName',
        label: 'Machine Name',
        sortable: true,
      },
      {
        key: 'rentalDate',
        label: 'Rental Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'returnDate',
        label: 'Return Date',
        sortable: true,
        render: (value: string | null) =>
          value ? new Date(value).toLocaleDateString('en-LK') : 'N/A',
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
          const base =
            'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
          if (value === 'Active') {
            return (
              <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>
                Active
              </span>
            );
          }
          if (value === 'Completed') {
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
        key: 'totalAmount',
        label: 'Total Amount',
        sortable: true,
        render: (value: number) => (
          <span className="font-medium text-gray-900 dark:text-white">
            Rs. {value.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
    ];

    // Payments Columns
    const paymentsColumns: TableColumn[] = [
      {
        key: 'machineName',
        label: 'Machine Name',
        sortable: true,
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        render: (value: number) => (
          <span className="font-medium text-gray-900 dark:text-white">
            Rs. {value.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
          const base =
            'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
          if (value === 'Paid') {
            return (
              <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
                Paid
              </span>
            );
          }
          if (value === 'Overdue') {
            return (
              <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
                Overdue
              </span>
            );
          }
          return (
            <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
              Pending
            </span>
          );
        },
      },
    ];

    // Damage Records Columns
    const damageRecordsColumns: TableColumn[] = [
      {
        key: 'machineName',
        label: 'Machine Name',
        sortable: true,
      },
      {
        key: 'rentalDate',
        label: 'Rental Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'returnDate',
        label: 'Return Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'damageDescription',
        label: 'Damage Description',
        sortable: false,
      },
      {
        key: 'repairCost',
        label: 'Repair Cost',
        sortable: true,
        render: (value: number) => (
          <span className="font-medium text-red-600 dark:text-red-400">
            Rs. {value.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
          const base =
            'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
          if (value === 'Repaired') {
            return (
              <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
                Repaired
              </span>
            );
          }
          return (
            <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
              Pending
            </span>
          );
        },
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
        
        <Table
          data={payments}
          columns={paymentsColumns}
          itemsPerPage={10}
          searchable={false}
          filterable={false}
          emptyMessage="No upcoming payments found."
        />
      </div>
    );

    const damageRecordsContent = (
      <div className="space-y-4">
        
        <Table
          data={damageRecords}
          columns={damageRecordsColumns}
          itemsPerPage={10}
          searchable={false}
          filterable={false}
          emptyMessage="No damage records found."
        />
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
      <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
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
          <Table
            data={mockCustomers}
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
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeCreateTab === 'company'
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
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeCreateTab === 'individual'
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
                <CreateForm
                  title="Business Details"
                  fields={companyFields}
                  onSubmit={handleCompanySubmit}
                  onClear={handleClear}
                  submitButtonLabel="Save"
                  clearButtonLabel="Clear"
                  loading={isSubmitting}
                  enableDynamicSpecs={false}
                  className="shadow-none border-0 p-0"
                />
              ) : (
                <CreateForm
                  title="Customer Details"
                  fields={individualFields}
                  onSubmit={handleIndividualSubmit}
                  onClear={handleClear}
                  submitButtonLabel="Save"
                  clearButtonLabel="Clear"
                  loading={isSubmitting}
                  enableDynamicSpecs={false}
                  className="shadow-none border-0 p-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Customer Modal - Shows only the form for the selected customer type (Business or Customer) */}
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

            {/* Modal Content - Single form based on customer type (no tabs) */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedCustomer.type === 'Business' ? (
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
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeProfileTab === tab.key
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