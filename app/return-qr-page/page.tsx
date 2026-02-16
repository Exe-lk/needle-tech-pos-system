'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRScannerComponent from '@/src/components/qr-scanner';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  Moon,
  Package,
  Scan,
  Sun,
  Trash2,
  X,
  RotateCcw,
  Loader2,
  Activity,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth-client';
import { AUTH_USER_KEY } from '@/lib/auth-constants';

const API_BASE = '/api/v1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  /** UUID of the rental for API (POST returns) */
  rentalId?: string;
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


// ---------------------------------------------------------------------------
// QR helpers
// ---------------------------------------------------------------------------

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
    // ignore JSON parse error
  }

  const serialMatch = raw.match(/serial\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i);
  const boxMatch = raw.match(/(?:motor)?\s*box\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i);
  const serial = serialMatch ? serialMatch[2].trim() : '';
  const box = boxMatch ? boxMatch[2].trim() : '';
  if (serial || box) return { serial, box: box || '' };
  return null;
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

/** Response from GET /api/v1/rentals/by-number */
interface RentalByNumberApiData {
  id: string;
  rentalId?: string;
  agreementNo?: string;
  customerName: string;
  customerAddress: string;
  customerPhone?: string;
  customerEmail?: string;
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
  machines: Array<{
    id: string;
    model: string;
    serialNumber: string;
    boxNumber: string;
    description: string;
  }>;
}

/** Response from POST /api/v1/returns (data payload) */
interface CreateReturnApiResponse {
  id: string;
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
    returnType: string;
    damageNote?: string;
    photosCount?: number;
  }>;
}

/** Single transaction from GET /api/v1/inventory/transactions */
interface InventoryTransactionItem {
  id: string;
  brand: string;
  model: string;
  type: string;
  transactionType: string;
  stockType: string | null;
  quantity: number;
  transactionDate: string;
  notes: string;
}

function getCreatedByDisplayName(): string {
  if (typeof window === 'undefined') return 'System';
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return 'Current User';
    const user = JSON.parse(raw) as { name?: string; username?: string; fullName?: string };
    return user?.name || user?.fullName || user?.username || 'Current User';
  } catch {
    return 'Current User';
  }
}

function mapRentalByNumberToAgreement(data: RentalByNumberApiData): RentalAgreement {
  const id = data.id || data.agreementNo || '';
  return {
    id,
    rentalId: data.rentalId,
    customerName: data.customerName ?? '',
    customerAddress: data.customerAddress ?? '',
    customerPhone: data.customerPhone ?? '',
    customerEmail: data.customerEmail ?? '',
    rentalStartDate: data.rentalStartDate ?? '',
    rentalEndDate: data.rentalEndDate ?? '',
    rentalPeriod: data.rentalPeriod ?? '',
    monthlyRate: Number(data.monthlyRate) || 0,
    totalAmount: Number(data.totalAmount) || 0,
    paidAmount: Number(data.paidAmount) || 0,
    outstandingAmount: Number(data.outstandingAmount) || 0,
    securityDeposit: Number(data.securityDeposit) || 0,
    dispatchedDate: data.dispatchedDate ?? '',
    expectedReturnDate: data.expectedReturnDate ?? '',
    machines: (data.machines ?? []).map((m) => ({
      id: String(m.id),
      model: m.model ?? '',
      serialNumber: m.serialNumber ?? '',
      boxNumber: m.boxNumber ?? '',
      description: m.description ?? '',
    })),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ScanResultType = 'success' | 'failed' | 'duplicate';
type Step = 1 | 2;
type Step2View = 'menu' | 'details' | 'scan';

const ReturnQRPage: React.FC = () => {
  const router = useRouter();

  // Flow
  const [step, setStep] = useState<Step>(1);
  const [view, setView] = useState<Step2View>('menu'); // only used when step === 2

  const [agreementNumberInput, setAgreementNumberInput] = useState('');
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);

  // Theme (light / dark) – same pattern as gatepass-qr-page
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Machines + return state
  const [machines, setMachines] = useState<MachineReturnState[]>([]);
  const [currentMachineIndex, setCurrentMachineIndex] = useState<number | null>(null);

  // Scanner
  const [scannerKey, setScannerKey] = useState(1);

  // Popup for scanned machine
  const [showMachinePopup, setShowMachinePopup] = useState(false);

  // Feedback + submit
  const [lastFeedback, setLastFeedback] = useState<{
    type: ScanResultType;
    title: string;
    message: string;
  } | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step2TopRef = useRef<HTMLDivElement | null>(null);

  // Recent inventory transactions (details view) – from GET /api/v1/inventory/transactions
  const [recentTransactions, setRecentTransactions] = useState<InventoryTransactionItem[]>([]);
  const [recentTransactionsLoading, setRecentTransactionsLoading] = useState(false);

  // Derived
  const totalMachines = machines.length;
  const scannedCount = useMemo(
    () => machines.filter((m) => m.scanned).length,
    [machines]
  );
  const allDone = useMemo(
    () => machines.length > 0 && machines.every((m) => m.scanned && m.returnType),
    [machines]
  );
  const canSubmit = allDone && !isSubmitting;

  // Cleanup (revoke photo URLs + timers)
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      machines.forEach((m) => m.photoPreviews?.forEach((p) => URL.revokeObjectURL(p)));
    };
  }, [machines]);

  // Theme init from localStorage + system preference (same as gatepass-qr-page)
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (savedTheme !== 'light' && systemPrefersDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  // Fetch recent inventory transactions when on details view (GET /api/v1/inventory/transactions)
  useEffect(() => {
    if (step !== 2 || view !== 'details') {
      return;
    }
    let cancelled = false;
    setRecentTransactionsLoading(true);
    authFetch(`${API_BASE}/inventory/transactions?limit=5&page=1`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const items = json?.data?.items?.transactions ?? json?.data?.transactions ?? json?.items ?? [];
        setRecentTransactions(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setRecentTransactions([]);
      })
      .finally(() => {
        if (!cancelled) setRecentTransactionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, view]);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const showFeedback = useCallback((fb: { type: ScanResultType; title: string; message: string }) => {
    setLastFeedback(fb);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 2500);
  }, []);

  const restartScannerSoon = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => setScannerKey((k) => k + 1), 450);
  }, []);

  const resetAll = () => {
    machines.forEach((m) => m.photoPreviews?.forEach((p) => URL.revokeObjectURL(p)));
    setStep(1);
    setView('menu');
    setAgreementNumberInput('');
    setAgreementError(null);
    setAgreementLoading(false);
    setSelectedAgreement(null);
    setMachines([]);
    setCurrentMachineIndex(null);
    setScannerKey((k) => k + 1);
    setLastFeedback(null);
    setIsSubmitting(false);
    setShowMachinePopup(false);
    setRecentTransactions([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step === 1) {
      router.push('/returns');
      return;
    }
    if (view === 'scan' || view === 'details') {
      setView('menu');
      setShowMachinePopup(false);
      return;
    }
    setStep(1);
    setView('menu');
  };

  // -------------------------------------------------------------------------
  // Step 1: Agreement lookup (GET /api/v1/rentals/by-number)
  // -------------------------------------------------------------------------

  const handleFindAgreement = async () => {
    const input = agreementNumberInput.trim();
    setAgreementError(null);

    if (!input) {
      setAgreementError('Please enter the rental agreement number.');
      return;
    }

    setAgreementLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE}/rentals/by-number?number=${encodeURIComponent(input)}`
      );
      const json = await res.json();

      if (!res.ok) {
        const message =
          json?.message ??
          (res.status === 404 ? 'Agreement not found. Please check the number.' : 'Failed to load agreement.');
        setAgreementError(message);
        setSelectedAgreement(null);
        setMachines([]);
        return;
      }

      const data = json?.data as RentalByNumberApiData | undefined;
      if (!data || !Array.isArray(data.machines) || data.machines.length === 0) {
        setAgreementError('Agreement has no machines assigned. Cannot process return.');
        setSelectedAgreement(null);
        setMachines([]);
        return;
      }

      const agreement = mapRentalByNumberToAgreement(data);
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
      setCurrentMachineIndex(null);
      setStep(2);
      setView('menu');
    } catch (_err) {
      setAgreementError('Network error. Please try again.');
      setSelectedAgreement(null);
      setMachines([]);
    } finally {
      setAgreementLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Machine helpers
  // -------------------------------------------------------------------------

  const updateMachineAtIndex = (
    index: number,
    updater: (m: MachineReturnState) => MachineReturnState
  ) => {
    setMachines((prev) => prev.map((m, i) => (i === index ? updater(m) : m)));
  };

  const handleReturnTypeChange = (index: number, type: ReturnCondition) => {
    updateMachineAtIndex(index, (m) => ({
      ...m,
      scanned: true,
      returnType: type,
    }));
  };

  const handleDamageNoteChange = (index: number, note: string) => {
    updateMachineAtIndex(index, (m) => ({ ...m, damageNote: note }));
  };

  const handlePhotoUpload = (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    updateMachineAtIndex(index, (m) => {
      const existingPreviews = m.photoPreviews || [];
      const newPreviews = fileArray.map((f) => URL.createObjectURL(f));
      return {
        ...m,
        photos: [...(m.photos || []), ...fileArray],
        photoPreviews: [...existingPreviews, ...newPreviews],
      };
    });
  };

  const handleRemovePhoto = (index: number, photoIndex: number) => {
    updateMachineAtIndex(index, (m) => {
      const photos = m.photos ? [...m.photos] : [];
      const previews = m.photoPreviews ? [...m.photoPreviews] : [];
      if (previews[photoIndex]) URL.revokeObjectURL(previews[photoIndex]);
      photos.splice(photoIndex, 1);
      previews.splice(photoIndex, 1);
      return { ...m, photos, photoPreviews: previews };
    });
  };

  const clearMachineState = (index: number) => {
    updateMachineAtIndex(index, (m) => ({
      ...m,
      scanned: false,
      returnType: undefined,
      damageNote: '',
      photos: [],
      photoPreviews: [],
    }));
  };

  // -------------------------------------------------------------------------
  // QR scan
  // -------------------------------------------------------------------------

  const handleScanSuccess = (decodedText: string) => {
    if (machines.length === 0) return;

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

    const foundIndex = machines.findIndex(
      (m) =>
        normalizeSerial(m.serialNumber) === serialNorm ||
        (parsed?.box && pairKey(m.serialNumber, m.boxNumber) === pairKey(parsed.serial, parsed.box))
    );

    if (foundIndex === -1) {
      showFeedback({
        type: 'failed',
        title: 'Not in this agreement',
        message: `Serial ${serialNorm} is not in this return.`,
      });
      restartScannerSoon();
      return;
    }

    const machine = machines[foundIndex];

    // Open popup for this machine
    setCurrentMachineIndex(foundIndex);

    // If not scanned yet, default to Good
    if (!machine.scanned) {
      updateMachineAtIndex(foundIndex, (m) => ({
        ...m,
        scanned: true,
        returnType: m.returnType ?? 'Good',
      }));
    }

    setShowMachinePopup(true);

    showFeedback({
      type: 'success',
      title: 'Matched',
      message: `${serialNorm} recorded. Select return type & proof.`,
    });

    // Scanner will restart after popup closes; no need to immediately restart here
  };

  // -------------------------------------------------------------------------
  // Submit (POST /api/v1/returns)
  // -------------------------------------------------------------------------

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
      const body = {
        ...(selectedAgreement.rentalId && { rentalId: selectedAgreement.rentalId }),
        ...(!selectedAgreement.rentalId && { agreementId: selectedAgreement.id }),
        customerName: selectedAgreement.customerName,
        totalMachines: machines.length,
        createdBy: getCreatedByDisplayName(),
        notes: '',
        machines: machines.map((m) => ({
          serialNumber: m.serialNumber,
          boxNumber: m.boxNumber ?? '',
          model: m.model,
          description: m.description,
          returnType: m.returnType as ReturnCondition,
          damageNote:
            m.returnType === 'Damage' || m.returnType === 'Missing' ? (m.damageNote ?? '') : undefined,
          photosCount:
            m.returnType === 'Damage' || m.returnType === 'Missing'
              ? (m.photos || []).length
              : 0,
        })),
      };

      const res = await authFetch(`${API_BASE}/returns`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        const message = json?.message ?? 'Failed to create return.';
        const errors = json?.data as Record<string, string[]> | undefined;
        const details =
          errors && typeof errors === 'object'
            ? Object.values(errors)
                .flat()
                .filter(Boolean)
                .join(' ')
            : '';
        alert(details ? `${message} ${details}` : message);
        return;
      }

      const created = json?.data as CreateReturnApiResponse | undefined;
      const returnNumber = created?.returnNumber ?? 'Return';
      const returnId = created?.id;

      if (returnId) {
        try {
          const getRes = await authFetch(`${API_BASE}/returns/${returnId}`);
          if (getRes.ok) {
            const getJson = await getRes.json();
            if (getJson?.data) {
              // Optional: use full return record for confirmation
            }
          }
        } catch {
          // Non-blocking: we already have success
        }
      }

      alert(`Return ${returnNumber} created successfully.`);
      resetAll();
      router.push('/returns');
    } catch (e) {
      console.error(e);
      alert('Failed to create return. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderScanFeedback = () => {
    if (!lastFeedback) return null;
    const styles =
      lastFeedback.type === 'success'
        ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-100'
        : lastFeedback.type === 'duplicate'
        ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-500/60 text-amber-800 dark:text-amber-100'
        : 'bg-red-100 dark:bg-red-950/60 border-red-400 dark:border-red-500/60 text-red-800 dark:text-red-100';
    return (
      <div
        className={`p-3 rounded-xl border ${styles} shadow-lg backdrop-blur-sm`}
        role="status"
        aria-live="polite"
      >
        <div className="font-semibold text-sm break-words">{lastFeedback.title}</div>
        <div className="text-xs mt-1 opacity-90 break-words">{lastFeedback.message}</div>
      </div>
    );
  };

  const renderMachinePopup = () => {
    if (
      !showMachinePopup ||
      currentMachineIndex == null ||
      currentMachineIndex < 0 ||
      currentMachineIndex >= machines.length
    ) {
      return null;
    }

    const machine = machines[currentMachineIndex];
    const isDamage = machine.returnType === 'Damage' || machine.returnType === 'Missing';
    const uploadId = `photo-upload-${machine.id}`;
    const cameraId = `photo-camera-${machine.id}`;

    const handleClose = () => {
      setShowMachinePopup(false);
      restartScannerSoon();
    };

    return (
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
        <div className="w-full sm:max-w-md bg-white dark:bg-slate-950 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 max-h-[85vh] flex flex-col shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">Machine return details</p>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-slate-300">
                Serial:{' '}
                <span className="font-mono text-gray-900 dark:text-slate-50 break-all">{machine.serialNumber}</span>
              </p>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1">
                Box:{' '}
                <span className="font-mono text-gray-800 dark:text-slate-100 break-all">{machine.boxNumber}</span>
              </p>
            </div>

            <div>
              <p className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Return type</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['Good', 'Standard', 'Damage', 'Missing', 'Exchange'] as ReturnCondition[]).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleReturnTypeChange(currentMachineIndex, type)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        machine.returnType === type
                          ? 'border-blue-500 bg-blue-600/20 dark:bg-blue-600/30 text-blue-800 dark:text-blue-100 shadow-sm'
                          : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/60 text-gray-800 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500/70'
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
                  <p className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Damage / missing note (required)
                  </p>
                  <textarea
                    value={machine.damageNote || ''}
                    onChange={(e) => handleDamageNoteChange(currentMachineIndex, e.target.value)}
                    rows={3}
                    placeholder="Describe the damage or missing parts..."
                    className="w-full min-h-[80px] px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900/60 text-xs text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  />
                </div>

                <div>
                  <p className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    Photos (required, use camera or gallery)
                  </p>

                  {/* Hidden inputs: camera + gallery */}
                  <input
                    id={cameraId}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(currentMachineIndex, e.target.files)}
                  />
                  <input
                    id={uploadId}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(currentMachineIndex, e.target.files)}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <label
                      htmlFor={cameraId}
                      className="min-h-[40px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/70 text-xs font-medium text-gray-800 dark:text-slate-100 cursor-pointer hover:border-blue-400 hover:bg-gray-100 dark:hover:bg-slate-900"
                    >
                      <Camera className="w-4 h-4" />
                      Take photo
                    </label>
                    <label
                      htmlFor={uploadId}
                      className="min-h-[40px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/70 text-xs font-medium text-gray-800 dark:text-slate-100 cursor-pointer hover:border-blue-400 hover:bg-gray-100 dark:hover:bg-slate-900"
                    >
                      <ImagePlus className="w-4 h-4" />
                      Gallery
                    </label>
                  </div>

                  {machine.photoPreviews && machine.photoPreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {machine.photoPreviews.map((src, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`Proof ${idx + 1}`}
                            className="w-full h-full object-cover rounded-lg border border-gray-300 dark:border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(currentMachineIndex, idx)}
                            className="absolute top-1 right-1 p-1.5 rounded-md bg-red-600/90 text-white hover:bg-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                clearMachineState(currentMachineIndex);
                handleClose();
              }}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-medium text-gray-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-slate-900"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 min-h-[40px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-emerald-950 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save & continue scanning
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render: Step 1 (agreement input)
// ---------------------------------------------------------------------------

  if (step === 1) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-950/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 mr-2 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition-colors text-gray-700 dark:text-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Scan className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Return Machine QR
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Enter rental agreement number to start the return process
              </p>
            </div>
          </div>
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
              aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-8">
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-slate-700/70 p-6 space-y-4 shadow-sm dark:shadow-xl dark:shadow-slate-950/60">
              <label
                htmlFor="agreement-input"
                className="block text-sm font-medium text-gray-700 dark:text-slate-200"
              >
                Rental agreement number
              </label>
              <input
                id="agreement-input"
                type="text"
                autoComplete="off"
                value={agreementNumberInput}
                onChange={(e) => {
                  setAgreementNumberInput(e.target.value);
                  setAgreementError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleFindAgreement()}
                placeholder="e.g. AGR-2024-001"
                className="w-full min-h-[52px] px-4 py-3 text-base border rounded-xl bg-gray-50 dark:bg-slate-800/80 text-gray-900 dark:text-slate-50 border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder-slate-500"
                autoFocus
              />
              {agreementError && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2" role="alert">
                  <span className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full" />
                  {agreementError}
                </p>
              )}

              <button
                type="button"
                onClick={handleFindAgreement}
                disabled={agreementLoading}
                className="w-full min-h-[52px] px-4 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {agreementLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    Find Agreement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Step 2 menu: after agreement found, two buttons
  // -------------------------------------------------------------------------

  if (step === 2 && view === 'menu' && selectedAgreement) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-950/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 mr-2 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition-colors text-gray-700 dark:text-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Scan className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Return Machine QR
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Agreement {selectedAgreement.id} · {selectedAgreement.customerName}
              </p>
            </div>
          </div>
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
              aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-8">
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-slate-700/70 p-5 space-y-3 shadow-sm dark:shadow-xl dark:shadow-slate-950/60">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">What would you like to do?</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                You can first review agreement details, or start scanning machine QR codes.
              </p>

              <button
                type="button"
                onClick={() => setView('details')}
                className="w-full min-h-[48px] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600 dark:text-slate-300" />
                  View agreement details
                </span>
                <span className="text-[11px] text-gray-500 dark:text-slate-400">
                  {machines.length} machine{machines.length !== 1 ? 's' : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setView('scan');
                  setScannerKey((k) => k + 1);
                }}
                className="w-full min-h-[52px] px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Start QR Scan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Step 2 view: agreement details + submit
  // -------------------------------------------------------------------------

  if (step === 2 && view === 'details' && selectedAgreement) {
    const progressPct = totalMachines > 0 ? (scannedCount / totalMachines) * 100 : 0;

    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col transition-colors">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-950/85 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition-colors text-gray-700 dark:text-white"
            aria-label="Go back to menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Agreement details</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">#{selectedAgreement.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-300" />
          </div>
        </div>

        <div className="flex-1 bg-gray-50/80 dark:bg-slate-900/40 backdrop-blur-sm px-4 py-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Summary */}
            <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 space-y-2 shadow-sm dark:shadow-none">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {selectedAgreement.customerName}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{selectedAgreement.customerAddress}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Period: {selectedAgreement.rentalStartDate} → {selectedAgreement.rentalEndDate}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Machines: {machines.length} · Verified: {scannedCount}/{totalMachines}
              </p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      allDone ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Machine list */}
            <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">Machines</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  {scannedCount}/{totalMachines} verified
                </p>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {machines.map((m, idx) => (
                  <div
                    key={m.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800/80 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-[11px] text-gray-600 dark:text-slate-300">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-slate-100 truncate">
                          {m.serialNumber}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                          Box {m.boxNumber || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.scanned && m.returnType ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          {m.returnType}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 dark:text-slate-400">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
                {machines.length === 0 && (
                  <div className="py-6 px-4 text-center text-xs text-gray-500 dark:text-slate-500">
                    No machines found for this agreement.
                  </div>
                )}
              </div>
            </div>

            {/* Recent stock activity (GET /api/v1/inventory/transactions) */}
            <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">Recent stock activity</p>
              </div>
              <div className="max-h-[140px] overflow-y-auto px-4 py-2">
                {recentTransactionsLoading ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-xs text-gray-500 dark:text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : recentTransactions.length === 0 ? (
                  <p className="text-[11px] text-gray-500 dark:text-slate-500 py-2">No recent transactions</p>
                ) : (
                  <ul className="space-y-1.5">
                    {recentTransactions.slice(0, 5).map((tx) => (
                      <li
                        key={tx.id}
                        className="text-[11px] text-gray-700 dark:text-slate-300 flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {tx.brand} {tx.model} · {tx.transactionType}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 shrink-0">
                          {tx.transactionDate} ({tx.quantity})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pb-4">
              <button
                type="button"
                onClick={handleSubmitReturn}
                disabled={!canSubmit}
                className={`w-full min-h-[52px] px-5 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  canSubmit
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-900/30 dark:shadow-emerald-900/40 active:scale-[0.98]'
                    : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-950 border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Submit return summary
                  </>
                )}
              </button>
              {!allDone && (
                <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-400 text-center">
                  All machines must be scanned and have a return type before submitting.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Step 2 view: full-screen scanner
  // -------------------------------------------------------------------------

  if (step === 2 && view === 'scan' && selectedAgreement) {
    const progressPct = totalMachines > 0 ? (scannedCount / totalMachines) * 100 : 0;

    return (
      <div className="min-h-screen w-full bg-gray-900 dark:bg-black flex flex-col transition-colors">
        {/* Header */}
        <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition-colors text-gray-700 dark:text-white"
            aria-label="Back to menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Scan machine QR</h1>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              {scannedCount}/{totalMachines} verified
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
            <Camera className="w-5 h-5 text-blue-600 dark:text-blue-300" />
          </div>
        </div>

        {/* Scanner full screen */}
        <div
          ref={step2TopRef}
          className="relative flex-1 bg-gray-900 dark:bg-black"
        >
          <QRScannerComponent
            key={scannerKey}
            onScanSuccess={handleScanSuccess}
            autoClose={false}
            showCloseButton={false}
            title=""
            subtitle=""
            embedded
          />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center px-4">
            <p className="text-sm text-gray-100 dark:text-slate-100 font-medium">Align QR code inside the frame</p>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
              When a machine is detected, a pop-up will appear to select return type.
            </p>
          </div>

          {/* Progress strip at bottom */}
          <div className="absolute bottom-4 left-0 right-0 px-4 space-y-2">
            <div className="w-full bg-gray-700 dark:bg-slate-800/70 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  allDone ? 'bg-emerald-400' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-300 dark:text-slate-300 text-center">
              For damaged or missing machines, add note and photos in the pop-up.
            </p>
          </div>
        </div>

        {/* Feedback toast (top of scanner) */}
        <div className="pointer-events-none fixed inset-x-0 top-[72px] px-4 z-30 flex justify-center">
          {lastFeedback && <div className="pointer-events-auto">{renderScanFeedback()}</div>}
        </div>

        {/* Machine popup */}
        {renderMachinePopup()}
      </div>
    );
  }

  return null;
};

export default ReturnQRPage;