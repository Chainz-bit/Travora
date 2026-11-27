import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '../../components/ui/Button';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  XIcon,
} from '../../components/ui/Icons';
import { formatCurrency } from '../../lib/utils';
import {
  API_BASE_URL,
  formatDateTimeWIB,
  getAuthHeaders,
  type ApiEnvelope,
  type Ticket,
} from './types';
import { playErrorBeep, playSuccessBeep } from './audioFeedback';

const SCANNER_ELEMENT_ID = 'travora-qr-scanner-viewfinder';
const COOLDOWN_MS = 3000;

interface ScanFeedback {
  status: 'success' | 'error';
  title: string;
  message: string;
  orderCode: string;
  ticket?: Ticket;
  timestamp: string;
}

function CameraLineIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function OperatorScanPage() {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // Hitung mundur visual jeda cooldown 3 detik agar operator melihat status siap scan berikutnya.
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const intervalId = window.setInterval(() => {
      const remaining = cooldownUntilRef.current - Date.now();
      if (remaining <= 0) {
        setCooldownSeconds(0);
      } else {
        setCooldownSeconds(Math.ceil(remaining / 1000));
      }
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [cooldownSeconds]);

  const activateCooldown = useCallback(() => {
    cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
    setCooldownSeconds(Math.ceil(COOLDOWN_MS / 1000));
  }, []);

  const submitScan = useCallback(
    async (rawCode: string, fromCamera: boolean) => {
      const orderCode = rawCode.trim();
      if (!orderCode) return;

      // Cegah request bertumpuk atau spam kamera selama cooldown 3 detik berlangsung.
      if (isProcessingRef.current) return;
      if (fromCamera && Date.now() < cooldownUntilRef.current) {
        return;
      }

      isProcessingRef.current = true;
      setSubmitting(true);

      try {
        const res = await fetch(`${API_BASE_URL}/api/tickets/scan`, {
          method: 'POST',
          credentials: 'include',
          headers: getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ order_code: orderCode }),
        });

        const json = (await res.json()) as ApiEnvelope<Ticket>;
        const nowWIB = new Intl.DateTimeFormat('id-ID', {
          timeStyle: 'medium',
          timeZone: 'Asia/Jakarta',
        }).format(new Date());

        if (res.ok && json.success && json.data) {
          playSuccessBeep();
          setFeedback({
            status: 'success',
            title: 'Check-in Berhasil!',
            message: 'Tiket valid. Status telah diperbarui menjadi used.',
            orderCode,
            ticket: json.data,
            timestamp: nowWIB,
          });
        } else {
          playErrorBeep();
          setFeedback({
            status: 'error',
            title: 'Check-in Ditolak',
            message:
              json.error?.message ||
              `Validasi gagal dengan status HTTP ${res.status}`,
            orderCode,
            timestamp: nowWIB,
          });
        }
      } catch {
        playErrorBeep();
        setFeedback({
          status: 'error',
          title: 'Koneksi API Gagal',
          message:
            'Tidak dapat menghubungi server backend Go. Pastikan server berjalan di port 8080.',
          orderCode,
          timestamp: new Date().toLocaleTimeString('id-ID'),
        });
      } finally {
        activateCooldown();
        isProcessingRef.current = false;
        setSubmitting(false);
      }
    },
    [activateCooldown]
  );

  const stopCamera = useCallback(async () => {
    const instance = scannerRef.current;
    if (!instance) {
      setCameraActive(false);
      return;
    }

    try {
      if (instance.isScanning) {
        await instance.stop();
      }
      instance.clear();
    } catch {
      // Abaikan error pembersihan instance kamera saat komponen sedang dihentikan.
    } finally {
      scannerRef.current = null;
      setCameraActive(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    await stopCamera();

    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          void submitScan(decodedText, true);
        },
        () => {
          // Abaikan error per-frame sebelum QR Code berada di area kotak scan.
        }
      );

      setCameraActive(true);
    } catch (err) {
      scannerRef.current = null;
      setCameraActive(false);
      setCameraError(
        err instanceof Error
          ? `Kamera tidak dapat dijalankan: ${err.message}. Silakan gunakan form input manual di bawah.`
          : 'Kamera tidak ditemukan atau izin ditolak. Gunakan form input manual di bawah.'
      );
    }
  }, [stopCamera, submitScan]);

  useEffect(() => {
    return () => {
      const instance = scannerRef.current;
      if (instance) {
        if (instance.isScanning) {
          void instance
            .stop()
            .then(() => instance.clear())
            .catch(() => {});
        }
      }
    };
  }, []);

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || cooldownSeconds > 0 || submitting) return;
    void submitScan(manualCode, false);
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Page Header */}
      <div className="border-b border-stone-200/80 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-primary mb-1.5">
          <CameraLineIcon className="size-4" />
          <span>Petugas Loket &bull; Validasi Check-in</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
          Scan QR Check-in Tiket
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Pindai QR Code pengunjung melalui kamera atau input kode pesanan secara manual untuk verifikasi masuk acara.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Side: Live Camera + Manual Input */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-lg font-bold text-stone-950">
                Kamera Scanner Live
              </h2>

              {!cameraActive ? (
                <Button variant="primary" size="sm" onClick={startCamera}>
                  Aktifkan Kamera
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={stopCamera}>
                  Matikan Kamera
                </Button>
              )}
            </div>

            {cooldownSeconds > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800">
                <ClockIcon className="size-4 shrink-0 text-amber-600 animate-pulse" />
                <span>
                  Cooldown anti double-scan aktif: tunggu {cooldownSeconds} detik sebelum scan berikutnya...
                </span>
              </div>
            )}

            <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-950 min-h-[280px] flex items-center justify-center">
              <div id={SCANNER_ELEMENT_ID} className="w-full" />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-stone-400">
                  <CameraLineIcon className="size-10 mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-stone-200">
                    Kamera Scanner Belum Aktif
                  </p>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs">
                    Tekan tombol &ldquo;Aktifkan Kamera&rdquo; untuk memulai pemindaian QR, atau gunakan form input manual di bawah.
                  </p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircleIcon className="size-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Manual Order Code Form */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="font-serif text-base font-bold text-stone-950">
                Input Manual Order Code
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Mempermudah pengujian di laptop tanpa mengarahkan QR ke kamera.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Contoh: TKT-20261127-001"
                className="travora-input-field flex-1 h-10 px-3.5 rounded-xl border text-sm font-mono focus:ring-2 focus:ring-primary/20"
                disabled={submitting}
              />
              <Button
                type="submit"
                variant="secondary"
                size="md"
                isLoading={submitting}
                disabled={!manualCode.trim() || cooldownSeconds > 0}
              >
                {cooldownSeconds > 0 ? `Jeda (${cooldownSeconds}s)` : 'Validasi Check-in'}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Side: Big Visual Feedback Card */}
        <div className="lg:col-span-6">
          {!feedback ? (
            <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white p-10 text-center min-h-[340px] flex flex-col items-center justify-center">
              <div className="size-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-500 mb-3">
                <CameraLineIcon className="size-7" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Siap Memindai Tiket
              </h3>
              <p className="text-sm text-stone-500 mt-1 max-w-sm">
                Status validasi check-in (kartu hijau besar jika berhasil, kartu merah besar jika ditolak) akan tampil di sini beserta bunyi notifikasi.
              </p>
            </div>
          ) : feedback.status === 'success' ? (
            <div
              role="status"
              className="rounded-2xl border-2 border-emerald-500 bg-emerald-600 p-6 sm:p-8 text-white shadow-xl space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-2xl bg-white/20 p-3 shrink-0">
                  <CheckCircle2Icon className="size-9 text-white" />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-emerald-100 font-bold">
                    Check-in Valid &bull; {feedback.timestamp}
                  </p>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold mt-0.5">
                    {feedback.title}
                  </h2>
                </div>
              </div>

              <p className="rounded-xl bg-emerald-700/70 border border-emerald-400/40 px-4 py-3 text-sm sm:text-base font-medium text-emerald-50">
                {feedback.message}
              </p>

              {feedback.ticket && (
                <div className="rounded-xl bg-white p-4 sm:p-5 text-stone-900 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>Kode Tiket</span>
                    <span className="font-mono font-bold text-stone-950">
                      {feedback.ticket.order_code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-500 gap-4">
                    <span>Event</span>
                    <span className="font-semibold text-stone-950 text-right">
                      {feedback.ticket.event_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>Harga Tiket</span>
                    <span className="font-semibold text-stone-950">
                      {formatCurrency(feedback.ticket.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                    <span>Waktu Check-in</span>
                    <span className="font-semibold text-emerald-700">
                      {formatDateTimeWIB(feedback.ticket.scanned_at)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              role="alert"
              className="rounded-2xl border-2 border-red-500 bg-red-600 p-6 sm:p-8 text-white shadow-xl space-y-5"
            >
              <div className="flex items-center gap-3.5">
                <div className="rounded-2xl bg-white/20 p-3 shrink-0">
                  <XIcon className="size-9 text-white" />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-red-100 font-bold">
                    Check-in Gagal &bull; {feedback.timestamp}
                  </p>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold mt-0.5">
                    {feedback.title}
                  </h2>
                </div>
              </div>

              <div className="rounded-xl bg-red-800/75 border border-red-400/40 px-4 py-4 space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-red-200 font-bold block">
                  Alasan Penolakan
                </span>
                <p className="text-base sm:text-lg font-bold text-white">
                  {feedback.message}
                </p>
                <p className="font-mono text-xs text-red-200 pt-1">
                  Order Code: {feedback.orderCode}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
