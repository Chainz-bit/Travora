import { useEffect, useMemo, useState } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import {
  bookingApiService,
  type BookingRecord,
  type BookingStatus,
} from '../services/bookingApiService';
import { MemberLayout } from '../components/MemberLayout';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/useToast';
import {
  TicketIcon,
  ArrowRightIcon,
  CreditCardIcon,
  EyeIcon,
} from '../../../components/ui/Icons';
import { formatRupiah, cn } from '../../../lib/utils';

export interface BookingHistoryPageProps {
  onNavigate: (path: RoutePath, params?: Record<string, string>) => void;
}

type FilterTab = 'semua' | BookingStatus;

export function BookingHistoryPage({ onNavigate }: BookingHistoryPageProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>('semua');
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<BookingRecord | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setIsCanceling(true);
    try {
      await bookingApiService.cancelBooking(bookingToCancel.id);
      const updated = await bookingApiService.getMyBookings();
      setAllBookings(updated);
      toast.success(`Pesanan ${bookingToCancel.id} berhasil dibatalkan dan kursi telah dibuka kembali.`);
      setBookingToCancel(null);
      if (selectedBooking?.id === bookingToCancel.id) {
        setSelectedBooking(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membatalkan pesanan.');
    } finally {
      setIsCanceling(false);
    }
  };

  useEffect(() => {
    let active = true;
    bookingApiService
      .getMyBookings()
      .then((list) => {
        if (!active) return;
        setAllBookings(list);
        setLoadError(null);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat riwayat pemesanan tiket.',
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'semua') return allBookings;
    return allBookings.filter((b) => b.status === activeTab);
  }, [allBookings, activeTab]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'semua', label: 'Semua', count: allBookings.length },
    {
      key: 'menunggu_pembayaran',
      label: 'Menunggu Bayar',
      count: allBookings.filter((b) => b.status === 'menunggu_pembayaran').length,
    },
    {
      key: 'menunggu_verifikasi',
      label: 'Menunggu Verifikasi',
      count: allBookings.filter((b) => b.status === 'menunggu_verifikasi').length,
    },
    {
      key: 'terkonfirmasi',
      label: 'Terkonfirmasi',
      count: allBookings.filter((b) => b.status === 'terkonfirmasi').length,
    },
    {
      key: 'selesai',
      label: 'Keberangkatan Tervalidasi',
      count: allBookings.filter((b) => b.status === 'selesai').length,
    },
  ];

  const renderBadge = (status: BookingStatus) => {
    switch (status) {
      case 'terkonfirmasi':
        return <StatusBadge status="success">Terkonfirmasi</StatusBadge>;
      case 'menunggu_verifikasi':
        return <StatusBadge status="warning">Menunggu Verifikasi</StatusBadge>;
      case 'menunggu_pembayaran':
        return <StatusBadge status="warning">Menunggu Pembayaran</StatusBadge>;
      case 'selesai':
        return <StatusBadge status="info">Keberangkatan Tervalidasi</StatusBadge>;
      case 'dibatalkan':
        return <StatusBadge status="error">Dibatalkan</StatusBadge>;
      default:
        return <StatusBadge status="info">{status}</StatusBadge>;
    }
  };

  return (
    <MemberLayout currentPath="/member/history" onNavigate={onNavigate}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 tracking-tight">
              Riwayat Pemesanan Tiket
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Daftar seluruh transaksi pemesanan tiket travel antar-kota akun Anda.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => onNavigate('/member/booking')}
            className="text-xs h-10 px-4 self-start sm:self-auto"
          >
            <TicketIcon className="size-4 mr-1.5" />
            Pesan Tiket Baru
          </Button>
        </div>

        {loadError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-700">
            {loadError}
          </div>
        )}

        {isLoading && (
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-xs text-stone-500">
            Memuat riwayat pemesanan tiket dari server...
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2',
                  isActive
                    ? 'bg-stone-900 text-white font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums',
                    isActive ? 'bg-stone-800 text-stone-200' : 'bg-stone-200 text-stone-600'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Table / Cards */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8">
            <EmptyState
              icon={<TicketIcon className="size-7 text-control-border" />}
              title="Tidak Ada Riwayat Pemesanan"
              description={`Tidak ditemukan data pemesanan pada kategori tab "${activeTab}".`}
              action={
                <Button variant="primary" size="sm" onClick={() => onNavigate('/member/booking')}>
                  Pesan Tiket Sekarang
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table (52px Row Height) */}
            <div className="hidden lg:block bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-stone-200">
                <table className="w-full text-left text-xs text-stone-600">
                  <thead className="sticky top-0 z-10 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-600 border-b border-stone-200 shadow-2xs">
                  <tr>
                    <th className="px-5 py-3.5">Kode Tiket</th>
                    <th className="px-5 py-3.5">Rute Perjalanan</th>
                    <th className="px-5 py-3.5">Jadwal Keberangkatan</th>
                    <th className="px-5 py-3.5">Armada / Kursi</th>
                    <th className="px-5 py-3.5">Total Tarif</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredBookings.map((b) => (
                    <tr
                      key={b.id}
                      className="h-[52px] hover:bg-stone-50/70 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono font-bold text-stone-900">
                        {b.id}
                      </td>
                      <td className="px-5 py-3 font-semibold text-stone-900">
                        <div className="flex items-center gap-1.5">
                          <span>{b.schedule.originCityName}</span>
                          <ArrowRightIcon className="size-3.5 text-stone-400" />
                          <span>{b.schedule.destinationCityName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-stone-700">
                        {b.schedule.departureDate} ({b.schedule.departureTime})
                      </td>
                      <td className="px-5 py-3 text-stone-700">
                        <span>{b.schedule.vehicleName}</span> &bull;{' '}
                        <span className="font-mono font-semibold text-stone-900">
                          No. {b.seatNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-stone-950 tabular-nums">
                        {formatRupiah(b.totalPrice)}
                      </td>
                      <td className="px-5 py-3 text-center whitespace-nowrap">{renderBadge(b.status)}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                          {b.status === 'menunggu_pembayaran' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  onNavigate('/member/payment-confirmation', { bookingId: b.id })
                                }
                                leftIcon={<CreditCardIcon className="size-3.5" />}
                              >
                                Bayar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setBookingToCancel(b)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Batalkan
                              </Button>
                            </>
                          )}
                          {b.status === 'terkonfirmasi' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => onNavigate('/tickets', { order_code: b.id })}
                              leftIcon={<TicketIcon className="size-3.5" />}
                            >
                              E-Tiket
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBooking(b)}
                            leftIcon={<EyeIcon className="size-3.5" />}
                          >
                            Detail
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

            {/* Mobile / Tablet Cards */}
            <div className="lg:hidden space-y-3">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                    <span className="font-mono font-bold text-xs text-stone-900">{b.id}</span>
                    {renderBadge(b.status)}
                  </div>

                  <div className="flex items-center gap-1.5 font-semibold text-stone-900 text-sm">
                    <span>{b.schedule.originCityName}</span>
                    <ArrowRightIcon className="size-3.5 text-stone-400" />
                    <span>{b.schedule.destinationCityName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Jadwal</span>
                      <span className="font-mono tabular-nums">{b.schedule.departureDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Waktu</span>
                      <span>{b.schedule.departureTime}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Armada</span>
                      <span className="truncate block">{b.schedule.vehicleName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Nomor Kursi</span>
                      <span className="font-mono font-semibold text-stone-900">No. {b.seatNumber}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Total Biaya</span>
                      <span className="font-mono font-bold text-stone-950 text-sm tabular-nums">
                        {formatRupiah(b.totalPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {b.status === 'menunggu_pembayaran' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              onNavigate('/member/payment-confirmation', { bookingId: b.id })
                            }
                            className="text-xs h-8 px-3"
                          >
                            Bayar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBookingToCancel(b)}
                            className="text-xs h-8 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Batal
                          </Button>
                        </>
                      )}
                      {b.status === 'terkonfirmasi' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onNavigate('/tickets', { order_code: b.id })}
                          className="text-xs h-8 px-3"
                        >
                          E-Tiket
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBooking(b)}
                        className="text-xs h-8 px-3"
                      >
                        Detail
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Detail Pemesanan (${selectedBooking.id})`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-600 font-medium">Status Tiket:</span>
              {renderBadge(selectedBooking.status)}
            </div>

            <div className="space-y-3 text-xs">
              <div className="border border-stone-200 rounded-xl p-4 space-y-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Informasi Jadwal & Perjalanan
                </span>
                <div className="grid grid-cols-2 gap-2 text-stone-700">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Rute</span>
                    <span className="font-semibold text-stone-900">
                      {selectedBooking.schedule.originCityName} &rarr; {selectedBooking.schedule.destinationCityName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Waktu Keberangkatan</span>
                    <span className="font-mono tabular-nums">
                      {selectedBooking.schedule.departureDate} &bull; {selectedBooking.schedule.departureTime} WIB
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Armada</span>
                    <span>{selectedBooking.schedule.vehicleName} ({selectedBooking.schedule.vehiclePlate})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Nomor Kursi</span>
                    <span className="font-mono font-bold text-stone-900">No. {selectedBooking.seatNumber}</span>
                  </div>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl p-4 space-y-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Informasi Penumpang & Tarif
                </span>
                <div className="grid grid-cols-2 gap-2 text-stone-700">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Nama Pemesan</span>
                    <span className="font-semibold">{selectedBooking.memberName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Kontak Telepon</span>
                    <span className="font-mono">{selectedBooking.memberPhone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Waktu Pemesanan</span>
                    <span>{selectedBooking.bookingDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block">Total Biaya Tiket</span>
                    <span className="font-mono font-bold text-stone-950 tabular-nums">
                      {formatRupiah(selectedBooking.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedBooking(null)}
                className="text-xs"
              >
                Tutup
              </Button>
              {selectedBooking.status === 'menunggu_pembayaran' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => setBookingToCancel(selectedBooking)}
                    className="text-xs"
                  >
                    Batalkan Pesanan
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const id = selectedBooking.id;
                      setSelectedBooking(null);
                      onNavigate('/member/payment-confirmation', { bookingId: id });
                    }}
                    className="text-xs"
                  >
                    <CreditCardIcon className="size-3.5 mr-1.5" />
                    Konfirmasi Pembayaran
                  </Button>
                </>
              )}
              {selectedBooking.status === 'terkonfirmasi' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const id = selectedBooking.id;
                    setSelectedBooking(null);
                    onNavigate('/tickets', { order_code: id });
                  }}
                  className="text-xs"
                >
                  <TicketIcon className="size-3.5 mr-1.5" />
                  Lihat E-Tiket QR
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Booking Confirmation Modal */}
      <Modal
        isOpen={!!bookingToCancel}
        onClose={() => !isCanceling && setBookingToCancel(null)}
        title="Konfirmasi Pembatalan Pesanan"
        description="Pesanan yang dibatalkan tidak dapat dikembalikan dan nomor kursi akan dibuka untuk penumpang lain."
      >
        {bookingToCancel && (
          <div className="space-y-4 pt-2">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs space-y-1">
              <p>
                <strong>Kode Tiket:</strong>{' '}
                <span className="font-mono text-primary">{bookingToCancel.id}</span>
              </p>
              <p>
                <strong>Rute:</strong> {bookingToCancel.schedule.originCityName} &rarr;{' '}
                {bookingToCancel.schedule.destinationCityName}
              </p>
              <p>
                <strong>Kursi:</strong> No. {bookingToCancel.seatNumber}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isCanceling}
                onClick={() => setBookingToCancel(null)}
              >
                Kembali
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isCanceling}
                onClick={handleConfirmCancel}
              >
                Ya, Batalkan Pesanan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MemberLayout>
  );
}
