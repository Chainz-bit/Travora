import { useState } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import { sharedStore } from '../../shared/services/sharedStore';
import { useSharedStore } from '../../shared/hooks/useSharedStore';
import {
  CalendarIcon,
  BusIcon,
  MessageSquareIcon,
  ArrowRightIcon,
  BuildingIcon,
  MapPinIcon,
  AlertCircleIcon,
  CheckIcon,
  PlusIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';
import { formatRupiah } from '../../../lib/utils';

export interface AdminDashboardPageProps {
  onNavigate: (path: RoutePath) => void;
}

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  useSharedStore(); // reactive re-render on any store mutation

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const metrics = sharedStore.getAdminMetrics();
  const schedules = sharedStore.getSchedules(true); // active schedules
  const complaints = sharedStore.getComplaints().filter((c) => c.status === 'diajukan' || c.status === 'diproses');

  const handleResetData = () => {
    sharedStore.resetDemoData();
    setResetModalOpen(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-primary">
            Pusat Kendali Master Data
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-950 mt-1">
            Dashboard Administrator
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Kelola data master kota asal, kota tujuan, armada kendaraan, jadwal keberangkatan, dan tanggapi keluhan member.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetModalOpen(true)}
            className="text-stone-600 border-stone-300 hover:bg-stone-100"
          >
            Reset Data Default
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/admin/schedules')}
          >
            <PlusIcon className="size-4 mr-1.5" />
            Tambah Jadwal
          </Button>
        </div>
      </div>

      {resetSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-sm text-emerald-800 animate-in fade-in">
          <CheckIcon className="size-5 text-emerald-600 shrink-0" />
          <span>Data master dan operasional berhasil diatur ulang ke kondisi default awal.</span>
        </div>
      )}

      {/* 3 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Metric 1: Jadwal Aktif */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 md:p-6 shadow-xs hover-editorial-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Jadwal Aktif
            </span>
            <div className="size-11 rounded-2xl bg-orange-100/70 border border-orange-200 flex items-center justify-center text-primary shadow-2xs">
              <CalendarIcon className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tabular-nums text-stone-950">
              {metrics.activeSchedulesCount}
            </span>
            <span className="text-xs text-stone-500">jadwal operasional</span>
          </div>
          <p className="mt-2 text-xs text-stone-500 flex items-center gap-1">
            <span>Rute aktif tersedia untuk pemesanan member</span>
          </p>
        </div>

        {/* Metric 2: Kendaraan Terdaftar */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 md:p-6 shadow-xs hover-editorial-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Armada Kendaraan
            </span>
            <div className="size-11 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 shadow-2xs">
              <BusIcon className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tabular-nums text-stone-950">
              {metrics.vehiclesCount}
            </span>
            <span className="text-xs text-stone-500">unit armada</span>
          </div>
          <p className="mt-2 text-xs text-stone-500 flex items-center gap-1">
            <span>HiAce & Isuzu Elf terdaftar di sistem</span>
          </p>
        </div>

        {/* Metric 3: Keluhan Menunggu Tanggapan */}
        <div className="bg-white rounded-2xl border border-stone-200/90 p-5 md:p-6 shadow-xs hover-editorial-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Keluhan Menunggu Respon
            </span>
            <div className="size-11 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs">
              <MessageSquareIcon className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-sans tabular-nums text-stone-950">
              {metrics.pendingComplaintsCount}
            </span>
            <span className="text-xs text-stone-500">laporan member</span>
          </div>
          <p className="mt-2 text-xs text-stone-500 flex items-center gap-1">
            <span>Membutuhkan tanggapan resmi dari Admin</span>
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="font-serif text-lg font-bold text-stone-950 mb-3">
          Akses Cepat Manajemen Master Data
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('/admin/origin-cities')}
            className="p-5 bg-white rounded-2xl border border-stone-200/90 hover:border-primary/40 hover-editorial-lift hover:shadow-xs transition-all text-left flex items-start justify-between group"
          >
            <div className="space-y-1">
              <div className="size-9 rounded-xl bg-orange-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <BuildingIcon className="size-4.5" />
              </div>
              <p className="text-sm font-semibold text-stone-900 pt-2">Kota Asal</p>
              <p className="text-xs text-stone-500">Kelola daftar titik keberangkatan</p>
            </div>
            <ArrowRightIcon className="size-4 text-stone-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/admin/destination-cities')}
            className="p-5 bg-white rounded-2xl border border-stone-200/90 hover:border-primary/40 hover-editorial-lift hover:shadow-xs transition-all text-left flex items-start justify-between group"
          >
            <div className="space-y-1">
              <div className="size-9 rounded-xl bg-orange-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <MapPinIcon className="size-4.5" />
              </div>
              <p className="text-sm font-semibold text-stone-900 pt-2">Kota Tujuan</p>
              <p className="text-xs text-stone-500">Kelola daftar destinasi perjalanan</p>
            </div>
            <ArrowRightIcon className="size-4 text-stone-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/admin/vehicles')}
            className="p-5 bg-white rounded-2xl border border-stone-200/90 hover:border-primary/40 hover-editorial-lift hover:shadow-xs transition-all text-left flex items-start justify-between group"
          >
            <div className="space-y-1">
              <div className="size-9 rounded-xl bg-orange-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <BusIcon className="size-4.5" />
              </div>
              <p className="text-sm font-semibold text-stone-900 pt-2">Kendaraan</p>
              <p className="text-xs text-stone-500">Kelola nomor plat dan armada</p>
            </div>
            <ArrowRightIcon className="size-4 text-stone-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/admin/complaints')}
            className="p-5 bg-white rounded-2xl border border-stone-200/90 hover:border-primary/40 hover-editorial-lift hover:shadow-xs transition-all text-left flex items-start justify-between group"
          >
            <div className="space-y-1">
              <div className="size-9 rounded-xl bg-orange-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <MessageSquareIcon className="size-4.5" />
              </div>
              <p className="text-sm font-semibold text-stone-900 pt-2">Keluhan Member</p>
              <p className="text-xs text-stone-500">Tinjau dan tanggapi laporan pengguna</p>
            </div>
            <ArrowRightIcon className="size-4 text-stone-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* Active Schedules Preview Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
        <div className="px-6 py-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg font-bold text-stone-950">
              Pratinjau Jadwal Keberangkatan Aktif
            </h2>
            <p className="text-xs text-stone-500">
              Menampilkan {schedules.length} jadwal aktif yang saat ini tampil pada pencarian publik dan pemesanan member.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/admin/schedules')}
          >
            Lihat Semua Jadwal
            <ArrowRightIcon className="size-3.5 ml-1.5" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/80 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-6">ID & Rute</th>
                <th className="py-3.5 px-6">Tanggal & Jam</th>
                <th className="py-3.5 px-6">Kendaraan</th>
                <th className="py-3.5 px-6 text-right">Tarif Tiket</th>
                <th className="py-3.5 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {schedules.slice(0, 5).map((sch) => (
                <tr key={sch.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="py-3.5 px-6">
                    <span className="font-mono text-xs text-stone-500 block">{sch.id}</span>
                    <div className="font-medium text-stone-900 flex items-center gap-1.5">
                      <span>{sch.originCityName}</span>
                      <span className="text-stone-400">→</span>
                      <span>{sch.destinationCityName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="font-sans text-stone-900 block">{sch.departureDate}</span>
                    <span className="text-xs font-mono text-stone-500">{sch.departureTime} WIB</span>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="font-medium text-stone-900 block">{sch.vehicleName}</span>
                    <span className="font-mono text-xs text-stone-500">{sch.vehiclePlate}</span>
                  </td>
                  <td className="py-3.5 px-6 text-right font-sans font-semibold tabular-nums text-stone-900">
                    {formatRupiah(sch.price)}
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <StatusBadge status="success">Aktif</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Complaints Attention List */}
      {complaints.length > 0 && (
        <div className="bg-amber-50/50 rounded-xl border border-amber-200/80 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="size-4.5 text-amber-700" />
              <h3 className="font-serif text-base font-bold text-amber-950">
                Perhatian: {complaints.length} Keluhan Memerlukan Respon Admin
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/admin/complaints')}
              className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs"
            >
              Tanggapi Keluhan
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {complaints.slice(0, 2).map((c) => (
              <div key={c.id} className="bg-white p-3.5 rounded-lg border border-amber-200/60 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-semibold text-stone-600">{c.id}</span>
                  <StatusBadge status="warning">
                    {c.status === 'diajukan' ? 'Diajukan' : 'Diproses'}
                  </StatusBadge>
                </div>
                <p className="text-xs font-semibold text-stone-900 line-clamp-1">{c.subject}</p>
                <p className="text-xs text-stone-500 line-clamp-2 mt-1">{c.message}</p>
                <p className="text-[11px] text-stone-400 mt-2 font-mono">Pengirim: {c.memberName} • {c.createdAt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset Data Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Atur Ulang Data Master"
        description="Apakah Anda yakin ingin mengembalikan seluruh data master, pesanan, konfirmasi, dan keluhan ke kondisi awal?"
      >
        <div className="space-y-4 pt-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
            Tindakan ini akan mengatur ulang data master lokal pada peramban Anda kembali ke data awal. Seluruh file proyek atau kode sumber tidak akan terpengaruh.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setResetModalOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleResetData}>
              Ya, Atur Ulang Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
