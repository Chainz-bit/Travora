import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircleIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { TableScrollContainer } from '../../../components/ui/TableScrollContainer';
import { useToast } from '../../../components/ui/useToast';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface OperatorAccount {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export function OperatorsManagementPage() {
  const toast = useToast();

  const [operators, setOperators] = useState<OperatorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [operatorToDelete, setOperatorToDelete] =
    useState<OperatorAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOperatorsList = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/admin/operators`, {
      credentials: 'include',
    });
    const json = (await res.json()) as ApiEnvelope<OperatorAccount[]>;
    if (!res.ok || !json.success) {
      throw new Error(
        json.error?.message || 'Gagal memuat daftar akun operator.'
      );
    }
    return Array.isArray(json.data) ? json.data : [];
  }, []);

  useEffect(() => {
    let active = true;
    fetchOperatorsList()
      .then((list) => {
        if (!active) return;
        setOperators(list);
        setFetchError(null);
      })
      .catch((err) => {
        if (!active) return;
        setFetchError(
          err instanceof Error
            ? err.message
            : 'Tidak dapat terhubung ke server API Travora.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchOperatorsList]);

  const handleReload = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const list = await fetchOperatorsList();
      setOperators(list);
    } catch (err) {
      setFetchError(
        err instanceof Error
          ? err.message
          : 'Tidak dapat terhubung ke server API Travora.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperator = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setFormError('Nama lengkap operator wajib diisi.');
      return;
    }
    if (!cleanEmail) {
      setFormError('Email atau username operator wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setFormError('Kata sandi minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/operators`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
        }),
      });

      const json = (await res.json()) as ApiEnvelope<OperatorAccount>;
      if (!res.ok || !json.success || !json.data) {
        setFormError(json.error?.message || 'Gagal membuat akun operator.');
        return;
      }

      setOperators((prev) => [...prev, json.data!]);
      setName('');
      setEmail('');
      setPassword('');
      setFormSuccess(
        `Akun operator "${json.data.name}" (${json.data.email}) berhasil dibuat.`
      );
      toast.success('Akun operator loket baru berhasil ditambahkan.');
    } catch {
      setFormError('Gagal terhubung ke server API Travora.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!operatorToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/operators/${operatorToDelete.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const json = (await res.json()) as ApiEnvelope<{ message: string }>;
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || 'Gagal menghapus akun operator.');
        return;
      }

      setOperators((prev) =>
        prev.filter((op) => op.id !== operatorToDelete.id)
      );
      toast.success(`Akun operator "${operatorToDelete.name}" telah dihapus.`);
      setOperatorToDelete(null);
    } catch {
      toast.error('Tidak dapat terhubung ke server API Travora.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-primary">
            Otorisasi &bull; Akun Petugas Loket
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-950 mt-1">
            Kelola Operator
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Buat dan kelola akun petugas loket/scanner dengan role{' '}
            <code className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">
              operator
            </code>{' '}
            secara aman dari Panel Administrator.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReload}
          isLoading={loading}
        >
          Muat Ulang Data
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Form Tambah Operator */}
        <div className="lg:col-span-5 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4">
            <div className="size-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
              <PlusIcon className="size-4.5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-950">
                Tambah Akun Operator
              </h2>
              <p className="text-xs text-stone-500">
                Akun yang dibuat otomatis memiliki role operator.
              </p>
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-700"
            >
              <AlertCircleIcon className="size-4 shrink-0 text-red-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800"
            >
              <CheckIcon className="size-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateOperator} className="space-y-4">
            <Input
              label="Nama Lengkap"
              placeholder="Contoh: Siti Petugas Loket"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div>
              <Input
                label="Email / Username Login"
                type="email"
                placeholder="operator.loket@travora.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                Digunakan operator saat login melalui portal Pengelola Loket.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="travora-input-field w-full h-10 px-3.5 pr-10 rounded-xl border text-sm focus:ring-2 focus:ring-primary/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                  aria-label={
                    showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'
                  }
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={submitting}
              leftIcon={<PlusIcon className="size-4" />}
            >
              Buat Akun Operator
            </Button>
          </form>
        </div>

        {/* Tabel Daftar Operator */}
        <div className="lg:col-span-7 rounded-2xl border border-stone-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserIcon className="size-4.5 text-primary" />
              <h2 className="font-serif text-lg font-bold text-stone-950">
                Daftar Akun Operator Terdaftar
              </h2>
            </div>
            <StatusBadge status="info" size="sm" showIcon={false}>
              {operators.length} Akun
            </StatusBadge>
          </div>

          {fetchError ? (
            <div className="p-6 text-sm text-red-700 bg-red-50/70 flex items-start gap-2.5">
              <AlertCircleIcon className="size-5 shrink-0 text-red-600" />
              <span>{fetchError}</span>
            </div>
          ) : loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-12 animate-pulse rounded-xl bg-stone-100"
                />
              ))}
            </div>
          ) : operators.length === 0 ? (
            <div className="p-10 text-center text-sm text-stone-500">
              Belum ada akun operator terdaftar di database.
            </div>
          ) : (
            <TableScrollContainer>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200/80 bg-stone-50/80 text-[11px] font-mono uppercase tracking-wider text-stone-500">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Email / Username</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {operators.map((op) => (
                    <tr
                      key={op.id}
                      className="hover:bg-stone-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-stone-500">
                        #{op.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-stone-900">
                        {op.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-stone-700">
                        {op.email || op.username}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status="warning" size="sm" showIcon={false}>
                          {op.role.toUpperCase()}
                        </StatusBadge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOperatorToDelete(op)}
                          className="text-red-700 border-red-200 hover:bg-red-50"
                          leftIcon={<TrashIcon className="size-3.5" />}
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScrollContainer>
          )}
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Operator */}
      <Modal
        isOpen={Boolean(operatorToDelete)}
        onClose={() => !deleting && setOperatorToDelete(null)}
        title="Hapus Akun Operator"
        description="Tindakan ini akan mencabut akses login operator dari sistem."
        className="max-w-md"
      >
        {operatorToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-stone-700">
              Apakah Anda yakin ingin menghapus akun operator{' '}
              <strong className="text-stone-950">
                {operatorToDelete.name}
              </strong>{' '}
              (<span className="font-mono text-xs">{operatorToDelete.email}</span>)?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOperatorToDelete(null)}
                disabled={deleting}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={deleting}
              >
                Ya, Hapus Akun
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
