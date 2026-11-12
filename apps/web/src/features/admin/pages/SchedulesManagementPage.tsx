import { useState, useMemo, type FormEvent } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { ScheduleEntity, ScheduleFormValues } from '../../../types/index';
import { sharedStore } from '../../shared/services/sharedStore';
import { useSharedStore } from '../../shared/hooks/useSharedStore';
import {
  CalendarIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  AlertCircleIcon,
  CheckIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Modal } from '../../../components/ui/Modal';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/useToast';
import { formatRupiah } from '../../../lib/utils';

export interface SchedulesManagementPageProps {
  onNavigate?: (path: RoutePath) => void;
}

export function SchedulesManagementPage() {
  useSharedStore();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEntity | null>(null);

  // Form states
  const [originCityId, setOriginCityId] = useState('');
  const [destinationCityId, setDestinationCityId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleEntity | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Master data for dropdowns
  const originCities = sharedStore.getOriginCities();
  const destinationCities = sharedStore.getDestinationCities();
  const vehicles = sharedStore.getVehicles();
  const scheduleEntities = sharedStore.getScheduleEntities();

  // Enriched schedules for table view
  const enrichedSchedules = useMemo(() => {
    return scheduleEntities.map((sch) => {
      const origin = originCities.find((c) => c.id === sch.originCityId);
      const dest = destinationCities.find((c) => c.id === sch.destinationCityId);
      const vehicle = vehicles.find((v) => v.id === sch.vehicleId);

      return {
        ...sch,
        originName: origin?.name || 'Kota Asal',
        originCode: origin?.code || '---',
        destName: dest?.name || 'Kota Tujuan',
        destCode: dest?.code || '---',
        vehicleName: vehicle?.name || 'Shuttle Travel',
        vehiclePlate: vehicle?.plateNumber || 'D 0000 TRV',
      };
    });
  }, [scheduleEntities, originCities, destinationCities, vehicles]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    let result = enrichedSchedules;

    if (statusFilter === 'active') {
      result = result.filter((s) => s.isActive);
    } else if (statusFilter === 'inactive') {
      result = result.filter((s) => !s.isActive);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.originName.toLowerCase().includes(q) ||
          s.destName.toLowerCase().includes(q) ||
          s.vehicleName.toLowerCase().includes(q) ||
          s.vehiclePlate.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [enrichedSchedules, statusFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setOriginCityId(originCities[0]?.id || '');
    setDestinationCityId(destinationCities[1]?.id || destinationCities[0]?.id || '');
    setVehicleId(vehicles[0]?.id || '');
    setDepartureDate(new Date().toISOString().split('T')[0]);
    setDepartureTime('08:00 WIB');
    setPrice(135000);
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (sch: ScheduleEntity) => {
    setEditingSchedule(sch);
    setOriginCityId(sch.originCityId);
    setDestinationCityId(sch.destinationCityId);
    setVehicleId(sch.vehicleId);
    setDepartureDate(sch.departureDate);
    setDepartureTime(sch.departureTime);
    setPrice(sch.price);
    setIsActive(sch.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    sharedStore.toggleScheduleActive(id);
    const msg = `Status jadwal ${id} berhasil diubah menjadi ${!currentStatus ? 'Aktif' : 'Nonaktif'}.`;
    toast.info(msg);
    setFeedbackMessage({
      type: 'success',
      text: msg,
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (originCityId === destinationCityId) {
      setFormError('Kota asal dan kota tujuan tidak boleh sama.');
      return;
    }

    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      setFormError('Tarif tiket harus bernilai positif lebih besar dari 0.');
      return;
    }

    let cleanTime = departureTime.trim();
    if (!cleanTime.toLowerCase().includes('wib')) {
      cleanTime = `${cleanTime} WIB`;
    }

    const values: ScheduleFormValues = {
      originCityId,
      destinationCityId,
      vehicleId,
      departureDate,
      departureTime: cleanTime,
      price: numPrice,
      isActive,
    };

    if (editingSchedule) {
      const res = sharedStore.updateSchedule(editingSchedule.id, values);
      if (!res.success) {
        setFormError(res.error || 'Gagal memperbarui jadwal.');
        return;
      }
      toast.success(`Jadwal ${editingSchedule.id} berhasil diperbarui.`);
      setFeedbackMessage({
        type: 'success',
        text: `Jadwal ${editingSchedule.id} berhasil diperbarui.`,
      });
    } else {
      const res = sharedStore.addSchedule(values);
      if (!res.success) {
        setFormError(res.error || 'Gagal menambahkan jadwal baru.');
        return;
      }
      toast.success(`Jadwal baru berhasil dibuat dan langsung tampil di pencarian publik.`);
      setFeedbackMessage({
        type: 'success',
        text: `Jadwal baru berhasil dibuat dan langsung tersinkronisasi ke pencarian publik.`,
      });
    }

    setModalOpen(false);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleOpenDelete = (sch: ScheduleEntity) => {
    setScheduleToDelete(sch);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!scheduleToDelete) return;

    const res = sharedStore.deleteSchedule(scheduleToDelete.id);
    if (!res.success) {
      toast.error(res.error || 'Gagal menghapus jadwal.');
      setFeedbackMessage({ type: 'error', text: res.error || 'Gagal menghapus jadwal.' });
    } else {
      if (res.error) {
        toast.info(res.error);
        setFeedbackMessage({ type: 'success', text: res.error });
      } else {
        toast.success(`Jadwal ${scheduleToDelete.id} berhasil dihapus.`);
        setFeedbackMessage({
          type: 'success',
          text: `Jadwal ${scheduleToDelete.id} berhasil dihapus dari sistem.`,
        });
      }
    }

    setDeleteModalOpen(false);
    setScheduleToDelete(null);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-primary">
            Master Data Operasional
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-950 mt-1 flex items-center gap-2.5">
            <CalendarIcon className="size-7 text-primary" />
            <span>Manajemen Jadwal Keberangkatan</span>
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Atur rute, waktu keberangkatan, penugasan armada kendaraan, dan tarif tiket (Entitas Jadwal).
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAdd}>
          <PlusIcon className="size-4 mr-1.5" />
          Tambah Jadwal Baru
        </Button>
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

      {/* Filters & Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="size-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                type="search"
                placeholder="Cari rute, plat, kendaraan..."
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
                Semua ({enrichedSchedules.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'active' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Aktif ({enrichedSchedules.filter((s) => s.isActive).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'inactive' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Nonaktif ({enrichedSchedules.filter((s) => !s.isActive).length})
              </button>
            </div>
          </div>

          <div className="text-xs text-stone-500 font-sans">
            Menampilkan <span className="font-semibold text-stone-900 tabular-nums">{filteredSchedules.length}</span> jadwal
          </div>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada jadwal yang sesuai"
              description={
                searchQuery || statusFilter !== 'all'
                  ? 'Tidak ada jadwal yang memenuhi kriteria pencarian atau filter status yang dipilih.'
                  : 'Belum ada jadwal keberangkatan yang dibuat.'
              }
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={
                    searchQuery || statusFilter !== 'all'
                      ? () => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }
                      : handleOpenAdd
                  }
                >
                  {searchQuery || statusFilter !== 'all' ? 'Reset Filter' : 'Tambah Jadwal Baru'}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200 shadow-2xs">
                <tr>
                  <th className="py-3 px-6">ID & Rute</th>
                  <th className="py-3 px-6">Waktu Berangkat</th>
                  <th className="py-3 px-6">Armada Ditugaskan</th>
                  <th className="py-3 px-6 text-right">Tarif</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredSchedules.map((sch) => (
                  <tr key={sch.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <span className="font-mono text-xs text-stone-500 block">{sch.id}</span>
                      <div className="font-semibold text-stone-900 flex items-center gap-1.5 mt-0.5">
                        <span>{sch.originName}</span>
                        <span className="text-primary">→</span>
                        <span>{sch.destName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-sans text-stone-900 font-medium block">
                        {sch.departureDate}
                      </span>
                      <span className="font-mono text-xs text-stone-500">
                        {sch.departureTime}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-medium text-stone-900 block">{sch.vehicleName}</span>
                      <span className="font-mono text-xs text-stone-500">{sch.vehiclePlate}</span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-sans font-bold tabular-nums text-stone-900">
                      {formatRupiah(sch.price)}
                    </td>
                    <td className="py-3.5 px-6 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(sch.id, sch.isActive)}
                        className="cursor-pointer group"
                        title="Klik untuk beralih status aktif/nonaktif"
                      >
                        <StatusBadge status={sch.isActive ? 'success' : 'neutral'}>
                          {sch.isActive ? 'Aktif' : 'Nonaktif'}
                        </StatusBadge>
                      </button>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(sch)}
                          leftIcon={<EditIcon className="size-3.5" />}
                          title="Ubah Jadwal"
                        >
                          Ubah
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(sch)}
                          leftIcon={<TrashIcon className="size-3.5 text-red-600" />}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Hapus / Nonaktifkan Jadwal"
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Schedule Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSchedule ? 'Ubah Rincian Jadwal' : 'Tambah Jadwal Keberangkatan'}
        description="Pilih rute kota, kendaraan, waktu keberangkatan, dan tarif tiket travel."
        className="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircleIcon className="size-4 shrink-0 text-red-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Select
                label="Kota Asal"
                value={originCityId}
                onChange={(e) => setOriginCityId(e.target.value)}
                options={originCities.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
                required
              />
            </div>
            <div>
              <Select
                label="Kota Tujuan"
                value={destinationCityId}
                onChange={(e) => setDestinationCityId(e.target.value)}
                options={destinationCities.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
                required
              />
            </div>
          </div>

          <div>
            <Select
              label="Armada Kendaraan Ditugaskan"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              options={vehicles.map((v) => ({
                value: v.id,
                label: `${v.name} — ${v.plateNumber} (${v.status === 'aktif' ? 'Aktif' : 'Perawatan'})`,
              }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Tanggal Keberangkatan"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Jam Keberangkatan"
                placeholder="Contoh: 08:00 WIB"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Tarif Tiket Per Kursi (Rp)"
              type="number"
              min="10000"
              step="5000"
              placeholder="Contoh: 135000"
              value={price}
              onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
              required
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-stone-300"
              />
              <span className="text-xs font-medium text-stone-900 select-none">
                Jadwal langsung aktif dan tampil pada pencarian tiket publik
              </span>
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              {editingSchedule ? 'Simpan Perubahan' : 'Tambah Jadwal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Konfirmasi Hapus / Nonaktifkan Jadwal"
        description="Apakah Anda yakin ingin menghapus atau menonaktifkan jadwal perjalanan ini?"
      >
        <div className="space-y-4 pt-2">
          {scheduleToDelete && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs space-y-1">
              <p>
                <strong>ID Jadwal:</strong> {scheduleToDelete.id}
              </p>
              <p>
                <strong>Tanggal & Jam:</strong> {scheduleToDelete.departureDate} ({scheduleToDelete.departureTime})
              </p>
              <p>
                <strong>Tarif:</strong> {formatRupiah(scheduleToDelete.price)}
              </p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
            <strong>Proteksi Integritas Pesanan:</strong> Jika jadwal ini telah memiliki riwayat pesanan tiket dari member, sistem tidak akan menghapus data melainkan otomatis menonaktifkan status jadwal agar integritas relasi tiket tetap utuh.
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete}>
              Ya, Hapus / Nonaktifkan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
