import { useState, useMemo, type FormEvent } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { BookingViewModel } from '../../../types/index';
import { authService } from '../../auth/services/authService';
import { mockBookingService } from '../services/mockBookingService';
import { mockPaymentConfirmationService } from '../services/mockPaymentConfirmationService';
import { MemberLayout } from '../components/MemberLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/useToast';
import {
  CheckIcon,
  AlertCircleIcon,
  InfoIcon,
  ReceiptIcon,
} from '../../../components/ui/Icons';
import { formatRupiah } from '../../../lib/utils';

export interface PaymentConfirmationPageProps {
  onNavigate: (path: RoutePath) => void;
  initialBookingId?: string | null;
}

const DESTINATION_ACCOUNTS = [
  { bank: 'BCA (Bank Central Asia)', number: '827-109-2811', name: 'PT TRAVORA INDONESIA JAYA' },
  { bank: 'Bank Mandiri', number: '137-00-1928-1100', name: 'PT TRAVORA INDONESIA JAYA' },
];

export function PaymentConfirmationPage({
  onNavigate,
  initialBookingId,
}: PaymentConfirmationPageProps) {
  const user = authService.getCurrentUser();
  const toast = useToast();

  const allMemberBookings = useMemo(() => {
    return mockBookingService.getAllBookings(user?.id);
  }, [user?.id]);

  // Candidate bookings needing confirmation or any booking
  const eligibleBookings = useMemo(() => {
    return allMemberBookings.filter(
      (b) => b.status === 'menunggu_pembayaran' || b.status === 'menunggu_verifikasi'
    );
  }, [allMemberBookings]);

  const defaultBookingId =
    initialBookingId || (eligibleBookings[0] ? eligibleBookings[0].id : allMemberBookings[0]?.id || '');

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const bookingId = selectedBookingId ?? defaultBookingId;
  const [bankName, setBankName] = useState<string>('BCA (Bank Central Asia)');
  const [accountHolder, setAccountHolder] = useState<string>(user?.name || '');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Selected booking view model
  const selectedBooking: BookingViewModel | undefined = useMemo(() => {
    return allMemberBookings.find((b) => b.id === bookingId);
  }, [allMemberBookings, bookingId]);

  const transferAmount = selectedBooking?.totalPrice || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bookingId) {
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

    setIsSubmitting(true);
    await mockPaymentConfirmationService.submitConfirmation({
      bookingId,
      bankName,
      accountHolder: accountHolder.trim(),
      accountNumber: accountNumber.trim(),
      transferAmount,
      transferDate,
    });
    setIsSubmitting(false);
    toast.success('Konfirmasi pembayaran berhasil dikirim!');
    setSuccessModalOpen(true);
  };

  return (
    <MemberLayout currentPath="/member/payment-confirmation" onNavigate={onNavigate}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 tracking-tight">
            Konfirmasi Pembayaran Transfer Manual
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Laporkan bukti dan data transfer rekening Anda untuk diverifikasi oleh petugas loket resmi Travora.
          </p>
        </div>

        {/* Destination Bank Accounts Notice */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-stone-950 font-serif font-bold text-base">
              <ReceiptIcon className="size-4.5 text-primary" />
              <span>Rekening Resmi Pembayaran Travora</span>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              Rekening Resmi Terverifikasi
            </span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            Silakan lakukan transfer bank manual tepat sesuai nominal tiket ke salah satu rekening resmi Travora di bawah ini, lalu isi formulir konfirmasi pembayaran.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {DESTINATION_ACCOUNTS.map((acc) => (
              <div
                key={acc.bank}
                className="p-4 rounded-xl bg-stone-50/80 border border-stone-200 space-y-1 relative"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-900">{acc.bank}</span>
                </div>
                <span className="font-mono text-base font-bold text-stone-900 block tabular-nums tracking-wide">
                  {acc.number}
                </span>
                <span className="text-[11px] text-stone-500 block">a/n {acc.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmation Form */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-xs text-red-700">
              <AlertCircleIcon className="size-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Booking Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Pilih Kode Tiket Pemesanan
              </label>
              {allMemberBookings.length === 0 ? (
                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-500 border border-stone-200">
                  Belum ada data pemesanan tiket. Silakan pesan tiket terlebih dahulu.
                </div>
              ) : (
                <select
                  value={bookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {allMemberBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.schedule.originCityName} ke {b.schedule.destinationCityName} ({b.schedule.departureDate}) — {formatRupiah(b.totalPrice)} [{b.status}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Booking Info Banner */}
            {selectedBooking && (
              <div className="rounded-xl bg-stone-50/80 border border-stone-200 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
                  <span>Rincian Tiket Terpilih:</span>
                  <span className="font-mono text-primary font-bold">{selectedBooking.id}</span>
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
                      {selectedBooking.schedule.departureDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Kursi</span>
                    <span className="font-mono text-stone-800 font-semibold">
                      No. {selectedBooking.seatNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Jumlah Tagihan</span>
                    <span className="font-mono font-bold text-stone-950 tabular-nums">
                      {formatRupiah(selectedBooking.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}

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

            {/* Panduan Verifikasi */}
            <div className="rounded-2xl bg-orange-50/70 border border-orange-200/80 p-4 flex items-start gap-3 text-xs text-orange-950">
              <InfoIcon className="size-4 shrink-0 mt-0.5 text-primary" />
              <div className="space-y-0.5">
                <p className="font-bold text-orange-950">
                  Proses Verifikasi Loket
                </p>
                <p className="text-orange-900 leading-relaxed text-[11px]">
                  Petugas loket resmi kami akan memeriksa data mutasi pembayaran Anda. Setelah diverifikasi, status tiket Anda akan langsung terbit dan dapat divalidasi saat hari keberangkatan.
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
                disabled={isSubmitting || !selectedBooking}
                className="w-full sm:w-auto h-11 px-6 text-xs font-semibold shadow-xs"
              >
                {isSubmitting ? 'Mengirim Konfirmasi...' : 'Kirim Konfirmasi Pembayaran'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={successModalOpen}
        onClose={() => {
          setSuccessModalOpen(false);
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
              <span className="font-mono font-bold text-stone-900">{bookingId}</span> telah tersimpan dengan status <strong>Menunggu Verifikasi</strong>.
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
                setSuccessModalOpen(false);
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
