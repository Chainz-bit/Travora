import { useState, useMemo, type FormEvent } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { ComplaintViewModel, ComplaintStatus } from '../../../types/index';
import { authService } from '../../auth/services/authService';
import { mockBookingService } from '../services/mockBookingService';
import { mockComplaintService } from '../services/mockComplaintService';
import { MemberLayout } from '../components/MemberLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Modal } from '../../../components/ui/Modal';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../components/ui/useToast';
import {
  MessageSquareIcon,
  AlertCircleIcon,
  CheckIcon,
  InfoIcon,
  PlusIcon,
} from '../../../components/ui/Icons';

export interface ComplaintsPageProps {
  onNavigate: (path: RoutePath) => void;
}

export function ComplaintsPage({ onNavigate }: ComplaintsPageProps) {
  const user = authService.getCurrentUser();
  const toast = useToast();

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintViewModel | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const bookings = useMemo(() => {
    return mockBookingService.getAllBookings(user?.id);
  }, [user?.id]);

  const complaints = useMemo(() => {
    // refreshKey dependency to re-query local storage on submit
    void refreshKey;
    return mockComplaintService.getComplaints(user?.id);
  }, [user?.id, refreshKey]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Subjek keluhan wajib diisi.');
      return;
    }
    if (!message.trim()) {
      setError('Uraian detail keluhan wajib diisi.');
      return;
    }
    if (!user) {
      setError('Sesi member tidak valid.');
      return;
    }

    setIsSubmitting(true);
    await mockComplaintService.submitComplaint(
      {
        bookingId: selectedBookingId || undefined,
        subject,
        message,
      },
      user
    );
    setIsSubmitting(false);

    toast.success('Pengaduan berhasil diajukan. Tim admin kami akan segera meninjau laporan Anda.');

    // Reset form
    setSubject('');
    setMessage('');
    setSelectedBookingId('');
    setFormOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  const renderStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'diajukan':
        return <StatusBadge status="warning">Diajukan</StatusBadge>;
      case 'diproses':
        return <StatusBadge status="info">Diproses</StatusBadge>;
      case 'selesai':
        return <StatusBadge status="success">Selesai</StatusBadge>;
      default:
        return <StatusBadge status="info">{status}</StatusBadge>;
    }
  };

  return (
    <MemberLayout currentPath="/member/complaints" onNavigate={onNavigate}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 tracking-tight">
              Layanan & Riwayat Keluhan
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Saluran resmi penyampaian kendala perjalanan atau saran pelayanan travel antar-kota.
            </p>
          </div>

          <Button
            variant={formOpen ? 'outline' : 'primary'}
            onClick={() => {
              setFormOpen(!formOpen);
              setError(null);
            }}
            className="text-xs h-10 px-4 self-start sm:self-auto"
          >
            {formOpen ? (
              'Tutup Formulir'
            ) : (
              <>
                <PlusIcon className="size-4 mr-1.5" />
                Ajukan Keluhan Baru
              </>
            )}
          </Button>
        </div>

        {/* Form Ajukan Keluhan Baru (Collapsible or toggleable) */}
        {formOpen && (
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-5 animate-modal-enter">
            <div className="border-b border-stone-200 pb-3">
              <h2 className="font-serif text-lg font-bold text-stone-950">
                Formulir Pengaduan Layanan
              </h2>
              <p className="text-xs text-stone-500">
                Laporan Anda akan ditinjau dan ditindaklanjuti secara resmi oleh tim Customer Care Travora.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-3 text-xs text-red-700">
                <AlertCircleIcon className="size-4 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Pilih Tiket Perjalanan Terkait (Opsional)
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">-- Keluhan Umum / Tidak Terkait Tiket Tertentu --</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.schedule.originCityName} ke {b.schedule.destinationCityName} ({b.schedule.departureDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Subjek / Ringkasan Keluhan"
                  placeholder="Contoh: Keterlambatan jadwal armada atau kendala fasilitas AC"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Uraian Detail Keluhan
                </label>
                <textarea
                  rows={4}
                  placeholder="Jelaskan secara rinci kronologi atau keluhan yang Anda alami selama perjalanan..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  className="text-xs h-10 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="text-xs h-10 px-5 font-semibold"
                >
                  {isSubmitting ? 'Mengirim...' : 'Kirim Pengaduan'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Daftar Keluhan */}
        <div className="space-y-4">
          <div className="border-b border-stone-200 pb-2">
            <h2 className="font-serif text-lg font-bold text-stone-950">
              Riwayat Pengaduan Anda
            </h2>
          </div>

          {complaints.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs">
              <EmptyState
                icon={<MessageSquareIcon className="size-7 text-control-border" />}
                title="Belum Ada Riwayat Keluhan"
                description="Anda belum pernah mengajukan keluhan atau masukan terkait layanan travel Travora."
                action={
                  <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                    Ajukan Keluhan Baru
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-3 hover-editorial-lift hover:border-stone-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-900">
                        {c.id}
                      </span>
                      {c.bookingCode && (
                        <span className="text-xs font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md border border-stone-200">
                          Tiket: {c.bookingCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-stone-400">{c.createdAt}</span>
                      {renderStatusBadge(c.status)}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-stone-950">
                      {c.subject}
                    </h3>
                    <p className="mt-1 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {c.message}
                    </p>
                  </div>

                  {c.adminResponse && (
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                        <CheckIcon className="size-3.5 text-emerald-700" />
                        <span>Tanggapan Admin:</span>
                      </div>
                      <p className="text-emerald-800 leading-relaxed">
                        {c.adminResponse}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedComplaint(c)}
                      className="text-xs h-8 px-3"
                    >
                      Lihat Lengkap
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title={`Detail Pengaduan ${selectedComplaint.id}`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-500 font-mono">
                Waktu Pelaporan: {selectedComplaint.createdAt}
              </span>
              {renderStatusBadge(selectedComplaint.status)}
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                Subjek Keluhan
              </span>
              <h4 className="font-serif font-bold text-stone-950 text-base">
                {selectedComplaint.subject}
              </h4>
              {selectedComplaint.bookingCode && (
                <p className="text-xs text-stone-500 font-mono">
                  Referensi Kode Tiket: {selectedComplaint.bookingCode}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                Uraian Pengaduan
              </span>
              <div className="bg-stone-50 rounded-xl p-3.5 text-xs text-stone-800 border border-stone-200 leading-relaxed whitespace-pre-wrap">
                {selectedComplaint.message}
              </div>
            </div>

            {selectedComplaint.adminResponse ? (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
                  Tanggapan Admin
                </span>
                <div className="bg-emerald-50 rounded-xl p-3.5 text-xs text-emerald-950 border border-emerald-200 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.adminResponse}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-900 border border-amber-200 flex items-center gap-2">
                <InfoIcon className="size-4 shrink-0 text-amber-700" />
                <span>Pengaduan Anda sedang menunggu peninjauan dan tindak lanjut dari Admin.</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedComplaint(null)}
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
