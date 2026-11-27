/**
 * Mock Authentication Service untuk Demonstrasi Frontend Multi-Role Travora
 *
 * Catatan Batasan & Keamanan:
 * 1. Seluruh akun dan sesi dalam layanan ini murni data demonstrasi lokal (browser storage).
 * 2. Kata sandi (password) TIDAK PERNAH disimpan ke dalam localStorage maupun state persisten.
 * 3. Layanan ini TIDAK terhubung ke database produksi dan bukan otorisasi keamanan nyata.
 * 4. Route guard yang memanfaatkan service ini berfungsi sebagai proteksi navigasi demo UI terpisah per role.
 */

import type { UserProfile, UserRole, LoginFormValues, RegisterFormValues } from '../../../types/index';

const USER_STORAGE_KEY = 'travora_demo_user';
const SESSION_STORAGE_KEY = 'travora_demo_session';

export const DEFAULT_DEMO_MEMBER: UserProfile = {
  id: 'MBR-001',
  name: 'Budi Pratama',
  email: 'member.demo@travora.id',
  role: 'member',
  phone: '081234567890',
  joinedDate: '2026-01-15',
};

export const DEFAULT_DEMO_ADMIN: UserProfile = {
  id: 'ADM-001',
  name: 'Siti Rahmawati (Admin)',
  email: 'admin.demo@travora.id',
  role: 'admin',
  phone: '081298765432',
  joinedDate: '2026-01-01',
};

export const DEFAULT_DEMO_OPERATOR: UserProfile = {
  id: 'OPR-001',
  name: 'Ahmad Hidayat (Operator Loket)',
  email: 'operator.demo@travora.id',
  role: 'operator',
  phone: '081387654321',
  joinedDate: '2026-01-10',
};

export const DEFAULT_DEMO_USER = DEFAULT_DEMO_MEMBER;

export const mockAuthService = {
  getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const session = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!session) return null;
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
    } catch {
      // fallback
    }
    return null;
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(SESSION_STORAGE_KEY) && !!this.getCurrentUser();
  },

  getUserRole(): UserRole | null {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  },

  hasRole(expectedRole: UserRole): boolean {
    return this.getUserRole() === expectedRole;
  },

  login(
    values: LoginFormValues,
    requiredRole: UserRole = 'member'
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cleanEmail = values.email.trim().toLowerCase();
        if (!cleanEmail || !values.password) {
          resolve({ success: false, error: 'Email dan kata sandi wajib diisi.' });
          return;
        }

        // Validasi kesesuaian role jika menggunakan akun demo bawaan
        if (requiredRole === 'admin' && (cleanEmail === DEFAULT_DEMO_MEMBER.email || cleanEmail === DEFAULT_DEMO_OPERATOR.email)) {
          resolve({
            success: false,
            error: `Email ${cleanEmail} bukan akun Administrator. Silakan pilih tab peran yang sesuai atau gunakan admin.demo@travora.id.`,
          });
          return;
        }

        if (requiredRole === 'operator' && (cleanEmail === DEFAULT_DEMO_MEMBER.email || cleanEmail === DEFAULT_DEMO_ADMIN.email)) {
          resolve({
            success: false,
            error: `Email ${cleanEmail} bukan akun Pengelola Loket. Silakan pilih tab peran yang sesuai atau gunakan operator.demo@travora.id.`,
          });
          return;
        }

        if (requiredRole === 'member' && (cleanEmail === DEFAULT_DEMO_ADMIN.email || cleanEmail === DEFAULT_DEMO_OPERATOR.email)) {
          resolve({
            success: false,
            error: `Email ${cleanEmail} adalah akun staf operasional (${cleanEmail.includes('admin') ? 'Admin' : 'Pengelola Loket'}). Silakan pilih tab peran di atas.`,
          });
          return;
        }

        // Validasi kata sandi untuk akun demo standar
        const isDemoAccount =
          cleanEmail === DEFAULT_DEMO_MEMBER.email ||
          cleanEmail === DEFAULT_DEMO_ADMIN.email ||
          cleanEmail === DEFAULT_DEMO_OPERATOR.email;

        if (isDemoAccount && values.password !== 'demo12345') {
          resolve({
            success: false,
            error: 'Kata sandi demo tidak cocok. Silakan gunakan: demo12345',
          });
          return;
        }

        let matchedUser: UserProfile;

        if (requiredRole === 'admin') {
          matchedUser = {
            ...DEFAULT_DEMO_ADMIN,
            email: cleanEmail || DEFAULT_DEMO_ADMIN.email,
          };
        } else if (requiredRole === 'operator') {
          matchedUser = {
            ...DEFAULT_DEMO_OPERATOR,
            email: cleanEmail || DEFAULT_DEMO_OPERATOR.email,
          };
        } else {
          matchedUser = {
            ...DEFAULT_DEMO_MEMBER,
            email: cleanEmail || DEFAULT_DEMO_MEMBER.email,
            name: cleanEmail === DEFAULT_DEMO_MEMBER.email ? DEFAULT_DEMO_MEMBER.name : (cleanEmail.split('@')[0] || 'Member Demo'),
          };
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(SESSION_STORAGE_KEY, 'active');
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(matchedUser));
        }

        resolve({ success: true, user: matchedUser });
      }, 250);
    });
  },

  register(values: RegisterFormValues): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!values.name || !values.email || !values.phone || !values.password) {
          resolve({ success: false, error: 'Semua kolom registrasi wajib diisi.' });
          return;
        }
        if (values.password !== values.confirmPassword) {
          resolve({ success: false, error: 'Konfirmasi kata sandi tidak cocok.' });
          return;
        }

        const newUser: UserProfile = {
          id: `MBR-${Math.floor(100 + Math.random() * 900)}`,
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          role: 'member',
          phone: values.phone.trim(),
          joinedDate: new Date().toISOString().split('T')[0],
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(SESSION_STORAGE_KEY, 'active');
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        }

        resolve({ success: true, user: newUser });
      }, 300);
    });
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  },

  loginDemo(role: UserRole = 'member'): UserProfile {
    let target = DEFAULT_DEMO_MEMBER;
    if (role === 'admin') target = DEFAULT_DEMO_ADMIN;
    if (role === 'operator') target = DEFAULT_DEMO_OPERATOR;

    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_STORAGE_KEY, 'active');
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(target));
    }
    return target;
  },
};
