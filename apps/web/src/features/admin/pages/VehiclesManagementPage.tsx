import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import { adminApiService, type AdminVehicle } from '../services/adminApiService';
import {
  BusIcon,
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  AlertCircleIcon,
  CheckIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/useToast';

export interface VehiclesManagementPageProps {
  onNavigate?: (path: RoutePath) => void;
}

export function VehiclesManagementPage() {
  const toast = useToast();

  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<AdminVehicle | null>(null);

  const [formName, setFormName] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formColor, setFormColor] = useState('Hitam');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<AdminVehicle | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    adminApiService
      .getVehicles()
      .then((list) => {
        if (!active) return;
        setVehicles(list);
      })
      .catch((err) => {
        if (!active) return;
        setFeedbackMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Gagal memuat data kendaraan.',
        });
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.plateNumber.toLowerCase().includes(q) ||
        v.color.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q)
    );
  }, [vehicles, searchQuery]);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormName('');
    setFormPlate('');
    setFormColor('Hitam');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (v: AdminVehicle) => {
    setEditingVehicle(v);
    setFormName(v.name);
    setFormPlate(v.plateNumber);
    setFormColor(v.color || 'Hitam');
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name: formName.trim(),
      plateNumber: formPlate.trim().toUpperCase(),
      color: formColor.trim() || 'Hitam',
    };

    if (!payload.name) {
      setFormError('Nama / jenis kendaraan wajib diisi.');
      return;
    }
    if (!payload.plateNumber) {
      setFormError('Nomor plat kendaraan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVehicle) {
        await adminApiService.updateVehicle(editingVehicle.id, payload);
        toast.success(`Data kendaraan "${payload.name}" (${payload.plateNumber}) berhasil diperbarui.`);
        setFeedbackMessage({
          type: 'success',
          text: `Data kendaraan "${payload.name}" (${payload.plateNumber}) berhasil diperbarui.`,
        });
      } else {
        await adminApiService.createVehicle(payload);
        toast.success(`Armada baru "${payload.name}" (${payload.plateNumber}) berhasil ditambahkan.`);
        setFeedbackMessage({
          type: 'success',
          text: `Armada baru "${payload.name}" (${payload.plateNumber}) berhasil ditambahkan.`,
        });
      }
      const updated = await adminApiService.getVehicles();
      setVehicles(updated);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data kendaraan.');
    } finally {
      setIsSubmitting(false);
    }
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleOpenDelete = (v: AdminVehicle) => {
    setVehicleToDelete(v);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    setIsSubmitting(true);
    try {
      await adminApiService.deleteVehicle(vehicleToDelete.id);
      const updated = await adminApiService.getVehicles();
      setVehicles(updated);
      toast.success(`Kendaraan "${vehicleToDelete.name}" (${vehicleToDelete.plateNumber}) berhasil dihapus.`);
      setFeedbackMessage({
        type: 'success',
        text: `Kendaraan "${vehicleToDelete.name}" (${vehicleToDelete.plateNumber}) berhasil dihapus.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus kendaraan.';
      toast.error(msg);
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
      setDeleteModalOpen(false);
      setVehicleToDelete(null);
    }
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
            <BusIcon className="size-7 text-primary" />
            <span>Manajemen Kendaraan</span>
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Kelola data armada shuttle travel dan nomor plat resmi (Entitas Kendaraan).
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAdd}>
          <PlusIcon className="size-4 mr-1.5" />
          Tambah Kendaraan
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

      {/* Table & Filter Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="size-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            <Input
              type="search"
              placeholder="Cari armada atau nomor plat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="text-xs text-stone-500 font-sans">
            Total armada:{' '}
            <span className="font-semibold text-stone-900 tabular-nums">
              {filteredVehicles.length} dari {vehicles.length}
            </span>{' '}
            unit
          </div>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada kendaraan ditemukan"
              description={
                searchQuery
                  ? `Tidak ada kendaraan yang cocok dengan "${searchQuery}".`
                  : 'Belum ada data kendaraan yang terdaftar.'
              }
              action={
                <Button variant="outline" size="sm" onClick={searchQuery ? () => setSearchQuery('') : handleOpenAdd}>
                  {searchQuery ? 'Hapus Pencarian' : 'Tambah Kendaraan'}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200 shadow-2xs">
                <tr>
                  <th className="py-3 px-6 w-16">No</th>
                  <th className="py-3 px-6">ID Unit</th>
                  <th className="py-3 px-6">Nama Kendaraan</th>
                  <th className="py-3 px-6">Nomor Plat</th>
                  <th className="py-3 px-6 text-center">Status Armada</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredVehicles.map((v, idx) => (
                  <tr key={v.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-xs text-stone-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold text-stone-600">
                      {v.id}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-stone-900">
                      {v.name}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs font-bold text-stone-800">
                      <span className="inline-block px-2 py-0.5 rounded bg-stone-100 border border-stone-200 tracking-wider">
                        {v.plateNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center whitespace-nowrap">
                      <StatusBadge status={v.status === 'aktif' ? 'success' : 'warning'}>
                        {v.status === 'aktif' ? 'Aktif Beroperasi' : 'Dalam Perawatan'}
                      </StatusBadge>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(v)}
                          leftIcon={<EditIcon className="size-3.5" />}
                          title="Ubah Data Kendaraan"
                        >
                          Ubah
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(v)}
                          leftIcon={<TrashIcon className="size-3.5 text-red-600" />}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Hapus Kendaraan"
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVehicle ? 'Ubah Data Kendaraan' : 'Tambah Kendaraan Baru'}
        description="Lengkapi informasi armada shuttle travel dan nomor registrasi plat resmi."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircleIcon className="size-4 shrink-0 text-red-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <Input
              label="Nama / Model Kendaraan"
              placeholder="Contoh: HiAce Executive Shuttle"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <Input
              label="Nomor Plat Kendaraan"
              placeholder="Contoh: D 7102 TRV"
              value={formPlate}
              onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
              required
            />
            <p className="text-[11px] text-stone-500 mt-1 font-mono">
              Format nomor plat resmi Indonesia (contoh: D 7102 TRV, B 2011 TRV).
            </p>
          </div>

          <div>
            <Input
              label="Warna Armada"
              placeholder="Contoh: Hitam, Putih, Silver"
              value={formColor}
              onChange={(e) => setFormColor(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingVehicle ? 'Simpan Perubahan' : 'Tambah Kendaraan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Konfirmasi Hapus Kendaraan"
        description="Apakah Anda yakin ingin menghapus data kendaraan ini dari master armada?"
      >
        <div className="space-y-4 pt-2">
          {vehicleToDelete && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs space-y-1">
              <p>
                <strong>Kendaraan:</strong> {vehicleToDelete.name}
              </p>
              <p>
                <strong>Nomor Plat:</strong> {vehicleToDelete.plateNumber}
              </p>
              <p>
                <strong>ID Unit:</strong> {vehicleToDelete.id}
              </p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
            <strong>Catatan Integritas Referensi Data:</strong> Kendaraan yang masih ditugaskan pada jadwal perjalanan aktif tidak dapat dihapus. Nonaktifkan atau perbarui jadwal terkait terlebih dahulu.
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete}>
              Ya, Hapus Kendaraan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
