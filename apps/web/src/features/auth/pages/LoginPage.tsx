import { useState, type FormEvent } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import type { UserRole } from '../../../types';
import { authService } from '../services/authService';
import {
  BusIcon,
  UserIcon,
  ShieldCheckIcon,
  ReceiptIcon,
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export interface LoginPageProps {
  onNavigate: (path: RoutePath) => void;
  redirectPath?: string | null;
  defaultRole?: UserRole;
}

export function LoginPage({
  onNavigate,
  redirectPath,
  defaultRole = 'member',
}: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ganti role secara reaktif tanpa cascading render effect
  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    setIdentifier('');
    setPassword('');
  };

  // Handler navigasi dashboard sesuai role yang berhasil diotentikasi backend
  const navigateToDashboard = (role: UserRole) => {
    if (redirectPath) {
      if (role === 'admin' && redirectPath.startsWith('/admin')) {
        onNavigate(redirectPath as RoutePath);
        return;
      }
      if (role === 'operator' && redirectPath.startsWith('/operator')) {
        onNavigate(redirectPath as RoutePath);
        return;
      }
      if (role === 'member' && redirectPath.startsWith('/member')) {
        onNavigate(redirectPath as RoutePath);
        return;
      }
    }

    if (role === 'admin') {
      onNavigate('/admin');
    } else if (role === 'operator') {
      onNavigate('/operator');
    } else {
      onNavigate('/member');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError(
        selectedRole === 'admin'
          ? 'Alamat email wajib diisi.'
          : 'Username akun wajib diisi.'
      );
      return;
    }
    if (!password) {
      setError('Kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    const res = await authService.login({
      role: selectedRole,
      identifier: cleanIdentifier,
      password,
    });
    setLoading(false);

    if (res.success && res.user) {
      navigateToDashboard(res.user.role);
    } else {
      setError(res.error || 'Kredensial login tidak valid.');
    }
  };

  return (
    <div className="h-dvh w-full flex flex-col lg:flex-row overflow-hidden bg-canvas-public font-sans">
      {/* =========================================================================
          LEFT PANEL: EDITORIAL TRAVEL STORY (DESKTOP VISUAL)
         ========================================================================= */}
      <div className="hidden lg:flex lg:w-1/2 h-full shrink-0 relative bg-text-main text-stone-200 overflow-hidden flex-col justify-between p-10 xl:p-14 2xl:p-16 select-none">
        {/* Background Atmosphere Image with Gradient Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-35">
          <img
            src="/hero-travel.jpg"
            alt="Perjalanan darat antar-kota di Pulau Jawa"
            className="w-full h-full object-cover scale-105 filter brightness-75 contrast-110"
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-text-main via-text-main/75 to-transparent" />

        {/* Top Brand Mark */}
        <div className="relative z-10">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-3 cursor-pointer group"
          >
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm group-hover:bg-primary-hover transition-colors">
              <BusIcon className="size-5.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-serif text-2xl font-bold tracking-tight text-white leading-none">
                TRAVORA
              </span>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 mt-1">
                Travel Antar-Kota
              </span>
            </div>
          </button>
        </div>

        {/* Center Editorial Quote */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto py-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-amber-300 bg-amber-950/60 border border-amber-800/40">
            Kenyamanan Perjalanan Terjadwal
          </span>

          <blockquote className="font-serif text-3xl xl:text-4xl font-bold text-white leading-snug tracking-tight">
            “Kenyamanan bepergian dimulai dari kepastian jadwal, armada terawat, dan alur tiket yang tertib.”
          </blockquote>

          <div className="space-y-3 pt-2 text-xs text-stone-300 leading-relaxed">
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Armada Toyota HiAce & Isuzu Elf dengan pendingin udara prima</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Pilihan nomor kursi transparan tanpa tumpang tindih</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Verifikasi transfer tertata langsung ke loket keberangkatan</span>
            </div>
          </div>
        </div>

        {/* Bottom Editorial Note */}
        <div className="relative z-10 flex items-center justify-between text-xs text-stone-400 pt-6 border-t border-stone-800/80">
          <span>Sistem Informasi Tiket Travora</span>
          <span className="font-mono text-[11px]">© 2026 PT Travora Nusantara</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANEL: CLEAN, PREMIUM AUTHENTICATION FORM (INDEPENDENT SCROLL)
         ========================================================================= */}
      <div className="w-full lg:w-1/2 h-full flex flex-col overflow-y-auto overflow-x-hidden min-h-0 bg-canvas-public">
        <div className="max-w-md w-full mx-auto space-y-6 my-auto px-4 sm:px-8 md:px-12 py-8 sm:py-12">
          {/* Mobile Brand Link (Only on Mobile/Tablet) */}
          <div className="lg:hidden text-center pb-2">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-2.5 mx-auto group cursor-pointer"
            >
              <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
                <BusIcon className="size-5" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-stone-950">
                TRAVORA
              </span>
            </button>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
              Masuk ke Akun Anda
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Pilih peran akun di bawah ini untuk mengakses layanan atau portal operasional.
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="flex rounded-xl bg-stone-200/70 p-1 border border-stone-300/60 shadow-2xs">
            <button
              type="button"
              onClick={() => handleRoleChange('member')}
              className={`flex-1 py-2 px-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === 'member'
                  ? 'bg-white text-stone-950 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <UserIcon className="size-4 text-primary" />
              <span>Member</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex-1 py-2 px-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === 'admin'
                  ? 'bg-white text-stone-950 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShieldCheckIcon className="size-4 text-emerald-700" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('operator')}
              className={`flex-1 py-2 px-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === 'operator'
                  ? 'bg-white text-stone-950 shadow-xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ReceiptIcon className="size-4 text-amber-700" />
              <span>Pengelola Loket</span>
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-sm space-y-5">
            {/* Header Role Terpilih */}
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                  Peran Terpilih
                </span>
                <span className="text-sm font-bold text-stone-900 font-serif">
                  {selectedRole === 'admin'
                    ? 'Administrator Master Data'
                    : selectedRole === 'operator'
                    ? 'Petugas Operasional Loket'
                    : 'Penumpang / Member'}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  selectedRole === 'admin'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : selectedRole === 'operator'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-orange-50 text-primary border border-orange-200'
                }`}
              >
                {selectedRole.toUpperCase()}
              </span>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-xs text-red-700 animate-toast-enter">
                <AlertCircleIcon className="size-4 shrink-0 mt-0.5 text-red-600" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={
                  selectedRole === 'admin'
                    ? 'Alamat Email'
                    : 'Username'
                }
                type={selectedRole === 'admin' ? 'email' : 'text'}
                placeholder={
                  selectedRole === 'admin'
                    ? 'contoh: admin@travora.id'
                    : selectedRole === 'operator'
                    ? 'contoh: operator_bandung'
                    : 'contoh: budi_santoso'
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete={selectedRole === 'admin' ? 'email' : 'username'}
                disabled={loading}
              />

              <div>
                <label className="block text-sm font-medium text-stone-900 mb-1.5 select-none">
                  Kata Sandi
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl auth-form-field text-sm transition-all duration-150 border shadow-2xs focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={loading}
                  className="w-full h-11 justify-center text-sm font-semibold"
                >
                  Masuk ke Akun
                </Button>
              </div>
            </form>
          </div>

          {/* Links & Navigation Help */}
          <div className="text-center space-y-2 text-xs text-stone-500">
            {selectedRole === 'member' ? (
              <p>
                Belum memiliki akun member?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/register')}
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  Daftar di Sini
                </button>
              </p>
            ) : (
              <p className="text-[11px] text-stone-500 bg-stone-100/80 border border-stone-200/70 py-1.5 px-3 rounded-xl max-w-sm mx-auto">
                Akun {selectedRole === 'admin' ? 'Administrator' : 'Petugas Loket'} dibuat melalui mekanisme provisioning sistem dan tidak menyediakan registrasi mandiri publik.
              </p>
            )}
            <p>
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="hover:text-stone-800 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                &larr; Kembali ke Halaman Utama
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
