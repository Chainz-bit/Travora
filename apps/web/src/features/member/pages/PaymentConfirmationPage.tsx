import { useState, useEffect, useMemo, useCallback } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { BookingViewModel } from '../../../types/index';
import { apiClient, type ApiQRISPayment } from '../../../services/api';
import { MemberLayout } from '../components/MemberLayout';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { LoadingState } from '../../../components/ui/LoadingState';
import { useToast } from '../../../components/ui/useToast';
import {
  CheckIcon,
  AlertCircleIcon,
  InfoIcon,
  ReceiptIcon,
  ClockIcon,
} from '../../../components/ui/Icons';
import { formatRupiah } from '../../../lib/utils';

export interface PaymentConfirmationPageProps {
  onNavigate: (path: RoutePath) => void;
  initialBookingId?: string | null;
}

function formatCountdown(secondsLeft: number): string {
  const clamped = Math.max(0, secondsLeft);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function PaymentConfirmationPage({
  onNavigate,
  initialBookingId,
}: PaymentConfirmationPageProps) {
  const toast = useToast();

  const [bookings, setBookings] = useState<BookingViewModel[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string>(initialBookingId || '');
  const [qrisData, setQrisData] = useState<ApiQRISPayment | null>(null);
  const [generatingQRIS, setGeneratingQRIS] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [paidModalOpen, setPaidModalOpen] = useState<boolean>(false);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const list = await apiClient.getMyBookings();
      setBookings(list);
      setSelectedBookingId((prev) => {
        if (prev && list.some((b) => b.id === prev)) return prev;
        const pending = list.find((b) => b.status === 'menunggu_pembayaran');
        return pending ? pending.id : list[0]?.id || '';
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar pesanan.');
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const selectedBooking: BookingViewModel | undefined = useMemo(() => {
    return bookings.find((b) => b.id === selectedBookingId);
  }, [bookings, selectedBookingId]);

  const handleGenerateQRIS = useCallback(
    async (targetBookingId: string) => {
      if (!targetBookingId) return;
      setError(null);
      setGeneratingQRIS(true);
      try {
        const res = await apiClient.createQRISPayment(targetBookingId);
        setQrisData(res);
        const diffSec = Math.floor((new Date(res.expires_at).getTime() - Date.now()) / 1000);
        setSecondsLeft(Math.max(0, diffSec));
      } catch (err: unknown) {
        setQrisData(null);
        setError(err instanceof Error ? err.message : 'Gagal membuat kode QRIS Midtrans.');
      } finally {
        setGeneratingQRIS(false);
      }
    },
    []
  );

  // Otomatis generate / muat QRIS saat pesanan menunggu_pembayaran dipilih
  useEffect(() => {
    if (!selectedBooking) {
      setQrisData(null);
      return;
    }
    if (selectedBooking.status === 'menunggu_pembayaran') {
      handleGenerateQRIS(selectedBooking.id);
    } else {
      setQrisData(null);
    }
  }, [selectedBooking?.id, selectedBooking?.status, handleGenerateQRIS]);

  // Countdown 15 menit
  useEffect(() => {
    if (!qrisData || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [qrisData, secondsLeft]);

  const handleCheckStatus = useCallback(
    async (silent = false) => {
      if (!selectedBooking) return;
      if (!silent) setCheckingStatus(true);
      try {
        const res = await apiClient.getPaymentStatus(selectedBooking.id);
        if (res.status === 'terkonfirmasi' || res.transaction_status === 'settlement' || res.transaction_status === 'capture') {
          setBookings((prev) =>
            prev.map((b) => (b.id === selectedBooking.id ? { ...b, status: 'terkonfirmasi' } : b))
          );
          setQrisData(null);
          toast.success('Pembayaran QRIS berhasil! Tiket Anda telah terkonfirmasi.');
          setPaidModalOpen(true);
        } else if (res.status === 'dibatalkan' || res.transaction_status === 'expire') {
          setBookings((prev) =>
            prev.map((b) => (b.id === selectedBooking.id ? { ...b, status: 'dibatalkan' } : b))
          );
          setQrisData(null);
          if (!silent) {
            toast.error('Waktu pembayaran QRIS telah habis. Pesanan dibatalkan.');
          }
        } else if (!silent) {
          toast.info('Pembayaran masih menunggu scan & konfirmasi dari aplikasi e-wallet/m-banking Anda.');
        }
      } catch (err: unknown) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Gagal memeriksa status pembayaran.');
        }
      } finally {
        if (!silent) setCheckingStatus(false);
      }
    },
    [selectedBooking, toast]
  );

  // Auto-polling status setiap 5 detik saat QRIS aktif
  useEffect(() => {
    if (!qrisData || !selectedBooking || selectedBooking.status !== 'menunggu_pembayaran') return;
    const poller = window.setInterval(() => {
      handleCheckStatus(true);
    }, 5000);
    return () => window.clearInterval(poller);
  }, [qrisData, selectedBooking, handleCheckStatus]);

  return (
    <MemberLayout currentPath="/member/payment-confirmation" onNavigate={onNavigate}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 tracking-tight">
            Pembayaran Tiket via QRIS (Midtrans)
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Scan kode QRIS menggunakan GoPay, OVO, DANA, ShopeePay, atau Mobile Banking. Tiket otomatis aktif setelah pembayaran terverifikasi.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-xs text-red-700">
            <AlertCircleIcon className="size-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {loadingBookings ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-10">
            <LoadingState message="Memuat daftar pesanan Anda..." />
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-4">
            <p className="text-sm text-stone-600">
              Belum ada data pemesanan tiket. Silakan pesan tiket terlebih dahulu.
            </p>
            <Button variant="primary" onClick={() => onNavigate('/member/booking')}>
              Pesan Tiket Sekarang
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Booking Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Pilih Pesanan Tiket
              </label>
              <select
                value={selectedBookingId}
                onChange={(e) => {
                  setSelectedBookingId(e.target.value);
                  setError(null);
                }}
                className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    #{b.id} — {b.schedule.originCityName} ke {b.schedule.destinationCityName} ({b.schedule.departureDate}) — Kursi {b.seatNumber} — {formatRupiah(b.totalPrice)} [{b.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Booking Summary */}
            {selectedBooking && (
              <div className="rounded-xl bg-stone-50/80 border border-stone-200 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
                  <span>Rincian Tiket Terpilih</span>
                  <span className="font-mono text-primary font-bold">
                    {qrisData?.booking_code || `ID #${selectedBooking.id}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-stone-600">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Rute</span>
                    <span className="font-medium text-stone-800">
                      {selectedBooking.schedule.originCityName} &rarr; {selectedBooking.schedule.destinationCityName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Jadwal</span>
                    <span className="font-mono text-stone-800 tabular-nums">
                      {selectedBooking.schedule.departureDate} ({selectedBooking.schedule.departureTime})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Kursi</span>
                    <span className="font-mono text-stone-800 font-semibold">
                      No. {selectedBooking.seatNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Total Tagihan</span>
                    <span className="font-mono font-bold text-stone-950 tabular-nums">
                      {formatRupiah(selectedBooking.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment State Area */}
            {selectedBooking?.status === 'terkonfirmasi' || selectedBooking?.status === 'selesai' ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
                <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckIcon className="size-6" />
                </div>
                <h2 className="font-serif text-lg font-bold text-emerald-950">
                  Pembayaran QRIS Lunas & Terkonfirmasi
                </h2>
                <p className="text-xs text-emerald-800">
                  Tiket perjalanan Anda sudah aktif. Silakan lihat detail di Riwayat Pemesanan.
                </p>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/member/history')}>
                  Lihat Riwayat Pemesanan
                </Button>
              </div>
            ) : selectedBooking?.status === 'dibatalkan' ? (
              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-6 text-center space-y-3">
                <h2 className="font-serif text-base font-bold text-stone-900">
                  Pesanan Dibatalkan / Kedaluwarsa
                </h2>
                <p className="text-xs text-stone-600">
                  Batas waktu pembayaran QRIS telah berakhir dan kursi telah dibebaskan kembali.
                </p>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/member/booking')}>
                  Buat Pesanan Baru
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-200 p-6 space-y-5 bg-stone-50/40">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2 font-serif font-bold text-stone-950 text-base">
                    <ReceiptIcon className="size-4.5 text-primary" />
                    <span>Kode QRIS Midtrans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {qrisData && (
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-700 font-semibold">
                        {qrisData.is_production ? 'PRODUCTION' : 'SANDBOX'}
                      </span>
                    )}
                    {qrisData && (
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-primary border border-orange-200 tabular-nums">
                        <ClockIcon className="size-3.5" />
                        {formatCountdown(secondsLeft)}
                      </span>
                    )}
                  </div>
                </div>

                {generatingQRIS ? (
                  <LoadingState message="Menghubungi Midtrans untuk membuat kode QRIS..." />
                ) : qrisData ? (
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                      <img
                        src={qrisData.qris_url}
                        alt={`QRIS Pembayaran ${qrisData.order_id}`}
                        className="w-60 h-60 object-contain"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-stone-500">Total Pembayaran</p>
                      <p className="font-mono text-2xl font-bold text-stone-950 tabular-nums">
                        {formatRupiah(qrisData.amount)}
                      </p>
                      <p className="font-mono text-[11px] text-stone-500">
                        Order ID: {qrisData.order_id}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleCheckStatus(false)}
                        disabled={checkingStatus}
                        className="h-10 px-5 text-xs font-semibold"
                      >
                        {checkingStatus ? 'Memeriksa...' : 'Cek Status Pembayaran'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => selectedBooking && handleGenerateQRIS(selectedBooking.id)}
                        disabled={generatingQRIS}
                        className="h-10 px-4 text-xs"
                      >
                        Muat Ulang QRIS
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-xs text-stone-600">
                      Klik tombol di bawah untuk membuat kode QRIS pembayaran melalui Midtrans.
                    </p>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => selectedBooking && handleGenerateQRIS(selectedBooking.id)}
                      className="text-xs h-10 px-5"
                    >
                      Buat Kode QRIS Sekarang
                    </Button>
                  </div>
                )}

                <div className="rounded-xl bg-orange-50/70 border border-orange-200/80 p-3.5 flex items-start gap-2.5 text-xs text-orange-950">
                  <InfoIcon className="size-4 shrink-0 mt-0.5 text-primary" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Verifikasi Otomatis via Webhook Midtrans</p>
                    <p className="text-[11px] text-orange-900 leading-relaxed">
                      Halaman ini otomatis memeriksa status setiap 5 detik. Anda tidak perlu mengirim bukti transfer manual atau menunggu verifikasi petugas loket.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={paidModalOpen}
        onClose={() => {
          setPaidModalOpen(false);
          onNavigate('/member/history');
        }}
        title="Pembayaran QRIS Berhasil"
      >
        <div className="text-center space-y-4 py-2">
          <div className="size-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-2xs">
            <CheckIcon className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg font-bold text-stone-950">
              Tiket Anda Telah Terkonfirmasi!
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
              Pembayaran QRIS via Midtrans telah diterima secara otomatis. Tiket siap digunakan saat keberangkatan.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => {
                setPaidModalOpen(false);
                onNavigate('/member/history');
              }}
              className="w-full justify-center text-xs h-10"
            >
              Lihat Riwayat Pemesanan &rarr;
            </Button>
          </div>
        </div>
      </Modal>
    </MemberLayout>
  );
}
