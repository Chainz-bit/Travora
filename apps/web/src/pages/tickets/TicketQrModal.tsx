import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatCurrency } from '../../lib/utils';
import {
  API_BASE_URL,
  formatDateTimeWIB,
  getAuthHeaders,
  type ApiEnvelope,
  type Ticket,
} from './types';

interface TicketQrModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onTicketUpdated?: (updated: Ticket) => void;
}

export function TicketQrModal({
  ticket,
  onClose,
  onTicketUpdated,
}: TicketQrModalProps) {
  const [refreshing, setRefreshing] = useState(false);

  if (!ticket) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/tickets/${encodeURIComponent(ticket.order_code)}`,
        {
          credentials: 'include',
          headers: getAuthHeaders(),
        }
      );
      if (res.ok) {
        const json = (await res.json()) as ApiEnvelope<Ticket>;
        if (json.success && json.data) {
          onTicketUpdated?.(json.data);
        }
      }
    } catch {
      // Abaikan kegagalan jaringan sementara dan pertahankan data saat ini.
    } finally {
      setRefreshing(false);
    }
  };

  const isUsed = ticket.ticket_status === 'used';

  return (
    <Modal
      isOpen={Boolean(ticket)}
      onClose={onClose}
      title="E-Tiket Resmi"
      description="Tunjukkan QR Code ini kepada petugas check-in di lokasi acara."
      className="w-full max-w-md max-h-[90vh] overflow-y-auto p-5"
    >
      <div className="space-y-3.5">
        <div className="text-center space-y-0.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
            Nama Event
          </p>
          <h3 className="font-serif text-base sm:text-lg font-bold text-stone-950 leading-snug">
            {ticket.event_name}
          </h3>
          <p className="text-sm font-semibold text-primary">
            {formatCurrency(ticket.amount)}
          </p>
        </div>

        {/* QR Container */}
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 px-4 py-4">
          <div
            className={`rounded-xl bg-white p-3 shadow-xs border border-stone-200 transition-opacity ${
              isUsed ? 'opacity-45' : 'opacity-100'
            }`}
          >
            <QRCodeSVG
              value={ticket.order_code}
              size={156}
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="mt-2.5 text-center">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 block">
              Kode Tiket
            </span>
            <span className="font-mono text-sm font-bold tracking-wider text-stone-950">
              {ticket.order_code}
            </span>
          </div>
        </div>

        {/* Ticket Usage Status */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2.5">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 block">
              Status Tiket
            </span>
            <StatusBadge status={isUsed ? 'error' : 'success'} size="sm">
              {isUsed ? 'Sudah Dipakai (used)' : 'Belum Dipakai (unused)'}
            </StatusBadge>
            {isUsed && ticket.scanned_at && (
              <p className="text-[11px] text-stone-600 mt-0.5">
                Check-in: {formatDateTimeWIB(ticket.scanned_at)}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={refreshing}
          >
            Refresh
          </Button>
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
}
