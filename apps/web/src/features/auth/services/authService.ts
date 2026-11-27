/**
 * Real PostgreSQL Database Authentication Service
 * Menghubungkan Frontend ke Backend Go REST API (/api/v1/auth/...)
 * Menggunakan Session Cookie HttpOnly dan verifikasi autentikasi backend.
 */

import type { UserProfile, UserRole } from "../../../types/index";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export interface LoginParams {
  role: UserRole;
  identifier: string;
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

interface ApiAuthUser {
  id: string | number;
  name?: string;
  role: string;
  email?: string;
  username?: string;
  identifier?: string;
  phone?: string;
}

interface ApiAuthResponse {
  success: boolean;
  data?: ApiAuthUser;
  error?: {
    code?: string;
    message?: string;
  };
}

class RealAuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Set<AuthListener> = new Set();
  private initialized = false;
  private initPromise: Promise<UserProfile | null> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      void this.initSession();
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error("Error in auth listener:", err);
      }
    });
  }

  private mapUser(userData: ApiAuthUser): UserProfile {
    return {
      id: String(userData.id),
      name: userData.name ?? "",
      role: userData.role as UserRole,
      email: userData.email,
      username: userData.username,
      identifier: userData.identifier,
      phone: userData.phone,
    };
  }

  /**
   * Memulihkan sesi pengguna dari backend.
   */
  public initSession(): Promise<UserProfile | null> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (res.ok) {
          const json: ApiAuthResponse = await res.json();

          if (json.success && json.data) {
            this.currentUser = this.mapUser(json.data);
            this.initialized = true;
            this.notify();
            return this.currentUser;
          }
        }
      } catch (err) {
        console.warn("Gagal memulihkan sesi autentikasi dari backend:", err);
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
   * Login menggunakan username/email dan password.
   */
  public async login(params: LoginParams): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          role: params.role,
          identifier: params.identifier.trim(),
          password: params.password,
        }),
      });

      const json: ApiAuthResponse = await res.json();

      if (!res.ok || !json.success || !json.data) {
        return {
          success: false,
          error:
            json.error?.message ||
            (res.status === 401
              ? "Kredensial login tidak valid. Periksa identifier dan kata sandi Anda."
              : "Terjadi kesalahan saat masuk ke akun."),
        };
      }

      this.currentUser = this.mapUser(json.data);
      this.initialized = true;
      this.notify();

      return {
        success: true,
        user: this.currentUser,
      };
    } catch (err: unknown) {
      console.error("Kesalahan jaringan saat login:", err);

      return {
        success: false,
        error:
          "Gagal terhubung ke server API Travora. Pastikan backend Go aktif.",
      };
    }
  }

  /**
   * Login Member menggunakan Google ID Token.
   * Verifikasi token dilakukan oleh backend Go.
   */
  public async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    try {
      if (!idToken.trim()) {
        return {
          success: false,
          error: "Google ID Token tidak ditemukan.",
        };
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/auth/google-login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id_token: idToken,
        }),
      });

      const json: ApiAuthResponse = await res.json();

      if (!res.ok || !json.success || !json.data) {
        return {
          success: false,
          error:
            json.error?.message ||
            "Login dengan Google gagal. Silakan coba kembali.",
        };
      }

      if (json.data.role !== "member") {
        return {
          success: false,
          error: "Login dengan Google hanya tersedia untuk akun Member.",
        };
      }

      this.currentUser = this.mapUser(json.data);
      this.initialized = true;
      this.notify();

      return {
        success: true,
        user: this.currentUser,
      };
    } catch (err: unknown) {
      console.error("Kesalahan jaringan saat Google Login:", err);

      return {
        success: false,
        error:
          "Gagal terhubung ke server API Travora. Pastikan backend Go aktif.",
      };
    }
  }

  /**
   * Registrasi Member baru.
   */
  public async register(params: RegisterParams): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: params.name.trim(),
          email: params.email.trim(),
          username: params.email.trim(),
          phone: params.phone.trim(),
          password: params.password,
        }),
      });

      const json: ApiAuthResponse = await res.json();

      if (!res.ok || !json.success) {
        return {
          success: false,
          error:
            json.error?.message ||
            "Gagal mendaftarkan akun. Silakan periksa data yang dimasukkan.",
        };
      }

      return {
        success: true,
      };
    } catch (err: unknown) {
      console.error("Kesalahan jaringan saat registrasi:", err);

      return {
        success: false,
        error:
          "Gagal terhubung ke server API Travora. Pastikan backend Go aktif.",
      };
    }
  }

  /**
   * Logout dan hapus cookie sesi di backend.
   */
  public async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
    } catch (err) {
      console.warn("Gagal memanggil endpoint logout backend:", err);
    } finally {
      this.currentUser = null;
      this.notify();
    }
  }

  /**
   * Berlangganan perubahan autentikasi.
   */
  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const authService = new RealAuthService();

// Alias kompatibilitas modul lama.
export const mockAuthService = authService;
