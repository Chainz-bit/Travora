import { useState, useEffect, useMemo, useCallback, type FormEvent } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import { authService } from '../../auth/services/authService';
import {
  bookingApiService,
  type BookingRecord,
} from '../services/bookingApiService';
import { apiClient, type ApiQRISPayment } from '../../../services/api';
import { MemberLayout } from '../components/MemberLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { LoadingState } from '../../../components/ui/LoadingState';
import { useToast } from '../../../components/ui/useToast';
import {
  CheckIcon,
  AlertCircleIcon,
  InfoIcon,
  ReceiptIcon,
  ClockIcon,
  QrCodeIcon,
  TicketIcon,
} from '../../../components/ui/Icons';
import { formatRupiah } from '../../../lib/utils';

export interface PaymentConfirmationPageProps {
  onNavigate: (path: RoutePath, params?: Record<string, string>) => void;
  initialBookingId?: string | null;
}

type PaymentTab = 'qris' | 'manual';

const DESTINATION_ACCOUNTS = [
  { bank: 'BCA (Bank Central Asia)', number: '827-109-2811', name: 'PT TRAVORA INDONESIA JAYA' },
  { bank: 'Bank Mandiri', number: '137-00-1928-1100', name: 'PT TRAVORA INDONESIA JAYA' },
];

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
  const user = authService.getCurrentUser();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<PaymentTab>('qris');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string>(initialBookingId || '');
  const [error, setError] = useState<string | null>(null);

  // Midtrans QRIS State
  const [qrisData, setQrisData] = useState<ApiQRISPayment | null>(null);
  const [generatingQRIS, setGeneratingQRIS] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [paidModalOpen, setPaidModalOpen] = useState<boolean>(false);

  // Manual Bank Transfer State
  const [bankName, setBankName] = useState<string>('BCA (Bank Central Asia)');
  const [accountHolder, setAccountHolder] = useState<string>(user?.name || '');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);
  const [manualSuccessModalOpen, setManualSuccessModalOpen] = useState<boolean>(false);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const list = await bookingApiService.getMyBookings();
      setBookings(list);
      setSelectedBookingId((prev) => {
        if (prev && list.some((b) => b.id === prev)) return prev;
        if (initialBookingId && list.some((b) => b.id === initialBookingId)) {
          return initialBookingId;
        }
        const pending = list.find(
          (b) => b.status === 'menunggu_pembayaran' || b.status === 'menunggu_verifikasi'
        );
        return pending ? pending.id : list[0]?.id || '';
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar pesanan.');
    } finally {
      setLoadingBookings(false);
    }
  }, [initialBookingId]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const selectedBooking: BookingRecord | undefined = useMemo(() => {
    return bookings.find((b) => b.id === selectedBookingId);
  }, [bookings, selectedBookingId]);

  const transferAmount = selectedBooking?.totalPrice || 0;

  const handleGenerateQRIS = useCallback(async (targetDbId: number) => {
    if (!targetDbId) return;
    setError(null);
    setGeneratingQRIS(true);
    try {
      const res = await apiClient.createQRISPayment(targetDbId);
      setQrisData(res);
      const diffSec = Math.floor((new Date(res.expires_at).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, diffSec));
    } catch (err: unknown) {
      setQrisData(null);
      setError(err instanceof Error ? err.message : 'Gagal membuat kode QRIS Midtrans.');
    } finally {
      setGeneratingQRIS(false);
    }
  }, []);

  // Otomatis muat / generate QRIS saat tab QRIS aktif & pesanan masih menunggu_pembayaran
  useEffect(() => {
    if (activeTab !== 'qris' || !selectedBooking) {
      return;
    }
    if (selectedBooking.status === 'menunggu_pembayaran' && selectedBooking.dbId > 0) {
      handleGenerateQRIS(selectedBooking.dbId);
    } else {
      setQrisData(null);
    }
  }, [activeTab, selectedBooking?.id, selectedBooking?.dbId, selectedBooking?.status, handleGenerateQRIS]);

  // Countdown 15 menit QRIS
  useEffect(() => {
    if (!qrisData || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [qrisData, secondsLeft]);

  const handleCheckStatus = useCallback(
    async (silent = false) => {
      if (!selectedBooking || !selectedBooking.dbId) return;
      if (!silent) setCheckingStatus(true);
      try {
        const res = await apiClient.getPaymentStatus(selectedBooking.dbId);
        if (
          res.status === 'terkonfirmasi' ||
          res.transaction_status === 'settlement' ||
          res.transaction_status === 'capture'
        ) {
          setBookings((prev) =>
            prev.map((b) => (b.id === selectedBooking.id ? { ...b, status: 'terkonfirmasi' } : b))
          );
          setQrisData(null);
          toast.success('Pembayaran QRIS berhasil! E-Tiket QR Anda kini aktif.');
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
          toast.info(
            'Pembayaran masih menunggu scan & konfirmasi dari aplikasi e-wallet/m-banking Anda.'
          );
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
    if (
      activeTab !== 'qris' ||
      !qrisData ||
      !selectedBooking ||
      selectedBooking.status !== 'menunggu_pembayaran'
    ) {
      return;
    }
    const poller = window.setInterval(() => {
      handleCheckStatus(true);
    }, 5000);
    return () => window.clearInterval(poller);
  }, [activeTab, qrisData, selectedBooking, handleCheckStatus]);

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBooking) {
      setError('Silakan pilih kode tiket pemesanan yang akan dikonfirmasi.');
      return;
    }
    if (!bankName.trim()) {
      setError('Nama bank wajib dipilih.');
      return;
    }
    if (!accountHolder.trim()) {
      setError('Nama pemilik rekening pengirim wajib diisi.');
      return;
    }
    if (!accountNumber.trim()) {
      setError('Nomor rekening pengirim wajib diisi.');
      return;
    }
    if (!transferDate) {
      setError('Tanggal transfer wajib diisi.');
      return;
    }

    setIsSubmittingManual(true);
    try {
      await bookingApiService.submitPaymentConfirmation(selectedBooking.id, {
        bankName,
        accountHolder: accountHolder.trim(),
        accountNumber: accountNumber.trim(),
        transferAmount,
        transferDate,
      });
      const updated = await bookingApiService.getMyBookings();
      setBookings(updated);
      toast.success('Konfirmasi pembayaran manual berhasil dikirim!');
      setManualSuccessModalOpen(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gagal mengirim konfirmasi pembayaran manual.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <MemberLayout currentPath="/member/payment-confirmation" onNavigate={onNavigate}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 tracking-tight">
            Pembayaran &amp; Konfirmasi Tiket
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Pilih metode pembayaran instan menggunakan QRIS Midtrans atau konfirmasi transfer bank manual melalui petugas loket.
          </p>
        </div>

        {/* Payment Method Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-stone-100 border border-stone-200 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('qris');
              setError(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'qris'
                ? 'bg-white text-primary shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <QrCodeIcon className="size-4" />
            <span>QRIS Instan (Midtrans)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setError(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-primary shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ReceiptIcon className="size-4" />
            <span>Transfer Bank Manual</span>
          </button>
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
            {/* Shared Booking Selector */}
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
                    {b.id} — {b.schedule.originCityName} ke {b.schedule.destinationCityName} ({b.schedule.departureDate}) — Kursi {b.seatNumber} — {formatRupiah(b.totalPrice)} [{b.status}]
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
                    {selectedBooking.id}
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

            {/* Confirmed / Cancelled States */}
            {selectedBooking?.status === 'terkonfirmasi' || selectedBooking?.status === 'selesai' ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
                <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckIcon className="size-6" />
                </div>
                <h2 className="font-serif text-lg font-bold text-emerald-950">
                  Pembayaran Lunas &amp; Tiket Terkonfirmasi
                </h2>
                <p className="text-xs text-emerald-800">
                  E-Tiket QR perjalanan Anda sudah aktif dan siap dipindai saat keberangkatan.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onNavigate('/tickets', { order_code: selectedBooking.id })}
                    leftIcon={<TicketIcon className="size-3.5" />}
                  >
                    Buka E-Tiket QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('/member/history')}
                  >
                    Riwayat Pemesanan
                  </Button>
                </div>
              </div>
            ) : selectedBooking?.status === 'dibatalkan' ? (
              <div className="rounded-2xl bg-stone-50 border border-stone-200 p-6 text-center space-y-3">
                <h2 className="font-serif text-base font-bold text-stone-900">
                  Pesanan Dibatalkan / Kedaluwarsa
                </h2>
                <p className="text-xs text-stone-600">
                  Pesanan ini sudah dibatalkan dan kursi telah dibebaskan kembali.
                </p>
                <Button variant="primary" size="sm" onClick={() => onNavigate('/member/booking')}>
                  Buat Pesanan Baru
                </Button>
              </div>
            ) : activeTab === 'qris' ? (
              /* TAB 1: QRIS MIDTRANS */
              <div className="rounded-2xl border border-stone-200 p-6 space-y-5 bg-stone-50/40">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2 font-serif font-bold text-stone-950 text-base">
                    <QrCodeIcon className="size-4.5 text-primary" />
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

                {selectedBooking?.status === 'menunggu_verifikasi' ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900">
                    Pesanan ini sudah memiliki konfirmasi transfer manual dan sedang menunggu verifikasi petugas loket.
                  </div>
                ) : generatingQRIS ? (
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
                        Order ID Midtrans: {qrisData.order_id}
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
                        onClick={() => selectedBooking && handleGenerateQRIS(selectedBooking.dbId)}
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
                      onClick={() => selectedBooking && handleGenerateQRIS(selectedBooking.dbId)}
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
                      Halaman ini otomatis memeriksa status setiap 5 detik. Begitu QRIS dibayar, status pesanan &amp; E-Tiket QR langsung berubah menjadi Lunas.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: MANUAL BANK TRANSFER */
              <div className="space-y-6">
                <div className="rounded-xl bg-stone-50/80 border border-stone-200 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-stone-950 font-serif font-bold text-sm">
                      <ReceiptIcon className="size-4 text-primary" />
                      <span>Rekening Resmi Pembayaran Travora</span>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      Rekening Resmi Terverifikasi
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DESTINATION_ACCOUNTS.map((acc) => (
                      <div
                        key={acc.bank}
                        className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-0.5"
                      >
                        <span className="text-xs font-bold text-stone-900 block">{acc.bank}</span>
                        <span className="font-mono text-base font-bold text-stone-900 block tabular-nums tracking-wide">
                          {acc.number}
                        </span>
                        <span className="text-[11px] text-stone-500 block">a/n {acc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Nama Bank Pengirim
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="BCA (Bank Central Asia)">BCA (Bank Central Asia)</option>
                        <option value="Bank Mandiri">Bank Mandiri</option>
                        <option value="BNI (Bank Negara Indonesia)">BNI (Bank Negara Indonesia)</option>
                        <option value="BRI (Bank Rakyat Indonesia)">BRI (Bank Rakyat Indonesia)</option>
                        <option value="BSI (Bank Syariah Indonesia)">BSI (Bank Syariah Indonesia)</option>
                        <option value="CIMB Niaga">CIMB Niaga</option>
                        <option value="Bank Permata">Bank Permata</option>
                      </select>
                    </div>

                    <div>
                      <Input
                        label="Nama Pemilik Rekening Pengirim"
                        placeholder="Sesuai nama rekening pengirim"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                      />
                    </div>

                    <div>
                      <Input
                        label="Nomor Rekening Pengirim"
                        placeholder="Contoh: 8271092811"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Tanggal Transfer
                      </label>
                      <input
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Jumlah Transfer (Sesuai Nominal Tiket)
                    </label>
                    <div className="w-full h-11 px-3.5 rounded-xl border border-stone-200 bg-stone-100 flex items-center font-mono font-bold text-stone-950 text-base tabular-nums">
                      {formatRupiah(transferAmount)}
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500">
                      Jumlah transfer terkunci otomatis sesuai total harga tiket yang dipilih.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-orange-50/70 border border-orange-200/80 p-4 flex items-start gap-3 text-xs text-orange-950">
                    <InfoIcon className="size-4 shrink-0 mt-0.5 text-primary" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-orange-950">Proses Verifikasi Loket</p>
                      <p className="text-orange-900 leading-relaxed text-[11px]">
                        Petugas loket resmi kami akan memeriksa data mutasi pembayaran Anda. Setelah diverifikasi, E-Tiket QR Anda akan aktif secara otomatis.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onNavigate('/member')}
                      className="w-full sm:w-auto h-11 px-5 text-xs font-medium"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSubmittingManual || !selectedBooking}
                      className="w-full sm:w-auto h-11 px-6 text-xs font-semibold shadow-xs"
                    >
                      {isSubmittingManual ? 'Mengirim Konfirmasi...' : 'Kirim Konfirmasi Pembayaran'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QRIS Payment Success Modal */}
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
              E-Tiket Anda Telah Aktif!
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
              Pembayaran QRIS via Midtrans telah diterima secara otomatis. Kode QR E-Tiket Anda sudah siap digunakan untuk check-in keberangkatan.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            {selectedBooking && (
              <Button
                variant="primary"
                onClick={() => {
                  setPaidModalOpen(false);
                  onNavigate('/tickets', { order_code: selectedBooking.id });
                }}
                leftIcon={<TicketIcon className="size-4" />}
                className="w-full justify-center text-xs h-10"
              >
                Lihat E-Tiket QR Sekarang
              </Button>
            )}
            <Button
              variant="outline"
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

      {/* Manual Transfer Success Modal */}
      <Modal
        isOpen={manualSuccessModalOpen}
        onClose={() => {
          setManualSuccessModalOpen(false);
          onNavigate('/member/history');
        }}
        title="Konfirmasi Pembayaran Terkirim"
      >
        <div className="text-center space-y-4 py-2">
          <div className="size-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-2xs">
            <CheckIcon className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg font-bold text-stone-950">
              Data Transfer Berhasil Diterima
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
              Konfirmasi pembayaran untuk kode tiket{' '}
              <span className="font-mono font-bold text-stone-900">{selectedBookingId}</span>{' '}
              telah tersimpan dengan status <strong>Menunggu Verifikasi</strong>.
            </p>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-500 border border-stone-200 text-left space-y-1 font-mono">
            <div>Bank Pengirim: {bankName}</div>
            <div>Rekening: {accountNumber} ({accountHolder})</div>
            <div>Nominal: {formatRupiah(transferAmount)}</div>
            <div>Tanggal: {transferDate}</div>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => {
                setManualSuccessModalOpen(false);
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
