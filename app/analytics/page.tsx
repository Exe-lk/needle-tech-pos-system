'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

const AnalyticsPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'6M' | '12M' | 'YTD'>('6M');
  const [isExporting, setIsExporting] = useState(false);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const currentMonth = mockMonthlyRevenue[mockMonthlyRevenue.length - 1];
    const previousMonth = mockMonthlyRevenue[mockMonthlyRevenue.length - 2];
    
    const totalRevenue = mockMonthlyRevenue.reduce((sum, m) => sum + m.totalRevenue, 0);
    const avgMonthlyRevenue = totalRevenue / mockMonthlyRevenue.length;
    const revenueGrowth = previousMonth 
      ? ((currentMonth.totalRevenue - previousMonth.totalRevenue) / previousMonth.totalRevenue) * 100 
      : 0;

    const totalVatRevenue = mockMonthlyRevenue.reduce((sum, m) => sum + m.vatRevenue, 0);
    const totalNonVatRevenue = mockMonthlyRevenue.reduce((sum, m) => sum + m.nonVatRevenue, 0);
    const vatPercentage = (totalVatRevenue / totalRevenue) * 100;

    const totalMachines = 50; // Mock total
    const idleMachines = mockIdleMachines.length;
    const utilizationRate = ((totalMachines - idleMachines) / totalMachines) * 100;

    const totalDamages = mockDamageFrequency.reduce((sum, d) => sum + d.totalDamages, 0);
    const totalRepairCost = mockDamageFrequency.reduce((sum, d) => sum + d.repairCost, 0);

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
  }, []);

  // Find max values for chart scaling
  const maxRevenue = Math.max(...mockMonthlyRevenue.map(m => m.totalRevenue));
  const maxUtilization = Math.max(...mockMachineUtilization.map(m => m.utilizationRate));
  const maxDamageRate = Math.max(...mockDamageFrequency.map(d => d.damageRate));

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

      const revenueData = mockMonthlyRevenue.map(item => [
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
        ...mockMonthlyRevenue.map(item => [
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
              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportToPDF}
                  disabled={isExporting}
                  className="px-4 py-2 bg-red-600 dark:bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-500 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </button>
                <button
                  onClick={handleExportToExcel}
                  disabled={isExporting}
                  className="px-4 py-2 bg-green-600 dark:bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-500 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
              {/* Period Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPeriod('6M')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    selectedPeriod === '6M'
                      ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  6M
                </button>
                <button
                  onClick={() => setSelectedPeriod('12M')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    selectedPeriod === '12M'
                      ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  12M
                </button>
                <button
                  onClick={() => setSelectedPeriod('YTD')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    selectedPeriod === 'YTD'
                      ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  YTD
                </button>
              </div>
            </div>
          </div>

          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
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
                    <span
                      className={`text-xs font-medium ${
                        summaryStats.revenueGrowth >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {Math.abs(summaryStats.revenueGrowth).toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Average Monthly Revenue */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    Rs. {(summaryStats.avgMonthlyRevenue / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Over {mockMonthlyRevenue.length} months
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Machine Utilization */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Machine Utilization</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {summaryStats.utilizationRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {mockIdleMachines.length} machines idle
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            {/* Total Damages */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Damages</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {summaryStats.totalDamages}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Rs. {(summaryStats.totalRepairCost / 1000).toFixed(0)}k repair cost
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
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
              <BarChart data={mockMonthlyRevenue} />
            </div>

            {/* Top 5 Machine Models by Utilization */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
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
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
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

            {/* Idle Machines Report */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Idle Machines Report
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Machines not currently rented or in maintenance
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
                    <div
                      key={machine.id}
                      className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {machine.brand} {machine.model}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                machine.status === 'Available'
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
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VAT vs Non-VAT Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
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
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Machines</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">50</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Active Rentals</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">42</p>
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