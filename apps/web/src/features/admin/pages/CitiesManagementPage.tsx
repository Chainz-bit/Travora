import { useState, useMemo, type FormEvent } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { CityEntity, CityFormValues } from '../../../types/index';
import { sharedStore } from '../../shared/services/sharedStore';
import { useSharedStore } from '../../shared/hooks/useSharedStore';
import {
  BuildingIcon,
  MapPinIcon,
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
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/useToast';

export interface CitiesManagementPageProps {
  type: 'origin' | 'destination';
  onNavigate: (path: RoutePath) => void;
}

export function CitiesManagementPage({ type }: CitiesManagementPageProps) {
  useSharedStore();
  const toast = useToast();

  const isOrigin = type === 'origin';
  const entityTitle = isOrigin ? 'Kota Asal' : 'Kota Tujuan';
  const entitySubtitle = isOrigin
    ? 'Kelola daftar kota titik keberangkatan travel resmi.'
    : 'Kelola daftar kota destinasi perjalanan travel resmi.';

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<CityEntity | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<CityEntity | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const cities: CityEntity[] = useMemo(() => {
    return isOrigin ? sharedStore.getOriginCities() : sharedStore.getDestinationCities();
  }, [isOrigin]);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    const q = searchQuery.toLowerCase();
    return cities.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [cities, searchQuery]);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingCity(null);
    setFormName('');
    setFormCode('');
    setFormError(null);
    setModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (city: CityEntity) => {
    setEditingCity(city);
    setFormName(city.name);
    setFormCode(city.code);
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const values: CityFormValues = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
    };

    if (!values.name) {
      setFormError('Nama kota wajib diisi.');
      return;
    }
    if (!values.code) {
      setFormError('Kode singkatan kota (3-4 huruf) wajib diisi.');
      return;
    }

    if (editingCity) {
      const res = isOrigin
        ? sharedStore.updateOriginCity(editingCity.id, values)
        : sharedStore.updateDestinationCity(editingCity.id, values);

      if (!res.success) {
        setFormError(res.error || 'Gagal memperbarui data kota.');
        return;
      }
      toast.success(`Data ${entityTitle} "${values.name}" berhasil diperbarui.`);
      setFeedbackMessage({ type: 'success', text: `Data ${entityTitle} "${values.name}" berhasil diperbarui.` });
    } else {
      const res = isOrigin
        ? sharedStore.addOriginCity(values)
        : sharedStore.addDestinationCity(values);

      if (!res.success) {
        setFormError(res.error || 'Gagal menambahkan kota baru.');
        return;
      }
      toast.success(`${entityTitle} baru "${values.name}" (${values.code}) berhasil ditambahkan.`);
      setFeedbackMessage({ type: 'success', text: `${entityTitle} baru "${values.name}" (${values.code}) berhasil ditambahkan.` });
    }

    setModalOpen(false);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleOpenDelete = (city: CityEntity) => {
    setCityToDelete(city);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!cityToDelete) return;

    const res = isOrigin
      ? sharedStore.deleteOriginCity(cityToDelete.id)
      : sharedStore.deleteDestinationCity(cityToDelete.id);

    if (!res.success) {
      toast.error(res.error || 'Gagal menghapus data kota.');
      setFeedbackMessage({ type: 'error', text: res.error || 'Gagal menghapus data kota.' });
    } else {
      toast.success(`${entityTitle} "${cityToDelete.name}" (${cityToDelete.code}) berhasil dihapus.`);
      setFeedbackMessage({
        type: 'success',
        text: `${entityTitle} "${cityToDelete.name}" (${cityToDelete.code}) berhasil dihapus.`,
      });
    }

    setDeleteModalOpen(false);
    setCityToDelete(null);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-primary">
              Master Data Operasional
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-950 mt-1 flex items-center gap-2.5">
            {isOrigin ? (
              <BuildingIcon className="size-7 text-primary" />
            ) : (
              <MapPinIcon className="size-7 text-primary" />
            )}
            <span>Manajemen {entityTitle}</span>
          </h1>
          <p className="text-sm text-stone-600 mt-1">{entitySubtitle}</p>
        </div>

        <Button variant="primary" onClick={handleOpenAdd}>
          <PlusIcon className="size-4 mr-1.5" />
          Tambah {entityTitle}
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

      {/* Search and Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="size-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            <Input
              type="search"
              placeholder={`Cari nama atau kode ${entityTitle.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="text-xs text-stone-500 font-sans">
            Total terdaftar:{' '}
            <span className="font-semibold text-stone-900 tabular-nums">
              {filteredCities.length} dari {cities.length}
            </span>{' '}
            kota
          </div>
        </div>

        {filteredCities.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={`Tidak ada data ${entityTitle.toLowerCase()}`}
              description={
                searchQuery
                  ? `Tidak ada kota yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                  : `Belum ada master ${entityTitle.toLowerCase()} yang terdaftar di sistem.`
              }
              action={
                <Button variant="outline" size="sm" onClick={searchQuery ? () => setSearchQuery('') : handleOpenAdd}>
                  {searchQuery ? 'Hapus Pencarian' : `Tambah ${entityTitle}`}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200 shadow-2xs">
                <tr>
                  <th className="py-3 px-6 w-20">No</th>
                  <th className="py-3 px-6">ID Entitas</th>
                  <th className="py-3 px-6">Nama Kota</th>
                  <th className="py-3 px-6">Kode Kota</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCities.map((city, idx) => (
                  <tr key={city.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-xs text-stone-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-stone-500">
                      {city.id}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-stone-900">
                      {city.name}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-block px-2.5 py-0.5 rounded bg-stone-100 border border-stone-200 font-mono text-xs font-bold text-stone-800">
                        {city.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(city)}
                          leftIcon={<EditIcon className="size-3.5" />}
                          title="Ubah Data Kota"
                        >
                          Ubah
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(city)}
                          leftIcon={<TrashIcon className="size-3.5 text-red-600" />}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Hapus Kota"
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
        title={editingCity ? `Ubah Data ${entityTitle}` : `Tambah ${entityTitle} Baru`}
        description={`Masukkan rincian identitas kota untuk didaftarkan pada entitas ${isOrigin ? 'Kota_Asal' : 'Kota_Tujuan'}.`}
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
              label={`Nama ${entityTitle}`}
              placeholder="Contoh: Bandung"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <Input
              label="Kode Singkatan Kota (3 Huruf)"
              placeholder="Contoh: BDG"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              maxLength={4}
              required
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Gunakan kode 3 huruf kapital standar (contoh: JKT, BDG, YGY, SMG, SBY).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              {editingCity ? 'Simpan Perubahan' : `Tambah ${entityTitle}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal with Dependency Warning */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`Konfirmasi Hapus ${entityTitle}`}
        description={`Apakah Anda yakin ingin menghapus data ${entityTitle.toLowerCase()} ini?`}
      >
        <div className="space-y-4 pt-2">
          {cityToDelete && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs space-y-1">
              <p>
                <strong>Nama Kota:</strong> {cityToDelete.name}
              </p>
              <p>
                <strong>Kode Kota:</strong> {cityToDelete.code}
              </p>
              <p>
                <strong>ID:</strong> {cityToDelete.id}
              </p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
            <strong>Catatan Integritas Referensi Data:</strong> Sistem akan menolak penghapusan kota jika masih terdapat jadwal keberangkatan aktif yang merujuk pada kota ini.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Ya, Hapus Kota
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
