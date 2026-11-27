import type { SeatItem } from '../../../types/index';
import { mockBookingService } from './mockBookingService';

/**
 * MOCK SEAT AVAILABILITY FIXTURE
 *
 * Catatan Arsitektur & Batasan ERD:
 * 1. Daftar nomor kursi ini adalah data demonstrasi eksplisit yang terpisah.
 * 2. Kapasitas kursi TIDAK ditentukan oleh nama atau model kendaraan, dan bukan atribut ERD.
 * 3. Kendaraan dalam data demo adalah data ilustrasi dan bukan armada fisik terdaftar.
 * 4. Pengecekan konflik kursi di bawah ini murni simulasi frontend untuk kebutuhan demonstrasi UI.
 *    Pencegahan double-booking sesungguhnya membutuhkan validasi transaksional backend (database locking).
 */
const DEFAULT_DEMO_SEATS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

// Fixture simulasi status ketersediaan kursi awal per jadwal demo
const INITIAL_OCCUPIED_FIXTURE: Record<string, string[]> = {
  'SCH-BDG-JKT-01': ['01', '02', '07', '08'],
  'SCH-BDG-JKT-02': ['03', '05', '06'],
  'SCH-JKT-BDG-01': ['02', '04', '09'],
  'SCH-JKT-BDG-02': ['01', '07'],
  'SCH-YGY-SMG-01': ['01', '04', '08'],
};

export const mockSeatAvailabilityService = {
  /**
   * Menghasilkan daftar kursi demonstrasi berdasarkan fixture mock.
   */
  getSeatsForSchedule(scheduleId: string): SeatItem[] {
    // Kursi yang telah dipesan dalam state demo lokal
    const bookedSeats = mockBookingService.getBookedSeats(scheduleId);

    // Kursi yang disimulasikan terisi awal dari fixture
    const fixtureOccupied = INITIAL_OCCUPIED_FIXTURE[scheduleId] || ['01', '03'];
    const allOccupied = new Set([...bookedSeats, ...fixtureOccupied]);

    return DEFAULT_DEMO_SEATS.map((seatNumber) => ({
      seatNumber,
      isAvailable: !allOccupied.has(seatNumber),
    }));
  },
};
