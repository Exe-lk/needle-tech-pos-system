'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import CreateForm, { FormField } from '@/src/components/form-popup/create';

const AddIndividualPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Form fields for Individual create
  const fields: FormField[] = [
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
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter email address',
      required: true,
    },
  ];

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // For now, frontend-only – just log and show a message
      console.log('Create individual payload:', data);
      alert(`Individual customer "${data.fullName}" created (frontend only).`);
      // Later: call your backend API here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    console.log('Create individual form cleared');
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
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Page header */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Add Individual
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Create a new individual customer with personal contact information.
            </p>
          </div>

          {/* Create individual form card (popup-style card on the page) */}
          <CreateForm
            title="Individual Details"
            fields={fields}
            onSubmit={handleSubmit}
            onClear={handleClear}
            submitButtonLabel="Save"
            clearButtonLabel="Clear"
            loading={isSubmitting}
            enableDynamicSpecs={false}
          />
        </div>
      </main>
    </div>
  );
};

export default AddIndividualPage;