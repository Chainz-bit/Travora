import { useMemo } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import { sharedStore } from '../../shared/services/sharedStore';
import { useSharedStore } from '../../shared/hooks/useSharedStore';
import {
  ReceiptIcon,
  CheckCircle2Icon,
  CalendarIcon,
  BusIcon,
  ArrowRightIcon,
  AlertCircleIcon,
  ClockIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { formatRupiah } from '../../../lib/utils';

export interface OperatorDashboardPageProps {
  onNavigate: (path: RoutePath) => void;
}

export function OperatorDashboardPage({ onNavigate }: OperatorDashboardPageProps) {
  useSharedStore();

  const metrics = sharedStore.getOperatorMetrics();
  const schedules = sharedStore.getSchedules(true);
  const bookings = sharedStore.getBookings();
  const confirmations = sharedStore.getConfirmations();

  const pendingConfirmations = useMemo(() => {
    return confirmations.filter((c) => c.status === 'menunggu_verifikasi');
  }, [confirmations]);

  // Today's active schedules preview
  const activeSchedulesPreview = useMemo(() => {
    return schedules.slice(0, 4).map((sch) => {
      const passengerCount = bookings.filter((b) => b.scheduleId === sch.id && b.status === 'terkonfirmasi').length;
      return {
        ...sch,
        passengerCount,
      };
    });
  }, [schedules, bookings]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-primary">
            Portal Loket Resmi
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-950 mt-1">
            Dashboard Operator Loket
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Verifikasi transfer manual penumpang dan validasi keberangkatan tiket di loket fisik keberangkatan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/operator/confirmations')}
          >
            <ReceiptIcon className="size-4 mr-1.5" />
            Verifikasi Transfer ({metrics.pendingConfirmationsCount})
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/operator/validation')}
          >
            <CheckCircle2Icon className="size-4 mr-1.5" />
            Validasi Keberangkatan
          </Button>
        </div>
      </div>

      {/* 3 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Metric 1: Jadwal Hari Ini */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 md:p-6 shadow-xs hover-editorial-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Jadwal Hari Ini
            </span>
            <div className="size-11 rounded-2xl bg-orange-100/70 border border-orange-200 flex items-center justify-center text-primary shadow-2xs">
              <CalendarIcon className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tabular-nums text-stone-950">
              {metrics.todaySchedulesCount || schedules.length}
            </span>
            <span className="text-xs text-stone-500">jadwal armada</span>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Jadwal operasional siap melayani penumpang hari ini
          </p>
        </div>

        {/* Metric 2: Pesanan Penumpang */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 md:p-6 shadow-xs hover-editorial-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Pesanan Penumpang
            </span>
            <div className="size-11 rounded-2xl bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-2xs">
              <BusIcon className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tabular-nums text-stone-950">
              {bookings.length}
            </span>
            <span className="text-xs text-stone-500">tiket terdaftar</span>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {bookings.filter((b) => b.status === 'terkonfirmasi').length} tiket terkonfirmasi lunas
          </p>
        </div>

        {/* Metric 3: Menunggu Verifikasi Transfer */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 md:p-6 shadow-xs hover-editorial-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Menunggu Verifikasi
            </span>
            <div className="size-11 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs">
              <ReceiptIcon className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tabular-nums text-stone-950">
              {metrics.pendingConfirmationsCount}
            </span>
            <span className="text-xs text-stone-500">konfirmasi transfer</span>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Perlu ditinjau dan disetujui petugas loket
          </p>
        </div>
      </div>

      {/* Pending Confirmations Notice Banner */}
      {pendingConfirmations.length > 0 && (
        <div className="bg-amber-50/70 rounded-2xl border border-amber-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="size-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-serif text-base font-bold text-amber-950">
                Ada {pendingConfirmations.length} Konfirmasi Pembayaran Menunggu Verifikasi
              </h3>
              <p className="text-xs text-amber-900 mt-0.5">
                Penumpang telah mengirimkan data konfirmasi transfer manual. Petugas dapat meninjau rincian rekening dan melakukan verifikasi.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/operator/confirmations')}
            className="shrink-0"
          >
            Buka Halaman Verifikasi
            <ArrowRightIcon className="size-3.5 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Two Column Section: Departure Schedules & Quick Validation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Schedules List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-950">
                Jadwal Keberangkatan Aktif
              </h2>
              <p className="text-xs text-stone-500">
                Daftar rute dan armada yang bertugas melayani perjalanan.
              </p>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {activeSchedulesPreview.map((sch) => (
              <div key={sch.id} className="p-4 hover:bg-stone-50/70 transition-colors flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 text-sm">
                      {sch.originCityName} → {sch.destinationCityName}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                      {sch.departureTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <BusIcon className="size-3.5 text-stone-400" />
                      {sch.vehicleName} ({sch.vehiclePlate})
                    </span>
                    <span>•</span>
                    <span>Tarif: <strong className="text-stone-800">{formatRupiah(sch.price)}</strong></span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-stone-900 block font-mono">
                    {sch.passengerCount} Penumpang Lunas
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/operator/validation')}
                    className="text-xs text-primary hover:underline font-medium mt-1 inline-flex items-center gap-1"
                  >
                    Validasi Loket <ArrowRightIcon className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Operasional Loket Info Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs">
            <h3 className="font-serif text-base font-bold text-stone-950 mb-2">
              Prosedur Operasional Loket
            </h3>
            <ol className="space-y-3 text-xs text-stone-600 list-decimal list-inside leading-relaxed">
              <li>
                <strong>Penelaahan Konfirmasi:</strong> Buka menu Verifikasi Transfer untuk meninjau data rekening pengirim yang dilaporkan member.
              </li>
              <li>
                <strong>Persetujuan Konfirmasi Transfer:</strong> Klik "Setujui" agar status pesanan berubah menjadi <code>terkonfirmasi</code>.
              </li>
              <li>
                <strong>Pemeriksaan Penumpang:</strong> Saat calon penumpang tiba di loket, minta kode pesanan (contoh: <code>TRV-...</code>).
              </li>
              <li>
                <strong>Validasi Keberangkatan:</strong> Klik "Validasi Keberangkatan" untuk menandai tiket telah <code>selesai</code> digunakan.
              </li>
            </ol>
          </div>

          <div className="bg-stone-50/80 rounded-2xl border border-stone-200/80 p-4 text-xs text-stone-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-stone-900">
              <ClockIcon className="size-4 text-primary" />
              <span>Jam Layanan Loket Resmi</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Loket fisik melayani verifikasi tiket dan keberangkatan penumpang 30 menit sebelum jadwal keberangkatan masing-masing armada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
