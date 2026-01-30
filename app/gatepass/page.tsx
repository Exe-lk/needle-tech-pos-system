'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import {
  Eye,
  Pencil,
  X,
  Plus,
  Trash2,
  Printer,
  ShieldCheck,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import QRScannerComponent from '@/src/components/qr-scanner';

interface GatePassItem {
  id: string;
  description: string;
  status: string;
  serialNo: string;
  motorBoxNo: string;
}

interface GatePass {
  id: number;
  gatepassNo: string;
  agreementReference: string;
  dateOfIssue: string;
  returnable: boolean;
  entry: 'IN' | 'OUT';
  from: string;
  to: string;
  toAddress: string;
  vehicleNumber: string;
  driverName: string;
  items: GatePassItem[];
  issuedBy?: string;
  receivedBy?: string;
}

// Mock rental agreements for dropdown (you can fetch from API later)
const mockRentalAgreements = [
  {
    id: 'RA-2024-001',
    customerName: 'ABC Holdings (Pvt) Ltd',
    customerAddress: '123 Main Street, Colombo 05',
  },
  {
    id: 'RA-2024-002',
    customerName: 'John Perera',
    customerAddress: '456 Galle Road, Mount Lavinia',
  },
  {
    id: 'RA-2024-003',
    customerName: 'XYZ Engineering',
    customerAddress: '789 Kandy Road, Peradeniya',
  },
  {
    id: 'RA-2024-004',
    customerName: 'Kamal Silva',
    customerAddress: '321 Negombo Road, Wattala',
  },
  {
    id: 'RA-2024-005',
    customerName: 'Mega Constructions',
    customerAddress: '654 High Level Road, Maharagama',
  },
  {
    id: 'RA-2024-006',
    customerName: 'VIHANGA SHADE STRUCTURES',
    customerAddress: '317/2, NEW KANDY ROAD, BIYAGAMA',
  },
];

// Mock gate pass data with minimum 5 items each
const mockGatePasses: GatePass[] = [
  {
    id: 1,
    gatepassNo: '016633',
    agreementReference: 'RA-2024-001',
    dateOfIssue: '2024-01-20',
    returnable: true,
    entry: 'OUT',
    from: 'Needle Technologies',
    to: 'ABC Holdings (Pvt) Ltd',
    toAddress: '123 Main Street, Colombo 05',
    vehicleNumber: 'ABC-1234',
    driverName: 'Nimal Perera',
    items: [
      {
        id: '1',
        description: 'JUKI LX-1903A-SS - ELECTRONIC BAR TACK MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01733',
        motorBoxNo: 'NMBDH01171',
      },
      {
        id: '2',
        description: 'JUKI DDL-8700 - HIGH-SPEED LOCKSTITCH MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01734',
        motorBoxNo: 'NMBDH01172',
      },
      {
        id: '3',
        description: 'BROTHER DB2-B755-403 - OVERLOCK MACHINE',
        status: 'FAIR',
        serialNo: 'BR-2024-001',
        motorBoxNo: 'BOX-2024-001',
      },
      {
        id: '4',
        description: 'SINGER 4423 - HEAVY DUTY SEWING MACHINE',
        status: 'GOOD',
        serialNo: 'SG-2024-001',
        motorBoxNo: 'BOX-2024-002',
      },
      {
        id: '5',
        description: 'JUKI MO-2516 - OVERLOCK MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01735',
        motorBoxNo: 'NMBDH01173',
      },
    ],
    issuedBy: 'Admin User',
    receivedBy: 'Nimal Perera',
  },
  {
    id: 2,
    gatepassNo: '016634',
    agreementReference: 'RA-2024-002',
    dateOfIssue: '2024-03-05',
    returnable: false,
    entry: 'OUT',
    from: 'Needle Technologies',
    to: 'John Perera',
    toAddress: '456 Galle Road, Mount Lavinia',
    vehicleNumber: 'XYZ-5678',
    driverName: 'Kamal Silva',
    items: [
      {
        id: '1',
        description: 'BROTHER XL2600i - DOMESTIC SEWING MACHINE',
        status: 'GOOD',
        serialNo: 'BR-2024-002',
        motorBoxNo: 'BOX-2024-003',
      },
      {
        id: '2',
        description: 'JUKI DDL-5550N - INDUSTRIAL SEWING MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01736',
        motorBoxNo: 'NMBDH01174',
      },
      {
        id: '3',
        description: 'SINGER 9960 - QUANTUM STYLIST MACHINE',
        status: 'GOOD',
        serialNo: 'SG-2024-002',
        motorBoxNo: 'BOX-2024-004',
      },
      {
        id: '4',
        description: 'BROTHER DB2-B755-403 - OVERLOCK MACHINE',
        status: 'FAIR',
        serialNo: 'BR-2024-003',
        motorBoxNo: 'BOX-2024-005',
      },
      {
        id: '5',
        description: 'JUKI MO-6700S - OVERLOCK MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01737',
        motorBoxNo: 'NMBDH01175',
      },
    ],
    issuedBy: 'Admin User',
  },
];

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'gatepassNo',
    label: 'Gatepass No',
    sortable: true,
    filterable: true,
  },
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
    key: 'dateOfIssue',
    label: 'Date of Issue',
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
    key: 'entry',
    label: 'Entry',
    sortable: true,
    filterable: true,
    render: (value: 'IN' | 'OUT') => {
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${value === 'OUT'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            }`}
        >
          {value}
        </span>
      );
    },
  },
];

const MIN_ITEMS = 5;

type ScanResultType = 'success' | 'failed' | 'duplicate';

interface SecurityScanLogItem {
  id: string;
  raw: string;
  extractedSerial: string;
  extractedBox: string;
  result: ScanResultType;
  reason: string;
  timestamp: Date;
}

/** Build a unique key for (serial, box) pair used in expected/matched sets */
function pairKey(serial: string, box: string): string {
  return `${normalizeSerial(serial)}|${normalizeSerial(box)}`;
}

/** Extract both serial number and box number from QR decoded text (JSON or plain text). */
function extractSerialAndBoxFromQR(decodedText: string): { serial: string; box: string } | null {
  const raw = (decodedText || '').trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const serialCandidates = [
        parsed.serialNo,
        parsed.serialNO,
        parsed.serial,
        parsed.serialNumber,
        parsed.SerialNo,
        parsed.Serial,
        parsed.machineSerial,
        parsed.machineSerialNo,
      ].filter((v: unknown) => typeof v === 'string' && (v as string).trim().length > 0);
      const boxCandidates = [
        parsed.motorBoxNo,
        parsed.boxNo,
        parsed.boxNumber,
        parsed.MotorBoxNo,
        parsed.BoxNo,
        parsed.box,
      ].filter((v: unknown) => typeof v === 'string' && (v as string).trim().length > 0);
      const serial = serialCandidates.length > 0 ? (serialCandidates[0] as string).trim() : '';
      const box = boxCandidates.length > 0 ? (boxCandidates[0] as string).trim() : '';
      if (serial || box) return { serial, box: box || '' };
    }
  } catch {
    // ignore
  }

  const serialMatch = raw.match(/serial\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i);
  const boxMatch = raw.match(/(?:motor)?\s*box\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i);
  const serial = serialMatch ? serialMatch[2].trim() : '';
  const box = boxMatch ? boxMatch[2].trim() : '';
  if (serial || box) return { serial, box: box || '' };

  return null;
}

function normalizeSerial(input: string): string {
  return (input || '').trim().toUpperCase();
}

function extractSerialFromQR(decodedText: string): string {
  const result = extractSerialAndBoxFromQR(decodedText);
  return result ? result.serial : '';
}

const GatePassPage: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedGatePass, setSelectedGatePass] = useState<GatePass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security approval modal: Step 1 = enter gatepass number, Step 2 = scan QR + approve
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityModalStep, setSecurityModalStep] = useState<1 | 2>(1);
  const [securityGatePassNumberInput, setSecurityGatePassNumberInput] = useState('');
  const [securityGatePassLookupError, setSecurityGatePassLookupError] = useState<string | null>(null);
  const [securityGatePass, setSecurityGatePass] = useState<GatePass | null>(null);
  const [scannerKey, setScannerKey] = useState(1);
  const [scanLog, setScanLog] = useState<SecurityScanLogItem[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [failedCount, setFailedCount] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<{
    type: ScanResultType;
    title: string;
    message: string;
  } | null>(null);
  const [isScannerExpanded, setIsScannerExpanded] = useState(false);

  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  const expectedPairs = useMemo(() => {
    if (!securityGatePass) return new Set<string>();
    const s = new Set<string>();
    for (const item of securityGatePass.items || []) {
      const key = pairKey(item.serialNo, item.motorBoxNo);
      if (key !== '|') s.add(key);
    }
    return s;
  }, [securityGatePass]);

  const expectedPairCount = expectedPairs.size;
  const matchedCount = matchedPairs.size;
  const allMatched = expectedPairCount > 0 && matchedCount === expectedPairCount;
  const canApprove = allMatched && failedCount === 0;

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  // Create form state - Initialize with 5 items
  const [agreementReference, setAgreementReference] = useState('');
  const [dateOfIssue, setDateOfIssue] = useState('');
  const [returnable, setReturnable] = useState(true);
  const [entry, setEntry] = useState<'IN' | 'OUT'>('OUT');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [items, setItems] = useState<GatePassItem[]>(() => {
    // Initialize with 5 empty items
    return Array.from({ length: MIN_ITEMS }, (_, i) => ({
      id: `item-${i + 1}`,
      description: '',
      status: 'GOOD',
      serialNo: '',
      motorBoxNo: '',
    }));
  });
  const [issuedBy, setIssuedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCreateGatePass = () => {
    setIsCreateModalOpen(true);
    // Reset form with 5 items
    setAgreementReference('');
    setDateOfIssue(new Date().toISOString().split('T')[0]);
    setReturnable(true);
    setEntry('OUT');
    setVehicleNumber('');
    setDriverName('');
    setItems(
      Array.from({ length: MIN_ITEMS }, (_, i) => ({
        id: `item-${Date.now()}-${i + 1}`,
        description: '',
        status: 'GOOD',
        serialNo: '',
        motorBoxNo: '',
      }))
    );
    setIssuedBy('');
    setReceivedBy('');
    setFormErrors({});
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setAgreementReference('');
    setDateOfIssue('');
    setReturnable(true);
    setEntry('OUT');
    setVehicleNumber('');
    setDriverName('');
    setItems(
      Array.from({ length: MIN_ITEMS }, (_, i) => ({
        id: `item-${Date.now()}-${i + 1}`,
        description: '',
        status: 'GOOD',
        serialNo: '',
        motorBoxNo: '',
      }))
    );
    setIssuedBy('');
    setReceivedBy('');
    setFormErrors({});
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: `item-${Date.now()}`, description: '', status: 'GOOD', serialNo: '', motorBoxNo: '' },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    // Prevent removal if it would result in less than MIN_ITEMS
    if (items.length > MIN_ITEMS) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof GatePassItem, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!agreementReference) errors.agreementReference = 'Agreement Reference is required';
    if (!dateOfIssue) errors.dateOfIssue = 'Date of Issue is required';
    if (!vehicleNumber.trim()) errors.vehicleNumber = 'Vehicle Number is required';
    if (!driverName.trim()) errors.driverName = 'Driver Name is required';

    // Filter out empty items for validation
    const filledItems = items.filter((item) => item.description.trim() !== '');

    // Ensure minimum 5 items are filled
    if (filledItems.length < MIN_ITEMS) {
      errors.items = `At least ${MIN_ITEMS} items are required`;
    }

    items.forEach((item, index) => {
      // Only validate filled items
      if (item.description.trim()) {
        if (!item.description.trim()) {
          errors[`item_description_${index}`] = 'Description is required';
        }
        if (!item.serialNo.trim()) {
          errors[`item_serialNo_${index}`] = 'Serial No is required';
        }
        if (!item.motorBoxNo.trim()) {
          errors[`item_motorBoxNo_${index}`] = 'Motor/Box No is required';
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateGatepassNo = (): string => {
    // Generate a 6-digit gatepass number
    const num = Math.floor(Math.random() * 1000000);
    return num.toString().padStart(6, '0');
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const agreement = mockRentalAgreements.find((a) => a.id === agreementReference);
      const gatepassNo = generateGatepassNo();

      // Filter out empty items and ensure at least 5 items
      const validItems = items.filter((item) => item.description.trim() !== '');

      if (validItems.length < MIN_ITEMS) {
        alert(`At least ${MIN_ITEMS} items are required`);
        setIsSubmitting(false);
        return;
      }

      const payload: GatePass = {
        id: Date.now(),
        gatepassNo,
        agreementReference,
        dateOfIssue,
        returnable,
        entry,
        from: 'Needle Technologies',
        to: agreement?.customerName || '',
        toAddress: agreement?.customerAddress || '',
        vehicleNumber,
        driverName,
        items: validItems,
        issuedBy: issuedBy || 'System',
        receivedBy: receivedBy || '',
      };

      console.log('Create gate pass payload:', payload);
      alert(`Gate Pass ${gatepassNo} created successfully (frontend only).`);
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

  const handlePrintGatePass = () => {
    window.print();
  };

  // --- Security approval flow (3 steps: enter number → scan QR one by one → approve if all clear) ---
  const resetSecuritySession = () => {
    setScannerKey((k) => k + 1);
    setScanLog([]);
    setMatchedPairs(new Set());
    setFailedCount(0);
    setLastFeedback(null);
  };

  const handleOpenSecurityApproval = () => {
    setSecurityModalStep(1);
    setSecurityGatePassNumberInput('');
    setSecurityGatePassLookupError(null);
    setSecurityGatePass(null);
    setIsSecurityModalOpen(true);
    resetSecuritySession();
  };

  const handleSecurityContinueFromStep1 = () => {
    const trimmed = securityGatePassNumberInput.trim();
    if (!trimmed) {
      setSecurityGatePassLookupError('Please enter a gatepass number.');
      return;
    }
    const found = mockGatePasses.find((g) => g.gatepassNo === trimmed || g.gatepassNo === trimmed.padStart(6, '0'));
    if (!found) {
      setSecurityGatePassLookupError('Gatepass not found. Please check the number.');
      return;
    }
    setSecurityGatePassLookupError(null);
    setSecurityGatePass(found);
    setSecurityModalStep(2);
    resetSecuritySession();
  };

  const handleBackToStep1 = () => {
    setSecurityModalStep(1);
    setSecurityGatePassNumberInput('');
    setSecurityGatePassLookupError(null);
    setSecurityGatePass(null);
    setIsScannerExpanded(false);
    resetSecuritySession();
  };

  const handleCloseSecurityModal = () => {
    setIsSecurityModalOpen(false);
    setSecurityModalStep(1);
    setSecurityGatePassNumberInput('');
    setSecurityGatePassLookupError(null);
    setSecurityGatePass(null);
    setIsScannerExpanded(false);
    setLastFeedback(null);
    setScanLog([]);
    setMatchedPairs(new Set());
    setFailedCount(0);
    setScannerKey((k) => k + 1);
  };

  

  const showFeedback = (fb: { type: ScanResultType; title: string; message: string }) => {
    setLastFeedback(fb);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 2500);
  };

  const restartScannerSoon = () => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => setScannerKey((k) => k + 1), 450);
  };

  const handleSecurityScanSuccess = (decodedText: string) => {
    if (!securityGatePass) return;

    const parsed = extractSerialAndBoxFromQR(decodedText);
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if (!parsed || (!parsed.serial && !parsed.box)) {
      setFailedCount((c) => c + 1);
      setScanLog((prev) => [
        {
          id,
          raw: decodedText,
          extractedSerial: parsed?.serial ?? '',
          extractedBox: parsed?.box ?? '',
          result: 'failed',
          reason: 'Could not extract serial number and box number from QR',
          timestamp: new Date(),
        },
        ...prev,
      ]);
      showFeedback({
        type: 'failed',
        title: 'Scan Failed',
        message: 'QR must contain serial number and box number.',
      });
      restartScannerSoon();
      return;
    }

    const serial = normalizeSerial(parsed.serial);
    const box = normalizeSerial(parsed.box);
    const key = pairKey(parsed.serial, parsed.box);

    if (!expectedPairs.has(key)) {
      setFailedCount((c) => c + 1);
      setScanLog((prev) => [
        {
          id,
          raw: decodedText,
          extractedSerial: parsed.serial,
          extractedBox: parsed.box,
          result: 'failed',
          reason: 'Serial/Box pair not found on this gatepass',
          timestamp: new Date(),
        },
        ...prev,
      ]);
      showFeedback({
        type: 'failed',
        title: 'Not Matched',
        message: `Serial ${serial} / Box ${box} is not on this gatepass.`,
      });
      restartScannerSoon();
      return;
    }

    if (matchedPairs.has(key)) {
      setFailedCount((c) => c + 1);
      setScanLog((prev) => [
        {
          id,
          raw: decodedText,
          extractedSerial: parsed.serial,
          extractedBox: parsed.box,
          result: 'duplicate',
          reason: 'This serial/box pair was already verified',
          timestamp: new Date(),
        },
        ...prev,
      ]);
      showFeedback({
        type: 'duplicate',
        title: 'Duplicate Scan',
        message: `${serial} / ${box} was already verified.`,
      });
      restartScannerSoon();
      return;
    }

    setMatchedPairs((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setScanLog((prev) => [
      {
        id,
        raw: decodedText,
        extractedSerial: parsed.serial,
        extractedBox: parsed.box,
        result: 'success',
        reason: 'Matched with gatepass',
        timestamp: new Date(),
      },
      ...prev,
    ]);
    showFeedback({
      type: 'success',
      title: 'Matched',
      message: `${serial} / ${box} verified.`,
    });
    restartScannerSoon();
  };

  const handleApproveGatePass = () => {
    if (!securityGatePass) return;
    if (!canApprove) {
      alert('Cannot approve: Please ensure all serial numbers are matched and there are no failed scans.');
      return;
    }

    alert(
      `Gate Pass ${securityGatePass.gatepassNo} approved by Security Officer (frontend only).`
    );
    handleCloseSecurityModal();
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
      name: 'dateOfIssue',
      label: 'Date of Issue',
      type: 'date' as const,
      placeholder: 'Select date of issue',
      required: true,
    },
    {
      name: 'returnable',
      label: 'Returnable',
      type: 'select' as const,
      placeholder: 'Select returnable status',
      required: true,
      options: [
        { label: 'YES', value: 'true' },
        { label: 'NO', value: 'false' },
      ],
    },
    {
      name: 'entry',
      label: 'Entry',
      type: 'select' as const,
      placeholder: 'Select entry type',
      required: true,
      options: [
        { label: 'IN', value: 'IN' },
        { label: 'OUT', value: 'OUT' },
      ],
    },
    {
      name: 'vehicleNumber',
      label: 'Vehicle Number',
      type: 'text' as const,
      placeholder: 'Enter vehicle number',
      required: true,
    },
    {
      name: 'driverName',
      label: 'Driver Name',
      type: 'text' as const,
      placeholder: 'Enter driver name',
      required: true,
    },
  ];

  // Get initial data for update form
  const getUpdateInitialData = (gatePass: GatePass | null) => {
    if (!gatePass) return {};

    return {
      agreementReference: gatePass.agreementReference,
      dateOfIssue: gatePass.dateOfIssue,
      returnable: gatePass.returnable ? 'true' : 'false',
      entry: gatePass.entry,
      vehicleNumber: gatePass.vehicleNumber,
      driverName: gatePass.driverName,
    };
  };

  const handleGatePassUpdate = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const agreement = mockRentalAgreements.find((a) => a.id === data.agreementReference);
      const payload = {
        ...data,
        returnable: data.returnable === 'true',
        from: 'Needle Technologies',
        to: agreement?.customerName || '',
        toAddress: agreement?.customerAddress || '',
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
      label: '',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewGatePass,
      tooltip: 'View Gate Pass',
      className:
        'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
    {
      label: '',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleUpdateGatePass,
      tooltip: 'Update Gate Pass',
      className:
        'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
    },
    {
      label: '',
      icon: <ShieldCheck className="w-4 h-4" />,
      variant: 'secondary',
      onClick: () => handleOpenSecurityApproval(),
      tooltip: 'Approve by security officer',
      className:
        'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800',
    },
  ];

  // Render Gate Pass Document (matches the image format)
  const renderGatePassDocument = (gatePass: GatePass) => {
    return (
      <div className="bg-white p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 border-b-2 border-gray-800 pb-3 sm:pb-4">
          <div className="flex items-center justify-center mb-1 sm:mb-2">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">NEEDLE TECHNOLOGIES</div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-gray-900 mt-1 sm:mt-2">GATEPASS</div>
          <div className="text-xs sm:text-sm text-gray-700 mt-1">
            Supplier of Industrial Sewing Machines and Accessories
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Left Side - Sender/Receiver Info */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">FROM:</div>
              <div className="text-xs sm:text-sm text-gray-900 font-medium break-words">
                {gatePass.from}
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">TO:</div>
              <div className="text-xs sm:text-sm text-gray-900 font-medium break-words">{gatePass.to}</div>
              <div className="text-[11px] sm:text-xs text-gray-700 mt-1 break-words">
                {gatePass.toAddress}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs sm:text-sm font-semibold text-gray-700">Vehicle:</div>
              <div className="text-xs sm:text-sm text-gray-900 font-medium break-words">
                {gatePass.vehicleNumber}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs sm:text-sm font-semibold text-gray-700">Driver:</div>
              <div className="text-xs sm:text-sm text-gray-900 font-medium break-words">
                {gatePass.driverName}
              </div>
            </div>
          </div>

          {/* Right Side - Gatepass Details */}
          <div className="space-y-3 sm:space-y-4 md:text-right">
            <div>
              <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Gatepass:</div>
              <div className="text-base sm:text-lg text-gray-900 font-bold break-words">
                {gatePass.gatepassNo}
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Date of Issue:</div>
              <div className="text-xs sm:text-sm text-gray-900 font-medium">
                {new Date(gatePass.dateOfIssue).toLocaleDateString('en-LK', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </div>
            </div>
            <div className="flex md:flex-col justify-between md:justify-start gap-2 md:gap-3">
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Returnable:</div>
                <div className="text-xs sm:text-sm text-gray-900 font-medium">
                  {gatePass.returnable ? 'YES' : 'NO'}
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Entry:</div>
                <div className="text-xs sm:text-sm text-gray-900 font-medium">{gatePass.entry}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4 sm:mb-6 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-800 text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 px-2 sm:px-4 py-2 text-left font-semibold text-gray-900">
                  Description
                </th>
                <th className="border border-gray-800 px-2 sm:px-4 py-2 text-center font-semibold text-gray-900">
                  Status
                </th>
                <th className="border border-gray-800 px-2 sm:px-4 py-2 text-center font-semibold text-gray-900">
                  Serial No
                </th>
                <th className="border border-gray-800 px-2 sm:px-4 py-2 text-center font-semibold text-gray-900">
                  Motor / Box No
                </th>
              </tr>
            </thead>
            <tbody>
              {gatePass.items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-gray-900 break-words">
                    {item.description}
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-center text-gray-900">
                    {item.status}
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-center text-gray-900 break-all">
                    {item.serialNo}
                  </td>
                  <td className="border border-gray-800 px-2 sm:px-4 py-2 text-center text-gray-900 break-all">
                    {item.motorBoxNo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div>
            <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Issued By:</div>
            <div className="border-b border-gray-800 pb-1 mb-2 min-h-[32px] sm:min-h-[40px]">
              {gatePass.issuedBy && (
                <div className="text-xs sm:text-sm text-gray-900 break-words">{gatePass.issuedBy}</div>
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-gray-600">Signature & Stamp</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Received By:</div>
            <div className="border-b border-gray-800 pb-1 mb-2 min-h-[32px] sm:min-h-[40px]">
              {gatePass.receivedBy && (
                <div className="text-xs sm:text-sm text-gray-900 break-words">
                  {gatePass.receivedBy}
                </div>
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-gray-600">Signature</div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-3 sm:pt-4 mt-4 sm:mt-6">
          <div className="text-[10px] sm:text-xs text-gray-700 text-center mb-2 px-2">
            IMPORTERS & DISTRIBUTORS OF SPARE PARTS & ATTACHMENTS FOR: JUKI, SINGER, KANSAI,
            BROTHER, SUNSTAR, EASTMAN, CUTTING PEGASUS & RECECINNUSTRIAL SEWING MACHINES, NAQMO
            IRONS, ORGAN & ORANGE NEEDLES.
          </div>
          <div className="text-[10px] sm:text-xs text-gray-700 text-center px-2">
            No. 137M, Colombo Road, Biyagama, Tel: 0112488735, 011-5737711, 011-5737712 Fax: 2487623,
            Email: needistec@sltnet.lk
          </div>
        </div>
      </div>
    );
  };

  // View Gate Pass Content
  const renderGatePassDetails = () => {
    if (!selectedGatePass) return null;

    return (
      <div>
        {/* Screen View */}
        <div className="print:hidden">{renderGatePassDocument(selectedGatePass)}</div>

        {/* Print View - Only visible when printing */}
        <div className="hidden print:block print:fixed print:inset-0 print:z-50 print:bg-white print:p-0 print:m-0">
          {renderGatePassDocument(selectedGatePass)}
        </div>
      </div>
    );
  };

  const renderSecurityFeedback = () => {
    if (!lastFeedback) return null;

    const styles =
      lastFeedback.type === 'success'
        ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200'
        : lastFeedback.type === 'duplicate'
          ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200'
          : 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200';

    return (
      <div className={`p-2 sm:p-3 rounded-lg border ${styles}`}>
        <div className="font-semibold text-xs sm:text-sm">{lastFeedback.title}</div>
        <div className="text-[11px] sm:text-xs mt-1">{lastFeedback.message}</div>
      </div>
    );
  };

  return (
    <>
      {/* Print-only gate pass document - hidden on screen, visible when printing */}
      {selectedGatePass && (
        <div className="hidden print:block print:fixed print:inset-0 print:z-[9999] print:bg-white">
          {renderGatePassDocument(selectedGatePass)}
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
        <main
          className={`pt-24 sm:pt-28 lg:pt-32 px-3 sm:px-4 md:px-6 pb-6 transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
            }`}
        >
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Gate Pass
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                  Overview of all gate passes with agreement references, driver information, and dispatch
                  details.
                </p>
              </div>
              <div className="flex justify-start sm:justify-end">
                <Tooltip content="Create Gate Pass">
                  <button
                    onClick={handleCreateGatePass}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
                  >
                    Create Gate Pass
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Gate Pass table card — horizontal scroll on small screens */}
            <div className="min-h-[300px] w-full overflow-x-auto">
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
          </div>
        </main>

        {/* Create Gate Pass Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseCreateModal} />
            <div className="relative bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Gate Pass Form
                </h2>
                <button
                  onClick={handleCloseCreateModal}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
                <div className="space-y-5 sm:space-y-6">
                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* Agreement Reference */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Agreement Reference <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={agreementReference}
                        onChange={(e) => setAgreementReference(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white ${formErrors.agreementReference
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
                        <p className="mt-1 text-xs sm:text-sm text-red-500">
                          {formErrors.agreementReference}
                        </p>
                      )}
                    </div>

                    {/* Date of Issue */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date of Issue <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={dateOfIssue}
                        onChange={(e) => setDateOfIssue(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white ${formErrors.dateOfIssue
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-slate-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                      />
                      {formErrors.dateOfIssue && (
                        <p className="mt-1 text-xs sm:text-sm text-red-500">
                          {formErrors.dateOfIssue}
                        </p>
                      )}
                    </div>

                    {/* Returnable */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Returnable <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={returnable ? 'true' : 'false'}
                        onChange={(e) => setReturnable(e.target.value === 'true')}
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                      >
                        <option value="true">YES</option>
                        <option value="false">NO</option>
                      </select>
                    </div>

                    {/* Entry */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Entry <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={entry}
                        onChange={(e) => setEntry(e.target.value as 'IN' | 'OUT')}
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                      >
                        <option value="OUT">OUT</option>
                        <option value="IN">IN</option>
                      </select>
                    </div>

                    {/* Vehicle Number */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="Enter vehicle number"
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white ${formErrors.vehicleNumber
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-slate-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                      />
                      {formErrors.vehicleNumber && (
                        <p className="mt-1 text-xs sm:text-sm text-red-500">
                          {formErrors.vehicleNumber}
                        </p>
                      )}
                    </div>

                    {/* Driver Name */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Driver Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="Enter driver name"
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white ${formErrors.driverName
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-slate-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                      />
                      {formErrors.driverName && (
                        <p className="mt-1 text-xs sm:text-sm text-red-500">
                          {formErrors.driverName}
                        </p>
                      )}
                    </div>

                    {/* Issued By */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Issued By
                      </label>
                      <input
                        type="text"
                        value={issuedBy}
                        onChange={(e) => setIssuedBy(e.target.value)}
                        placeholder="Enter issuer name"
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                      />
                    </div>

                    {/* Received By */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Received By
                      </label>
                      <input
                        type="text"
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        placeholder="Enter receiver name"
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                          Items
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Minimum {MIN_ITEMS} items required
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </button>
                    </div>
                    {formErrors.items && (
                      <p className="text-xs sm:text-sm text-red-500">{formErrors.items}</p>
                    )}
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
                          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                            Item {index + 1}
                          </span>
                          {items.length > MIN_ITEMS && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="self-start sm:self-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs sm:text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {items.length === MIN_ITEMS && (
                            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                              Minimum {MIN_ITEMS} items required
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Description <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              placeholder="e.g., JUKI LX-1903A-SS - ELECTRONIC BAR TACK MACHINE"
                              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white ${formErrors[`item_description_${index}`]
                                  ? 'border-red-500'
                                  : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                            />
                            {formErrors[`item_description_${index}`] && (
                              <p className="mt-1 text-xs sm:text-sm text-red-500">
                                {formErrors[`item_description_${index}`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Status <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={item.status}
                              onChange={(e) => handleItemChange(item.id, 'status', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                            >
                              <option value="GOOD">GOOD</option>
                              <option value="FAIR">FAIR</option>
                              <option value="POOR">POOR</option>
                              <option value="DAMAGED">DAMAGED</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Serial No <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={item.serialNo}
                              onChange={(e) => handleItemChange(item.id, 'serialNo', e.target.value)}
                              placeholder="Enter serial number"
                              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white ${formErrors[`item_serialNo_${index}`]
                                  ? 'border-red-500'
                                  : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                            />
                            {formErrors[`item_serialNo_${index}`] && (
                              <p className="mt-1 text-xs sm:text-sm text-red-500">
                                {formErrors[`item_serialNo_${index}`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Motor / Box No <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={item.motorBoxNo}
                              onChange={(e) => handleItemChange(item.id, 'motorBoxNo', e.target.value)}
                              placeholder="Enter motor/box number"
                              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-xs sm:text-sm text-gray-900 dark:text-white ${formErrors[`item_motorBoxNo_${index}`]
                                  ? 'border-red-500'
                                  : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                            />
                            {formErrors[`item_motorBoxNo_${index}`] && (
                              <p className="mt-1 text-xs sm:text-sm text-red-500">
                                {formErrors[`item_motorBoxNo_${index}`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCreate}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create & Print'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Gate Pass Modal */}
        {isViewModalOpen && selectedGatePass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseViewModal} />
            <div className="relative bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-700">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                    Gate Pass Details
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                    {selectedGatePass.gatepassNo}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrintGatePass}
                    className="px-3 sm:px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center space-x-1 sm:space-x-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={handleCloseViewModal}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4">
                {renderGatePassDetails()}
              </div>
            </div>
          </div>
        )}

        {/* Update Gate Pass Modal */}
        {isUpdateModalOpen && selectedGatePass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseUpdateModal} />
            <div className="relative bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  Update Gate Pass
                </h2>
                <button
                  onClick={handleCloseUpdateModal}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 h-5" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
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

        {/* Security Officer Approval Modal — Step 1: Enter gatepass number → Step 2: Scan QR one by one → Step 3: Approve if all clear */}
        {isSecurityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseSecurityModal} />
            <div className="relative bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-xl w-full max-w-7xl max-h-[96vh] sm:max-h-[92vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-800">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
                    <span>Security Officer Verification</span>
                  </h2>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {securityModalStep === 1 ? 'Step 1: Enter gatepass number' : 'Step 2: Scan each machine QR one by one. Step 3: Approve when all match.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  {securityModalStep === 2 && securityGatePass && (
                    <>
                      <Tooltip content="Clear scans and start over (same gatepass)">
                        <button
                          onClick={resetSecuritySession}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 dark:bg-slate-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center gap-1 sm:gap-2"
                        >
                          <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Reset scans</span>
                        </button>
                      </Tooltip>
                      <button
                        type="button"
                        onClick={handleBackToStep1}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 dark:bg-slate-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
                      >
                        Change gatepass no
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleCloseSecurityModal}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
                {securityModalStep === 1 ? (
                  /* Step 1: Enter gatepass number */
                  <div className="max-w-md mx-auto py-6 sm:py-8">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 space-y-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enter gatepass number
                      </label>
                      <input
                        type="text"
                        value={securityGatePassNumberInput}
                        onChange={(e) => {
                          setSecurityGatePassNumberInput(e.target.value);
                          setSecurityGatePassLookupError(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSecurityContinueFromStep1()}
                        placeholder="e.g. 016633"
                        className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                        autoFocus
                      />
                      {securityGatePassLookupError && (
                        <p className="text-sm text-red-600 dark:text-red-400">{securityGatePassLookupError}</p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleCloseSecurityModal}
                          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSecurityContinueFromStep1}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>
                ) : securityGatePass ? (
                  /* Step 2: Only QR scanner — scan all machines one by one; approve when all match */
                  <div className="flex flex-col items-center w-full max-w-2xl mx-auto py-3 sm:py-6 px-0 sm:px-2">
                    {/* Compact per-scan feedback (success / not on gatepass / duplicate) */}
                    {renderSecurityFeedback()}

                    {/* Scanner header with expand/collapse */}
                    <div className="w-full flex items-center justify-between gap-2 mt-2 sm:mt-3 mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">QR Scanner</span>
                      <Tooltip content={isScannerExpanded ? 'Collapse scanner' : 'Expand scanner to full size'}>
                        <button
                          type="button"
                          onClick={() => setIsScannerExpanded((prev) => !prev)}
                          className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                          aria-label={isScannerExpanded ? 'Collapse scanner' : 'Expand scanner'}
                        >
                          {isScannerExpanded ? (
                            <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </button>
                      </Tooltip>
                    </div>

                    {/* Scanner — main focus (collapsed or expanded) */}
                    <div className="w-full rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-900 dark:bg-black transition-[height] duration-300 ease-in-out">
                      <div
                        className={isScannerExpanded
                          ? 'h-[min(85vh,900px)] min-h-[min(80vh,500px)]'
                          : 'h-[min(70vh,520px)] min-h-[280px] sm:min-h-[320px]'
                        }
                      >
                        <QRScannerComponent
                          key={scannerKey}
                          onScanSuccess={handleSecurityScanSuccess}
                          autoClose={false}
                          showCloseButton={false}
                          title="Scan each machine QR"
                          subtitle={canApprove ? 'All matched — you can approve below' : `Scanned ${matchedCount} of ${expectedPairCount}${failedCount > 0 ? ' · One or more did not match' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Single line status + Approve */}
                    <div className="w-full mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                        {canApprove ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">All machines matched. You can approve.</span>
                        ) : failedCount > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">A scan did not match this gatepass. You cannot approve.</span>
                        ) : (
                          <span>Scan every machine QR one by one. Order does not matter.</span>
                        )}
                      </p>
                      <button
                        onClick={handleApproveGatePass}
                        disabled={!canApprove}
                        className={`w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 ${canApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed dark:bg-slate-600'}`}
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        Approve Gate Pass
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GatePassPage;