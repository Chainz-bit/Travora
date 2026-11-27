import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoutePath } from '../../hooks/useRouter';
import { authService } from '../../features/auth/services/authService';
import { Button } from '../../components/ui/Button';
import { StatusBadge, type StatusVariant } from '../../components/ui/StatusBadge';
import { AlertCircleIcon, KeyIcon, TicketIcon } from '../../components/ui/Icons';
import { formatCurrency } from '../../lib/utils';
import {
  API_BASE_URL,
  formatDateTimeWIB,
  getAuthHeaders,
  type ApiEnvelope,
  type PaymentStatus,
  type Ticket,
  type TicketStatus,
} from './types';
import { TicketQrModal } from './TicketQrModal';

function QrMiniIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}

function getPaymentBadge(status: PaymentStatus): { variant: StatusVariant; label: string } {
  switch (status) {
    case 'paid':
      return { variant: 'success', label: 'Lunas (paid)' };
    case 'pending':
      return { variant: 'warning', label: 'Menunggu Bayar (pending)' };
    case 'expired':
      return { variant: 'neutral', label: 'Kedaluwarsa (expired)' };
  }
}

function getUsageBadge(status: TicketStatus): { variant: StatusVariant; label: string } {
  if (status === 'used') {
    return { variant: 'error', label: 'Sudah Dipakai (used)' };
  }
  return { variant: 'info', label: 'Siap Pakai (unused)' };
}

export interface UserTicketsPageProps {
  onNavigate?: (path: RoutePath, params?: Record<string, string>) => void;
}

export function UserTicketsPage({ onNavigate }: UserTicketsPageProps) {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [authChecking, setAuthChecking] = useState<boolean>(!authService.isInitialized());
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(() => authService.isAuthenticated());
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const autoOpenedOrderRef = useRef<boolean>(false);

  const loadTickets = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/tickets/my`, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    const json = (await res.json()) as ApiEnvelope<Ticket[]>;
    if (res.status === 401) {
      throw new Error(json.error?.message || 'Silakan login terlebih dahulu.');
    }
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Gagal memuat daftar tiket.');
    }
    return Array.isArray(json.data) ? json.data : [];
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = authService.subscribe((user) => {
      if (!active) return;
      setCurrentUser(user);
      setAuthChecking(!authService.isInitialized());
    });

    if (!authService.isInitialized()) {
      void authService.initSession().then((user) => {
        if (!active) return;
        setCurrentUser(user);
        setAuthChecking(false);
      });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authChecking || !currentUser || currentUser.role !== 'member') return;

    let active = true;
    loadTickets()
      .then((data) => {
        if (!active) return;
        setTickets(data);
        setError(null);
        if (!autoOpenedOrderRef.current && typeof window !== 'undefined') {
          const requestedOrder = new URLSearchParams(window.location.search).get('order_code');
          if (requestedOrder) {
            const match = data.find(
              (t) => t.order_code === requestedOrder && t.payment_status === 'paid'
            );
            if (match) {
              setSelectedTicket(match);
            }
          }
          autoOpenedOrderRef.current = true;
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(
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
  }, [authChecking, currentUser, loadTickets]);

  const handleReload = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadTickets();
      setTickets(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Tidak dapat terhubung ke server API Travora.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTicketUpdated = (updated: Ticket) => {
    setTickets((prev) =>
      prev.map((item) =>
        item.order_code === updated.order_code ? updated : item
      )
    );
    setSelectedTicket(updated);
  };

  const handleGoToLogin = () => {
    if (onNavigate) {
      onNavigate('/login', { redirect: '/tickets' });
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login?redirect=/tickets';
    }
  };

  if (authChecking) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 text-center text-sm text-stone-600">
        Memeriksa sesi akun Anda...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 sm:p-10 text-center shadow-xs space-y-5">
          <div className="mx-auto size-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-primary">
            <KeyIcon className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-serif text-2xl font-bold text-stone-950">
              Masuk untuk Melihat E-Tiket Anda
            </h1>
            <p className="text-sm text-stone-600 max-w-md mx-auto">
              E-Tiket QR Code terhubung ke akun Travora resmi Anda. Silakan login terlebih dahulu untuk menampilkan daftar tiket milik Anda.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" size="md" onClick={handleGoToLogin}>
              Masuk ke Akun Travora
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role !== 'member') {
    const portalPath: RoutePath = currentUser.role === 'admin' ? '/admin' : '/operator';
    const portalLabel = currentUser.role === 'admin' ? 'Panel Admin' : 'Portal Operator';
    return (
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 sm:p-10 text-center shadow-xs space-y-5">
          <div className="mx-auto size-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <TicketIcon className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-serif text-2xl font-bold text-stone-950">
              Halaman Khusus Akun Member
            </h1>
            <p className="text-sm text-stone-600 max-w-md mx-auto">
              Anda sedang masuk sebagai <strong>{currentUser.role}</strong>. E-Tiket QR Code pribadi hanya tersedia untuk akun penumpang (member).
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                if (onNavigate) onNavigate(portalPath);
              }}
            >
              Kembali ke {portalLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-primary mb-1.5">
            <TicketIcon className="size-4" />
            <span>E-Tiket Pengunjung &bull; {currentUser.name}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
            Daftar E-Tiket Saya
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Tiket yang sudah berstatus lunas dapat menampilkan QR Code resmi untuk check-in di lokasi.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={handleReload}
          isLoading={loading}
        >
          Muat Ulang Tiket
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-800"
        >
          <AlertCircleIcon className="size-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold">Gagal Memuat Tiket</p>
            <p className="text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Ticket Grid */}
      {loading && tickets.length === 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-56 animate-pulse rounded-2xl border border-stone-200 bg-white p-6"
            >
              <div className="h-4 w-28 rounded bg-stone-200 mb-3" />
              <div className="h-6 w-3/4 rounded bg-stone-200 mb-4" />
              <div className="h-4 w-1/2 rounded bg-stone-100 mb-8" />
              <div className="h-10 w-full rounded-xl bg-stone-200" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <TicketIcon className="mx-auto size-10 text-stone-400" />
          <h2 className="font-serif text-lg font-bold text-stone-900 mt-3">
            Belum ada tiket tersedia
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Pesanan tiket Anda akan muncul di halaman ini setelah Anda melakukan pemesanan.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => {
            const paymentBadge = getPaymentBadge(ticket.payment_status);
            const usageBadge = getUsageBadge(ticket.ticket_status);
            const isPaid = ticket.payment_status === 'paid';

            return (
              <article
                key={ticket.id}
                className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-md transition-shadow"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200/70">
                      {ticket.order_code}
                    </span>
                    <StatusBadge status={paymentBadge.variant} size="sm">
                      {paymentBadge.label}
                    </StatusBadge>
                  </div>

                  <div>
                    <h2 className="font-serif text-lg font-bold text-stone-950 leading-snug">
                      {ticket.event_name}
                    </h2>
                    <p className="text-base font-bold text-primary mt-1">
                      {formatCurrency(ticket.amount)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-stone-500">
                      Status Check-in
                    </span>
                    <StatusBadge status={usageBadge.variant} size="sm">
                      {usageBadge.label}
                    </StatusBadge>
                  </div>

                  {ticket.scanned_at && (
                    <p className="text-xs text-stone-600 bg-stone-50 rounded-xl px-3 py-2 border border-stone-200/70">
                      Di-scan pada: {formatDateTimeWIB(ticket.scanned_at)}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100">
                  {isPaid ? (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      leftIcon={<QrMiniIcon />}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      Lihat E-Tiket
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs font-medium text-amber-800">
                      Menunggu pelunasan pembayaran untuk membuka QR E-Tiket
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <TicketQrModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onTicketUpdated={handleTicketUpdated}
      />
    </div>
  );
}
