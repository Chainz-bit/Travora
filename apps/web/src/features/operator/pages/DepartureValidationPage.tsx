import { useState, useMemo } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { BookingViewModel } from '../../../types/index';
import { sharedStore } from '../../shared/services/sharedStore';
import { useSharedStore } from '../../shared/hooks/useSharedStore';
import {
  CheckCircle2Icon,
  SearchIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  AlertCircleIcon,
  CheckIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/useToast';
import { formatRupiah } from '../../../lib/utils';

export interface DepartureValidationPageProps {
  onNavigate?: (path: RoutePath) => void;
}

export function DepartureValidationPage() {
  useSharedStore();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'completed'>('all');

  const [bookingToValidate, setBookingToValidate] = useState<BookingViewModel | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const bookings: BookingViewModel[] = sharedStore.getBookings();

  const filteredBookings = useMemo(() => {
    let result = bookings;

    if (statusFilter === 'ready') {
      result = result.filter((b) => b.status === 'terkonfirmasi');
    } else if (statusFilter === 'completed') {
      result = result.filter((b) => b.status === 'selesai');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.memberName.toLowerCase().includes(q) ||
          b.memberPhone.toLowerCase().includes(q) ||
          b.seatNumber.toLowerCase().includes(q) ||
          b.schedule.originCityName.toLowerCase().includes(q) ||
          b.schedule.destinationCityName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [bookings, statusFilter, searchQuery]);

  const handleOpenValidate = (b: BookingViewModel) => {
    setBookingToValidate(b);
    setConfirmModalOpen(true);
  };

  const handleConfirmValidation = () => {
    if (!bookingToValidate) return;
    setIsProcessing(true);

    const res = sharedStore.validateDeparture(bookingToValidate.id);
    setIsProcessing(false);

    if (!res.success) {
      toast.error(res.error || 'Gagal memvalidasi keberangkatan.');
      setFeedbackMessage({ type: 'error', text: res.error || 'Gagal memvalidasi keberangkatan.' });
    } else {
      const msg = `Keberangkatan tiket ${bookingToValidate.id} (Penumpang: ${bookingToValidate.memberName}, Kursi ${bookingToValidate.seatNumber}) BERHASIL DIVALIDASI.`;
      toast.success(msg);
      setFeedbackMessage({
        type: 'success',
        text: `${msg} Tiket telah ditandai Keberangkatan Tervalidasi (Sudah Check-in).`,
      });
    }

    setConfirmModalOpen(false);
    setBookingToValidate(null);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-primary">
            Operasional Keberangkatan
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-950 mt-1 flex items-center gap-2.5">
            <CheckCircle2Icon className="size-7 text-primary" />
            <span>Validasi Keberangkatan Penumpang</span>
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Validasi fisik tiket terkonfirmasi calon penumpang saat check-in di loket keberangkatan armada (Entitas Pesan).
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`rounded-xl p-4 flex items-start gap-3 text-sm animate-in fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckIcon className="size-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircleIcon className="size-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Table & Filter Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="size-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                type="search"
                placeholder="Cari kode tiket (TRV-...), nama, no. HP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 w-full sm:w-auto bg-stone-200/60 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Semua ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ready')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'ready' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Siap Berangkat ({bookings.filter((b) => b.status === 'terkonfirmasi').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'completed'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Keberangkatan Tervalidasi ({bookings.filter((b) => b.status === 'selesai').length})
              </button>
            </div>
          </div>

          <div className="text-xs text-stone-500 font-sans">
            Menampilkan <span className="font-semibold text-stone-900 tabular-nums">{filteredBookings.length}</span> tiket
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada tiket yang sesuai"
              description={
                searchQuery || statusFilter !== 'all'
                  ? 'Tidak ada tiket penumpang yang sesuai dengan kriteria pencarian atau filter status.'
                  : 'Belum ada pesanan tiket yang terdaftar pada sistem.'
              }
              action={
                searchQuery || statusFilter !== 'all' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200 shadow-2xs">
                <tr>
                  <th className="py-3 px-6">Kode Tiket</th>
                  <th className="py-3 px-6">Identitas Penumpang</th>
                  <th className="py-3 px-6">Rute & Waktu Keberangkatan</th>
                  <th className="py-3 px-6">Armada & Kursi</th>
                  <th className="py-3 px-6 text-center">Status Tiket</th>
                  <th className="py-3 px-6 text-right">Aksi Loket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <strong className="font-mono text-xs font-bold text-stone-900 block">
                        {b.id}
                      </strong>
                      <span className="text-[11px] text-stone-400 font-mono">{b.bookingDate}</span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-medium text-stone-900 block">{b.memberName}</span>
                      <span className="text-xs font-mono text-stone-500">{b.memberPhone}</span>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-stone-900 flex items-center gap-1">
                        <span>{b.schedule.originCityName}</span>
                        <span className="text-primary">→</span>
                        <span>{b.schedule.destinationCityName}</span>
                      </div>
                      <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <CalendarIcon className="size-3 text-stone-400" />
                          {b.schedule.departureDate}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <ClockIcon className="size-3 text-stone-400" />
                          {b.schedule.departureTime}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-medium text-stone-900 block">
                        {b.schedule.vehicleName}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-stone-500">{b.schedule.vehiclePlate}</span>
                        <span className="px-2 py-0.5 bg-orange-100 text-primary font-mono text-xs font-bold rounded">
                          Kursi {b.seatNumber}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-center whitespace-nowrap">
                      <StatusBadge
                        status={
                          b.status === 'terkonfirmasi' || b.status === 'selesai'
                            ? 'success'
                            : b.status === 'dibatalkan'
                            ? 'error'
                            : 'warning'
                        }
                      >
                        {b.status === 'terkonfirmasi'
                          ? 'Terkonfirmasi'
                          : b.status === 'selesai'
                          ? 'Selesai Berangkat'
                          : b.status === 'menunggu_verifikasi'
                          ? 'Menunggu Verifikasi'
                          : b.status === 'dibatalkan'
                          ? 'Dibatalkan'
                          : 'Menunggu Pembayaran'}
                      </StatusBadge>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      {b.status === 'terkonfirmasi' ? (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleOpenValidate(b)}
                          leftIcon={<CheckCircle2Icon className="size-3.5" />}
                        >
                          Validasi Berangkat
                        </Button>
                      ) : b.status === 'selesai' ? (
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap">
                          <CheckCircle2Icon className="size-3.5 text-emerald-600 shrink-0" />
                          Sudah Check-in
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 italic">
                          Belum Lunas
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Departure Validation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Validasi Keberangkatan Penumpang di Loket"
        description="Pastikan fisik calon penumpang telah hadir di loket resmi dan menunjukkan identitas sesuai rincian tiket."
      >
        {bookingToValidate && (
          <div className="space-y-4 pt-2">
            <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                <span className="text-stone-500">Kode Pemesanan Tiket</span>
                <span className="font-mono font-bold text-primary text-sm">{bookingToValidate.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Nama Penumpang</span>
                <span className="font-semibold text-stone-900 flex items-center gap-1">
                  <UserIcon className="size-3.5 text-stone-400" />
                  {bookingToValidate.memberName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Nomor Telepon</span>
                <span className="font-mono text-stone-800">{bookingToValidate.memberPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Rute Perjalanan</span>
                <span className="font-semibold text-stone-900">
                  {bookingToValidate.schedule.originCityName} → {bookingToValidate.schedule.destinationCityName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Waktu Keberangkatan</span>
                <span className="font-mono text-stone-900">
                  {bookingToValidate.schedule.departureDate} ({bookingToValidate.schedule.departureTime})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Armada & Nomor Kursi</span>
                <span className="font-semibold text-stone-900">
                  {bookingToValidate.schedule.vehicleName} • <strong>Kursi {bookingToValidate.seatNumber}</strong>
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                <span className="text-stone-500">Total Tarif Terbayar</span>
                <span className="font-bold text-stone-950 tabular-nums">
                  {formatRupiah(bookingToValidate.totalPrice)} (Lunas)
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 leading-relaxed">
              Dengan mengklik <strong>"Konfirmasi Keberangkatan"</strong>, tiket akan ditandai dengan status UI <code>Keberangkatan Tervalidasi (Sudah Check-in)</code>, dan penumpang dipersilakan naik ke armada travel.
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                disabled={isProcessing}
                onClick={() => setConfirmModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="success"
                size="md"
                isLoading={isProcessing}
                onClick={handleConfirmValidation}
                leftIcon={<CheckCircle2Icon className="size-4" />}
              >
                Konfirmasi Keberangkatan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
