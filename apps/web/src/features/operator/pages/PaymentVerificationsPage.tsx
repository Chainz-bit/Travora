import { useState, useMemo } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { PaymentConfirmationViewModel } from '../../../types/index';
import { sharedStore } from '../../shared/services/sharedStore';
import { useSharedStore } from '../../shared/hooks/useSharedStore';
import {
  ReceiptIcon,
  SearchIcon,
  CheckCircle2Icon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  BuildingIcon,
  CalendarIcon,
  UserIcon,
  EyeIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/useToast';
import { formatRupiah } from '../../../lib/utils';

export interface PaymentVerificationsPageProps {
  onNavigate?: (path: RoutePath) => void;
}

export function PaymentVerificationsPage() {
  useSharedStore();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'menunggu_verifikasi' | 'terverifikasi' | 'ditolak'>('all');

  const [selectedConf, setSelectedConf] = useState<PaymentConfirmationViewModel | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetConf, setTargetConf] = useState<PaymentConfirmationViewModel | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const confirmations = sharedStore.getConfirmations();

  const filteredConfirmations = useMemo(() => {
    let result = confirmations;

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.bookingId.toLowerCase().includes(q) ||
          c.accountHolder.toLowerCase().includes(q) ||
          c.bankName.toLowerCase().includes(q) ||
          c.accountNumber.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [confirmations, statusFilter, searchQuery]);

  const handleOpenApproveModal = (conf: PaymentConfirmationViewModel) => {
    setTargetConf(conf);
    setApproveModalOpen(true);
  };

  const handleOpenRejectModal = (conf: PaymentConfirmationViewModel) => {
    setTargetConf(conf);
    setRejectModalOpen(true);
  };

  const handleConfirmApprove = () => {
    if (!targetConf) return;
    setIsProcessing(true);

    const res = sharedStore.verifyConfirmation(targetConf.id, true);
    setIsProcessing(false);

    if (!res.success) {
      toast.error(res.error || 'Gagal memverifikasi pembayaran.');
      setFeedbackMessage({ type: 'error', text: res.error || 'Gagal memverifikasi pembayaran.' });
    } else {
      const msg = `Konfirmasi transfer untuk tiket ${targetConf.bookingId} (${formatRupiah(targetConf.transferAmount)}) berhasil disetujui. Tiket kini terkonfirmasi lunas.`;
      toast.success(msg);
      setFeedbackMessage({
        type: 'success',
        text: msg,
      });
    }

    setApproveModalOpen(false);
    setDetailModalOpen(false);
    setTargetConf(null);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleConfirmReject = () => {
    if (!targetConf) return;
    setIsProcessing(true);

    const res = sharedStore.verifyConfirmation(targetConf.id, false);
    setIsProcessing(false);

    if (!res.success) {
      toast.error(res.error || 'Gagal menolak konfirmasi.');
      setFeedbackMessage({ type: 'error', text: res.error || 'Gagal menolak konfirmasi.' });
    } else {
      const msg = `Konfirmasi transfer untuk tiket ${targetConf.bookingId} ditolak. Status pesanan dikembalikan menjadi "Menunggu Pembayaran".`;
      toast.warning(msg);
      setFeedbackMessage({
        type: 'error',
        text: msg,
      });
    }

    setRejectModalOpen(false);
    setDetailModalOpen(false);
    setTargetConf(null);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleOpenDetail = (conf: PaymentConfirmationViewModel) => {
    setSelectedConf(conf);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-primary">
            Operasional Loket Resmi
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-950 mt-1 flex items-center gap-2.5">
            <ReceiptIcon className="size-7 text-primary" />
            <span>Verifikasi Konfirmasi Transfer</span>
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Penelaahan data konfirmasi transfer manual rekening bank dan verifikasi oleh petugas loket resmi.
          </p>
        </div>
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

      {/* Filter and Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="size-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                type="search"
                placeholder="Cari kode booking, nama pengirim..."
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
                Semua ({confirmations.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('menunggu_verifikasi')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'menunggu_verifikasi'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Menunggu ({confirmations.filter((c) => c.status === 'menunggu_verifikasi').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('terverifikasi')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'terverifikasi'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Disetujui ({confirmations.filter((c) => c.status === 'terverifikasi').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ditolak')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'ditolak'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Ditolak ({confirmations.filter((c) => c.status === 'ditolak').length})
              </button>
            </div>
          </div>

          <div className="text-xs text-stone-500 font-sans">
            Menampilkan <span className="font-semibold text-stone-900 tabular-nums">{filteredConfirmations.length}</span> data
          </div>
        </div>

        {filteredConfirmations.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada konfirmasi pembayaran"
              description={
                searchQuery || statusFilter !== 'all'
                  ? 'Tidak ada data konfirmasi transfer yang cocok dengan filter yang dipilih.'
                  : 'Belum ada pengajuan konfirmasi transfer dari penumpang.'
              }
              action={
                searchQuery || statusFilter !== 'all' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200 shadow-2xs">
                <tr>
                  <th className="py-3 px-6 whitespace-nowrap">ID & Kode Tiket</th>
                  <th className="py-3 px-6 whitespace-nowrap">Rincian Bank Pengirim</th>
                  <th className="py-3 px-6 text-right whitespace-nowrap">Nominal Transfer</th>
                  <th className="py-3 px-6 whitespace-nowrap">Tanggal & Waktu</th>
                  <th className="py-3 px-6 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-6 text-right whitespace-nowrap">Aksi Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredConfirmations.map((conf) => (
                  <tr key={conf.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span className="font-mono text-xs text-stone-500 block">{conf.id}</span>
                      <strong className="font-mono text-xs text-stone-900 font-bold block mt-0.5">
                        {conf.bookingId}
                      </strong>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-medium text-stone-900 block">{conf.bankName}</span>
                      <span className="text-xs text-stone-600 block">
                        a.n. <strong>{conf.accountHolder}</strong> ({conf.accountNumber})
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-sans font-bold tabular-nums text-stone-900 whitespace-nowrap">
                      {formatRupiah(conf.transferAmount)}
                    </td>
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span className="font-sans text-stone-900 text-xs block">{conf.transferDate}</span>
                      <span className="text-[11px] font-mono text-stone-400">{conf.submittedAt}</span>
                    </td>
                    <td className="py-3.5 px-6 text-center whitespace-nowrap">
                      <StatusBadge
                        status={
                          conf.status === 'terverifikasi'
                            ? 'success'
                            : conf.status === 'ditolak'
                            ? 'error'
                            : 'warning'
                        }
                      >
                        {conf.status === 'terverifikasi'
                          ? 'Terverifikasi'
                          : conf.status === 'ditolak'
                          ? 'Ditolak'
                          : 'Menunggu Verifikasi'}
                      </StatusBadge>
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      {conf.status === 'menunggu_verifikasi' ? (
                        <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleOpenApproveModal(conf)}
                            leftIcon={<CheckIcon className="size-3.5" />}
                            title="Persetujuan Konfirmasi Transfer"
                          >
                            Setujui
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleOpenRejectModal(conf)}
                            leftIcon={<XIcon className="size-3.5" />}
                            title="Tolak Data Konfirmasi"
                          >
                            Tolak
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(conf)}
                          leftIcon={<EyeIcon className="size-3.5" />}
                          className="text-stone-600 hover:text-stone-900"
                        >
                          Rincian
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Confirmation Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Rincian Konfirmasi Transfer"
        description="Verifikasi kesesuaian data transfer bank manual penumpang dengan mutasi rekening loket resmi."
      >
        {selectedConf && (
          <div className="space-y-4 pt-1">
            <div className="bg-stone-50 rounded-xl border border-stone-200/90 p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-500">ID Konfirmasi</span>
                <span className="font-mono font-bold text-stone-800">{selectedConf.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Kode Pesanan</span>
                <span className="font-mono font-bold text-primary">{selectedConf.bookingId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Bank Pengirim</span>
                <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                  <BuildingIcon className="size-3.5 text-stone-400" />
                  {selectedConf.bankName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Nama Pemilik Rekening</span>
                <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                  <UserIcon className="size-3.5 text-stone-400" />
                  {selectedConf.accountHolder}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Nomor Rekening Pengirim</span>
                <span className="font-mono font-bold text-stone-900">{selectedConf.accountNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Nominal yang Ditransfer</span>
                <span className="font-bold text-sm text-stone-950 tabular-nums">
                  {formatRupiah(selectedConf.transferAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Tanggal Transfer</span>
                <span className="font-medium text-stone-900 flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5 text-stone-400" />
                  {selectedConf.transferDate}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-stone-200">
                <span className="text-stone-500">Status Saat Ini</span>
                <StatusBadge
                  status={
                    selectedConf.status === 'terverifikasi'
                      ? 'success'
                      : selectedConf.status === 'ditolak'
                      ? 'error'
                      : 'warning'
                  }
                >
                  {selectedConf.status === 'terverifikasi'
                    ? 'Terverifikasi'
                    : selectedConf.status === 'ditolak'
                    ? 'Ditolak'
                    : 'Menunggu Verifikasi'}
                </StatusBadge>
              </div>
            </div>

            {selectedConf.status === 'menunggu_verifikasi' ? (
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleOpenRejectModal(selectedConf);
                  }}
                  leftIcon={<XIcon className="size-4" />}
                >
                  Tolak Konfirmasi
                </Button>
                <Button
                  variant="success"
                  size="md"
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleOpenApproveModal(selectedConf);
                  }}
                  leftIcon={<CheckCircle2Icon className="size-4" />}
                >
                  Setujui Pembayaran
                </Button>
              </div>
            ) : (
              <div className="flex justify-end pt-2">
                <Button variant="outline" size="md" onClick={() => setDetailModalOpen(false)}>
                  Tutup
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approval Confirmation Dialog */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => !isProcessing && setApproveModalOpen(false)}
        title="Konfirmasi Persetujuan Pembayaran"
        description="Pastikan mutasi dana telah benar-benar masuk ke rekening loket resmi Travora."
      >
        {targetConf && (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-4 text-xs text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <CheckCircle2Icon className="size-4.5 text-emerald-700" />
                <span>Persetujuan Pembayaran Tiket</span>
              </div>
              <p className="leading-relaxed">
                Anda akan menyetujui konfirmasi transfer untuk tiket{' '}
                <strong className="font-mono text-emerald-950">{targetConf.bookingId}</strong> atas nama{' '}
                <strong>{targetConf.accountHolder}</strong> ({targetConf.bankName}) sejumlah{' '}
                <strong className="font-mono text-emerald-950 tabular-nums">
                  {formatRupiah(targetConf.transferAmount)}
                </strong>
                .
              </p>
              <p className="text-emerald-800 text-[11px] pt-1 border-t border-emerald-200/60">
                Setelah disetujui, status pesanan akan langsung berubah menjadi <strong>Terkonfirmasi (Lunas)</strong> dan penumpang dapat mencetak tiket / validasi saat keberangkatan.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                disabled={isProcessing}
                onClick={() => setApproveModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="success"
                size="md"
                isLoading={isProcessing}
                onClick={handleConfirmApprove}
                leftIcon={<CheckIcon className="size-4" />}
              >
                Ya, Setujui Pembayaran
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rejection Confirmation Dialog */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => !isProcessing && setRejectModalOpen(false)}
        title="Konfirmasi Penolakan Konfirmasi Transfer"
        description="Tindakan ini akan membatalkan pengajuan bukti transfer pembayaran manual."
      >
        {targetConf && (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl bg-red-50/80 border border-red-200 p-4 text-xs text-red-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
                <AlertCircleIcon className="size-4.5 text-red-600" />
                <span>Peringatan Penolakan</span>
              </div>
              <p className="leading-relaxed">
                Anda akan menolak konfirmasi transfer untuk tiket{' '}
                <strong className="font-mono text-red-950">{targetConf.bookingId}</strong> senilai{' '}
                <strong className="font-mono text-red-950 tabular-nums">
                  {formatRupiah(targetConf.transferAmount)}
                </strong>
                .
              </p>
              <p className="text-red-800 text-[11px] pt-1 border-t border-red-200/60">
                Status pesanan penumpang akan dikembalikan menjadi <strong>Menunggu Pembayaran</strong> sehingga penumpang dapat mengunggah ulang data transfer yang valid.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                disabled={isProcessing}
                onClick={() => setRejectModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isProcessing}
                onClick={handleConfirmReject}
                leftIcon={<XIcon className="size-4" />}
              >
                Tolak Konfirmasi
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
