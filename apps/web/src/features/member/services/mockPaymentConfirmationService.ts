/**
 * MOCK PAYMENT CONFIRMATION SERVICE (Entitas: Konfirmasi_Pesanan)
 * Terhubung dengan Shared Mock Store Travora.
 */

import type { PaymentConfirmationViewModel, PaymentConfirmationValues } from '../../../types/index';
import { sharedStore } from '../../shared/services/sharedStore';

export const mockPaymentConfirmationService = {
  getAllConfirmations(): PaymentConfirmationViewModel[] {
    return sharedStore.getConfirmations();
  },

  getConfirmationByBookingId(bookingId: string): PaymentConfirmationViewModel | null {
    return sharedStore.getConfirmationByBookingId(bookingId);
  },

  submitConfirmation(values: PaymentConfirmationValues): Promise<PaymentConfirmationViewModel> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const item = sharedStore.submitConfirmation(values);
        resolve(item);
      }, 300);
    });
  },

  verifyConfirmation(confirmationId: string, approved: boolean): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const res = sharedStore.verifyConfirmation(confirmationId, approved);
        resolve(res);
      }, 300);
    });
  },
};
