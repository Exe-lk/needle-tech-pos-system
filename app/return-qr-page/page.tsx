'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import QRScannerComponent from '@/src/components/qr-scanner';
import {
  X,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  Search,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Maximize2,
  Minimize2,
  Package,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type ReturnCondition = 'Good' | 'Standard' | 'Damage' | 'Missing' | 'Exchange';

interface RentalAgreementMachine {
  id: string;
  model: string;
  serialNumber: string;
  boxNumber: string;
  description: string;
}

interface RentalAgreement {
  id: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  rentalStartDate: string;
  rentalEndDate: string;
  rentalPeriod: string;
  monthlyRate: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  securityDeposit: number;
  dispatchedDate: string;
  expectedReturnDate: string;
  machines: RentalAgreementMachine[];
}

interface MachineReturnState extends RentalAgreementMachine {
  scanned: boolean;
  returnType?: ReturnCondition;
  damageNote?: string;
  photos?: File[];
  photoPreviews?: string[];
}

interface CreatedReturnPayload {
  id: number;
  returnNumber: string;
  agreementId: string;
  createdAt: string;
  createdBy: string;
  customerName: string;
  totalMachines: number;
  machines: Array<{
    serialNumber: string;
    boxNumber: string;
    model: string;
    description: string;
    returnType: ReturnCondition;
    damageNote?: string;
    photosCount?: number;
  }>;
}

// --- QR helpers (same as gatepass) ---
function normalizeSerial(input: string): string {
  return (input || '').trim().toUpperCase();
}

function pairKey(serial: string, box: string): string {
  return `${normalizeSerial(serial)}|${normalizeSerial(box)}`;
}

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

function extractSerialFromQR(decodedText: string): string {
  const result = extractSerialAndBoxFromQR(decodedText);
  return result ? result.serial : '';
}

// --- Breakpoints ---
const BP_NARROW = 640;
const BP_MOBILE_SCANNER_FULL = 480;

// --- Mock data (with box numbers) ---
const mockRentalAgreements: RentalAgreement[] = [
  {
    id: 'AGR-2024-001',
    customerName: 'ABC Holdings (Pvt) Ltd',
    customerAddress: '123 Main Street, Colombo 05',
    customerPhone: '+94 11 2345678',
    customerEmail: 'contact@abcholdings.lk',
    rentalStartDate: '2024-01-15',
    rentalEndDate: '2024-07-15',
    rentalPeriod: '6 months',
    monthlyRate: 25000,
    totalAmount: 150000,
    paidAmount: 100000,
    outstandingAmount: 50000,
    securityDeposit: 50000,
    dispatchedDate: '2024-01-15',
    expectedReturnDate: '2024-07-15',
    machines: [
      {
        id: 'MACH-001-01',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-001',
        boxNumber: 'BOX-CAT320-001',
        description: 'Excavator CAT 320 - Unit 01',
      },
      {
        id: 'MACH-001-02',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-002',
        boxNumber: 'BOX-CAT320-002',
        description: 'Excavator CAT 320 - Unit 02',
      },
      {
        id: 'MACH-001-03',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-003',
        boxNumber: 'BOX-CAT320-003',
        description: 'Excavator CAT 320 - Unit 03',
      },
      {
        id: 'MACH-001-04',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-004',
        boxNumber: 'BOX-CAT320-004',
        description: 'Excavator CAT 320 - Unit 04',
      },
      {
        id: 'MACH-001-05',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-005',
        boxNumber: 'BOX-CAT320-005',
        description: 'Excavator CAT 320 - Unit 05',
      },
      {
        id: 'MACH-002-01',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-001',
        boxNumber: 'BOX-CATD6-001',
        description: 'Bulldozer CAT D6 - Unit 01',
      },
      {
        id: 'MACH-002-02',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-002',
        boxNumber: 'BOX-CATD6-002',
        description: 'Bulldozer CAT D6 - Unit 02',
      },
      {
        id: 'MACH-002-03',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-003',
        boxNumber: 'BOX-CATD6-003',
        description: 'Bulldozer CAT D6 - Unit 03',
      },
      {
        id: 'MACH-002-04',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-004',
        boxNumber: 'BOX-CATD6-004',
        description: 'Bulldozer CAT D6 - Unit 04',
      },
      {
        id: 'MACH-002-05',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-005',
        boxNumber: 'BOX-CATD6-005',
        description: 'Bulldozer CAT D6 - Unit 05',
      },
    ],
  },
  {
    id: 'AGR-2024-002',
    customerName: 'Mega Constructions',
    customerAddress: '654 High Level Road, Maharagama',
    customerPhone: '+94 11 3456789',
    customerEmail: 'info@megaconstructions.lk',
    rentalStartDate: '2024-03-01',
    rentalEndDate: '2024-09-01',
    rentalPeriod: '6 months',
    monthlyRate: 33333.33,
    totalAmount: 200000,
    paidAmount: 100000,
    outstandingAmount: 100000,
    securityDeposit: 75000,
    dispatchedDate: '2024-03-01',
    expectedReturnDate: '2024-09-01',
    machines: [
      {
        id: 'MACH-010-01',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-001',
        boxNumber: 'BOX-CAT950-001',
        description: 'Loader CAT 950 - Unit 01',
      },
      {
        id: 'MACH-010-02',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-002',
        boxNumber: 'BOX-CAT950-002',
        description: 'Loader CAT 950 - Unit 02',
      },
      {
        id: 'MACH-010-03',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-003',
        boxNumber: 'BOX-CAT950-003',
        description: 'Loader CAT 950 - Unit 03',
      },
      {
        id: 'MACH-010-04',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-004',
        boxNumber: 'BOX-CAT950-004',
        description: 'Loader CAT 950 - Unit 04',
      },
    ],
  },
];

// --- Component ---

const ReturnQRPage: React.FC = () => {
  const router = useRouter();

  // Viewport width tracking for responsive behavior
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const isNarrow = viewportWidth < BP_NARROW;
  const isVerySmall = viewportWidth < BP_MOBILE_SCANNER_FULL;

  // Step 1: Enter agreement number
  const [step, setStep] = useState<1 | 2>(1);
  const [agreementNumberInput, setAgreementNumberInput] = useState('');
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);

  // All machines with return state (flat)
  const [machines, setMachines] = useState<MachineReturnState[]>([]);
  // Group by model for step 2
  const machinesByModel = useMemo(() => {
    const map = new Map<string, MachineReturnState[]>();
    machines.forEach((m) => {
      const list = map.get(m.model) || [];
      list.push(m);
      map.set(m.model, list);
    });
    return Array.from(map.entries()).map(([model, list]) => ({ model, machines: list }));
  }, [machines]);

  // Step 2: current model index (0, 1, ...)
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const currentModelGroup = machinesByModel[currentModelIndex] ?? null;
  const currentModelMachines = currentModelGroup?.machines ?? [];

  // Selected machine (index within current model's machines) for editing return type / photos
  const [selectedMachineIndexInModel, setSelectedMachineIndexInModel] = useState<number | null>(null);

  const [scannerKey, setScannerKey] = useState(1);
  const [scannerExpanded, setScannerExpanded] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [machineListExpanded, setMachineListExpanded] = useState(true);
  
  // Ref for scrolling to top of step 2
  const step2TopRef = useRef<HTMLDivElement>(null);
  
  type ScanResultType = 'success' | 'failed' | 'duplicate';
  const [lastFeedback, setLastFeedback] = useState<{
    type: ScanResultType;
    title: string;
    message: string;
  } | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Viewport resize listener
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      machines.forEach((m) => {
        m.photoPreviews?.forEach((p) => URL.revokeObjectURL(p));
      });
    };
  }, [machines]);

  const totalMachines = machines.length;
  const scannedCount = useMemo(
    () => machines.filter((m) => m.scanned).length,
    [machines]
  );
  const currentModelScanned = useMemo(
    () => currentModelMachines.filter((m) => m.scanned).length,
    [currentModelMachines]
  );
  const currentModelTotal = currentModelMachines.length;
  const allModelsDone = useMemo(() => {
    if (machinesByModel.length === 0) return false;
    return machinesByModel.every((g) =>
      g.machines.every((m) => m.scanned && m.returnType != null)
    );
  }, [machinesByModel]);
  const canSubmit = allModelsDone && !isSubmitting;

  const showFeedback = useCallback((fb: { type: ScanResultType; title: string; message: string }) => {
    setLastFeedback(fb);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 2500);
  }, []);

  const restartScannerSoon = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => setScannerKey((k) => k + 1), 450);
  }, []);

  const updateMachineByGlobalIndex = (
    globalIndex: number,
    updater: (m: MachineReturnState) => MachineReturnState
  ) => {
    setMachines((prev) =>
      prev.map((m, i) => (i === globalIndex ? updater(m) : m))
    );
  };

  const updateCurrentModelMachine = (indexInModel: number, updater: (m: MachineReturnState) => MachineReturnState) => {
    if (!currentModelGroup) return;
    const m = currentModelGroup.machines[indexInModel];
    const globalIndex = machines.findIndex((x) => x.id === m.id);
    if (globalIndex >= 0) updateMachineByGlobalIndex(globalIndex, updater);
  };

  const resetAll = () => {
    machines.forEach((m) => m.photoPreviews?.forEach((p) => URL.revokeObjectURL(p)));
    setStep(1);
    setAgreementNumberInput('');
    setAgreementError(null);
    setSelectedAgreement(null);
    setMachines([]);
    setCurrentModelIndex(0);
    setSelectedMachineIndexInModel(null);
    setScannerKey((k) => k + 1);
    setLastFeedback(null);
    setIsSubmitting(false);
    setIsScannerVisible(false);
    setScannerExpanded(false);
    setMachineListExpanded(true);
    
    // Scroll to top when resetting
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    resetAll();
    router.push('/returns');
  };

  // --- Step 1: Find agreement ---
  const handleFindAgreement = () => {
    const input = agreementNumberInput.trim();
    setAgreementError(null);
    if (!input) {
      setAgreementError('Please enter the rental agreement number.');
      return;
    }
    const agreement = mockRentalAgreements.find(
      (a) => a.id.toLowerCase() === input.toLowerCase()
    );
    if (!agreement) {
      setAgreementError('Agreement not found. Please check the number.');
      setSelectedAgreement(null);
      setMachines([]);
      return;
    }
    const initialMachines: MachineReturnState[] = agreement.machines.map((m) => ({
      ...m,
      scanned: false,
      returnType: undefined,
      damageNote: '',
      photos: [],
      photoPreviews: [],
    }));
    setSelectedAgreement(agreement);
    setMachines(initialMachines);
    setCurrentModelIndex(0);
    setSelectedMachineIndexInModel(null);
    setScannerKey((k) => k + 1);
  };

  const handleContinueToReturns = () => {
    if (!selectedAgreement || machines.length === 0) return;
    setStep(2);
    setCurrentModelIndex(0);
    setSelectedMachineIndexInModel(null);
    setIsScannerVisible(false); // Reset scanner visibility
    setScannerExpanded(false); // Reset scanner expansion
    
    // Scroll to top of step 2 on mobile for better UX
    setTimeout(() => {
      if (step2TopRef.current) {
        step2TopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // --- Step 2: QR scan (only for current model) ---
  const expectedSerialsForCurrentModel = useMemo(() => {
    const s = new Set<string>();
    currentModelMachines.forEach((m) => {
      const serial = normalizeSerial(m.serialNumber);
      if (serial) s.add(serial);
    });
    return s;
  }, [currentModelMachines]);

  const handleScanSuccess = (decodedText: string) => {
    if (currentModelMachines.length === 0) return;

    const parsed = extractSerialAndBoxFromQR(decodedText);
    const serialNorm = parsed?.serial ? normalizeSerial(parsed.serial) : '';
    if (!serialNorm) {
      showFeedback({
        type: 'failed',
        title: 'Scan failed',
        message: 'Could not read serial number from QR.',
      });
      restartScannerSoon();
      return;
    }

    const globalIndex = machines.findIndex(
      (m) =>
        normalizeSerial(m.serialNumber) === serialNorm ||
        (parsed?.box && pairKey(m.serialNumber, m.boxNumber) === pairKey(parsed.serial, parsed.box))
    );

    if (globalIndex === -1) {
      showFeedback({
        type: 'failed',
        title: 'Not in this agreement',
        message: `Serial ${serialNorm} is not in this return.`,
      });
      restartScannerSoon();
      return;
    }

    const machine = machines[globalIndex];
    if (machine.model !== currentModelGroup?.model) {
      showFeedback({
        type: 'failed',
        title: 'Wrong model',
        message: 'This machine belongs to another model. Switch model or scan the correct machine.',
      });
      restartScannerSoon();
      return;
    }

    if (machine.scanned) {
      const idxInModel = currentModelMachines.findIndex((m) => m.id === machine.id);
      setSelectedMachineIndexInModel(idxInModel >= 0 ? idxInModel : null);
      showFeedback({
        type: 'duplicate',
        title: 'Already scanned',
        message: `${serialNorm} was already scanned. You can change return type below.`,
      });
      restartScannerSoon();
      return;
    }

    updateMachineByGlobalIndex(globalIndex, (m) => ({
      ...m,
      scanned: true,
      returnType: m.returnType ?? 'Good',
    }));
    const idxInModel = currentModelMachines.findIndex((m) => m.id === machine.id);
    setSelectedMachineIndexInModel(idxInModel >= 0 ? idxInModel : null);

    showFeedback({
      type: 'success',
      title: 'Matched',
      message: `${serialNorm} recorded. Set return type below.`,
    });
    restartScannerSoon();
  };

  const handleReturnTypeChange = (indexInModel: number, type: ReturnCondition) => {
    updateCurrentModelMachine(indexInModel, (m) => ({
      ...m,
      scanned: true,
      returnType: type,
    }));
  };

  const handleDamageNoteChange = (indexInModel: number, note: string) => {
    updateCurrentModelMachine(indexInModel, (m) => ({ ...m, damageNote: note }));
  };

  const handlePhotoUpload = (indexInModel: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    updateCurrentModelMachine(indexInModel, (m) => {
      const existingPreviews = m.photoPreviews || [];
      const newPreviews = fileArray.map((f) => URL.createObjectURL(f));
      return {
        ...m,
        photos: [...(m.photos || []), ...fileArray],
        photoPreviews: [...existingPreviews, ...newPreviews],
      };
    });
  };

  const handleRemovePhoto = (indexInModel: number, photoIndex: number) => {
    updateCurrentModelMachine(indexInModel, (m) => {
      const photos = m.photos ? [...m.photos] : [];
      const previews = m.photoPreviews ? [...m.photoPreviews] : [];
      if (previews[photoIndex]) URL.revokeObjectURL(previews[photoIndex]);
      photos.splice(photoIndex, 1);
      previews.splice(photoIndex, 1);
      return { ...m, photos, photoPreviews: previews };
    });
  };

  const handleNextModel = () => {
    if (currentModelIndex < machinesByModel.length - 1) {
      setCurrentModelIndex((i) => i + 1);
      setSelectedMachineIndexInModel(null);
      setScannerKey((k) => k + 1);
    }
  };

  const handlePrevModel = () => {
    if (currentModelIndex > 0) {
      setCurrentModelIndex((i) => i - 1);
      setSelectedMachineIndexInModel(null);
      setScannerKey((k) => k + 1);
    }
  };

  const generateReturnNumber = (): string => {
    return `RET-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(4, '0')}`;
  };

  const handleSubmitReturn = async () => {
    if (!selectedAgreement || !canSubmit) return;

    for (const m of machines) {
      if (!m.returnType) {
        alert(`Please set return type for machine ${m.serialNumber}.`);
        return;
      }
      if (
        (m.returnType === 'Damage' || m.returnType === 'Missing') &&
        (!m.damageNote?.trim() || !m.photos?.length)
      ) {
        alert(
          `For ${m.serialNumber} (${m.returnType}): please add a note and at least one photo.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreatedReturnPayload = {
        id: Date.now(),
        returnNumber: generateReturnNumber(),
        agreementId: selectedAgreement.id,
        createdAt: new Date().toISOString(),
        createdBy: 'Current User',
        customerName: selectedAgreement.customerName,
        totalMachines: machines.length,
        machines: machines.map((m) => ({
          serialNumber: m.serialNumber,
          boxNumber: m.boxNumber,
          model: m.model,
          description: m.description,
          returnType: m.returnType as ReturnCondition,
          damageNote:
            m.returnType === 'Damage' || m.returnType === 'Missing' ? m.damageNote : undefined,
          photosCount:
            m.returnType === 'Damage' || m.returnType === 'Missing'
              ? (m.photos || []).length
              : undefined,
        })),
      };
      console.log('Return payload:', payload);
      await new Promise((r) => setTimeout(r, 800));
      alert(`Return ${payload.returnNumber} created successfully.`);
      resetAll();
      router.push('/returns');
    } catch (e) {
      console.error(e);
      alert('Failed to create return. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render helpers ---
  const renderScanFeedback = () => {
    if (!lastFeedback) return null;
    const styles =
      lastFeedback.type === 'success'
        ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200'
        : lastFeedback.type === 'duplicate'
          ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200'
          : 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200';
    return (
      <div
        className={`p-3 sm:p-4 rounded-xl border-2 ${styles} shadow-lg animate-in fade-in duration-200`}
        role="status"
        aria-live="polite"
      >
        <div className="font-semibold text-sm sm:text-base break-words">{lastFeedback.title}</div>
        <div className="text-xs sm:text-sm mt-1 opacity-90 break-words">{lastFeedback.message}</div>
      </div>
    );
  };

  const renderSelectedMachineEditor = () => {
    if (
      currentModelGroup == null ||
      selectedMachineIndexInModel == null ||
      selectedMachineIndexInModel < 0 ||
      selectedMachineIndexInModel >= currentModelMachines.length
    ) {
      return (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-words">
          Scan a machine or click a row to set return type and add photos (for damage/missing).
        </p>
      );
    }

    const machine = currentModelMachines[selectedMachineIndexInModel];
    const isDamage = machine.returnType === 'Damage' || machine.returnType === 'Missing';
    const uploadId = `photo-upload-${machine.id}`;
    const cameraId = `photo-camera-${machine.id}`;

    return (
      <div className="space-y-3 sm:space-y-4 min-w-0">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 break-words">
            Serial: <span className="font-mono text-gray-900 dark:text-white break-all">{machine.serialNumber}</span>
            {' · '}
            Box: <span className="font-mono text-gray-900 dark:text-white break-all">{machine.boxNumber}</span>
          </p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Return type
          </label>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {(['Good', 'Standard', 'Damage', 'Missing', 'Exchange'] as ReturnCondition[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleReturnTypeChange(selectedMachineIndexInModel, type)}
                  className={`min-h-[44px] px-3 py-2.5 sm:py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors touch-manipulation active:scale-[0.98] ${
                    machine.returnType === type
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-200'
                      : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-indigo-500'
                  }`}
                >
                  {type}
                </button>
              )
            )}
          </div>
        </div>

        {isDamage && (
          <>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Note (required for damage/missing)
              </label>
              <textarea
                value={machine.damageNote || ''}
                onChange={(e) => handleDamageNoteChange(selectedMachineIndexInModel, e.target.value)}
                rows={3}
                placeholder="Describe the damage or missing parts..."
                className="w-full min-h-[80px] px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-indigo-500 touch-manipulation resize-y"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Photos (required)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id={uploadId}
                onChange={(e) => handlePhotoUpload(selectedMachineIndexInModel, e.target.files)}
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                id={cameraId}
                onChange={(e) => handlePhotoUpload(selectedMachineIndexInModel, e.target.files)}
              />
              <div className="grid grid-cols-2 gap-2">
                <label
                  htmlFor={cameraId}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-transform touch-manipulation"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span className="truncate">Take photo</span>
                </label>
                <label
                  htmlFor={uploadId}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-transform touch-manipulation"
                >
                  <ImagePlus className="w-4 h-4 shrink-0" />
                  <span className="truncate">Upload</span>
                </label>
              </div>
              {machine.photoPreviews && machine.photoPreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {machine.photoPreviews.map((src, idx) => (
                    <div key={idx} className="relative group aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Proof ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(selectedMachineIndexInModel, idx)}
                        className="absolute top-1 right-1 min-h-[32px] min-w-[32px] p-1.5 rounded-lg bg-red-500 text-white opacity-90 hover:opacity-100 active:scale-[0.95] transition-all touch-manipulation flex items-center justify-center"
                        aria-label="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className="min-h-0 w-full bg-gray-100 dark:bg-slate-950 overflow-x-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <Navbar />

      <main
        className="w-full min-h-0"
        style={{
          paddingTop: 'calc(6rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="px-3 sm:px-4 md:px-6 max-w-3xl mx-auto">
          <div className="space-y-4 sm:space-y-5">
            {/* Page title */}
            <div className="max-w-2xl">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                
                Return Machine QR Verification
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {step === 1
                  ? 'Enter rental agreement number to view details, then scan each machine QR.'
                  : 'Verify each machine by scanning its QR. Set return type for all machines.'}
              </p>
            </div>

            {step === 1 ? (
              /* Step 1: Enter agreement number */
              <div className="w-full max-w-md">
                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm space-y-4">
                  <label
                    htmlFor="agreement-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Rental agreement number
                  </label>
                  <input
                    id="agreement-input"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    value={agreementNumberInput}
                    onChange={(e) => {
                      setAgreementNumberInput(e.target.value);
                      setAgreementError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleFindAgreement()}
                    placeholder="e.g. AGR-2024-001"
                    className="w-full min-h-[48px] sm:min-h-[52px] px-4 py-3 text-base border rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-indigo-500 touch-manipulation"
                    autoFocus
                  />
                  {agreementError && (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                      {agreementError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleFindAgreement}
                    className="w-full min-h-[48px] sm:min-h-[52px] px-4 py-3 text-base font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-xl hover:bg-blue-700 dark:hover:bg-indigo-700 active:scale-[0.98] transition-transform touch-manipulation flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    Find Agreement
                  </button>
                </div>

                {selectedAgreement && (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                    <div className="flex items-start gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                          Agreement found: {selectedAgreement.id}
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                          {selectedAgreement.customerName}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {machinesByModel.length} model{machinesByModel.length !== 1 ? 's' : ''}, {totalMachines} machine{totalMachines !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleContinueToReturns}
                      className="w-full min-h-[48px] px-4 py-3 sm:py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-base sm:text-sm font-medium rounded-xl hover:bg-blue-700 dark:hover:bg-indigo-700 active:scale-[0.98] transition-transform touch-manipulation flex items-center justify-center gap-2"
                    >
                      Continue to scan & return
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                )}
              </div>
            ) : selectedAgreement ? (
              /* Step 2: Scan & return flow */
              <div ref={step2TopRef} className="flex flex-col w-full gap-4">
                {/* Top: Agreement ref + actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    Agreement: {selectedAgreement.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setIsScannerVisible(false);
                      setScannerExpanded(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="min-h-[44px] px-3 sm:px-4 py-2 bg-gray-100 dark:bg-slate-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98] touch-manipulation flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    Change agreement
                  </button>
                </div>

                {/* Instruction banner for mobile */}
                {isNarrow && (
                  <div className="bg-blue-50 dark:bg-indigo-900/20 border border-blue-200 dark:border-indigo-800 rounded-xl p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 font-medium">
                      📋 Scroll down to see the machine list, then tap "Scan QR" to verify each machine
                    </p>
                  </div>
                )}

                {/* Model navigation */}
                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={handlePrevModel}
                        disabled={currentModelIndex === 0}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-gray-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-transform touch-manipulation shrink-0"
                        aria-label="Previous model"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                        Model {currentModelIndex + 1} of {machinesByModel.length}: {currentModelGroup?.model ?? ''}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextModel}
                        disabled={currentModelIndex >= machinesByModel.length - 1}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-gray-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-transform touch-manipulation shrink-0"
                        aria-label="Next model"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium shrink-0">
                      Scanned {currentModelScanned} of {currentModelTotal}
                    </div>
                  </div>
                </div>

                {/* Machine list - collapsible on mobile */}
                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  {isNarrow ? (
                    <button
                      type="button"
                      onClick={() => setMachineListExpanded((e) => !e)}
                      className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors touch-manipulation min-h-[44px]"
                      aria-expanded={machineListExpanded}
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          Machines – {currentModelGroup?.model}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                          Scan QR or tap a row to set return type
                        </p>
                      </div>
                      <div className="shrink-0">
                        {machineListExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </button>
                  ) : (
                    <div className="px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Machines – {currentModelGroup?.model}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Scan QR or tap a row to set return type
                      </p>
                    </div>
                  )}
                  {machineListExpanded && (
                    <div className="overflow-x-auto border-t border-gray-200 dark:border-slate-700 max-h-[min(40vh,400px)] sm:max-h-[min(60vh,600px)] overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0 z-10">
                          <tr>
                            <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 w-10">
                              #
                            </th>
                            <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                              Serial number
                            </th>
                            <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                              Box number
                            </th>
                            <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 w-16 sm:w-20">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {currentModelMachines.map((m, idx) => (
                            <tr
                              key={m.id}
                              onClick={() => setSelectedMachineIndexInModel(idx)}
                              className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 active:bg-gray-100 dark:active:bg-slate-700 touch-manipulation ${
                                selectedMachineIndexInModel === idx
                                  ? 'bg-blue-50 dark:bg-indigo-900/20'
                                  : ''
                              }`}
                            >
                              <td className="px-2 sm:px-3 py-2.5 sm:py-2 text-gray-600 dark:text-gray-400">{idx + 1}</td>
                              <td className="px-2 sm:px-3 py-2.5 sm:py-2 font-mono text-gray-900 dark:text-white break-all">
                                {m.serialNumber}
                              </td>
                              <td className="px-2 sm:px-3 py-2.5 sm:py-2 font-mono text-gray-900 dark:text-white break-all">
                                {m.boxNumber}
                              </td>
                              <td className="px-2 sm:px-3 py-2.5 sm:py-2">
                                {m.scanned ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                    <span className="hidden sm:inline">Done</span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Pending</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Feedback toast */}
                {lastFeedback && <div>{renderScanFeedback()}</div>}

                {/* Scan QR: button to show scanner, or inline scanner */}
                {!isScannerVisible ? (
                  <div className="sticky bottom-0 left-0 right-0 z-10 -mx-3 px-3 pt-3 pb-4 sm:pb-3 bg-gradient-to-t from-gray-100 via-gray-100 dark:from-slate-950 dark:via-slate-950 sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:bg-transparent">
                    <button
                      type="button"
                      onClick={() => {
                        setIsScannerVisible(true);
                        setScannerKey((k) => k + 1);
                        // Scroll to scanner button area for better UX on mobile
                        if (isNarrow) {
                          setTimeout(() => {
                            window.scrollBy({ top: 100, behavior: 'smooth' });
                          }, 150);
                        }
                      }}
                      className="w-full min-h-[52px] sm:min-h-[48px] px-4 py-3 rounded-xl text-base sm:text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700 active:scale-[0.98] transition-transform touch-manipulation flex items-center justify-center gap-2 shadow-lg sm:shadow-none"
                    >
                      <Camera className="w-5 h-5 sm:w-4 sm:h-4" />
                      Scan QR Code
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        📷 Scan each machine QR code
                      </span>
                      <div className="flex items-center gap-2">
                        {!isVerySmall && (
                          <button
                            type="button"
                            onClick={() => setScannerExpanded((prev) => !prev)}
                            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors touch-manipulation"
                            aria-label={scannerExpanded ? 'Collapse scanner' : 'Expand scanner'}
                          >
                            {scannerExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsScannerVisible(false);
                            // Scroll back up slightly when closing scanner on mobile
                            if (isNarrow) {
                              setTimeout(() => {
                                window.scrollBy({ top: -50, behavior: 'smooth' });
                              }, 100);
                            }
                          }}
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-sm text-red-700 dark:text-red-300 font-medium hover:bg-red-200 dark:hover:bg-red-900/50 touch-manipulation"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    <div className="w-full rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-900 dark:bg-black shadow-inner">
                      <div
                        className={
                          scannerExpanded && !isNarrow
                            ? 'min-h-[min(70dvh,520px)] h-[min(70dvh,520px)]'
                            : isNarrow
                              ? 'min-h-[min(55dvh,450px)] h-[min(55dvh,450px)]'
                              : 'min-h-[min(50dvh,380px)] h-[min(50dvh,380px)]'
                        }
                      >
                        <QRScannerComponent
                          key={scannerKey}
                          onScanSuccess={handleScanSuccess}
                          autoClose={false}
                          showCloseButton={false}
                          title="Scan machine QR"
                          subtitle={`${currentModelScanned}/${currentModelTotal} scanned in this model`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Return type & proof */}
                <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-indigo-400 shrink-0" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Return type & proof
                    </h3>
                  </div>
                  {renderSelectedMachineEditor()}
                </div>

                {/* Progress summary card - more prominent on mobile */}
                <div className={`rounded-xl border-2 p-3 sm:p-4 ${
                  canSubmit 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {canSubmit ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${
                        canSubmit 
                          ? 'text-emerald-900 dark:text-emerald-100' 
                          : 'text-blue-900 dark:text-blue-100'
                      }`}>
                        {canSubmit ? '✓ All machines verified' : 'Verification in progress'}
                      </p>
                      <p className={`text-xs mt-1 ${
                        canSubmit 
                          ? 'text-emerald-700 dark:text-emerald-300' 
                          : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        {canSubmit 
                          ? 'All machines have been scanned and return types set. Ready to submit!'
                          : `${scannedCount} of ${totalMachines} machines scanned. Scan and set return type for all machines.`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit: always visible, better spacing on mobile */}
                <div
                  className="pt-2 pb-4 sm:pt-3 sm:pb-0"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                >
                  <button
                    type="button"
                    onClick={handleSubmitReturn}
                    disabled={!canSubmit}
                    className={`w-full min-h-[52px] sm:min-h-[48px] px-5 py-3 rounded-xl text-base sm:text-sm font-medium text-white flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] transition-transform ${
                      canSubmit
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20'
                        : 'bg-gray-400 cursor-not-allowed dark:bg-slate-600'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent shrink-0" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                        Submit Return
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReturnQRPage;
