import { useState, useEffect } from 'react';
import { SearchForm } from '../../features/schedule/components/SearchForm';
import { ScheduleCard } from '../../features/schedule/components/ScheduleCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MapPinIcon, CalendarIcon, AlertCircleIcon, BusIcon } from '../../components/ui/Icons';
import { apiClient } from '../../services/api';
import { formatDateIndonesian, formatCurrency } from '../../lib/utils';
import type {
  CityOption,
  SearchTicketFormValues,
  ScheduleViewModel,
  ScheduleViewStatus,
} from '../../types';
import type { RoutePath } from '../../hooks/useRouter';

export interface SchedulesPageProps {
  initialSearchValues?: SearchTicketFormValues;
  onNavigateHome: () => void;
  onNavigate?: (path: RoutePath, params?: Record<string, string>) => void;
}

export function SchedulesPage({
  initialSearchValues,
  onNavigateHome,
  onNavigate,
}: SchedulesPageProps) {
  const [searchParams, setSearchParams] = useState<SearchTicketFormValues>(
    () =>
      initialSearchValues || {
        originCityId: '101',
        destinationCityId: '201',
        departureDate: '2026-11-13',
      }
  );

  const [originCities, setOriginCities] = useState<CityOption[]>([]);
  const [destCities, setDestCities] = useState<CityOption[]>([]);
  const [status, setStatus] = useState<ScheduleViewStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduleViewModel[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ScheduleViewModel | null>(null);
  const [bookingNoticeOpen, setBookingNoticeOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Ambil metadata kota dari API untuk badge header
  useEffect(() => {
    let isMounted = true;
    async function loadCities() {
      try {
        const [origins, dests] = await Promise.all([
          apiClient.getOriginCities(),
          apiClient.getDestinationCities(),
        ]);
        if (isMounted) {
          setOriginCities(origins);
          setDestCities(dests);
        }
      } catch {
        // Abaikan jika gagal; badge menggunakan fallback
      }
    }
    loadCities();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch jadwal langsung dari Go REST API Backend
  useEffect(() => {
    let isMounted = true;

    async function fetchLiveSchedules() {
      try {
        const data = await apiClient.getSchedules({
          originCityId: searchParams.originCityId,
          destinationCityId: searchParams.destinationCityId,
          departureDate: searchParams.departureDate,
        });

        if (isMounted) {
          setSchedules(data);
          setStatus(data.length > 0 ? 'success' : 'empty');
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error('Error fetching schedules from Go API:', err);
          const msg = err instanceof Error ? err.message : 'Gagal menghubungi server Go API.';
          setErrorMessage(msg);
          setStatus('error');
        }
      }
    }

    fetchLiveSchedules();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const originCity = originCities.find((c) => c.id === searchParams.originCityId);
  const destinationCity = destCities.find((c) => c.id === searchParams.destinationCityId);

  function handleSearchSubmit(newValues: SearchTicketFormValues) {
    setStatus('loading');
    setErrorMessage(null);
    setSearchParams(newValues);
  }

  async function handleSelectTicket(schedule: ScheduleViewModel) {
    setSelectedTicket(schedule);
    setBookingNoticeOpen(true);
    setDetailLoading(true);

    try {
      // Panggil endpoint detail GET /api/v1/schedules/{id} untuk verifikasi live API
      const detail = await apiClient.getScheduleById(schedule.id);
      setSelectedTicket(detail);
    } catch (err) {
      console.warn('Gagal memuat detail via endpoint individual, menggunakan cache list:', err);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="w-full bg-canvas-dashboard min-h-[calc(100vh-144px)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* =========================================================================
            HEADER PENCARIAN & PARAMETER
           ========================================================================= */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest font-semibold text-primary">
                Hasil Pencarian Tiket
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
                Jadwal Perjalanan Tersedia
              </h1>
            </div>

            {/* Parameter Badge */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-900 font-semibold border border-stone-200/60 shadow-2xs">
                <MapPinIcon className="size-3.5 text-primary" />
                <span>{originCity?.name || `Kota Asal (${searchParams.originCityId})`}</span>
                <span className="text-stone-400">→</span>
                <MapPinIcon className="size-3.5 text-slate-800" />
                <span>{destinationCity?.name || `Kota Tujuan (${searchParams.destinationCityId})`}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-900 font-semibold border border-stone-200/60 shadow-2xs">
                <CalendarIcon className="size-3.5 text-stone-500" />
                <span>{formatDateIndonesian(searchParams.departureDate)}</span>
              </div>

              <StatusBadge status="success">Jadwal Aktif Terverifikasi</StatusBadge>
            </div>
          </div>

          {/* Form Filter / Ubah Pencarian */}
          <div className="pt-1">
            <details className="group">
              <summary className="text-xs font-bold text-primary hover:text-primary-hover cursor-pointer flex items-center gap-1.5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-lg p-1.5 w-fit">
                <span>Ubah Kriteria Pencarian</span>
                <span className="transition-transform duration-200 group-open:rotate-180 text-[10px]">▼</span>
              </summary>
              <div className="pt-4 animate-page-enter">
                <SearchForm
                  initialValues={searchParams}
                  onSearch={handleSearchSubmit}
                  className="bg-stone-50/70 border-stone-200/80 shadow-2xs"
                />
              </div>
            </details>
          </div>
        </div>

        {/* =========================================================================
            STATE PENAMPILAN DAFTAR JADWAL
           ========================================================================= */}
        <section aria-label="Daftar Jadwal Perjalanan" className="space-y-4">
          {/* State 1: Loading */}
          {status === 'loading' && (
            <LoadingState message="Memuat jadwal langsung dari database PostgreSQL via Go API..." />
          )}

          {/* State 2: Error */}
          {status === 'error' && (
            <div className="w-full bg-white border border-red-200 rounded-lg p-8 text-center space-y-4">
              <div className="size-12 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto">
                <AlertCircleIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900">
                  Gagal Memuat Jadwal dari API
                </h3>
                <p className="text-sm text-stone-600 max-w-lg mx-auto">
                  {errorMessage || 'Terjadi kendala saat menghubungi backend Go REST API.'}
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSearchParams({ ...searchParams })}
                >
                  Coba Lagi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateHome}
                >
                  Kembali ke Beranda
                </Button>
              </div>
            </div>
          )}

          {/* State 3: Empty Result */}
          {status === 'empty' && (
            <EmptyState
              title={`Belum Ada Jadwal ${originCity?.name || ''} ke ${destinationCity?.name || ''}`}
              description={`Tidak ditemukan jadwal aktif untuk rute dan tanggal ${formatDateIndonesian(searchParams.departureDate)} pada database. Silakan coba tanggal lain atau ubah kota tujuan.`}
              action={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSearchParams({
                        originCityId: '101',
                        destinationCityId: '201',
                        departureDate: '2026-11-13',
                      })
                    }
                  >
                    Lihat Rute Bandung — Jakarta (13 Nov 2026)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNavigateHome}
                  >
                    Kembali ke Beranda
                  </Button>
                </div>
              }
            />
          )}

          {/* State 4: Results */}
          {status === 'success' && schedules.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-stone-600 px-1">
                <span>
                  Menampilkan <strong>{schedules.length}</strong> jadwal perjalanan (Database PostgreSQL)
                </span>
                <span className="italic">Tarif transparan point-to-point</span>
              </div>

              {schedules.map((item) => (
                <ScheduleCard
                  key={item.id}
                  schedule={item}
                  onSelectTicket={handleSelectTicket}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal Notifikasi & Detail Jadwal (GET /api/v1/schedules/{id}) */}
      <Modal
        isOpen={bookingNoticeOpen}
        onClose={() => setBookingNoticeOpen(false)}
        title="Detail Jadwal Perjalanan"
        description="Data rute dan armada terverifikasi langsung dari database operasional."
      >
        {selectedTicket && (
          <div className="space-y-4 pt-2">
            {detailLoading && (
              <div className="text-xs text-stone-500 italic pb-1">Memverifikasi detail jadwal dari backend...</div>
            )}
            <div className="bg-stone-50 rounded-md border border-stone-200 p-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-600">ID Jadwal:</span>
                <span className="font-mono text-xs font-semibold text-stone-800 bg-stone-200 px-2 py-0.5 rounded">
                  #{selectedTicket.id}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-600">Rute:</span>
                <span className="font-semibold text-stone-900">
                  {selectedTicket.originCityName} → {selectedTicket.destinationCityName}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-600">Tanggal Keberangkatan:</span>
                <span className="font-semibold text-stone-900">
                  {formatDateIndonesian(selectedTicket.departureDate)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-600">Waktu Berangkat:</span>
                <span className="font-semibold text-stone-900">
                  {selectedTicket.departureTime} WIB
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-600">Armada Kendaraan:</span>
                <span className="text-stone-900">
                  {selectedTicket.vehicleName} ({selectedTicket.vehiclePlate})
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-stone-600">Tarif per Penumpang:</span>
                <span className="text-base font-bold text-stone-900 tabular-nums">
                  {formatCurrency(selectedTicket.price)}
                </span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
              <BusIcon className="size-4 shrink-0 text-amber-700 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Ketentuan Penumpang:</strong> Kapasitas bagasi hingga 15 kg per orang. Harap tiba di titik kumpul atau loket minimal 15 menit sebelum jam keberangkatan.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingNoticeOpen(false)}
              >
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setBookingNoticeOpen(false);
                  if (onNavigate) {
                    onNavigate('/member/booking', { scheduleId: selectedTicket.id });
                  }
                }}
              >
                Lanjutkan ke Pemilihan Kursi &rarr;
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
