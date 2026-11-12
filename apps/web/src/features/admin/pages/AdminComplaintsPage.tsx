import { useState, useMemo, type FormEvent } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { ComplaintViewModel, ComplaintStatus } from '../../../types/index';
import { sharedStore } from '../../shared/services/sharedStore';
import { useSharedStore } from '../../shared/hooks/useSharedStore';
import {
  MessageSquareIcon,
  SearchIcon,
  AlertCircleIcon,
  CheckIcon,
  UserIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Modal } from '../../../components/ui/Modal';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/useToast';

export interface AdminComplaintsPageProps {
  onNavigate?: (path: RoutePath) => void;
}

export function AdminComplaintsPage() {
  useSharedStore();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all');

  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintViewModel | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<ComplaintStatus>('selesai');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const complaints: ComplaintViewModel[] = sharedStore.getComplaints();

  const filteredComplaints = useMemo(() => {
    let result = complaints;

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.subject.toLowerCase().includes(q) ||
          c.memberName.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.bookingCode && c.bookingCode.toLowerCase().includes(q))
      );
    }

    return result;
  }, [complaints, statusFilter, searchQuery]);

  const handleOpenReplyModal = (c: ComplaintViewModel) => {
    setSelectedComplaint(c);
    setReplyText(c.adminResponse || '');
    setReplyStatus(c.status === 'diajukan' ? 'diproses' : c.status);
    setReplyError(null);
    setReplyModalOpen(true);
  };

  const handleReplySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setReplyError(null);

    if (!replyText.trim()) {
      setReplyError('Uraian tanggapan resmi dari Admin wajib diisi.');
      return;
    }

    const res = sharedStore.replyComplaint(selectedComplaint.id, {
      adminResponse: replyText.trim(),
      status: replyStatus,
    });

    if (!res.success) {
      setReplyError(res.error || 'Gagal menyimpan tanggapan keluhan.');
      return;
    }

    const msg = `Tanggapan resmi admin untuk keluhan ${selectedComplaint.id} berhasil dikirim dan tersinkronisasi ke portal Member.`;
    toast.success(msg);
    setFeedbackMessage(msg);
    setReplyModalOpen(false);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-primary">
            Layanan Purna Jual & Pelanggan
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-950 mt-1 flex items-center gap-2.5">
            <MessageSquareIcon className="size-7 text-primary" />
            <span>Manajemen Keluhan Member</span>
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Tinjau pengaduan kendala perjalanan dari member dan kirimkan respon resmi tindak lanjut (Entitas Keluhan).
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckIcon className="size-5 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Filter and List Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="size-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                type="search"
                placeholder="Cari subjek, kode, nama member..."
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
                Semua ({complaints.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('diajukan')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'diajukan' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Diajukan ({complaints.filter((c) => c.status === 'diajukan').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('diproses')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'diproses' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Diproses ({complaints.filter((c) => c.status === 'diproses').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('selesai')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'selesai' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Selesai ({complaints.filter((c) => c.status === 'selesai').length})
              </button>
            </div>
          </div>

          <div className="text-xs text-stone-500 font-sans">
            Menampilkan <span className="font-semibold text-stone-900 tabular-nums">{filteredComplaints.length}</span> keluhan
          </div>
        </div>

        {filteredComplaints.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada keluhan ditemukan"
              description={
                searchQuery || statusFilter !== 'all'
                  ? 'Tidak ada keluhan yang cocok dengan filter atau kata kunci pencarian.'
                  : 'Belum ada keluhan yang masuk dari member.'
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
          <div className="overflow-y-auto max-h-[520px] divide-y divide-stone-100 scrollbar-thin scrollbar-thumb-stone-200">
            {filteredComplaints.map((c) => (
              <div
                key={c.id}
                className="p-6 hover:bg-stone-50/60 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                      {c.id}
                    </span>
                    <StatusBadge
                      status={
                        c.status === 'selesai'
                          ? 'success'
                          : c.status === 'diproses'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {c.status === 'diajukan'
                        ? 'Diajukan Member'
                        : c.status === 'diproses'
                        ? 'Sedang Diproses'
                        : 'Selesai Ditanggapi'}
                    </StatusBadge>
                    {c.bookingCode && (
                      <span className="text-xs font-mono text-stone-500">
                        Tiket Terkait: <strong className="text-stone-700">{c.bookingCode}</strong>
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-base font-bold text-stone-950">
                    {c.subject}
                  </h3>

                  <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                    "{c.message}"
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1">
                    <span className="flex items-center gap-1">
                      <UserIcon className="size-3.5 text-stone-400" />
                      Pengirim: <strong className="text-stone-800">{c.memberName}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3.5 text-stone-400" />
                      Waktu Lapor: {c.createdAt}
                    </span>
                  </div>

                  {c.adminResponse && (
                    <div className="mt-3 bg-orange-50/70 border border-orange-200/80 rounded-lg p-3 text-xs text-orange-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <ShieldCheckIcon className="size-4" />
                        <span>Respon Resmi Administrator</span>
                        {c.resolvedAt && (
                          <span className="text-stone-400 font-normal ml-auto font-mono text-[11px]">
                            {c.resolvedAt}
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed text-stone-800">{c.adminResponse}</p>
                    </div>
                  )}
                </div>

                <div className="md:shrink-0 pt-2 md:pt-0">
                  <Button
                    variant={c.adminResponse ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleOpenReplyModal(c)}
                    leftIcon={<MessageSquareIcon className="size-3.5" />}
                  >
                    {c.adminResponse ? 'Ubah Tanggapan' : 'Beri Tanggapan'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Reply Modal */}
      <Modal
        isOpen={replyModalOpen}
        onClose={() => setReplyModalOpen(false)}
        title="Tanggapan Resmi Keluhan Member"
        description="Berikan penjelasan, solusi, atau tindak lanjut atas keluhan yang diajukan oleh member."
        className="max-w-xl"
      >
        {selectedComplaint && (
          <form onSubmit={handleReplySubmit} className="space-y-4 pt-2">
            {replyError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
                <AlertCircleIcon className="size-4 shrink-0 text-red-600 mt-0.5" />
                <span>{replyError}</span>
              </div>
            )}

            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-stone-600">{selectedComplaint.id}</span>
                <span className="text-stone-500">{selectedComplaint.createdAt}</span>
              </div>
              <p className="font-semibold text-stone-900">{selectedComplaint.subject}</p>
              <p className="text-stone-600 italic">"{selectedComplaint.message}"</p>
              <p className="text-[11px] text-stone-500 pt-1">
                Pelapor: {selectedComplaint.memberName} {selectedComplaint.bookingCode ? `• Kode Tiket: ${selectedComplaint.bookingCode}` : ''}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-900 mb-1">
                Uraian Respon Admin
              </label>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tuliskan respon dan penjelasan resmi dari manajemen Travora..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Tanggapan ini akan langsung dapat dibaca oleh member pada halaman riwayat pengaduan.
              </p>
            </div>

            <div>
              <Select
                label="Perbarui Status Keluhan"
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value as ComplaintStatus)}
                options={[
                  { value: 'diproses', label: 'Diproses (Sedang ditindaklanjuti)' },
                  { value: 'selesai', label: 'Selesai (Keluhan telah tuntas)' },
                ]}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
              <Button type="button" variant="outline" onClick={() => setReplyModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Kirim Tanggapan Resmi
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
