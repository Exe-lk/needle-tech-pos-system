'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  FileSpreadsheet,
  X,
  Users,
  FileCheck,
  Bell,
  Truck,
  Award,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Tooltip from '@/src/components/common/tooltip';
import { authFetch } from '@/lib/auth-client';

const API_BASE = '/api/v1';

/** Month-end analytics API response (data payload) */
interface MonthEndAnalyticsPayload {
  period: { startDate: string; endDate: string };
  rentals: { total: number; active: number };
  revenue: { total: number; vat: number; nonVat: number; paymentsReceived: number };
  machines: { total: number; rented: number; utilizationRate: number };
  financials: { totalOutstanding: number; totalPayments: number };
  operations: { totalReturns: number; totalDamages: number };
}

// Data Types
interface MonthlyRevenue {
  month: string;
  monthNumber: number;
  vatRevenue: number;
  nonVatRevenue: number;
  totalRevenue: number;
}

interface MachineUtilization {
  model: string;
  brand: string;
  totalRentals: number;
  totalDaysRented: number;
  utilizationRate: number; // percentage
  revenue: number;
}

interface DamageFrequency {
  model: string;
  brand: string;
  totalDamages: number;
  repairCost: number;
  damageRate: number; // damages per 100 rentals
}

interface IdleMachine {
  id: number;
  barcode: string;
  serialNumber: string;
  brand: string;
  model: string;
  type: string;
  status: 'Available' | 'Maintenance' | 'Retired';
  daysIdle: number;
  lastRentalDate: string | null;
}

// Mock Data - In production, this would come from API
const mockMonthlyRevenue: MonthlyRevenue[] = [
  { month: 'Jan 2024', monthNumber: 1, vatRevenue: 450000, nonVatRevenue: 120000, totalRevenue: 570000 },
  { month: 'Feb 2024', monthNumber: 2, vatRevenue: 520000, nonVatRevenue: 150000, totalRevenue: 670000 },
  { month: 'Mar 2024', monthNumber: 3, vatRevenue: 480000, nonVatRevenue: 180000, totalRevenue: 660000 },
  { month: 'Apr 2024', monthNumber: 4, vatRevenue: 550000, nonVatRevenue: 200000, totalRevenue: 750000 },
  { month: 'May 2024', monthNumber: 5, vatRevenue: 600000, nonVatRevenue: 220000, totalRevenue: 820000 },
  { month: 'Jun 2024', monthNumber: 6, vatRevenue: 580000, nonVatRevenue: 190000, totalRevenue: 770000 },
];

const mockMachineUtilization: MachineUtilization[] = [
  { model: 'XL2600i', brand: 'Brother', totalRentals: 45, totalDaysRented: 320, utilizationRate: 85.2, revenue: 160000 },
  { model: 'Heavy Duty 4423', brand: 'Singer', totalRentals: 38, totalDaysRented: 280, utilizationRate: 78.5, revenue: 224000 },
  { model: 'HD3000', brand: 'Janome', totalRentals: 42, totalDaysRented: 295, utilizationRate: 82.1, revenue: 88500 },
  { model: 'SE600', brand: 'Brother', totalRentals: 35, totalDaysRented: 245, utilizationRate: 68.3, revenue: 122500 },
  { model: 'MO-654DE', brand: 'Juki', totalRentals: 30, totalDaysRented: 210, utilizationRate: 58.6, revenue: 105000 },
];

const mockDamageFrequency: DamageFrequency[] = [
  { model: 'XL2600i', brand: 'Brother', totalDamages: 8, repairCost: 40000, damageRate: 17.8 },
  { model: 'Heavy Duty 4423', brand: 'Singer', totalDamages: 12, repairCost: 75000, damageRate: 31.6 },
  { model: 'HD3000', brand: 'Janome', totalDamages: 5, repairCost: 25000, damageRate: 11.9 },
  { model: 'SE600', brand: 'Brother', totalDamages: 6, repairCost: 30000, damageRate: 17.1 },
  { model: 'MO-654DE', brand: 'Juki', totalDamages: 4, repairCost: 20000, damageRate: 13.3 },
  { model: 'CS6000i', brand: 'Brother', totalDamages: 3, repairCost: 15000, damageRate: 10.0 },
  { model: 'MB-4S', brand: 'Janome', totalDamages: 7, repairCost: 35000, damageRate: 20.0 },
];

const mockIdleMachines: IdleMachine[] = [
  { id: 1, barcode: 'BROTHER-XL2600I-SN-2024-001', serialNumber: 'SN-2024-001', brand: 'Brother', model: 'XL2600i', type: 'Domestic', status: 'Available', daysIdle: 15, lastRentalDate: '2024-05-01' },
  { id: 2, barcode: 'JANOME-HD3000-SN-2024-003', serialNumber: 'SN-2024-003', brand: 'Janome', model: 'HD3000', type: 'Domestic', status: 'Available', daysIdle: 28, lastRentalDate: '2024-04-15' },
  { id: 3, barcode: 'BROTHER-CS6000I-SN-2024-007', serialNumber: 'SN-2024-007', brand: 'Brother', model: 'CS6000i', type: 'Domestic', status: 'Available', daysIdle: 45, lastRentalDate: '2024-03-20' },
  { id: 4, barcode: 'SINGER-BUTTONHOLE-160-SN-2024-006', serialNumber: 'SN-2024-006', brand: 'Singer', model: 'Buttonhole 160', type: 'Buttonhole', status: 'Maintenance', daysIdle: 60, lastRentalDate: '2024-02-25' },
  { id: 5, barcode: 'JANOME-MB-4S-SN-2024-008', serialNumber: 'SN-2024-008', brand: 'Janome', model: 'MB-4S', type: 'Industrial', status: 'Available', daysIdle: 90, lastRentalDate: '2024-01-10' },
];

// Additional analytics types (dummy data for UI)
interface RentalStatusItem {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface RevenueByBrandItem {
  brand: string;
  revenue: number;
  percentage: number;
  color: string;
}

interface OutstandingAgingItem {
  bucket: string;
  amount: number;
  count: number;
  color: string;
}

interface AlertByTypeItem {
  type: string;
  count: number;
  severity: string;
  color: string;
}

interface GatepassVolumeItem {
  entry: 'IN' | 'OUT';
  count: number;
  label: string;
}

const mockRentalStatusDistribution: RentalStatusItem[] = [
  { status: 'Active', count: 42, percentage: 58, color: 'rgb(34, 197, 94)' },
  { status: 'Completed', count: 24, percentage: 33, color: 'rgb(59, 130, 246)' },
  { status: 'Pending', count: 4, percentage: 6, color: 'rgb(234, 179, 8)' },
  { status: 'Cancelled', count: 2, percentage: 3, color: 'rgb(148, 163, 184)' },
];

const mockRevenueByBrand: RevenueByBrandItem[] = [
  { brand: 'Brother', revenue: 1250000, percentage: 32, color: 'rgb(59, 130, 246)' },
  { brand: 'Singer', revenue: 980000, percentage: 25, color: 'rgb(168, 85, 247)' },
  { brand: 'Janome', revenue: 850000, percentage: 22, color: 'rgb(236, 72, 153)' },
  { brand: 'Juki', revenue: 520000, percentage: 13, color: 'rgb(249, 115, 22)' },
  { brand: 'Others', revenue: 320000, percentage: 8, color: 'rgb(100, 116, 139)' },
];

const mockOutstandingAging: OutstandingAgingItem[] = [
  { bucket: '0-30 days', amount: 450000, count: 12, color: 'rgb(34, 197, 94)' },
  { bucket: '31-60 days', amount: 280000, count: 5, color: 'rgb(234, 179, 8)' },
  { bucket: '61+ days', amount: 180000, count: 3, color: 'rgb(239, 68, 68)' },
];

const mockAlertsByType: AlertByTypeItem[] = [
  { type: 'Payment Overdue', count: 8, severity: 'High', color: 'rgb(239, 68, 68)' },
  { type: 'High Balance', count: 5, severity: 'Medium', color: 'rgb(249, 115, 22)' },
  { type: 'Agreement Expiring', count: 12, severity: 'Low', color: 'rgb(234, 179, 8)' },
  { type: 'Credit Limit Exceeded', count: 2, severity: 'Critical', color: 'rgb(127, 29, 29)' },
];

const mockGatepassVolume: GatepassVolumeItem[] = [
  { entry: 'OUT', count: 156, label: 'Outbound' },
  { entry: 'IN', count: 142, label: 'Inbound' },
];

const MOCK_ALERTS_COUNT = 27;
const MOCK_TOP_BRAND = 'Brother';
const MOCK_TOP_BRAND_REVENUE = 1250000;

/** Get list of { year, month } for the selected period (oldest first for charts) */
function getMonthsForPeriod(period: '6M' | '12M' | 'YTD'): { year: number; month: number }[] {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1; // 1-indexed
  let count = 6;
  if (period === '12M') count = 12;
  else if (period === 'YTD') count = endMonth;
  const out: { year: number; month: number }[] = [];
  for (let i = 0; i < count; i++) {
    const monthsAgo = count - 1 - i;
    const d = new Date(endYear, endMonth - 1 - monthsAgo, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
}

/** Fetch month-end analytics for a given year and month (uses authFetch for token refresh on 401) */
async function fetchMonthEndAnalytics(
  year: number,
  month: number
): Promise<MonthEndAnalyticsPayload | null> {
  try {
    const res = await authFetch(
      `${API_BASE}/analytics/month-end?year=${year}&month=${month}`,
      { method: 'GET', credentials: 'include' }
    );
    const json = await res.json();
    if (!res.ok || json?.status !== 'success') return null;
    return json?.data ?? null;
  } catch {
    return null;
  }
}

const AnalyticsPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'6M' | '12M' | 'YTD'>('6M');
  const [isExporting, setIsExporting] = useState(false);
  const [detailPopup, setDetailPopup] = useState<{ title: string; content: React.ReactNode } | null>(null);

  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [apiMonthlyRevenue, setApiMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [latestAnalytics, setLatestAnalytics] = useState<MonthEndAnalyticsPayload | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsError(null);
    setAnalyticsLoading(true);
    const months = getMonthsForPeriod(selectedPeriod);
    try {
      const results = await Promise.all(
        months.map(({ year, month }) => fetchMonthEndAnalytics(year, month))
      );
      const valid = results.filter((r): r is MonthEndAnalyticsPayload => r != null);
      if (valid.length === 0) {
        setAnalyticsError('Could not load analytics. Please try again.');
        setApiMonthlyRevenue([]);
        setLatestAnalytics(null);
      } else {
        const revenueList: MonthlyRevenue[] = valid.map((a, i) => {
          const start = new Date(a.period.startDate);
          const monthLabel = start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
          return {
            month: monthLabel,
            monthNumber: start.getMonth() + 1,
            vatRevenue: a.revenue.vat,
            nonVatRevenue: a.revenue.nonVat,
            totalRevenue: a.revenue.total,
          };
        });
        setApiMonthlyRevenue(revenueList);
        setLatestAnalytics(valid[valid.length - 1] ?? null);
      }
    } catch {
      setAnalyticsError('Failed to load analytics.');
      setApiMonthlyRevenue([]);
      setLatestAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  // Detail popup modal (full details on card click)
  const DetailModal: React.FC<{
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }> = ({ title, children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 text-sm text-gray-700 dark:text-gray-300">{children}</div>
      </div>
    </div>
  );

  // Use API data when available, otherwise fall back to mock for charts that need model-level data
  const monthlyRevenueForCharts = apiMonthlyRevenue.length > 0 ? apiMonthlyRevenue : mockMonthlyRevenue;

  // Calculate summary statistics from API when available
  const summaryStats = useMemo(() => {
    const source = apiMonthlyRevenue.length > 0 ? apiMonthlyRevenue : mockMonthlyRevenue;
    const currentMonth = source[source.length - 1];
    const previousMonth = source[source.length - 2];

    const totalRevenue = source.reduce((sum, m) => sum + m.totalRevenue, 0);
    const avgMonthlyRevenue = source.length > 0 ? totalRevenue / source.length : 0;
    const revenueGrowth = previousMonth && currentMonth
      ? ((currentMonth.totalRevenue - previousMonth.totalRevenue) / (previousMonth.totalRevenue || 1)) * 100
      : 0;

    const totalVatRevenue = source.reduce((sum, m) => sum + m.vatRevenue, 0);
    const totalNonVatRevenue = source.reduce((sum, m) => sum + m.nonVatRevenue, 0);
    const vatPercentage = totalRevenue > 0 ? (totalVatRevenue / totalRevenue) * 100 : 0;

    const totalMachines = latestAnalytics?.machines?.total ?? 50;
    const utilizationRate = latestAnalytics?.machines?.utilizationRate ?? (totalMachines > 0 ? ((totalMachines - mockIdleMachines.length) / totalMachines) * 100 : 0);
    const idleMachines = latestAnalytics ? (totalMachines - (latestAnalytics.machines?.rented ?? 0)) : mockIdleMachines.length;

    const totalDamages = latestAnalytics?.operations?.totalDamages ?? mockDamageFrequency.reduce((sum, d) => sum + d.totalDamages, 0);
    const totalRepairCost = mockDamageFrequency.reduce((sum, d) => sum + d.repairCost, 0); // API does not return repair cost; keep mock for display

    return {
      totalRevenue,
      avgMonthlyRevenue,
      revenueGrowth,
      totalVatRevenue,
      totalNonVatRevenue,
      vatPercentage,
      utilizationRate,
      totalDamages,
      totalRepairCost,
      idleMachines,
    };
  }, [apiMonthlyRevenue, latestAnalytics]);

  // Find max values for chart scaling
  const maxRevenue = Math.max(1, ...monthlyRevenueForCharts.map(m => m.totalRevenue));
  const maxUtilization = Math.max(...mockMachineUtilization.map(m => m.utilizationRate));
  const maxDamageRate = Math.max(...mockDamageFrequency.map(d => d.damageRate));

  const activeRentals = latestAnalytics?.rentals?.active ?? 42;
  const outstandingAmount = latestAnalytics?.financials?.totalOutstanding ?? 910000;
  const newAgreementsThisMonth = latestAnalytics?.rentals?.total ?? 8;

  // Export to PDF
  const handleExportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
      };

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Analytics Dashboard Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-LK')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Summary Statistics
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Statistics', 14, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Revenue', `Rs. ${(summaryStats.totalRevenue / 1000000).toFixed(2)}M`],
        ['Average Monthly Revenue', `Rs. ${(summaryStats.avgMonthlyRevenue / 1000).toFixed(0)}k`],
        ['Revenue Growth', `${summaryStats.revenueGrowth.toFixed(1)}%`],
        ['Machine Utilization', `${summaryStats.utilizationRate.toFixed(1)}%`],
        ['Total Damages', summaryStats.totalDamages.toString()],
        ['Total Repair Cost', `Rs. ${(summaryStats.totalRepairCost / 1000).toFixed(0)}k`],
        ['VAT Revenue', `Rs. ${(summaryStats.totalVatRevenue / 1000000).toFixed(2)}M`],
        ['Non-VAT Revenue', `Rs. ${(summaryStats.totalNonVatRevenue / 1000000).toFixed(2)}M`],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Monthly Revenue
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Revenue (VAT vs Non-VAT)', 14, yPosition);
      yPosition += 8;

      const revenueData = monthlyRevenueForCharts.map(item => [
        item.month,
        `Rs. ${item.vatRevenue.toLocaleString('en-LK')}`,
        `Rs. ${item.nonVatRevenue.toLocaleString('en-LK')}`,
        `Rs. ${item.totalRevenue.toLocaleString('en-LK')}`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Month', 'VAT Revenue', 'Non-VAT Revenue', 'Total Revenue']],
        body: revenueData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Top 5 Machine Models by Utilization
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 Machine Models by Utilization', 14, yPosition);
      yPosition += 8;

      const utilizationData = mockMachineUtilization.map(item => [
        `${item.brand} ${item.model}`,
        item.totalRentals.toString(),
        item.totalDaysRented.toString(),
        `${item.utilizationRate.toFixed(1)}%`,
        `Rs. ${item.revenue.toLocaleString('en-LK')}`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Machine Model', 'Total Rentals', 'Days Rented', 'Utilization Rate', 'Revenue']],
        body: utilizationData,
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Damage Frequency by Model
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Damage Frequency by Model', 14, yPosition);
      yPosition += 8;

      const damageData = mockDamageFrequency.map(item => [
        `${item.brand} ${item.model}`,
        item.totalDamages.toString(),
        `${item.damageRate.toFixed(1)}%`,
        `Rs. ${item.repairCost.toLocaleString('en-LK')}`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Machine Model', 'Total Damages', 'Damage Rate', 'Repair Cost']],
        body: damageData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Idle Machines Report
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Idle Machines Report', 14, yPosition);
      yPosition += 8;

      const idleData = mockIdleMachines.map(item => [
        `${item.brand} ${item.model}`,
        item.serialNumber,
        item.type,
        item.status,
        item.daysIdle.toString(),
        item.lastRentalDate ? new Date(item.lastRentalDate).toLocaleDateString('en-LK') : 'Never',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Machine Model', 'Serial Number', 'Type', 'Status', 'Days Idle', 'Last Rental']],
        body: idleData,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });

      // Save the PDF
      const fileName = `Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel
  const handleExportToExcel = () => {
    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();

      // Summary Statistics Sheet
      const summaryData = [
        ['Analytics Dashboard - Summary Statistics'],
        ['Generated on:', new Date().toLocaleDateString('en-LK')],
        [],
        ['Metric', 'Value'],
        ['Total Revenue', summaryStats.totalRevenue],
        ['Average Monthly Revenue', summaryStats.avgMonthlyRevenue],
        ['Revenue Growth (%)', summaryStats.revenueGrowth],
        ['Machine Utilization (%)', summaryStats.utilizationRate],
        ['Total Damages', summaryStats.totalDamages],
        ['Total Repair Cost', summaryStats.totalRepairCost],
        ['VAT Revenue', summaryStats.totalVatRevenue],
        ['Non-VAT Revenue', summaryStats.totalNonVatRevenue],
        ['VAT Percentage (%)', summaryStats.vatPercentage],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Monthly Revenue Sheet
      const revenueData = [
        ['Month', 'VAT Revenue', 'Non-VAT Revenue', 'Total Revenue'],
        ...monthlyRevenueForCharts.map(item => [
          item.month,
          item.vatRevenue,
          item.nonVatRevenue,
          item.totalRevenue,
        ]),
      ];

      const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Monthly Revenue');

      // Machine Utilization Sheet
      const utilizationData = [
        ['Brand', 'Model', 'Total Rentals', 'Days Rented', 'Utilization Rate (%)', 'Revenue'],
        ...mockMachineUtilization.map(item => [
          item.brand,
          item.model,
          item.totalRentals,
          item.totalDaysRented,
          item.utilizationRate,
          item.revenue,
        ]),
      ];

      const utilizationSheet = XLSX.utils.aoa_to_sheet(utilizationData);
      XLSX.utils.book_append_sheet(workbook, utilizationSheet, 'Machine Utilization');

      // Damage Frequency Sheet
      const damageData = [
        ['Brand', 'Model', 'Total Damages', 'Damage Rate (%)', 'Repair Cost'],
        ...mockDamageFrequency.map(item => [
          item.brand,
          item.model,
          item.totalDamages,
          item.damageRate,
          item.repairCost,
        ]),
      ];

      const damageSheet = XLSX.utils.aoa_to_sheet(damageData);
      XLSX.utils.book_append_sheet(workbook, damageSheet, 'Damage Frequency');

      // Idle Machines Sheet
      const idleData = [
        ['Brand', 'Model', 'Serial Number', 'Type', 'Status', 'Days Idle', 'Last Rental Date'],
        ...mockIdleMachines.map(item => [
          item.brand,
          item.model,
          item.serialNumber,
          item.type,
          item.status,
          item.daysIdle,
          item.lastRentalDate || 'Never',
        ]),
      ];

      const idleSheet = XLSX.utils.aoa_to_sheet(idleData);
      XLSX.utils.book_append_sheet(workbook, idleSheet, 'Idle Machines');

      // Save the Excel file
      const fileName = `Analytics_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Bar Chart Component
  const BarChart: React.FC<{ data: MonthlyRevenue[] }> = ({ data }) => {
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>{item.month}</span>
              <span className="font-medium text-gray-900 dark:text-white">
                Rs. {item.totalRevenue.toLocaleString('en-LK')}
              </span>
            </div>
            <div className="flex gap-1 h-8">
              {/* VAT Bar */}
              <div
                className="bg-blue-600 dark:bg-blue-500 rounded-l flex items-center justify-end pr-2 transition-all duration-300 hover:opacity-90"
                style={{ width: `${(item.vatRevenue / maxRevenue) * 100}%` }}
                title={`VAT: Rs. ${item.vatRevenue.toLocaleString('en-LK')}`}
              >
                {item.vatRevenue / maxRevenue > 0.15 && (
                  <span className="text-xs font-medium text-white">
                    Rs. {(item.vatRevenue / 1000).toFixed(0)}k
                  </span>
                )}
              </div>
              {/* Non-VAT Bar */}
              <div
                className="bg-green-600 dark:bg-green-500 rounded-r flex items-center justify-end pr-2 transition-all duration-300 hover:opacity-90"
                style={{ width: `${(item.nonVatRevenue / maxRevenue) * 100}%` }}
                title={`Non-VAT: Rs. ${item.nonVatRevenue.toLocaleString('en-LK')}`}
              >
                {item.nonVatRevenue / maxRevenue > 0.15 && (
                  <span className="text-xs font-medium text-white">
                    Rs. {(item.nonVatRevenue / 1000).toFixed(0)}k
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 dark:bg-blue-500 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">VAT Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 dark:bg-green-500 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Non-VAT Revenue</span>
          </div>
        </div>
      </div>
    );
  };

  // Utilization Bar Chart
  const UtilizationBarChart: React.FC<{ data: MachineUtilization[] }> = ({ data }) => {
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-900 dark:text-white">
                {item.brand} {item.model}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {item.utilizationRate.toFixed(1)}%
                </span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {item.totalRentals} rentals
                </span>
              </div>
            </div>
            <div className="relative h-6 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${item.utilizationRate}%` }}
              >
                {item.utilizationRate > 20 && (
                  <span className="text-xs font-medium text-white">
                    {item.utilizationRate.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {item.totalDaysRented} days rented • Rs. {item.revenue.toLocaleString('en-LK')} revenue
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Damage Frequency Chart
  const DamageFrequencyChart: React.FC<{ data: DamageFrequency[] }> = ({ data }) => {
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-900 dark:text-white">
                {item.brand} {item.model}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {item.totalDamages} damages
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {item.damageRate.toFixed(1)}% rate
                </span>
              </div>
            </div>
            <div className="relative h-6 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 to-orange-600 dark:from-red-600 dark:to-orange-700 transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${(item.damageRate / maxDamageRate) * 100}%` }}
              >
                {item.damageRate / maxDamageRate > 0.15 && (
                  <span className="text-xs font-medium text-white">
                    {item.damageRate.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Repair cost: Rs. {item.repairCost.toLocaleString('en-LK')}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Revenue trend line chart (SVG)
  const RevenueLineChart: React.FC<{ data: MonthlyRevenue[] }> = ({ data }) => {
    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map((d) => d.totalRevenue));
    const minVal = Math.min(...data.map((d) => d.totalRevenue));
    const scaleY = (v: number) => padding.top + innerHeight - ((v - minVal) / (maxVal - minVal || 1)) * innerHeight;
    const scaleX = (i: number) => padding.left + (i / (data.length - 1 || 1)) * innerWidth;
    const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.totalRevenue)}`).join(' ');
    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 min-h-[180px]" preserveAspectRatio="xMidYMid meet">
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="currentColor" strokeWidth="1" className="text-gray-300 dark:text-slate-600" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="currentColor" strokeWidth="1" className="text-gray-300 dark:text-slate-600" />
          {data.map((d, i) => (
            <text key={i} x={scaleX(i)} y={height - 5} textAnchor="middle" className="fill-gray-500 dark:fill-gray-400 text-[10px]">
              {d.month.split(' ')[0]}
            </text>
          ))}
          <polyline fill="none" stroke="rgb(59, 130, 246)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
          {data.map((d, i) => (
            <circle key={i} cx={scaleX(i)} cy={scaleY(d.totalRevenue)} r="4" className="fill-blue-500" />
          ))}
        </svg>
      </div>
    );
  };

  // Donut chart (CSS conic gradient)
  const DonutChart: React.FC<{ items: { percentage: number; color: string }[]; size?: number }> = ({ items, size = 140 }) => {
    let acc = 0;
    const conic = items.map(({ percentage, color }) => {
      const start = acc;
      acc += percentage;
      return `${color} ${start}% ${acc}%`;
    }).join(', ');
    return (
      <div
        className="rounded-full border-[10px] border-gray-200 dark:border-slate-700 flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${conic})`,
        }}
      />
    );
  };

  // Outstanding aging bar chart
  const OutstandingAgingChart: React.FC<{ data: OutstandingAgingItem[] }> = ({ data }) => {
    const maxAmount = Math.max(...data.map((d) => d.amount), 1);
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900 dark:text-white">{item.bucket}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Rs. {(item.amount / 1000).toFixed(0)}k · {item.count} items
              </span>
            </div>
            <div className="relative h-6 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${(item.amount / maxAmount) * 100}%`, backgroundColor: item.color }}
              >
                {item.amount / maxAmount > 0.2 && (
                  <span className="text-xs font-medium text-white">{(item.amount / 1000).toFixed(0)}k</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      {detailPopup && (
        <DetailModal title={detailPopup.title} onClose={() => setDetailPopup(null)}>
          {detailPopup.content}
        </DetailModal>
      )}
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
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Analytics Dashboard
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Comprehensive insights into revenue, machine utilization, damages, and idle machines.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {analyticsLoading && (
                <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading analytics…
                </span>
              )}
              {analyticsError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                  {analyticsError}
                  <button
                    type="button"
                    onClick={() => fetchAnalytics()}
                    className="underline font-medium"
                  >
                    Retry
                  </button>
                </div>
              )}
              <Tooltip content="Refresh analytics">
                <button
                  type="button"
                  onClick={() => fetchAnalytics()}
                  disabled={analyticsLoading}
                  className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${analyticsLoading ? 'animate-spin' : ''}`} />
                </button>
              </Tooltip>
              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <Tooltip content="Export As a PDF">
                  <button
                    onClick={handleExportToPDF}
                    disabled={isExporting}
                    className="px-4 py-2 bg-red-600 dark:bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-500 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4" />
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                  </button>
                </Tooltip>
                <Tooltip content="Export As a Excel">
                  <button
                    onClick={handleExportToExcel}
                    disabled={isExporting}
                    className="px-4 py-2 bg-green-600 dark:bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-500 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {isExporting ? 'Exporting...' : 'Export Excel'}
                  </button>
                </Tooltip>
              </div>
              {/* Period Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPeriod('6M')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedPeriod === '6M'
                      ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                >
                  6M
                </button>
                <button
                  onClick={() => setSelectedPeriod('12M')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedPeriod === '12M'
                      ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                >
                  12M
                </button>
                <button
                  onClick={() => setSelectedPeriod('YTD')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedPeriod === 'YTD'
                      ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                >
                  YTD
                </button>
              </div>
            </div>
          </div>

          {/* Summary Stats Cards (clickable for full details) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'Total Revenue – Full Details',
                  content: (
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        Total revenue across the selected period (6 months). Includes both VAT and Non-VAT invoices.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                          <p className="font-semibold text-gray-900 dark:text-white">Rs. {(summaryStats.totalRevenue / 1000000).toFixed(2)}M</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">VAT</p>
                          <p className="font-semibold text-gray-900 dark:text-white">Rs. {(summaryStats.totalVatRevenue / 1000000).toFixed(2)}M</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Non-VAT</p>
                          <p className="font-semibold text-gray-900 dark:text-white">Rs. {(summaryStats.totalNonVatRevenue / 1000000).toFixed(2)}M</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Growth (MoM)</p>
                          <p className={`font-semibold ${summaryStats.revenueGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {summaryStats.revenueGrowth >= 0 ? '+' : ''}{summaryStats.revenueGrowth.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Click outside or close to return.</p>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-left hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    Rs. {(summaryStats.totalRevenue / 1000000).toFixed(2)}M
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {summaryStats.revenueGrowth >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`text-xs font-medium ${summaryStats.revenueGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {Math.abs(summaryStats.revenueGrowth).toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-105 transition-transform">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View details</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </div>
            </button>

            {/* Average Monthly Revenue */}
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'Average Monthly Revenue – Full Details',
                  content: (
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        Average revenue per month over the last {monthlyRevenueForCharts.length} months. Useful for forecasting and target setting.
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Average</span>
                          <span className="font-semibold text-gray-900 dark:text-white">Rs. {(summaryStats.avgMonthlyRevenue / 1000).toFixed(0)}k</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Highest month</span>
                          <span className="font-semibold text-gray-900 dark:text-white">Rs. {(maxRevenue / 1000).toFixed(0)}k</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Months in period</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{monthlyRevenueForCharts.length}</span>
                        </div>
                      </div>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-left hover:border-green-400 dark:hover:border-green-500 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    Rs. {(summaryStats.avgMonthlyRevenue / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Over {monthlyRevenueForCharts.length} months</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View details</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </div>
            </button>

            {/* Machine Utilization */}
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'Machine Utilization – Full Details',
                  content: (
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        Percentage of total machines that are currently on rent or in use. Idle machines are available or in maintenance.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Utilization</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{summaryStats.utilizationRate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Idle machines</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{summaryStats.idleMachines}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Top utilized models</p>
                          <ul className="space-y-1 text-sm">
                            {mockMachineUtilization.slice(0, 3).map((m, i) => (
                              <li key={i} className="flex justify-between">
                                <span>{m.brand} {m.model}</span>
                                <span className="font-medium">{m.utilizationRate.toFixed(1)}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-left hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Machine Utilization</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summaryStats.utilizationRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{summaryStats.idleMachines} machines idle</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-105 transition-transform">
                  <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View details</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </div>
            </button>

            {/* Total Damages */}
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'Total Damages & Repair Cost – Full Details',
                  content: (
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        Total damage incidents and repair costs across machine models. Higher damage rate may indicate maintenance or usage issues.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total incidents</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{summaryStats.totalDamages}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Repair cost</p>
                          <p className="font-semibold text-gray-900 dark:text-white">Rs. {(summaryStats.totalRepairCost / 1000).toFixed(0)}k</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">By model (top 5)</p>
                          <ul className="space-y-1 text-sm">
                            {mockDamageFrequency.slice(0, 5).map((d, i) => (
                              <li key={i} className="flex justify-between">
                                <span>{d.brand} {d.model}</span>
                                <span>{d.totalDamages} · Rs. {(d.repairCost / 1000).toFixed(0)}k</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-left hover:border-red-400 dark:hover:border-red-500 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Damages</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summaryStats.totalDamages}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Rs. {(summaryStats.totalRepairCost / 1000).toFixed(0)}k repair cost</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View details</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </div>
            </button>
          </div>

          {/* Small KPI cards (click for popup) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'Active Rentals',
                  content: (
                    <div className="space-y-3">
                      <p className="text-gray-600 dark:text-gray-400">Currently active rental agreements. These machines are out with customers.</p>
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{activeRentals}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">agreements</div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Rental status breakdown available in the Rental Status chart below.</p>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 text-left hover:border-blue-400 dark:hover:border-blue-500 hover:shadow transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active Rentals</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{activeRentals}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-80 group-hover:opacity-100" />
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'Outstanding Amount',
                  content: (
                    <div className="space-y-3">
                      <p className="text-gray-600 dark:text-gray-400">Total amount outstanding from customers (overdue and current).</p>
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">Rs. {(outstandingAmount / 1000).toFixed(0)}k</div>
                      <div className="space-y-2 text-sm">
                        {mockOutstandingAging.map((a, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{a.bucket}</span>
                            <span>Rs. {(a.amount / 1000).toFixed(0)}k ({a.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 text-left hover:border-amber-400 dark:hover:border-amber-500 hover:shadow transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">Rs. {(outstandingAmount / 1000).toFixed(0)}k</p>
                </div>
                <DollarSign className="w-8 h-8 text-amber-500 dark:text-amber-400 opacity-80 group-hover:opacity-100" />
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'New Agreements This Month',
                  content: (
                    <div className="space-y-3">
                      <p className="text-gray-600 dark:text-gray-400">Rental agreements created in the current month. Indicates sales pipeline health.</p>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">{newAgreementsThisMonth}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Compare with previous months in the Rental Status section.</p>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 text-left hover:border-green-400 dark:hover:border-green-500 hover:shadow transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">New (Month)</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{newAgreementsThisMonth}</p>
                </div>
                <FileCheck className="w-8 h-8 text-green-500 dark:text-green-400 opacity-80 group-hover:opacity-100" />
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'Outstanding Alerts',
                  content: (
                    <div className="space-y-3">
                      <p className="text-gray-600 dark:text-gray-400">Alerts include payment overdue, high balance, agreement expiring, and credit limit exceeded.</p>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{MOCK_ALERTS_COUNT}</div>
                      <ul className="space-y-1 text-sm">
                        {mockAlertsByType.map((a, i) => (
                          <li key={i} className="flex justify-between">
                            <span>{a.type}</span>
                            <span className="font-medium">{a.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 text-left hover:border-red-400 dark:hover:border-red-500 hover:shadow transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Alerts</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{MOCK_ALERTS_COUNT}</p>
                </div>
                <Bell className="w-8 h-8 text-red-500 dark:text-red-400 opacity-80 group-hover:opacity-100" />
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'Gatepass Volume',
                  content: (
                    <div className="space-y-3">
                      <p className="text-gray-600 dark:text-gray-400">IN = returns; OUT = dispatches. Balance indicates net machine movement.</p>
                      <div className="grid grid-cols-2 gap-3">
                        {mockGatepassVolume.map((g, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{g.label}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{g.count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 text-left hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Gatepass</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">IN {mockGatepassVolume[1].count} / OUT {mockGatepassVolume[0].count}</p>
                </div>
                <Truck className="w-8 h-8 text-indigo-500 dark:text-indigo-400 opacity-80 group-hover:opacity-100" />
              </div>
            </button>
            <button
              type="button"
              onClick={() =>
                setDetailPopup({
                  title: 'Top Brand by Revenue',
                  content: (
                    <div className="space-y-3">
                      <p className="text-gray-600 dark:text-gray-400">Revenue attributed to machine brands (rental income by brand).</p>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{MOCK_TOP_BRAND}</div>
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">Rs. {(MOCK_TOP_BRAND_REVENUE / 1000000).toFixed(2)}M</p>
                      <ul className="space-y-1 text-sm">
                        {mockRevenueByBrand.slice(0, 5).map((b, i) => (
                          <li key={i} className="flex justify-between">
                            <span>{b.brand}</span>
                            <span>Rs. {(b.revenue / 1000).toFixed(0)}k ({b.percentage}%)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                })
              }
              className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 text-left hover:border-violet-400 dark:hover:border-violet-500 hover:shadow transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Top Brand</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{MOCK_TOP_BRAND}</p>
                </div>
                <Award className="w-8 h-8 text-violet-500 dark:text-violet-400 opacity-80 group-hover:opacity-100" />
              </div>
            </button>
          </div>

          {/* Revenue Trend & Donuts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Total revenue over time</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <LineChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <RevenueLineChart data={monthlyRevenueForCharts} />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rental Status</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Agreements by status</p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <PieChart className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <DonutChart items={mockRentalStatusDistribution.map(({ percentage, color }) => ({ percentage, color }))} size={140} />
                <div className="flex-1 space-y-2 min-w-0">
                  {mockRentalStatusDistribution.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-700 dark:text-gray-300">{item.status}</span>
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{item.count} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue by Brand</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Share of revenue</p>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <DonutChart items={mockRevenueByBrand.map(({ percentage, color }) => ({ percentage, color }))} size={140} />
                <div className="flex-1 space-y-2 min-w-0">
                  {mockRevenueByBrand.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-700 dark:text-gray-300">{item.brand}</span>
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">Rs. {(item.revenue / 1000).toFixed(0)}k</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Outstanding Aging & Alerts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Outstanding by Aging</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Amount and count by bucket</p>
                </div>
              </div>
              <OutstandingAgingChart data={mockOutstandingAging} />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alerts by Type</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Outstanding alerts breakdown</p>
                </div>
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="space-y-3">
                {mockAlertsByType.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-gray-900 dark:text-white">{item.type}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({item.severity})</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Monthly Revenue (VAT vs Non-VAT)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Revenue breakdown by invoice type
                  </p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <LineChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <BarChart data={monthlyRevenueForCharts} />
            </div>

            {/* Top 5 Machine Models by Utilization */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Top 5 Machine Models by Utilization
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Most utilized machines by rental frequency
                  </p>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <UtilizationBarChart data={mockMachineUtilization} />
            </div>

            {/* Damage Frequency by Model */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Damage Frequency by Model
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Damage incidents and repair costs by machine model
                  </p>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <DamageFrequencyChart data={mockDamageFrequency} />
            </div>

            {/* Idle Machines Report (clickable cards → popup) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Idle Machines Report
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Machines not currently rented or in maintenance · Click for full details
                  </p>
                </div>
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="space-y-3">
                {mockIdleMachines.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No idle machines found</p>
                  </div>
                ) : (
                  mockIdleMachines.map((machine) => (
                    <button
                      key={machine.id}
                      type="button"
                      onClick={() =>
                        setDetailPopup({
                          title: `${machine.brand} ${machine.model} – Full Details`,
                          content: (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Barcode</p>
                                  <p className="font-mono text-gray-900 dark:text-white text-xs break-all">{machine.barcode}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Serial</p>
                                  <p className="font-mono text-gray-900 dark:text-white">{machine.serialNumber}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Brand / Model</p>
                                  <p className="font-medium text-gray-900 dark:text-white">{machine.brand} {machine.model}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Type</p>
                                  <p className="text-gray-900 dark:text-white">{machine.type}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Status</p>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${machine.status === 'Available' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : machine.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200'}`}>
                                    {machine.status}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Days Idle</p>
                                  <p className="font-semibold text-gray-900 dark:text-white">{machine.daysIdle} days</p>
                                </div>
                                <div className="col-span-2">
                                  <p className="text-gray-500 dark:text-gray-400">Last Rental Date</p>
                                  <p className="text-gray-900 dark:text-white">
                                    {machine.lastRentalDate ? new Date(machine.lastRentalDate).toLocaleDateString('en-LK') : 'Never'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ),
                        })
                      }
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-orange-400 dark:hover:border-orange-500 transition-all text-left cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {machine.brand} {machine.model}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${machine.status === 'Available'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : machine.status === 'Maintenance'
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200'
                                }`}
                            >
                              {machine.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Serial:</span>
                              <span className="ml-2 text-gray-900 dark:text-white font-mono text-xs">
                                {machine.serialNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Type:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {machine.type}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Days Idle:</span>
                              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                                {machine.daysIdle} days
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Last Rental:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {machine.lastRentalDate
                                  ? new Date(machine.lastRentalDate).toLocaleDateString('en-LK')
                                  : 'Never'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 flex-shrink-0 ml-2" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VAT vs Non-VAT Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue Breakdown
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">VAT Revenue</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Rs. {(summaryStats.totalVatRevenue / 1000000).toFixed(2)}M
                    </span>
                  </div>
                  <div className="relative h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-blue-600 dark:bg-blue-500"
                      style={{ width: `${summaryStats.vatPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {summaryStats.vatPercentage.toFixed(1)}% of total revenue
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Non-VAT Revenue</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Rs. {(summaryStats.totalNonVatRevenue / 1000000).toFixed(2)}M
                    </span>
                  </div>
                  <div className="relative h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-green-600 dark:bg-green-500"
                      style={{ width: `${100 - summaryStats.vatPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {(100 - summaryStats.vatPercentage).toFixed(1)}% of total revenue
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Machines</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{latestAnalytics?.machines?.total ?? 50}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Active Rentals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeRentals}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Rental Duration</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">28</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">days</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Damage Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(summaryStats.totalDamages / 200 * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;