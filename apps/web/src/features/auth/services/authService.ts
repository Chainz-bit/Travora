/**
 * Real PostgreSQL Database Authentication Service
 * Menghubungkan Frontend ke Backend Go REST API (/api/v1/auth/...)
 * Menggunakan Session Cookie HttpOnly yang Aman dan Verifikasi Bcrypt di PostgreSQL
 */

import type { UserProfile, UserRole } from '../../../types/index';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface LoginParams {
  role: UserRole;
  identifier: string; // Email untuk Admin, Username untuk Member/Operator
  password: string;
}

export interface RegisterParams {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

type AuthListener = (user: UserProfile | null) => void;

class RealAuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Set<AuthListener> = new Set();
  private initialized: boolean = false;
  private initPromise: Promise<UserProfile | null> | null = null;

  constructor() {
    // Jalankan pengecekan sesi otomatis saat service pertama kali diinstansiasi
    if (typeof window !== 'undefined') {
      this.initSession();
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  /**
   * Inisialisasi awal pemulihan sesi dari backend via GET /api/v1/auth/me
   */
  public initSession(): Promise<UserProfile | null> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          method: 'GET',
          credentials: 'include', // Kirim cookie HttpOnly
          headers: {
            Accept: 'application/json',
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const userData = json.data;
            this.currentUser = {
              id: String(userData.id),
              name: userData.name,
              role: userData.role as UserRole,
              email: userData.email,
              username: userData.username,
              identifier: userData.identifier,
              phone: userData.phone,
            };
            this.initialized = true;
            this.notify();
            return this.currentUser;
          }
        }
      } catch (err) {
        // Backend belum aktif atau jaringan terputus
        console.warn('Gagal memulihkan sesi autentikasi dari backend:', err);
      }

      this.currentUser = null;
      this.initialized = true;
      this.notify();
      return null;
    })();

    return this.initPromise;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getUserRole(): UserRole | null {
    return this.currentUser ? this.currentUser.role : null;
  }

  public hasRole(expectedRole: UserRole): boolean {
    return this.getUserRole() === expectedRole;
  }

  /**
   * Login ke Backend PostgreSQL
   */
  public async login(params: LoginParams): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include', // Tangkap cookie HttpOnly
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          role: params.role,
          identifier: params.identifier.trim(),
          password: params.password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const errorMessage =
          json.error?.message ||
          (res.status === 401
            ? 'Kredensial login tidak valid. Periksa identifier dan kata sandi Anda.'
            : 'Terjadi kesalahan saat masuk ke akun.');
        return { success: false, error: errorMessage };
      }

      const userData = json.data;
      this.currentUser = {
        id: String(userData.id),
        name: userData.name,
        role: userData.role as UserRole,
        email: userData.email,
        username: userData.username,
        identifier: userData.identifier,
        phone: userData.phone,
      };

      this.initialized = true;
      this.notify();

      return { success: true, user: this.currentUser };
    } catch (err: unknown) {
      console.error('Kesalahan jaringan saat login:', err);
      return {
        success: false,
        error:
          'Gagal terhubung ke server API Travora (http://localhost:8080). Pastikan backend Go aktif.',
      };
    }
  }

  /**
   * Pendaftaran Member Baru ke PostgreSQL via POST /api/v1/auth/register
   */
  public async register(params: RegisterParams): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: params.name.trim(),
          email: params.email.trim(),
          username: params.email.trim(),
          phone: params.phone.trim(),
          password: params.password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const errorMessage =
          json.error?.message ||
          'Gagal mendaftarkan akun. Silakan periksa data yang dimasukkan.';
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (err: unknown) {
      console.error('Kesalahan jaringan saat registrasi:', err);
      return {
        success: false,
        error:
          'Gagal terhubung ke server API Travora (http://localhost:8080). Pastikan backend Go aktif.',
      };
    }
  }

  /**
   * Logout dan hapus cookie sesi di Backend
   */
  public async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (err) {
      console.warn('Gagal memanggil endpoint logout backend:', err);
    } finally {
      this.currentUser = null;
      this.notify();
    }
  }

  /**
   * Berlangganan perubahan state autentikasi (reactive)
   */
  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const authService = new RealAuthService();

// Alias untuk kompatibilitas transisi modul internal jika dibutuhkan
export const mockAuthService = authService;

