'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import CreateForm, { FormField } from '@/src/components/form-popup/create';

const AddCompanyPage: React.FC = () => {
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

  // Form fields for Company create
  const fields: FormField[] = [
    {
      name: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'Enter company name',
      required: true,
    },
    {
      name: 'vatTin',
      label: 'VAT / TIN Number',
      type: 'text',
      placeholder: 'Enter VAT or TIN number',
      required: true,
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
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter contact email',
      required: true,
    },
  ];

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // For now, frontend-only – just log and show a message
      console.log('Create company payload:', data);
      alert(`Company "${data.companyName}" created (frontend only).`);
      // Later: call your backend API here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    console.log('Create company form cleared');
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
              Add Company
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Create a new company customer with basic contact and billing information.
            </p>
          </div>

          {/* Create company form card (popup-style card on the page) */}
          <CreateForm
            title="Company Details"
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

export default AddCompanyPage;