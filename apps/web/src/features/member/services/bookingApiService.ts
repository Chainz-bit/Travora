import { API_BASE_URL, getAuthHeaders } from '../../../pages/tickets/types';

export type BookingStatus =
  | 'menunggu_pembayaran'
  | 'menunggu_verifikasi'
  | 'terkonfirmasi'
  | 'selesai'
  | 'dibatalkan';

export interface BookingScheduleView {
  id: string;
  originCityId: string;
  originCityName: string;
  destinationCityId: string;
  destinationCityName: string;
  departureDate: string;
  departureTime: string;
  vehicleName: string;
  vehiclePlate: string;
  price: number;
  availableSeats: number;
}

export interface BookingRecord {
  id: string;
  dbId: number;
  scheduleId: string;
  schedule: BookingScheduleView;
  memberId: string;
  memberName: string;
  memberPhone: string;
  seatNumber: string;
  totalPrice: number;
  bookingDate: string;
  status: BookingStatus;
  paymentConfirmationId?: string;
}

export interface PaymentConfirmationRecord {
  id: string;
  bookingId: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  transferAmount: number;
  transferDate: string;
  status: 'menunggu_verifikasi' | 'terverifikasi' | 'ditolak';
  submittedAt: string;
}

export interface SubmitPaymentPayload {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  transferAmount: number;
  transferDate: string;
}

export interface ComplaintRecord {
  id: string;
  dbId: number;
  memberId: string;
  memberName: string;
  bookingCode?: string;
  subject: string;
  message: string;
  status: 'diajukan' | 'diproses' | 'selesai';
  adminResponse?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateComplaintPayload {
  bookingId?: string;
  subject: string;
  message: string;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    }),
  });

  let payload: ApiResponseEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponseEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!res.ok || !payload?.success) {
    const msg =
      payload?.error?.message ||
      payload?.message ||
      `Permintaan gagal dengan status HTTP ${res.status}.`;
    throw new Error(msg);
  }

  if (payload.data === undefined) {
    throw new Error('Respons server tidak memuat data.');
  }

  return payload.data;
}

export const bookingApiService = {
  async getBookedSeats(scheduleId: number | string): Promise<string[]> {
    const id = encodeURIComponent(String(scheduleId));
    return requestJson<string[]>(`/api/v1/bookings/booked-seats?schedule_id=${id}`);
  },

  async createBooking(scheduleId: number, seatNumber: string): Promise<BookingRecord> {
    return requestJson<BookingRecord>('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify({
        schedule_id: scheduleId,
        seat_number: seatNumber,
      }),
    });
  },

  async getMyBookings(): Promise<BookingRecord[]> {
    return requestJson<BookingRecord[]>('/api/v1/bookings/my');
  },

  async submitPaymentConfirmation(
    orderCode: string,
    payload: SubmitPaymentPayload,
  ): Promise<PaymentConfirmationRecord> {
    const encoded = encodeURIComponent(orderCode);
    return requestJson<PaymentConfirmationRecord>(
      `/api/v1/bookings/${encoded}/confirm-payment`,
      {
        method: 'POST',
        body: JSON.stringify({
          bank_name: payload.bankName,
          account_holder: payload.accountHolder,
          account_number: payload.accountNumber,
          transfer_amount: payload.transferAmount,
          transfer_date: payload.transferDate,
        }),
      },
    );
  },

  async getOperatorConfirmations(): Promise<PaymentConfirmationRecord[]> {
    return requestJson<PaymentConfirmationRecord[]>('/api/v1/operator/confirmations');
  },

  async verifyConfirmation(
    noResi: string,
    approved: boolean,
  ): Promise<PaymentConfirmationRecord> {
    const encoded = encodeURIComponent(noResi);
    return requestJson<PaymentConfirmationRecord>(
      `/api/v1/operator/confirmations/${encoded}/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ approved }),
      },
    );
  },

  async getOperatorBookings(): Promise<BookingRecord[]> {
    return requestJson<BookingRecord[]>('/api/v1/operator/bookings');
  },

  async validateDeparture(orderCode: string): Promise<BookingRecord> {
    const encoded = encodeURIComponent(orderCode);
    return requestJson<BookingRecord>(`/api/v1/operator/bookings/${encoded}/validate`, {
      method: 'POST',
    });
  },

  async cancelBooking(orderCode: string): Promise<BookingRecord> {
    const encoded = encodeURIComponent(orderCode);
    return requestJson<BookingRecord>(`/api/v1/bookings/${encoded}/cancel`, {
      method: 'POST',
    });
  },

  async getMyComplaints(): Promise<ComplaintRecord[]> {
    return requestJson<ComplaintRecord[]>('/api/v1/complaints/my');
  },

  async createComplaint(payload: CreateComplaintPayload): Promise<ComplaintRecord> {
    return requestJson<ComplaintRecord>('/api/v1/complaints', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: payload.bookingId || '',
        subject: payload.subject,
        message: payload.message,
      }),
    });
  },
};
