/**
 * Type Definitions for Travora Frontend View Models
 *
 * Catatan Arsitektur:
 * Tipe data di bawah ini merupakan View Model (tampilan UI) yang terpisah
 * dari DDL / skema database asli, sesuai batasan Phase 1.
 */

export interface CityOption {
  id: string;
  name: string;
  code?: string;
}

export interface SearchTicketFormValues {
  originCityId: string;
  destinationCityId: string;
  departureDate: string;
}

export interface SearchTicketFormErrors {
  originCityId?: string;
  destinationCityId?: string;
  departureDate?: string;
  general?: string;
}

export interface ScheduleViewModel {
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
  availableSeats?: number;
}

export type ScheduleViewStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

// ==========================================
// Phase 2 & 3: Role & Auth Types
// ==========================================

export type UserRole = 'member' | 'admin' | 'operator';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  username?: string;
  identifier?: string;
  role: UserRole;
  phone?: string;
  joinedDate?: string;
}

// ==========================================
// Phase 2: Member & Booking Types
// Catatan Arsitektur & Scope Alignment:
// Tipe data di bawah ini merupakan View Model (tampilan UI & mock workflow)
// yang terpisah dari DDL / skema database asli, sesuai batasan 10 entitas ERD:
// Admin, Member, Operator_Loket, Kota_Asal,
// Kota_Tujuan, Kendaraan, Jadwal, Pesan,
// Konfirmasi_Pesanan, Keluhan.
// ==========================================

export interface MemberProfile {
  id: string;
  name: string;
  email?: string;
  username?: string;
  role?: UserRole;
  phone?: string;
  joinedDate?: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface RegisterFormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

/**
 * Mock Workflow Status untuk antarmuka UI.
 * PERHATIAN: Status ini murni alur status demonstrasi frontend, bukan
 * merupakan enum database resmi yang tersimpan di backend.
 *
 * Catatan Semantik Alur Loket:
 * - 'selesai': Pada konteks validasi keberangkatan loket, status ini merepresentasikan
 *   tahap 'Keberangkatan Tervalidasi' / 'Sudah Check-in' di loket fisik keberangkatan,
 *   dan TIDAK memberikan kesan bahwa perjalanan antar-kota telah tuntas di tujuan.
 */
export type BookingStatus =
  | 'menunggu_pembayaran'
  | 'menunggu_verifikasi'
  | 'terkonfirmasi'
  | 'selesai'
  | 'dibatalkan';

export interface BookingViewModel {
  id: string; // e.g. TRV-202611-001
  scheduleId: string;
  schedule: ScheduleViewModel;
  memberId: string;
  memberName: string;
  memberPhone: string;
  seatNumber: string;
  totalPrice: number;
  bookingDate: string;
  status: BookingStatus;
  paymentConfirmationId?: string;
}

/**
 * Item ketersediaan nomor kursi demonstrasi.
 * Catatan: Daftar nomor kursi berasal dari mock availability fixture
 * dan bukan atribut kolom entitas ERD.
 */
export interface SeatItem {
  seatNumber: string;
  isAvailable: boolean;
  bookedBy?: string;
}

export interface PaymentConfirmationValues {
  bookingId: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  transferAmount: number;
  transferDate: string;
}

export interface PaymentConfirmationErrors {
  bookingId?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  transferAmount?: string;
  transferDate?: string;
  general?: string;
}

export interface PaymentConfirmationViewModel {
  id: string; // e.g. KNF-001
  bookingId: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  transferAmount: number;
  transferDate: string;
  status: 'menunggu_verifikasi' | 'terverifikasi' | 'ditolak';
  submittedAt: string;
}

export type ComplaintStatus = 'diajukan' | 'diproses' | 'selesai';

export interface ComplaintFormValues {
  bookingId?: string;
  subject: string;
  message: string;
}

export interface ComplaintFormErrors {
  bookingId?: string;
  subject?: string;
  message?: string;
  general?: string;
}

export interface ComplaintViewModel {
  id: string; // e.g. KLP-001
  memberId: string;
  memberName: string;
  bookingId?: string;
  bookingCode?: string;
  subject: string;
  message: string;
  status: ComplaintStatus;
  createdAt: string;
  adminResponse?: string;
  resolvedAt?: string;
}

export interface MemberDashboardMetrics {
  activeTicketsCount: number;
  pendingPaymentCount: number;
  totalTripsCount: number;
}

// ==========================================
// Phase 3: Admin & Operator Master Data & Operational View Models
//
// Catatan Arsitektur & Kepatuhan Batasan ERD:
// View model di bawah ini merepresentasikan antarmuka pengguna frontend yang
// memetakan 10 entitas ERD Travora (Admin, Member, Operator_Loket, Kota_Asal,
// Kota_Tujuan, Kendaraan, Jadwal, Pesan, Konfirmasi_Pesanan, Keluhan).
//
// PERINGATAN INTEGRITAS DDL:
// Atribut-atribut berikut murni merupakan MOCK FIELD / VIEW MODEL FRONTEND /
// METADATA DEMONSTRASI UI, dan TIDAK DIKLAIM sebagai atribut DDL resmi:
// 1. Kota_Asal.code & Kota_Tujuan.code (singkatan visual nama kota untuk UI)
// 2. Kendaraan.status (status operasional demonstrasi: 'aktif' | 'perawatan')
// 3. Jadwal.isActive (flag keaktifan tampilan jadwal di UI)
// 4. Pesan.totalPrice, Pesan.bookingDate, Pesan.status (alur workflow UI demo)
// 5. Konfirmasi_Pesanan.bookingId, Konfirmasi_Pesanan.status (status penelaahan loket)
// 6. Keluhan.subject, Keluhan.adminResponse (uraian tanggapan demonstrasi)
// ==========================================

export interface CityEntity {
  id: string; // e.g. 'city-bdg'
  name: string; // e.g. 'Bandung'
  code: string; // MOCK FIELD: singkatan kota untuk representasi visual UI
}

export interface CityFormValues {
  name: string;
  code: string;
}

export interface VehicleEntity {
  id: string; // e.g. 'VH-01'
  name: string; // e.g. 'HiAce Executive Shuttle'
  plateNumber: string; // e.g. 'D 7102 TRV'
  status: 'aktif' | 'perawatan'; // MOCK FIELD: status kesiapan armada di UI
}

export interface VehicleFormValues {
  name: string;
  plateNumber: string;
  status: 'aktif' | 'perawatan';
}

export interface ScheduleEntity {
  id: string; // e.g. 'SCH-BDG-JKT-01'
  originCityId: string;
  destinationCityId: string;
  vehicleId: string;
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // e.g. '06:00 WIB'
  price: number;
  isActive: boolean; // MOCK FIELD: toggle keaktifan jadwal di pencarian UI
}

export interface ScheduleFormValues {
  originCityId: string;
  destinationCityId: string;
  vehicleId: string;
  departureDate: string;
  departureTime: string;
  price: number;
  isActive: boolean;
}

export interface AdminComplaintReplyValues {
  adminResponse: string; // MOCK FIELD: teks respon demonstrasi admin
  status: ComplaintStatus;
}

export interface AdminDashboardMetrics {
  activeSchedulesCount: number;
  vehiclesCount: number;
  pendingComplaintsCount: number;
}

export interface OperatorDashboardMetrics {
  todaySchedulesCount: number;
  todayBookingsCount: number;
  pendingConfirmationsCount: number;
}



