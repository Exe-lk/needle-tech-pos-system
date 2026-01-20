'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import { Eye, Pencil, Trash2 } from 'lucide-react';

type CustomerType = 'Company' | 'Individual';
type CustomerStatus = 'Active' | 'Inactive' | 'Blocked';

interface Customer {
  id: number;
  name: string;
  type: CustomerType;
  outstandingBalance: number;
  status: CustomerStatus;
}

// Mock customer data (frontend only for now)
const mockCustomers: Customer[] = [
  {
    id: 1,
    name: 'ABC Holdings (Pvt) Ltd',
    type: 'Company',
    outstandingBalance: 120000.5,
    status: 'Active',
  },
  {
    id: 2,
    name: 'John Perera',
    type: 'Individual',
    outstandingBalance: 3500,
    status: 'Active',
  },
  {
    id: 3,
    name: 'XYZ Engineering',
    type: 'Company',
    outstandingBalance: 0,
    status: 'Inactive',
  },
  {
    id: 4,
    name: 'Kamal Silva',
    type: 'Individual',
    outstandingBalance: 78000,
    status: 'Blocked',
  },
  {
    id: 5,
    name: 'Mega Constructions',
    type: 'Company',
    outstandingBalance: 245000.75,
    status: 'Active',
  },
];

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

// Action buttons (View / Update / Delete)
const actions: ActionButton[] = [
  {
    label: 'View',
    icon: <Eye className="w-4 h-4" />,
    variant: 'secondary',
    onClick: (row: Customer) => {
      console.log('View customer', row);
      alert(`View customer: ${row.name}`);
    },
  },
  {
    label: 'Update',
    icon: <Pencil className="w-4 h-4" />,
    variant: 'primary',
    onClick: (row: Customer) => {
      console.log('Update customer', row);
      alert(`Update customer: ${row.name}`);
    },
  },
  {
    label: 'Delete',
    icon: <Trash2 className="w-4 h-4" />,
    variant: 'danger',
    onClick: (row: Customer) => {
      console.log('Delete customer', row);
      alert(`Delete customer: ${row.name}`);
    },
  },
];

const CustomerListPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    // TODO: plug into real auth/logout later
    console.log('Logout clicked');
  };

  const handleCreateCustomer = () => {
    // Later this will open "Add Company / Add Individual" flow
    alert('Create new customer (Company / Individual)');
  };

  const getRowClassName = (customer: Customer) => {
    if (customer.status === 'Blocked') return 'bg-red-50/60 dark:bg-red-950/40';
    if (customer.status === 'Inactive') return 'bg-gray-50 dark:bg-slate-900/40';
    return '';
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
      />

      {/* Main content area */}
      <main className="pt-[70px] lg:ml-[300px] p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Customer List
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
    </div>
  );
};

export default CustomerListPage;