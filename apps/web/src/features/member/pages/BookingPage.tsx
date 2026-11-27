import { useState, useEffect, useMemo } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { ScheduleViewModel } from '../../../types/index';
import { authService } from '../../auth/services/authService';
import { apiClient } from '../../../services/api';
import { MemberLayout } from '../components/MemberLayout';
import { SeatSelector } from '../components/SeatSelector';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/ui/LoadingState';
import {
  CalendarIcon,
  ClockIcon,
  BusIcon,
  ArrowRightIcon,
  AlertCircleIcon,
  CreditCardIcon,
} from '../../../components/ui/Icons';
import { formatRupiah } from '../../../lib/utils';

export interface BookingPageProps {
  onNavigate: (path: RoutePath, params?: Record<string, string>) => void;
  initialScheduleId?: string | null;
}

export function BookingPage({ onNavigate, initialScheduleId }: BookingPageProps) {
  const user = authService.getCurrentUser();

  const [schedules, setSchedules] = useState<ScheduleViewModel[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(true);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(initialScheduleId || '');
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingSchedules(true);
    apiClient
      .getSchedules({ limit: 50 })
      .then((list) => {
        if (!active) return;
        setSchedules(list);
        if (list.length > 0) {
          setSelectedScheduleId((prev) => {
            if (prev && list.some((s) => s.id === prev)) return prev;
            return list[0].id;
          });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal memuat daftar jadwal dari server.');
        }
      })
      .finally(() => {
        if (active) setLoadingSchedules(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedSchedule: ScheduleViewModel | undefined = useMemo(() => {
    return schedules.find((s) => s.id === selectedScheduleId) || schedules[0];
  }, [schedules, selectedScheduleId]);

  const handleBookingSubmit = async () => {
    setError(null);
    if (!selectedSchedule) {
      setError('Jadwal perjalanan belum tersedia.');
      return;
    }
    if (!selectedSeat) {
      setError('Silakan pilih salah satu nomor kursi yang tersedia terlebih dahulu.');
      return;
    }
    if (!user) {
      setError('Sesi member tidak valid. Silakan masuk kembali.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiClient.createBooking(Number(selectedSchedule.id), selectedSeat);
      onNavigate('/member/payment-confirmation', { bookingId: String(created.id_pesan) });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat pesanan tiket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MemberLayout currentPath="/member/booking" onNavigate={onNavigate}>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 tracking-tight">
            Pemesanan Tiket Travel
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Pilih jadwal perjalanan, tentukan nomor kursi, lalu selesaikan pembayaran instan via QRIS Midtrans.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-xs text-red-700">
            <AlertCircleIcon className="size-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {loadingSchedules ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-10">
            <LoadingState message="Memuat jadwal perjalanan aktif..." />
          </div>
        ) : !selectedSchedule ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-sm text-stone-600">
            Belum ada jadwal perjalanan aktif tersedia saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Schedule & Seat Selection */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Select Schedule */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h2 className="font-serif text-base font-bold text-stone-950">
                      Pilih Jadwal Perjalanan
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('/schedules')}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Cari Rute Lain &rarr;
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-2">
                    Daftar Jadwal Tersedia
                  </label>
                  <select
                    value={selectedSchedule.id}
                    onChange={(e) => {
                      setSelectedScheduleId(e.target.value);
                      setSelectedSeat('');
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {schedules.map((sched) => (
                      <option key={sched.id} value={sched.id}>
                        {sched.originCityName} &rarr; {sched.destinationCityName} &bull; {sched.departureDate} ({sched.departureTime}) &bull; {sched.vehicleName} &bull; {formatRupiah(sched.price)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Schedule Card Summary */}
                <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-serif font-bold text-stone-950 text-base">
                      <span>{selectedSchedule.originCityName}</span>
                      <ArrowRightIcon className="size-4 text-stone-400 font-sans" />
                      <span>{selectedSchedule.destinationCityName}</span>
                    </div>
                    <span className="font-mono font-bold text-stone-950 text-base tabular-nums">
                      {formatRupiah(selectedSchedule.price)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5 text-stone-400" />
                      <span className="font-mono tabular-nums">{selectedSchedule.departureDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ClockIcon className="size-3.5 text-stone-400" />
                      <span>{selectedSchedule.departureTime} WIB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BusIcon className="size-3.5 text-stone-400" />
                      <span className="truncate">{selectedSchedule.vehicleName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Seat Selector */}
              <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                  <span className="size-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h2 className="font-serif text-base font-bold text-stone-950">
                    Pilih Nomor Kursi
                  </h2>
                </div>

                <SeatSelector
                  scheduleId={selectedSchedule.id}
                  totalSeats={selectedSchedule.availableSeats}
                  selectedSeat={selectedSeat}
                  onSelectSeat={(seat) => {
                    setSelectedSeat(seat);
                    setError(null);
                  }}
                />
              </div>
            </div>

            {/* Right Column: Booking Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs space-y-5 sticky top-6">
                <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                  <span className="size-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <h2 className="font-serif text-base font-bold text-stone-950">
                    Ringkasan Pemesanan
                  </h2>
                </div>

                {/* Passenger Info */}
                <div className="space-y-1.5 text-xs border-b border-stone-100 pb-3">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                    Identitas Penumpang
                  </span>
                  <p className="font-semibold text-stone-900">{user?.name || '-'}</p>
                  <p className="text-stone-500 font-mono text-[11px]">{user?.phone || '-'}</p>
                  <p className="text-stone-500 text-[11px]">{user?.username || user?.email || '-'}</p>
                </div>

                {/* Route & Seat Info */}
                <div className="space-y-2 text-xs border-b border-stone-100 pb-3">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                    Detail Perjalanan
                  </span>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Rute:</span>
                    <span className="font-medium text-stone-900 text-right">
                      {selectedSchedule.originCityName} &rarr; {selectedSchedule.destinationCityName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Waktu:</span>
                    <span className="font-mono text-stone-900 text-right tabular-nums">
                      {selectedSchedule.departureDate}, {selectedSchedule.departureTime} WIB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Kendaraan:</span>
                    <span className="text-stone-900 text-right">{selectedSchedule.vehicleName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500">Nomor Kursi:</span>
                    {selectedSeat ? (
                      <span className="font-mono font-bold text-sm bg-orange-50 text-primary border border-orange-200 px-2 py-0.5 rounded-md">
                        No. {selectedSeat}
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">Belum dipilih</span>
                    )}
                  </div>
                </div>

                {/* Total Price */}
                <div className="flex justify-between items-center pt-1">
                  <div>
                    <span className="text-[11px] text-stone-500 block">Total Pembayaran</span>
                    <span className="text-[11px] text-stone-400">1 Tiket Penumpang</span>
                  </div>
                  <span className="font-mono font-bold text-xl text-stone-950 tabular-nums">
                    {formatRupiah(selectedSchedule.price)}
                  </span>
                </div>

                {/* Submit Button */}
                <Button
                  variant="primary"
                  onClick={handleBookingSubmit}
                  disabled={!selectedSeat || isSubmitting}
                  className="w-full justify-center h-12 text-sm font-semibold shadow-sm"
                >
                  {isSubmitting ? (
                    'Membuat Pesanan...'
                  ) : (
                    <>
                      <CreditCardIcon className="size-4 mr-2" />
                      Lanjutkan Bayar dengan QRIS
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-stone-500 text-center leading-relaxed">
                  Setelah ini, kode QRIS Midtrans akan dibuat otomatis dan tiket langsung terkonfirmasi setelah pembayaran berhasil.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
