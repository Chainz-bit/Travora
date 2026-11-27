export type PaymentStatus = 'pending' | 'paid' | 'expired';
export type TicketStatus = 'unused' | 'used';

export interface Ticket {
  id: number;
  user_id: number;
  order_code: string;
  event_name: string;
  amount: number;
  payment_status: PaymentStatus;
  ticket_status: TicketStatus;
  scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Membangun header autentikasi standar Travora.
 * Sesi cookie HttpOnly dikirim lewat `credentials: 'include'`, dan jika ada token Bearer
 * di localStorage (misal dari integrasi OAuth/JWT), header Authorization otomatis disertakan.
 */
export function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...extra,
  };

  if (typeof window !== 'undefined') {
    const token =
      window.localStorage.getItem('token') ||
      window.localStorage.getItem('access_token') ||
      window.localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

export function formatDateTimeWIB(isoString: string | null): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}
