/**
 * TRAVORA - Centralized REST API Client
 * Berkomunikasi dengan Go REST API Backend (/api/v1/...)
 */

import type { CityOption, ScheduleViewModel } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ============================================================================
// DTO / API Response Types matching Go Backend
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiOriginCity {
  id_kota_asal: number;
  nm_kota_asal: string;
}

export interface ApiDestinationCity {
  id_kota_tujuan: number;
  nm_kota_tujuan: string;
}

export interface ApiVehicle {
  id_kendaraan: number;
  jenis_mobil: string;
  nomor_polisi: string;
  warna_mobil: string;
}

export interface ApiSchedule {
  id_jadwal: number;
  harga: number;
  tgl_berangkat: string; // YYYY-MM-DD
  jam_berangkat: string; // HH:MM:SS or HH:MM
  is_active: boolean;
  id_kendaraan: number;
  jenis_mobil: string;
  nomor_polisi: string;
  id_kota_asal: number;
  nm_kota_asal: string;
  id_kota_tujuan: number;
  nm_kota_tujuan: string;
}

export interface ScheduleSearchParams {
  originCityId?: number | string;
  destinationCityId?: number | string;
  departureDate?: string; // YYYY-MM-DD
  limit?: number;
  offset?: number;
}

// ============================================================================
// Helper Request Method
// ============================================================================

class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'API_ERROR', status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: HeadersInit = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      `Gagal terhubung ke API backend (${url}). Pastikan Go API Server menyala pada port yang sesuai.`,
      'NETWORK_ERROR',
      0
    );
  }

  // Parse JSON response
  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(
      `Respons dari server (${response.status} ${response.statusText}) bukan format JSON yang valid.`,
      'INVALID_JSON',
      response.status
    );
  }

  if (!response.ok || !json.success) {
    const errorEnvelope = json as ApiErrorResponse;
    const msg = errorEnvelope?.error?.message || `HTTP ${response.status}: Terjadi kesalahan server`;
    const code = errorEnvelope?.error?.code || 'HTTP_ERROR';
    throw new ApiError(msg, code, response.status);
  }

  return (json as ApiSuccessResponse<T>).data;
}

// ============================================================================
// Public API Methods
// ============================================================================

export const apiClient = {
  /**
   * Health Check: Liveness Probe
   */
  async checkLive(): Promise<{ status: string; service: string }> {
    return request<{ status: string; service: string }>('/health/live');
  },

  /**
   * Health Check: Readiness Probe (PostgreSQL connectivity)
   */
  async checkReady(): Promise<{ status: string; service: string; database?: string }> {
    return request<{ status: string; service: string; database?: string }>('/health/ready');
  },

  /**
   * Master Data: Daftar Kota Asal
   */
  async getOriginCities(): Promise<CityOption[]> {
    const data = await request<ApiOriginCity[]>('/api/v1/master-data/origin-cities');
    return data.map((c) => ({
      id: String(c.id_kota_asal),
      name: c.nm_kota_asal,
      code: `ASAL-${c.id_kota_asal}`,
    }));
  },

  /**
   * Master Data: Daftar Kota Tujuan
   */
  async getDestinationCities(): Promise<CityOption[]> {
    const data = await request<ApiDestinationCity[]>('/api/v1/master-data/destination-cities');
    return data.map((c) => ({
      id: String(c.id_kota_tujuan),
      name: c.nm_kota_tujuan,
      code: `TUJ-${c.id_kota_tujuan}`,
    }));
  },

  /**
   * Master Data: Daftar Armada Kendaraan
   */
  async getVehicles(): Promise<ApiVehicle[]> {
    return request<ApiVehicle[]>('/api/v1/master-data/vehicles');
  },

  /**
   * Schedules: Pencarian Jadwal Terjadwal dengan filter
   */
  async getSchedules(params?: ScheduleSearchParams): Promise<ScheduleViewModel[]> {
    const query = new URLSearchParams();

    if (params?.originCityId) {
      // Pastikan hanya integer yang dikirim ke backend
      const id = parseInt(String(params.originCityId), 10);
      if (!isNaN(id) && id > 0) {
        query.append('origin_city_id', String(id));
      }
    }

    if (params?.destinationCityId) {
      const id = parseInt(String(params.destinationCityId), 10);
      if (!isNaN(id) && id > 0) {
        query.append('destination_city_id', String(id));
      }
    }

    if (params?.departureDate) {
      query.append('departure_date', params.departureDate);
    }

    if (params?.limit) {
      query.append('limit', String(params.limit));
    }

    if (params?.offset !== undefined) {
      query.append('offset', String(params.offset));
    }

    const qs = query.toString();
    const path = `/api/v1/schedules${qs ? `?${qs}` : ''}`;
    const rawSchedules = await request<ApiSchedule[]>(path);

    // Map ApiSchedule to frontend ScheduleViewModel
    return rawSchedules.map((s): ScheduleViewModel => {
      // Format jam keberangkatan: HH:MM:SS -> HH:MM
      const timeFormatted = s.jam_berangkat ? s.jam_berangkat.substring(0, 5) : '00:00';

      return {
        id: String(s.id_jadwal),
        originCityId: String(s.id_kota_asal),
        originCityName: s.nm_kota_asal,
        destinationCityId: String(s.id_kota_tujuan),
        destinationCityName: s.nm_kota_tujuan,
        departureDate: s.tgl_berangkat,
        departureTime: timeFormatted,
        vehicleName: s.jenis_mobil,
        vehiclePlate: s.nomor_polisi,
        price: s.harga,
        availableSeats: s.jenis_mobil.includes('11') ? 11 : s.jenis_mobil.includes('14') ? 14 : s.jenis_mobil.includes('12') ? 12 : s.jenis_mobil.includes('8') ? 8 : 6,
      };
    });
  },

  /**
   * Schedules: Ambil detail satu jadwal berdasarkan ID
   */
  async getScheduleById(id: number | string): Promise<ScheduleViewModel> {
    const s = await request<ApiSchedule>(`/api/v1/schedules/${id}`);
    const timeFormatted = s.jam_berangkat ? s.jam_berangkat.substring(0, 5) : '00:00';

    return {
      id: String(s.id_jadwal),
      originCityId: String(s.id_kota_asal),
      originCityName: s.nm_kota_asal,
      destinationCityId: String(s.id_kota_tujuan),
      destinationCityName: s.nm_kota_tujuan,
      departureDate: s.tgl_berangkat,
      departureTime: timeFormatted,
      vehicleName: s.jenis_mobil,
      vehiclePlate: s.nomor_polisi,
      price: s.harga,
      availableSeats: s.jenis_mobil.includes('11') ? 11 : s.jenis_mobil.includes('14') ? 14 : s.jenis_mobil.includes('12') ? 12 : s.jenis_mobil.includes('8') ? 8 : 6,
    };
  },
};

