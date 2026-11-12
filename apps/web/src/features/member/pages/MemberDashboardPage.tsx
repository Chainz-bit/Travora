import { useState, useMemo } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { BookingViewModel } from '../../../types/index';
import { authService } from '../../auth/services/authService';
import { mockBookingService } from '../services/mockBookingService';
import { MemberLayout } from '../components/MemberLayout';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  TicketIcon,
  ReceiptIcon,
  HistoryIcon,
  CalendarIcon,
  ClockIcon,
  BusIcon,
  ArrowRightIcon,
  CreditCardIcon,
  SparklesIcon,
  EyeIcon,
} from '../../../components/ui/Icons';
import { formatRupiah } from '../../../lib/utils';

export interface MemberDashboardPageProps {
  onNavigate: (path: RoutePath) => void;
}

export function MemberDashboardPage({ onNavigate }: MemberDashboardPageProps) {
  const user = authService.getCurrentUser();
  const [selectedTicket, setSelectedTicket] = useState<BookingViewModel | null>(null);

  const activeBookings = useMemo(() => {
    return mockBookingService.getActiveBookings(user?.id);
  }, [user?.id]);

  const metrics = useMemo(() => {
    return mockBookingService.getMetrics(user?.id);
  }, [user?.id]);

  return (
    <MemberLayout currentPath="/member" onNavigate={onNavigate}>
      <div className="space-y-8">
        {/* Editorial Greeting Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 md:p-8 rounded-2xl border border-stone-200 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-primary mb-2.5">
              <SparklesIcon className="size-3.5" />
              <span>Akun Member Terverifikasi</span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 tracking-tight">
              Selamat Datang, {user?.name || 'Budi Pratama'}
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Kelola perjalanan antar-kota Anda dengan mudah dan terpantau secara transparan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              onClick={() => onNavigate('/member/booking')}
              className="text-xs h-10 px-4"
            >
              <TicketIcon className="size-4 mr-1.5" />
              Pesan Tiket Baru
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate('/member/payment-confirmation')}
              className="text-xs h-10 px-4"
            >
              <CreditCardIcon className="size-4 mr-1.5" />
              Konfirmasi Transfer
            </Button>
          </div>
        </div>

        {/* Metric Cards (3 Metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200/90 shadow-xs hover-editorial-lift transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Tiket Aktif
              </p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-stone-900">
                {metrics.activeTicketsCount}
              </p>
              <p className="mt-1 text-[11px] text-stone-500">Siap untuk keberangkatan</p>
            </div>
            <div className="size-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs">
              <TicketIcon className="size-6" />
            </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200/90 shadow-xs hover-editorial-lift transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Menunggu Konfirmasi
              </p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-amber-700">
                {metrics.pendingPaymentCount}
              </p>
              <p className="mt-1 text-[11px] text-stone-500">Menunggu pembayaran / verifikasi</p>
            </div>
            <div className="size-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-2xs">
              <ReceiptIcon className="size-6" />
            </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200/90 shadow-xs hover-editorial-lift transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Total Perjalanan
              </p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-stone-900">
                {metrics.totalTripsCount}
              </p>
              <p className="mt-1 text-[11px] text-stone-500">Perjalanan tersimpan</p>
            </div>
            <div className="size-12 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 shadow-2xs">
              <HistoryIcon className="size-6" />
            </div>
          </div>
        </div>

        {/* Active Tickets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-stone-950">
                Tiket Perjalanan Aktif
              </h2>
              <p className="text-xs text-stone-500">
                Tiket resmi yang telah terkonfirmasi dan siap digunakan pada hari keberangkatan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/member/history')}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Semua Riwayat</span>
              <ArrowRightIcon className="size-3.5" />
            </button>
          </div>

          {activeBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs">
              <EmptyState
                icon={<TicketIcon className="size-7 text-control-border" />}
                title="Tidak Ada Tiket Aktif"
                description="Anda belum memiliki tiket perjalanan yang siap berangkat. Silakan cari jadwal perjalanan yang sesuai untuk memesan tiket."
                action={
                  <Button variant="primary" size="sm" onClick={() => onNavigate('/member/booking')}>
                    Pesan Tiket Sekarang
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeBookings.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 md:p-6 hover-editorial-lift hover:border-stone-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary">
                        {ticket.id}
                      </span>
                      <p className="text-[11px] text-stone-500">
                        Dipesan: {ticket.bookingDate}
                      </p>
                    </div>
                    <StatusBadge status="success">
                      Terkonfirmasi
                    </StatusBadge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stone-950 font-serif font-bold text-lg">
                      <span>{ticket.schedule.originCityName}</span>
                      <ArrowRightIcon className="size-4 text-stone-400 font-sans" />
                      <span>{ticket.schedule.destinationCityName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 bg-stone-50/80 p-3.5 rounded-xl border border-stone-100">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="size-3.5 text-stone-400" />
                        <span className="font-mono tabular-nums">{ticket.schedule.departureDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="size-3.5 text-stone-400" />
                        <span>{ticket.schedule.departureTime} WIB</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BusIcon className="size-3.5 text-stone-400" />
                        <span className="truncate">{ticket.schedule.vehicleName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                        <span>Kursi:</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-stone-200 text-stone-900">
                          No. {ticket.seatNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                    <div>
                      <span className="text-[11px] text-stone-500 block">Total Tarif</span>
                      <span className="font-mono font-bold text-stone-950 text-base tabular-nums">
                        {formatRupiah(ticket.totalPrice)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTicket(ticket)}
                      leftIcon={<EyeIcon className="size-3.5" />}
                    >
                      Lihat Detail
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Help & Manual Transfer Guide */}
        <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-serif text-base font-bold text-stone-950">
              Butuh Bantuan Kendala atau Pengaduan Layanan?
            </h3>
            <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
              Jika mengalami kendala operasional, jadwal, maupun pelayanan armada, Anda dapat mengirimkan keluhan resmi yang ditinjau dan ditindaklanjuti oleh Admin Travora.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => onNavigate('/member/complaints')}
            className="text-xs shrink-0 bg-white shadow-2xs"
          >
            Layanan Pengaduan
          </Button>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title="Detail Tiket Perjalanan"
        >
          <div className="space-y-5">
            {/* Ticket Card Summary */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <span className="font-serif font-bold text-base text-stone-950 block">
                    TRAVORA TRAVEL
                  </span>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                    E-Tiket Resmi Perjalanan
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block">
                    Kode Tiket
                  </span>
                  <span className="font-mono font-bold text-sm text-primary">
                    {selectedTicket.id}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-emerald-950">Status: Terkonfirmasi</p>
                  <p className="text-[11px] text-emerald-800">
                    Tiket siap digunakan. Harap tiba di loket 15 menit sebelum waktu keberangkatan.
                  </p>
                </div>
                <StatusBadge status="success">Lunas</StatusBadge>
              </div>

              {/* Trip & Passenger Info */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-stone-200/80">
                <div>
                  <span className="text-[11px] text-stone-400 block">Nama Pemesan</span>
                  <span className="font-semibold text-stone-900">{selectedTicket.memberName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Nomor Telepon</span>
                  <span className="font-mono text-stone-800">{selectedTicket.memberPhone}</span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Kota Asal &rarr; Tujuan</span>
                  <span className="font-semibold text-stone-900">
                    {selectedTicket.schedule.originCityName} &rarr; {selectedTicket.schedule.destinationCityName}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Tanggal & Waktu</span>
                  <span className="font-mono font-semibold text-stone-900 tabular-nums">
                    {selectedTicket.schedule.departureDate} &bull; {selectedTicket.schedule.departureTime} WIB
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Armada</span>
                  <span className="text-stone-800">
                    {selectedTicket.schedule.vehicleName} ({selectedTicket.schedule.vehiclePlate})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-400 block">Nomor Kursi</span>
                  <span className="font-mono font-bold text-stone-950 bg-stone-100 px-2 py-0.5 rounded-md text-sm inline-block">
                    No. {selectedTicket.seatNumber}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-stone-100 flex justify-between items-center">
                  <span className="text-stone-500">Total Tarif:</span>
                  <span className="font-mono font-bold text-base text-stone-950 tabular-nums">
                    {formatRupiah(selectedTicket.totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedTicket(null)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </MemberLayout>
  );
}
