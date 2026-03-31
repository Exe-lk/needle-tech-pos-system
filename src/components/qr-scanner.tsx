'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  CameraOff,
  Loader2,
  ScanLine
} from 'lucide-react';

interface QRScannerComponentProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
  autoClose?: boolean;
  showCloseButton?: boolean;
  title?: string;
  subtitle?: string;
  onError?: (error: string) => void;
  /** When true, scanner fills its container (e.g. modal). No min-h-screen; responsive for mobile. */
  embedded?: boolean;
}

const QRScannerComponent: React.FC<QRScannerComponentProps> = ({ 
  onScanSuccess, 
  onClose,
  autoClose = true,
  showCloseButton = true,
  title = 'QR Code Scanner',
  subtitle,
  onError,
  embedded = false,
}) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [overlayExpanded, setOverlayExpanded] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Responsive QR box size calculation (smaller when embedded in modal)
  const getQRBoxSize = useCallback(() => {
    if (typeof window === 'undefined') return embedded ? 180 : 250;
    const width = window.innerWidth;
    if (embedded) {
      if (width < 400) return 160;
      if (width < 640) return 180;
      if (width < 1024) return 220;
      return 260;
    }
    if (width < 640) return 200; // Mobile
    if (width < 1024) return 250; // Tablet
    return 300; // Desktop
  }, [embedded]);

  useEffect(() => {
    isMountedRef.current = true;
    checkCameraPermission();
    return () => {
      isMountedRef.current = false;
      stopScanning();
    };
  }, []);

  // Start/stop scanner when switching between inline and overlay (e.g. embedded in overflow-hidden)
  useEffect(() => {
    const timer = setTimeout(() => startScanning(), 150);
    return () => {
      clearTimeout(timer);
      stopScanning();
    };
  }, [overlayExpanded]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    events.forEach(event => {
      document.addEventListener(event, handleFullscreenChange);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleFullscreenChange);
      });
    };
  }, []);

  // Handle window resize for responsive QR box
  useEffect(() => {
    const handleResize = () => {
      if (scanning && scannerRef.current) {
        // Restart with new size if needed
        const newSize = getQRBoxSize();
        // Note: html5-qrcode doesn't support dynamic resizing, so we'd need to restart
        // For now, we'll just update the visual feedback
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scanning, getQRBoxSize]);

  const checkCameraPermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(result.state);
        
        result.onchange = () => {
          setCameraPermission(result.state);
        };
      }
    } catch (err) {
      // Permissions API not supported, continue anyway
    }
  };

  const startScanning = async () => {
    if (isStartingRef.current) return;
    
    try {
      isStartingRef.current = true;
      setError(null);
      setLastScanResult(null);
      setIsInitializing(true);
      
      await stopScanning();

      const html5QrCode = new Html5Qrcode("qr-reader-scanner");
      scannerRef.current = html5QrCode;

      const qrboxSize = getQRBoxSize();
      const scannerConfig = {
        fps: 10,
        qrbox: { width: qrboxSize, height: qrboxSize },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      const onDecode = (decodedText: string) => {
        if (isMountedRef.current) {
          handleScanSuccess(decodedText);
        }
      };

      const onScanError = () => {
        // Ignore scan frame errors (non-fatal while trying to detect QR)
      };

      // Try preferred camera first, then fall back to any available device.
      let startError: any = null;
      const candidateCameraConfigs: Array<string | { facingMode: string }> = [
        { facingMode: 'environment' },
        { facingMode: 'user' },
      ];

      try {
        const devices = await Html5Qrcode.getCameras();
        if (Array.isArray(devices) && devices.length > 0) {
          // Use first discovered camera as a final fallback.
          candidateCameraConfigs.push(devices[0].id);
        }
      } catch {
        // If camera enumeration fails, keep facingMode fallbacks only.
      }

      for (const cameraConfig of candidateCameraConfigs) {
        try {
          await html5QrCode.start(cameraConfig as any, scannerConfig as any, onDecode, onScanError);
          startError = null;
          break;
        } catch (err: any) {
          startError = err;
        }
      }

      if (startError) {
        throw startError;
      }

      if (isMountedRef.current) {
        setScanning(true);
        setIsInitializing(false);
        isStartingRef.current = false;
        retryCountRef.current = 0;
      }
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      retryCountRef.current += 1;
      
      if (isMountedRef.current) {
        const rawMessage = String(err?.message || err || '');
        const errorMessage = rawMessage.includes('NotAllowedError')
          ? 'Camera permission denied. Please allow camera access in browser/site settings.'
          : rawMessage.includes('NotFoundError')
            ? 'No camera device was found on this device/browser.'
            : rawMessage.includes('NotReadableError')
              ? 'Camera is in use by another app or browser tab. Please close other camera apps and retry.'
              : (rawMessage || 'Failed to start camera. Please check permissions.');
        setError(errorMessage);
        setScanning(false);
        setIsInitializing(false);
        isStartingRef.current = false;
        
        if (onError) {
          onError(errorMessage);
        }

        // Auto-retry logic for certain errors
        if (retryCountRef.current < maxRetries && 
            (errorMessage.includes('NotFoundError') || errorMessage.includes('NotAllowedError'))) {
          setTimeout(() => {
            if (isMountedRef.current) {
              startScanning();
            }
          }, 1000);
        }
      }
    }
  };

  const stopScanning = async () => {
    if (isStoppingRef.current) return;
    
    try {
      isStoppingRef.current = true;
      
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (err: any) {
          const errorMessage = err?.message || err?.toString() || '';
          if (
            !errorMessage.includes('not running') && 
            !errorMessage.includes('not started') &&
            !errorMessage.includes('Cannot stop')
          ) {
            console.error('Error stopping scanner:', err);
          }
        }
        
        try {
          scannerRef.current.clear();
        } catch (clearErr) {
          // Ignore clear errors
        }
        
        scannerRef.current = null;
      }
      
      if (isMountedRef.current) {
        setScanning(false);
      }
      isStoppingRef.current = false;
    } catch (err) {
      scannerRef.current = null;
      if (isMountedRef.current) {
        setScanning(false);
      }
      isStoppingRef.current = false;
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    setLastScanResult(decodedText);
    stopScanning();
    onScanSuccess(decodedText);
    
    if (autoClose && onClose) {
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const handleRescan = () => {
    setLastScanResult(null);
    setError(null);
    retryCountRef.current = 0;
    startScanning();
  };

  const toggleFullscreen = async () => {
    if (overlayExpanded) {
      setOverlayExpanded(false);
      return;
    }
    if (isFullscreen) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      } catch {
        // ignore
      }
      return;
    }
    const element = containerRef.current;
    if (element) {
      const requestFs =
        element.requestFullscreen ||
        (element as any).webkitRequestFullscreen ||
        (element as any).mozRequestFullScreen ||
        (element as any).msRequestFullscreen;
      if (requestFs) {
        try {
          await requestFs.call(element);
        } catch {
          // Fullscreen API failed (e.g. element inside overflow:hidden) – use overlay fallback
          await stopScanning();
          setOverlayExpanded(true);
        }
      } else {
        await stopScanning();
        setOverlayExpanded(true);
      }
    } else {
      await stopScanning();
      setOverlayExpanded(true);
    }
  };

  const wrapperClass = embedded
    ? 'relative w-full h-full min-h-0 min-w-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center overflow-hidden p-2 sm:p-3'
    : 'relative w-full min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-3 sm:p-4 md:p-6';

  const scannerBody = (
    <>
      {/* Header - hide when embedded (parent modal provides header) */}
      {!embedded && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-black/60 backdrop-blur-md border-b border-white/10 p-3 sm:p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm text-white/70 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {showCloseButton && onClose && (
                <button
                  onClick={onClose}
                  className="p-2 sm:p-2.5 text-white hover:bg-white/20 rounded-lg transition-all duration-200 active:scale-95"
                  title="Close Scanner"
                  aria-label="Close Scanner"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="max-w-md w-full mb-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4 z-10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-1">Camera Error</p>
              <p className="text-sm break-words">{error}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={startScanning}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {/* {lastScanResult && !scanning && (
        <div className="max-w-md w-full mb-4 bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded-xl p-4 z-10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-1">Scan Successful!</p>
              <p className="text-xs sm:text-sm break-all font-mono bg-white/50 dark:bg-black/30 p-2 rounded mt-2">
                {lastScanResult}
              </p>
              {!autoClose && (
                <button
                  onClick={handleRescan}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Scan Another</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )} */}

      {/* Scanner Container - when embedded: outer flex-1 centers inner square; when standalone: single box */}
      {embedded ? (
        <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1 sm:p-2">
          <div
            className="relative bg-black overflow-hidden shadow-2xl rounded-lg sm:rounded-xl w-full max-w-full max-h-full aspect-square"
            style={{ minWidth: 0, minHeight: 0 }}
          >
            <div id="qr-reader-scanner" className="w-full h-full min-h-0 min-w-0"></div>
        
        {/* Scanning Overlay - responsive corner size when embedded */}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Animated scanning line */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute left-0 right-0 h-0.5 bg-blue-500/80 shadow-lg shadow-blue-500/50 animate-scan-line"></div>
            </div>
            
            {/* Corner indicators - smaller on mobile/embedded */}
            <div className={`absolute border-blue-500 rounded-tl-lg shadow-lg shadow-blue-500/50 ${embedded ? 'top-1.5 left-1.5 sm:top-2 sm:left-2 w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-l-2 sm:border-t-[3px] sm:border-l-[3px]' : 'top-3 left-3 sm:top-4 sm:left-4 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4'}`}></div>
            <div className={`absolute border-blue-500 rounded-tr-lg shadow-lg shadow-blue-500/50 ${embedded ? 'top-1.5 right-1.5 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 border-t-2 border-r-2 sm:border-t-[3px] sm:border-r-[3px]' : 'top-3 right-3 sm:top-4 sm:right-4 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4'}`}></div>
            <div className={`absolute border-blue-500 rounded-bl-lg shadow-lg shadow-blue-500/50 ${embedded ? 'bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-l-2 sm:border-b-[3px] sm:border-l-[3px]' : 'bottom-3 left-3 sm:bottom-4 sm:left-4 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4'}`}></div>
            <div className={`absolute border-blue-500 rounded-br-lg shadow-lg shadow-blue-500/50 ${embedded ? 'bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 border-b-2 border-r-2 sm:border-b-[3px] sm:border-r-[3px]' : 'bottom-3 right-3 sm:bottom-4 sm:right-4 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4'}`}></div>
            
            {/* Center instruction - compact when embedded */}
            <div className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 ${embedded ? 'bottom-[15%]' : 'bottom-1/4'}`}>
              <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 sm:px-4 sm:py-2">
                <p className="text-white text-[10px] sm:text-xs font-medium flex items-center justify-center gap-1.5 sm:space-x-2 whitespace-nowrap">
                  <ScanLine className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse shrink-0" />
                  <span>Position QR code here</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isInitializing && !error && !lastScanResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-center text-white">
              <div className="relative mb-4">
                <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 animate-spin mx-auto text-blue-500" />
                <Camera className="w-6 h-6 sm:w-8 sm:h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white" />
              </div>
              <p className="text-base sm:text-lg font-medium">Initializing camera...</p>
              <p className="text-xs sm:text-sm text-gray-300 mt-2">Please allow camera access</p>
              {cameraPermission === 'denied' && (
                <p className="text-xs text-red-300 mt-2">Camera permission denied. Please enable it in settings.</p>
              )}
            </div>
          </div>
        )}

        {/* No Camera State */}
        {!scanning && !isInitializing && !error && !lastScanResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-center text-white">
              <CameraOff className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-base sm:text-lg font-medium">Camera not available</p>
              <button
                onClick={startScanning}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}
          </div>
        </div>
      ) : (
      <div
        className="relative bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl w-full"
        style={{ maxWidth: 'min(600px, 95vw)', aspectRatio: '1 / 1' }}
      >
        <div id="qr-reader-scanner" className="w-full h-full min-h-0 min-w-0"></div>
        {/* Scanning Overlay - standalone */}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute left-0 right-0 h-0.5 bg-blue-500/80 shadow-lg shadow-blue-500/50 animate-scan-line"></div>
            </div>
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg shadow-lg shadow-blue-500/50"></div>
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg shadow-lg shadow-blue-500/50"></div>
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg shadow-lg shadow-blue-500/50"></div>
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg shadow-lg shadow-blue-500/50"></div>
            <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white text-xs sm:text-sm font-medium flex items-center space-x-2">
                  <ScanLine className="w-4 h-4 animate-pulse" />
                  <span>Position QR code here</span>
                </p>
              </div>
            </div>
          </div>
        )}
        {isInitializing && !error && !lastScanResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-center text-white">
              <div className="relative mb-4">
                <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 animate-spin mx-auto text-blue-500" />
                <Camera className="w-6 h-6 sm:w-8 sm:h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white" />
              </div>
              <p className="text-base sm:text-lg font-medium">Initializing camera...</p>
              <p className="text-xs sm:text-sm text-gray-300 mt-2">Please allow camera access</p>
              {cameraPermission === 'denied' && (
                <p className="text-xs text-red-300 mt-2">Camera permission denied. Please enable it in settings.</p>
              )}
            </div>
          </div>
        )}
        {!scanning && !isInitializing && !error && !lastScanResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-center text-white">
              <CameraOff className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-base sm:text-lg font-medium">Camera not available</p>
              <button
                onClick={startScanning}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Instructions - hide when embedded to save space */}
      {!embedded && (
        <div className="max-w-md w-full mt-4 sm:mt-6 text-center text-white/80 text-xs sm:text-sm space-y-1.5 sm:space-y-2">
          <p className="flex items-center justify-center space-x-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            <span>Position the QR code within the scanning area</span>
          </p>
          <p className="flex items-center justify-center space-x-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            <span>Ensure good lighting for better scanning</span>
          </p>
          <p className="flex items-center justify-center space-x-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            <span>Hold the device steady</span>
          </p>
        </div>
      )}
    </>
  );

  if (overlayExpanded && typeof document !== 'undefined') {
    return createPortal(
      <div className={`fixed inset-0 z-[9999] overflow-auto safe-area-inset ${wrapperClass}`}>
        {scannerBody}
      </div>,
      document.body
    );
  }
  return (
    <div ref={containerRef} className={wrapperClass}>
      {scannerBody}
    </div>
  );
};

export default QRScannerComponent;