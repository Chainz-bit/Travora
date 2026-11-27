/**
 * MOCK COMPLAINT SERVICE (Entitas: Keluhan)
 * Terhubung dengan Shared Mock Store Travora.
 */

import type {
  ComplaintViewModel,
  ComplaintFormValues,
  MemberProfile,
  AdminComplaintReplyValues,
} from '../../../types/index';
import { sharedStore } from '../../shared/services/sharedStore';

export const mockComplaintService = {
  getComplaints(memberId?: string): ComplaintViewModel[] {
    return sharedStore.getComplaints(memberId);
  },

  getComplaintById(id: string): ComplaintViewModel | null {
    return sharedStore.getComplaintById(id);
  },

  submitComplaint(
    values: ComplaintFormValues,
    member: MemberProfile
  ): Promise<ComplaintViewModel> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const item = sharedStore.submitComplaint(values, member);
        resolve(item);
      }, 300);
    });
  },

  replyComplaint(id: string, reply: AdminComplaintReplyValues): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const res = sharedStore.replyComplaint(id, reply);
        resolve(res);
      }, 300);
    });
  },
};
