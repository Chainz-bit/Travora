/**
 * MOCK BOOKING SERVICE (Entitas: Pesan)
 * Terhubung dengan Shared Mock Store Travora.
 */

import type { BookingViewModel, BookingStatus, MemberProfile, MemberDashboardMetrics } from '../../../types/index';
import { sharedStore } from '../../shared/services/sharedStore';

export const mockBookingService = {
  getAllBookings(memberId?: string): BookingViewModel[] {
    return sharedStore.getBookings({ memberId });
  },

  getBookingById(id: string): BookingViewModel | null {
    return sharedStore.getBookingById(id);
  },

  getActiveBookings(memberId?: string): BookingViewModel[] {
    const list = this.getAllBookings(memberId);
    return list.filter((b) => b.status === 'terkonfirmasi');
  },

  getPendingPaymentBookings(memberId?: string): BookingViewModel[] {
    const list = this.getAllBookings(memberId);
    return list.filter((b) => b.status === 'menunggu_pembayaran');
  },

  getMetrics(memberId?: string): MemberDashboardMetrics {
    return sharedStore.getMemberMetrics(memberId);
  },

  createBooking(input: {
    scheduleId: string;
    seatNumber: string;
    member: MemberProfile;
  }): BookingViewModel {
    return sharedStore.createBooking(input);
  },

  updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    paymentConfirmationId?: string
  ): boolean {
    return sharedStore.updateBookingStatus(bookingId, status, paymentConfirmationId);
  },

  getBookedSeats(scheduleId: string): string[] {
    const all = sharedStore.getBookings();
    return all
      .filter((b) => b.scheduleId === scheduleId && b.status !== 'dibatalkan')
      .map((b) => b.seatNumber);
  },
};
