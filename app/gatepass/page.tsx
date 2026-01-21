'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import { Eye, Pencil, X, Plus } from 'lucide-react';

interface GatePass {
  id: number;
  agreementReference: string;
  driverName: string;
  vehicleNumber: string;
  dispatchDate: string; // ISO timestamp string
}

// Mock rental agreements for dropdown (you can fetch from API later)
const mockRentalAgreements = [
  { id: 'RA-2024-001', customerName: 'ABC Holdings (Pvt) Ltd' },
  { id: 'RA-2024-002', customerName: 'John Perera' },
  { id: 'RA-2024-003', customerName: 'XYZ Engineering' },
  { id: 'RA-2024-004', customerName: 'Kamal Silva' },
  { id: 'RA-2024-005', customerName: 'Mega Constructions' },
];

// Mock gate pass data
const mockGatePasses: GatePass[] = [
  {
    id: 1,
    agreementReference: 'RA-2024-001',
    driverName: 'Nimal Perera',
    vehicleNumber: 'ABC-1234',
    dispatchDate: '2024-01-20T10:30:00',
  },
  {
    id: 2,
    agreementReference: 'RA-2024-002',
    driverName: 'Kamal Silva',
    vehicleNumber: 'XYZ-5678',
    dispatchDate: '2024-03-05T14:15:00',
  },
  {
    id: 3,
    agreementReference: 'RA-2024-003',
    driverName: 'Sunil Fernando',
    vehicleNumber: 'DEF-9012',
    dispatchDate: '2024-02-15T09:45:00',
  },
  {
    id: 4,
    agreementReference: 'RA-2024-004',
    driverName: 'Rohan Jayasuriya',
    vehicleNumber: 'GHI-3456',
    dispatchDate: '2024-04-10T16:20:00',
  },
  {
    id: 5,
    agreementReference: 'RA-2024-005',
    driverName: 'Dilshan Perera',
    vehicleNumber: 'JKL-7890',
    dispatchDate: '2024-04-15T11:00:00',
  },
];

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'agreementReference',
    label: 'Agreement Reference',
    sortable: true,
    filterable: true,
  },
  {
    key: 'driverName',
    label: 'Driver Name',
    sortable: true,
    filterable: true,
  },
  {
    key: 'vehicleNumber',
    label: 'Vehicle Number',
    sortable: true,
    filterable: true,
  },
  {
    key: 'dispatchDate',
    label: 'Dispatch Date',
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
          })}{' '}
          {date.toLocaleTimeString('en-LK', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      );
    },
  },
];

const GatePassPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedGatePass, setSelectedGatePass] = useState<GatePass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [agreementReference, setAgreementReference] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [dispatchTime, setDispatchTime] = useState('');
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

  const handleCreateGatePass = () => {
    setIsCreateModalOpen(true);
    // Reset form
    setAgreementReference('');
    setDriverName('');
    setVehicleNumber('');
    setDispatchDate('');
    setDispatchTime('');
    setFormErrors({});
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setAgreementReference('');
    setDriverName('');
    setVehicleNumber('');
    setDispatchDate('');
    setDispatchTime('');
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!agreementReference) errors.agreementReference = 'Agreement Reference is required';
    if (!driverName.trim()) errors.driverName = 'Driver Name is required';
    if (!vehicleNumber.trim()) errors.vehicleNumber = 'Vehicle Number is required';
    if (!dispatchDate) errors.dispatchDate = 'Dispatch Date is required';
    if (!dispatchTime) errors.dispatchTime = 'Dispatch Time is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time into ISO timestamp
      const dispatchDateTime = new Date(`${dispatchDate}T${dispatchTime}`).toISOString();

      const payload = {
        agreementReference,
        driverName,
        vehicleNumber,
        dispatchDate: dispatchDateTime,
      };

      console.log('Create gate pass payload:', payload);
      alert(`Gate Pass created successfully (frontend only).`);
      handleCloseCreateModal();
    } catch (error) {
      console.error('Error creating gate pass:', error);
      alert('Failed to create gate pass. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewGatePass = (gatePass: GatePass) => {
    setSelectedGatePass(gatePass);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedGatePass(null);
  };

  const handleUpdateGatePass = (gatePass: GatePass) => {
    setSelectedGatePass(gatePass);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedGatePass(null);
  };

  // Form fields for Update
  const updateFields = [
    {
      name: 'agreementReference',
      label: 'Agreement Reference',
      type: 'select' as const,
      placeholder: 'Select agreement reference',
      required: true,
      options: mockRentalAgreements.map((agreement) => ({
        label: `${agreement.id} - ${agreement.customerName}`,
        value: agreement.id,
      })),
    },
    {
      name: 'driverName',
      label: 'Driver Name',
      type: 'text' as const,
      placeholder: 'Enter driver name',
      required: true,
    },
    {
      name: 'vehicleNumber',
      label: 'Vehicle Number',
      type: 'text' as const,
      placeholder: 'Enter vehicle number',
      required: true,
    },
    {
      name: 'dispatchDate',
      label: 'Dispatch Date',
      type: 'date' as const,
      placeholder: 'Select dispatch date',
      required: true,
    },
    {
      name: 'dispatchTime',
      label: 'Dispatch Time',
      type: 'text' as const,
      placeholder: 'HH:MM (e.g., 14:30)',
      required: true,
    },
  ];

  // Get initial data for update form
  const getUpdateInitialData = (gatePass: GatePass | null) => {
    if (!gatePass) return {};

    const dispatchDateTime = new Date(gatePass.dispatchDate);
    const dateStr = dispatchDateTime.toISOString().split('T')[0];
    const timeStr = dispatchDateTime.toTimeString().slice(0, 5); // HH:MM format

    return {
      agreementReference: gatePass.agreementReference,
      driverName: gatePass.driverName,
      vehicleNumber: gatePass.vehicleNumber,
      dispatchDate: dateStr,
      dispatchTime: timeStr,
    };
  };

  const handleGatePassUpdate = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // Combine date and time into ISO timestamp
      const dispatchDateTime = new Date(`${data.dispatchDate}T${data.dispatchTime}`).toISOString();

      const payload = {
        ...data,
        dispatchDate: dispatchDateTime,
      };

      console.log('Update gate pass payload:', payload);
      alert(`Gate Pass "${data.agreementReference}" updated (frontend only).`);
      handleCloseUpdateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action buttons
  const actions: ActionButton[] = [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewGatePass,
    },
    {
      label: 'Update',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleUpdateGatePass,
    },
  ];

  // View Gate Pass Content
  const renderGatePassDetails = () => {
    if (!selectedGatePass) return null;

    const dispatchDateTime = new Date(selectedGatePass.dispatchDate);
    const agreement = mockRentalAgreements.find(
      (a) => a.id === selectedGatePass.agreementReference
    );

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Gate Pass Details
        </h3>

        <div className="space-y-4">
          {/* Agreement Information */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Agreement Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Agreement Reference:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {selectedGatePass.agreementReference}
                </span>
              </div>
              {agreement && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Customer Name:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {agreement.customerName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Driver & Vehicle Information */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Driver & Vehicle Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Driver Name:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {selectedGatePass.driverName}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Vehicle Number:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {selectedGatePass.vehicleNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Dispatch Information */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Dispatch Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Dispatch Date:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {dispatchDateTime.toLocaleDateString('en-LK', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Dispatch Time:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {dispatchDateTime.toLocaleTimeString('en-LK', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Gate Pass List</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Overview of all gate passes with agreement references, driver information, and dispatch
                details.
              </p>
            </div>
            <button
              onClick={handleCreateGatePass}
              className="px-6 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
            >
              Create Gate Pass
            </button>
          </div>

          {/* Gate Pass table card */}
          <Table
            data={mockGatePasses}
            columns={columns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            emptyMessage="No gate passes found."
          />
        </div>
      </main>

      {/* Create Gate Pass Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Gate Pass Form
              </h2>
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
                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Agreement Reference */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Agreement Reference <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={agreementReference}
                      onChange={(e) => setAgreementReference(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.agreementReference
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    >
                      <option value="">Select Agreement Reference</option>
                      {mockRentalAgreements.map((agreement) => (
                        <option key={agreement.id} value={agreement.id}>
                          {agreement.id} - {agreement.customerName}
                        </option>
                      ))}
                    </select>
                    {formErrors.agreementReference && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.agreementReference}</p>
                    )}
                  </div>

                  {/* Driver Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Driver Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Enter driver name"
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.driverName
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.driverName && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.driverName}</p>
                    )}
                  </div>

                  {/* Vehicle Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="Enter vehicle number"
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.vehicleNumber
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.vehicleNumber && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.vehicleNumber}</p>
                    )}
                  </div>

                  {/* Dispatch Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dispatch Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dispatchDate}
                      onChange={(e) => setDispatchDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.dispatchDate
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.dispatchDate && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.dispatchDate}</p>
                    )}
                  </div>

                  {/* Dispatch Time */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dispatch Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={dispatchTime}
                      onChange={(e) => setDispatchTime(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.dispatchTime
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.dispatchTime && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.dispatchTime}</p>
                    )}
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
                {isSubmitting ? 'Creating...' : 'Create & Print'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Gate Pass Modal */}
      {isViewModalOpen && selectedGatePass && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Gate Pass Details
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedGatePass.agreementReference}
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
            <div className="flex-1 overflow-y-auto p-6">{renderGatePassDetails()}</div>
          </div>
        </div>
      )}

      {/* Update Gate Pass Modal */}
      {isUpdateModalOpen && selectedGatePass && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Update Gate Pass
              </h2>
              <button
                onClick={handleCloseUpdateModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <UpdateForm
                title="Update Gate Pass Details"
                fields={updateFields}
                onSubmit={handleGatePassUpdate}
                submitButtonLabel="Update"
                clearButtonLabel="Reset"
                loading={isSubmitting}
                initialData={getUpdateInitialData(selectedGatePass)}
                className="shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatePassPage;