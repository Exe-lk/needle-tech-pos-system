'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import { Eye, X, FileText, CheckCircle2, Clock, Calendar, Printer } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { LetterheadDocument } from '@/src/components/letterhead/letterhead-document';

const API_BASE_URL = '/api/v1';

type PurchaseRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled' | 'Partially Fulfilled';
type CustomerType = 'Business' | 'Customer';

interface PurchaseRequest {
    id: string | number;
    requestNumber: string;
    customerId: string | number;
    customerName: string;
    customerType: CustomerType;
    requestDate: string;
    startDate?: string | null;
    endDate?: string | null;
    totalAmount: number;
    status: PurchaseRequestStatus;
    requestedMachines: number;
    machines: MachineRequestItem[];
    rentalAgreementIds?: (string | number)[];
}

interface MachineRequestItem {
    id: string;
    brand: string;
    model: string;
    type: string;
    quantity: number;
    availableStock: number;
    unitPrice: number;
    totalPrice: number;
    rentedQuantity?: number;
    pendingQuantity?: number;
    expectedAvailabilityDate?: string;
}

const getEarliestExpectedAvailabilityDate = (request: PurchaseRequest): string | null => {
    if (!request.machines || request.machines.length === 0) return null;
    const unavailableMachines = request.machines.filter(machine => {
        const available = Math.min(machine.availableStock, machine.quantity - (machine.rentedQuantity || 0));
        const needed = machine.quantity - (machine.rentedQuantity || 0);
        return needed > available && machine.expectedAvailabilityDate;
    });
    if (unavailableMachines.length === 0) return null;
    const dates = unavailableMachines
        .map(m => m.expectedAvailabilityDate)
        .filter((date): date is string => !!date)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return dates.length > 0 ? dates[0] : null;
};

const columns: TableColumn[] = [
    { key: 'requestNumber', label: 'Request Number', sortable: true, filterable: true },
    { key: 'customerName', label: 'Customer', sortable: true, filterable: true },
    { key: 'customerType', label: 'Customer Type', sortable: true, filterable: true, render: (value: CustomerType) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span> },
    { key: 'requestDate', label: 'Request Date', sortable: true, filterable: false, render: (value: string) => new Date(value).toLocaleDateString('en-LK') },
    {
        key: 'requestedMachines', label: 'Machines', sortable: true, filterable: false,
        render: (value: number, row: PurchaseRequest) => {
            const totalRented = row.machines?.reduce((sum, m) => sum + (m.rentedQuantity || 0), 0) || 0;
            const totalPending = row.machines?.reduce((sum, m) => sum + (m.pendingQuantity || 0), 0) || 0;
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">{value}</span>
                    {totalRented > 0 && <span className="text-xs text-green-600 dark:text-green-400">{totalRented} rented</span>}
                    {totalPending > 0 && <span className="text-xs text-yellow-600 dark:text-yellow-400">{totalPending} pending</span>}
                </div>
            );
        },
    },
    { key: 'totalAmount', label: 'Total Amount', sortable: true, filterable: false, render: (value: number) => <span className="font-medium text-gray-900 dark:text-white">Rs. {value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
    {
        key: 'expectedAvailabilityDate', label: 'Expected Availability', sortable: true, filterable: false,
        render: (_: any, row: PurchaseRequest) => {
            const earliestDate = getEarliestExpectedAvailabilityDate(row);
            if (!earliestDate) return <span className="text-sm text-gray-400 dark:text-gray-500 italic">N/A</span>;
            const date = new Date(earliestDate);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const dateOnly = new Date(date); dateOnly.setHours(0, 0, 0, 0);
            const daysUntil = Math.ceil((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return (
                <div className="flex flex-col items-start">
                    <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">{date.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    {daysUntil > 0 && <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{daysUntil} day{daysUntil !== 1 ? 's' : ''} away</span>}
                    {daysUntil === 0 && <span className="text-xs text-green-600 dark:text-green-400 mt-0.5">Available today</span>}
                    {daysUntil < 0 && <span className="text-xs text-red-600 dark:text-red-400 mt-0.5">Overdue</span>}
                </div>
            );
        },
    },
    {
        key: 'status', label: 'Status', sortable: true, filterable: true,
        render: (value: PurchaseRequestStatus) => {
            const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
            if (value === 'Approved') return <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>Approved</span>;
            if (value === 'Completed') return <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>Completed</span>;
            if (value === 'Partially Fulfilled') return <span className={`${base} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`}>Partially Fulfilled</span>;
            if (value === 'Rejected') return <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>Rejected</span>;
            if (value === 'Cancelled') return <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>Cancelled</span>;
            return <span className={`${base} bg-yellow-100 text-yellow-700 dark:text-yellow-900/30 dark:text-yellow-300`}>Pending</span>;
        },
    },
];

const PurchaseOrderPage: React.FC = () => {
    const router = useRouter();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMachinesForRental, setSelectedMachinesForRental] = useState<Record<string, number>>({});
    const [modifiedUnitPrices, setModifiedUnitPrices] = useState<Record<string, number>>({});
    const [rentalStartDate, setRentalStartDate] = useState('');
    const [rentalEndDate, setRentalEndDate] = useState('');
    const [rentalFormErrors, setRentalFormErrors] = useState<Record<string, string>>({});
    const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchPurchaseOrders = useCallback(async () => {
        setFetchError(null);
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('needletech_access_token') : null;
            const params = new URLSearchParams({ page: '1', limit: '500', sortBy: 'requestDate', sortOrder: 'desc' });
            const response = await fetch(`${API_BASE_URL}/purchase-orders?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
            });
            const json = await response.json();
            if (!response.ok) {
                throw new Error(json?.message || 'Failed to fetch purchase orders');
            }
            const list = json?.data?.items ?? [];
            setPurchaseRequests(Array.isArray(list) ? list : []);
        } catch (err: any) {
            setFetchError(err?.message || 'Failed to load purchase orders');
            setPurchaseRequests([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPurchaseOrders();
    }, [fetchPurchaseOrders]);

    const hasAvailableMachinesForRental = (request: PurchaseRequest): boolean => {
        if (!request.machines || request.machines.length === 0) return false;
        return request.machines.some(m => {
            const available = Math.min(m.availableStock, m.quantity - (m.rentedQuantity || 0));
            return available > 0;
        });
    };

    const availableMachinesForRental = useMemo(() => {
        if (!selectedRequest) return [];
        return selectedRequest.machines?.map((machine) => {
            const available = Math.min(machine.availableStock, machine.quantity - (machine.rentedQuantity || 0));
            const pending = machine.quantity - (machine.rentedQuantity || 0) - available;
            const currentUnitPrice = modifiedUnitPrices[machine.id] ?? machine.unitPrice;
            return { ...machine, canRent: available, stillPending: pending, unitPrice: currentUnitPrice };
        }).filter(m => m.canRent > 0) || [];
    }, [selectedRequest, modifiedUnitPrices]);

    const handleMenuClick = () => setIsMobileSidebarOpen((prev) => !prev);
    const handleMobileSidebarClose = () => setIsMobileSidebarOpen(false);
    const handleLogout = () => console.log('Logout clicked');
    const handleCreatePurchaseRequest = () => router.push('/purchase-order/create');

    const handleViewRequest = (request: PurchaseRequest) => {
        setSelectedRequest(request);
        setIsViewModalOpen(true);
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedRequest(null);
    };

    const handlePrintPurchaseOrder = () => window.print();

    const handleCreateRentalAgreement = (request: PurchaseRequest) => {
        if (!hasAvailableMachinesForRental(request)) {
            alert('No machines available for rental from this purchase order. You can only create a rental agreement when at least one machine line has available stock.');
            return;
        }
        const poStart = request.startDate ? (typeof request.startDate === 'string' ? request.startDate : new Date(request.startDate).toISOString().split('T')[0]) : '';
        const poEnd = request.endDate ? (typeof request.endDate === 'string' ? request.endDate : new Date(request.endDate).toISOString().split('T')[0]) : '';
        if (!poStart || !poEnd) {
            alert('This purchase order has no rental period (start/end date). Please edit the purchase order to set the rental period before creating a hiring agreement.');
            return;
        }
        setSelectedRequest(request);
        setSelectedMachinesForRental({});
        setModifiedUnitPrices({});
        setRentalStartDate(poStart);
        setRentalEndDate(poEnd);
        setRentalFormErrors({});
        const availableMachines = request.machines?.map((machine) => {
            const available = Math.min(machine.availableStock, machine.quantity - (machine.rentedQuantity || 0));
            return { ...machine, canRent: available };
        }).filter(m => m.canRent > 0) || [];
        const initialSelection: Record<string, number> = {};
        availableMachines.forEach((machine) => { initialSelection[String(machine.id)] = machine.canRent; });
        setSelectedMachinesForRental(initialSelection);
        setIsRentalModalOpen(true);
    };

    const handleCloseRentalModal = () => {
        setIsRentalModalOpen(false);
        setSelectedRequest(null);
        setSelectedMachinesForRental({});
        setModifiedUnitPrices({});
        setRentalStartDate('');
        setRentalEndDate('');
        setRentalFormErrors({});
    };

    const handleUnitPriceChange = (machineId: string, newPrice: number) => {
        setModifiedUnitPrices(prev => ({ ...prev, [machineId]: Math.max(0, newPrice) }));
    };

    const validateRentalForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!rentalStartDate) errors.rentalStartDate = 'Start date is required';
        if (!rentalEndDate) errors.rentalEndDate = 'End date is required';
        if (rentalStartDate && rentalEndDate && new Date(rentalEndDate) <= new Date(rentalStartDate)) errors.rentalEndDate = 'End date must be after start date';
        const hasSelection = Object.values(selectedMachinesForRental).some(qty => qty > 0);
        if (!hasSelection) errors.machines = 'Please select at least one machine to rent';
        setRentalFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmitRentalAgreement = async () => {
        if (!validateRentalForm() || !selectedRequest) return;
        setIsSubmitting(true);
        try {
            const machinesToRent = availableMachinesForRental
                .filter(m => selectedMachinesForRental[m.id] > 0)
                .map(m => ({
                    machineId: m.id,
                    quantity: selectedMachinesForRental[m.id],
                    unitPrice: modifiedUnitPrices[m.id] ?? m.unitPrice,
                }));
            const payload = {
                purchaseRequestId: selectedRequest.id,
                rentalStartDate: rentalStartDate,
                rentalEndDate: rentalEndDate,
                machines: machinesToRent,
            };
            const token = typeof window !== 'undefined' ? localStorage.getItem('needletech_access_token') : null;
            const response = await fetch(`${API_BASE_URL}/rentals/from-purchase-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const json = await response.json();
            if (!response.ok) {
                const msg = json?.message || (json?.data ? Object.values(json.data).flat().join(' ') : '') || 'Failed to create rental agreement';
                throw new Error(msg);
            }
            alert(`Rental agreement created successfully. Agreement: ${json?.data?.agreementNo ?? 'N/A'}`);
            handleCloseRentalModal();
            fetchPurchaseOrders();
        } catch (error: any) {
            console.error('Error creating rental agreement:', error);
            alert(error?.message || 'Failed to create rental agreement. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const actions: ActionButton[] = [
        { label: '', icon: <Eye className="w-4 h-4" />, variant: 'secondary', onClick: handleViewRequest, tooltip: 'View Purchase Request', className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600' },
        { label: '', icon: <FileText className="w-4 h-4" />, variant: 'primary', onClick: (row: PurchaseRequest) => handleCreateRentalAgreement(row), tooltip: 'Create Hiring Machine Agreement (only when machines are available)', className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500', shouldShow: (row: PurchaseRequest) => hasAvailableMachinesForRental(row) },
    ];

    const renderStatusBadge = (status: PurchaseRequestStatus) => {
        const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
        if (status === 'Approved') return <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>Approved</span>;
        if (status === 'Completed') return <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>Completed</span>;
        if (status === 'Partially Fulfilled') return <span className={`${base} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`}>Partially Fulfilled</span>;
        if (status === 'Rejected') return <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>Rejected</span>;
        if (status === 'Cancelled') return <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>Cancelled</span>;
        return <span className={`${base} bg-yellow-100 text-yellow-700 dark:text-yellow-900/30 dark:text-yellow-300`}>Pending</span>;
    };

    const renderRequestDetails = () => {
        if (!selectedRequest) return null;
        return (
            <div className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer</label>
                            <div className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white">{selectedRequest.customerName}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Type</label>
                            <div className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white">{selectedRequest.customerType}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Request Date</label>
                            <div className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50 text-gray-900 dark:text-white">{new Date(selectedRequest.requestDate).toLocaleDateString('en-LK')}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <div className="pt-1">{renderStatusBadge(selectedRequest.status)}</div>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Machine Details</h3>
                    {selectedRequest.machines?.map((machine, index) => {
                        const available = Math.min(machine.availableStock, machine.quantity - (machine.rentedQuantity || 0));
                        const rented = machine.rentedQuantity || 0;
                        const pending = machine.pendingQuantity || 0;
                        const isUnavailable = (machine.quantity - rented) > available;
                        return (
                            <div key={machine.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Machine {index + 1}</span>
                                    {machine.brand && machine.model && (
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${available > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>Available: {available}</div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Brand</label><div className="text-sm text-gray-900 dark:text-white">{machine.brand}</div></div>
                                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Model</label><div className="text-sm text-gray-900 dark:text-white">{machine.model}</div></div>
                                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label><div className="text-sm text-gray-900 dark:text-white">{machine.type}</div></div>
                                    <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label><div className="text-sm text-gray-900 dark:text-white">{machine.quantity}</div></div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span>Unit Price: Rs. {machine.unitPrice.toLocaleString('en-LK')}</span>
                                    <span>Sub Total: Rs. {machine.totalPrice.toLocaleString('en-LK')} ({machine.unitPrice.toLocaleString('en-LK')} × {machine.quantity})</span>
                                    {rented > 0 && <span className="flex items-center text-green-600 dark:text-green-400"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Rented: {rented}</span>}
                                    {pending > 0 && <span className="flex items-center text-yellow-600 dark:text-yellow-400"><Clock className="w-3.5 h-3.5 mr-1" /> Pending: {pending}</span>}
                                    {isUnavailable && machine.expectedAvailabilityDate && <span className="flex items-center text-orange-600 dark:text-orange-400"><Calendar className="w-3.5 h-3.5 mr-1" />Expected: {new Date(machine.expectedAvailabilityDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Pricing Summary</h3>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">Rs. {selectedRequest.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
                {selectedRequest.rentalAgreementIds && selectedRequest.rentalAgreementIds.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Associated Rental Agreements</h4>
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                            {selectedRequest.rentalAgreementIds.map((id, idx) => (
                                <span key={id}>RA-2024-{String(id).padStart(3, '0')}{idx < selectedRequest.rentalAgreementIds!.length - 1 ? ', ' : ''}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    /** Printable purchase order in letterhead (used when user clicks Print in view modal). */
    const renderPurchaseOrderDocument = (request: PurchaseRequest) => (
        <div className="bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col print:p-8">
            <LetterheadDocument documentTitle="QUOTATION" footerStyle="simple" className="print:p-0 flex flex-col flex-1">
                <div className="text-center mb-4">
                    <p className="text-lg font-bold text-gray-900">{request.requestNumber}</p>
                </div>
                <div className="mb-4 space-y-2 text-sm">
                    <div><span className="font-semibold text-gray-700">Customer:</span> <span className="text-gray-900">{request.customerName}</span></div>
                    <div><span className="font-semibold text-gray-700">Customer Type:</span> <span className="text-gray-900">{request.customerType}</span></div>
                    <div><span className="font-semibold text-gray-700">Request Date:</span> <span className="text-gray-900">{new Date(request.requestDate).toLocaleDateString('en-LK')}</span></div>
                    <div><span className="font-semibold text-gray-700">Status:</span> <span className="text-gray-900">{request.status}</span></div>
                </div>
                <div className="mb-4 flex-1">
                    <table className="w-full border-collapse border border-gray-800">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-800 px-4 py-2 text-left text-sm font-semibold">Brand</th>
                                <th className="border border-gray-800 px-4 py-2 text-left text-sm font-semibold">Model</th>
                                <th className="border border-gray-800 px-4 py-2 text-left text-sm font-semibold">Type</th>
                                <th className="border border-gray-800 px-4 py-2 text-center text-sm font-semibold">Quantity</th>
                                <th className="border border-gray-800 px-4 py-2 text-right text-sm font-semibold">Unit Price (Rs.)</th>
                                <th className="border border-gray-800 px-4 py-2 text-right text-sm font-semibold">Total (Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {request.machines?.map((m, i) => (
                                <tr key={i}>
                                    <td className="border border-gray-800 px-4 py-2 text-sm">{m.brand}</td>
                                    <td className="border border-gray-800 px-4 py-2 text-sm">{m.model}</td>
                                    <td className="border border-gray-800 px-4 py-2 text-sm">{m.type}</td>
                                    <td className="border border-gray-800 px-4 py-2 text-sm text-center">{m.quantity}</td>
                                    <td className="border border-gray-800 px-4 py-2 text-sm text-right">{m.unitPrice.toLocaleString('en-LK')}</td>
                                    <td className="border border-gray-800 px-4 py-2 text-sm text-right">{m.totalPrice.toLocaleString('en-LK')}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold">
                                <td colSpan={5} className="border border-gray-800 px-4 py-2 text-right text-sm">Total Amount:</td>
                                <td className="border border-gray-800 px-4 py-2 text-right text-sm">Rs. {request.totalAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {request.rentalAgreementIds && request.rentalAgreementIds.length > 0 && (
                    <div className="border-t border-gray-300 pt-4 mt-4">
                        <div className="text-sm font-semibold text-gray-700 mb-1">Associated Rental Agreements</div>
                        <div className="text-sm text-gray-900">{request.rentalAgreementIds.map(id => `RA-2024-${String(id).padStart(3, '0')}`).join(', ')}</div>
                    </div>
                )}
            </LetterheadDocument>
        </div>
    );

    const renderViewModalContent = () => {
        if (!selectedRequest) return null;
        return (
            <div className="print:hidden">
                <div className="space-y-6">{renderRequestDetails()}</div>
            </div>
        );
    };

    return (
        <>
            {/* Print-only: purchase order in letterhead (shown when user clicks Print in view modal) */}
            {selectedRequest && (
                <div className="hidden print:block print:fixed print:inset-0 print:z-[9999] print:bg-white print:p-0 print:m-0">
                    {renderPurchaseOrderDocument(selectedRequest)}
                </div>
            )}
            <div className="min-h-screen bg-gray-100 dark:bg-slate-950 print:hidden">
                <Navbar onMenuClick={handleMenuClick} />
                <Sidebar onLogout={handleLogout} isMobileOpen={isMobileSidebarOpen} onMobileClose={handleMobileSidebarClose} onExpandedChange={setIsSidebarExpanded} />
                <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'}`}>
                    <div className="max-w-7xl mx-auto space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Purchase Orders</h2>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage purchase requests from customers for sewing machines and related tools. Create rental agreements for available machines.</p>
                            </div>
                        </div>
                        {fetchError && (
                            <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                                {fetchError}
                            </div>
                        )}
                        <Table data={purchaseRequests} columns={columns} actions={actions} itemsPerPage={10} searchable filterable loading={loading} onCreateClick={handleCreatePurchaseRequest} createButtonLabel="Create Purchase Order" emptyMessage="No purchase requests found." />
                    </div>
                </main>

                {isViewModalOpen && selectedRequest && (
                    <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4 print:hidden">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Purchase Order Details</h2>
                                    {/* <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selectedRequest.requestNumber}</p> */}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Tooltip content="Print">
                                        <button onClick={handlePrintPurchaseOrder} className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center space-x-2"><Printer className="w-4 h-4" /><span>Print</span></button>
                                    </Tooltip>
                                    {(selectedRequest.status === 'Pending' || selectedRequest.status === 'Approved' || selectedRequest.status === 'Partially Fulfilled') && availableMachinesForRental.length > 0 && (
                                        <Tooltip content="Create Rental Agreement">
                                            <button onClick={() => handleCreateRentalAgreement(selectedRequest)} className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-800 flex items-center space-x-2"><FileText className="w-4 h-4" /><span>Create Rental</span></button>
                                        </Tooltip>
                                    )}
                                    <Tooltip content="Close">
                                        <button onClick={handleCloseViewModal} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"><X className="w-5 h-5" /></button>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">{renderViewModalContent()}</div>
                        </div>
                    </div>
                )}

                {/* Create Rental Agreement Modal - simplified Select Machines UI (single row: Unit Price + Qty + Subtotal) */}
                {isRentalModalOpen && selectedRequest && (
                    <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Hiring Machine Agreement</h2>
                                    
                                </div>
                                <Tooltip content="Close">
                                    <button onClick={handleCloseRentalModal} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"><X className="w-5 h-5" /></button>
                                </Tooltip>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-6">
                                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Customer : {selectedRequest.customerName}</h3>
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Purchase Request : {selectedRequest.requestNumber}</h3>
                                        
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rental Period</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Fetched from the purchase order; cannot be changed.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                                                <div className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700/80 text-gray-700 dark:text-gray-300 cursor-not-allowed">
                                                    {rentalStartDate ? new Date(rentalStartDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                                                <div className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-700/80 text-gray-700 dark:text-gray-300 cursor-not-allowed">
                                                    {rentalEndDate ? new Date(rentalEndDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Machines to Rent</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Choose quantity for each machine. You can adjust the unit price if needed.</p>
                                        {availableMachinesForRental.length === 0 ? (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                                                <p className="text-sm text-yellow-800 dark:text-yellow-200">No machines available for rental from this purchase request.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {availableMachinesForRental.map((machine) => {
                                                    const currentPrice = modifiedUnitPrices[machine.id] ?? machine.unitPrice;
                                                    const originalPrice = selectedRequest.machines?.find(m => m.id === machine.id)?.unitPrice ?? machine.unitPrice;
                                                    const isPriceModified = modifiedUnitPrices[machine.id] !== undefined && modifiedUnitPrices[machine.id] !== originalPrice;
                                                    const qty = selectedMachinesForRental[machine.id] || 0;
                                                    const subtotal = currentPrice * qty;
                                                    return (
                                                        <div key={machine.id} className="bg-white dark:bg-slate-700/80 rounded-xl border border-gray-200 dark:border-slate-600 p-4 shadow-sm hover:shadow-md transition-shadow">
                                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                                <div className="min-w-0 flex-1">
                                                                    <h4 className="font-medium text-gray-900 dark:text-white truncate">{machine.brand} {machine.model} <span className="text-gray-500 dark:text-gray-400 font-normal">({machine.type})</span></h4>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Available: {machine.canRent}</span>
                                                                        {machine.stillPending > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{machine.stillPending} pending</span>}
                                                                        {isPriceModified && <span className="text-xs text-blue-600 dark:text-blue-400">Original: Rs. {originalPrice.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Rs.</span>
                                                                        <input type="number" min="0" step="0.01" value={currentPrice} onChange={(e) => handleUnitPriceChange(machine.id, parseFloat(e.target.value) || 0)} className="w-24 sm:w-28 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500" />
                                                                        {isPriceModified && (
                                                                            <Tooltip content="Reset to original price">
                                                                                <button type="button" onClick={() => setModifiedUnitPrices(prev => { const u = { ...prev }; delete u[machine.id]; return u; })} className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">Reset</button>
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Qty</span>
                                                                        <input type="number" min="0" max={machine.canRent} value={qty} onChange={(e) => { const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, machine.canRent)); setSelectedMachinesForRental({ ...selectedMachinesForRental, [machine.id]: val }); }} className="w-16 sm:w-20 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500" />
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">/ {machine.canRent}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 sm:min-w-[120px]">
                                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">=</span>
                                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {rentalFormErrors.machines && <p className="text-sm text-red-500">{rentalFormErrors.machines}</p>}
                                    </div>
                                    {Object.values(selectedMachinesForRental).some(qty => qty > 0) && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Rental Summary</h3>
                                            <div className="space-y-2 text-sm">
                                                {availableMachinesForRental.filter(m => selectedMachinesForRental[m.id] > 0).map((machine) => {
                                                    const finalPrice = modifiedUnitPrices[machine.id] ?? machine.unitPrice;
                                                    const quantity = selectedMachinesForRental[machine.id];
                                                    const subtotal = finalPrice * quantity;
                                                    return (
                                                        <div key={machine.id} className="flex justify-between">
                                                            <span className="text-gray-600 dark:text-gray-400">{machine.brand} {machine.model} × {quantity}</span>
                                                            <span className="font-medium text-gray-900 dark:text-white">Rs. {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    );
                                                })}
                                                <div className="border-t border-blue-200 dark:border-blue-800 pt-2 mt-2 flex justify-between">
                                                    <span className="font-semibold text-gray-900 dark:text-white">Total Monthly Rent:</span>
                                                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">Rs. {availableMachinesForRental.reduce((sum, m) => sum + ((modifiedUnitPrices[m.id] ?? m.unitPrice) * (selectedMachinesForRental[m.id] || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
                                <Tooltip content="Cancel">
                                    <button type="button" onClick={handleCloseRentalModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                                </Tooltip>
                                <Tooltip content="Create Rental Agreement">
                                    <button type="button" onClick={handleSubmitRentalAgreement} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Creating...' : 'Create Rental Agreement'}</button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PurchaseOrderPage;