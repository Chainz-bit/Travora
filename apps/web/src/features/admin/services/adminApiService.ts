import { API_BASE_URL, getAuthHeaders } from '../../../pages/tickets/types';
import type { ComplaintRecord } from '../../member/services/bookingApiService';

export interface AdminCity {
  id: string;
  name: string;
  code: string;
}

export interface AdminVehicle {
  id: string;
  name: string;
  plateNumber: string;
  color: string;
  status: 'aktif' | 'perawatan';
}

export interface AdminSchedule {
  id: string;
  originCityId: string;
  originCityName: string;
  destinationCityId: string;
  destinationCityName: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  departureDate: string;
  departureTime: string;
  price: number;
  isActive: boolean;
}

export interface AdminSchedulePayload {
  originCityId: number;
  destinationCityId: number;
  vehicleId: number;
  departureDate: string;
  departureTime: string;
  price: number;
  isActive: boolean;
}

export interface DeleteScheduleResponse {
  deactivated: boolean;
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

async function requestAdminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
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
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        `Permintaan admin gagal dengan status HTTP ${res.status}.`,
    );
  }

  if (payload.data === undefined) {
    throw new Error('Respons server tidak memuat data.');
  }

  return payload.data;
}

export const adminApiService = {
  getCities(type: 'origin' | 'destination'): Promise<AdminCity[]> {
    const seg = type === 'origin' ? 'origin-cities' : 'destination-cities';
    return requestAdminJson<AdminCity[]>(`/api/admin/${seg}`);
  },

  createCity(type: 'origin' | 'destination', name: string): Promise<AdminCity> {
    const seg = type === 'origin' ? 'origin-cities' : 'destination-cities';
    return requestAdminJson<AdminCity>(`/api/admin/${seg}`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  updateCity(type: 'origin' | 'destination', id: string, name: string): Promise<AdminCity> {
    const seg = type === 'origin' ? 'origin-cities' : 'destination-cities';
    return requestAdminJson<AdminCity>(`/api/admin/${seg}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  deleteCity(type: 'origin' | 'destination', id: string): Promise<{ message: string }> {
    const seg = type === 'origin' ? 'origin-cities' : 'destination-cities';
    return requestAdminJson<{ message: string }>(`/api/admin/${seg}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  getVehicles(): Promise<AdminVehicle[]> {
    return requestAdminJson<AdminVehicle[]>('/api/admin/vehicles');
  },

  createVehicle(payload: { name: string; plateNumber: string; color?: string }): Promise<AdminVehicle> {
    return requestAdminJson<AdminVehicle>('/api/admin/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateVehicle(
    id: string,
    payload: { name: string; plateNumber: string; color?: string },
  ): Promise<AdminVehicle> {
    return requestAdminJson<AdminVehicle>(`/api/admin/vehicles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteVehicle(id: string): Promise<{ message: string }> {
    return requestAdminJson<{ message: string }>(`/api/admin/vehicles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  getSchedules(): Promise<AdminSchedule[]> {
    return requestAdminJson<AdminSchedule[]>('/api/admin/schedules');
  },

  createSchedule(payload: AdminSchedulePayload): Promise<AdminSchedule> {
    return requestAdminJson<AdminSchedule>('/api/admin/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateSchedule(id: string, payload: AdminSchedulePayload): Promise<AdminSchedule> {
    return requestAdminJson<AdminSchedule>(`/api/admin/schedules/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  toggleScheduleActive(id: string): Promise<AdminSchedule> {
    return requestAdminJson<AdminSchedule>(
      `/api/admin/schedules/${encodeURIComponent(id)}/toggle`,
      { method: 'PATCH' },
    );
  },

  deleteSchedule(id: string): Promise<DeleteScheduleResponse> {
    return requestAdminJson<DeleteScheduleResponse>(
      `/api/admin/schedules/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  },

  getComplaints(): Promise<ComplaintRecord[]> {
    return requestAdminJson<ComplaintRecord[]>('/api/admin/complaints');
  },

  replyComplaint(
    dbId: number,
    payload: { adminResponse: string; status: 'diproses' | 'selesai' },
  ): Promise<ComplaintRecord> {
    return requestAdminJson<ComplaintRecord>(`/api/admin/complaints/${dbId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
