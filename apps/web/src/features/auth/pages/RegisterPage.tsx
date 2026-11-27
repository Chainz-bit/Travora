import { useState, type FormEvent } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import { authService } from '../services/authService';
import {
  BusIcon,
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
  CheckIcon,
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export interface RegisterPageProps {
  onNavigate: (path: RoutePath) => void;
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError('Nama lengkap wajib diisi.');
      return;
    }
    if (!cleanEmail) {
      setError('Alamat email wajib diisi.');
      return;
    }
    if (!cleanPhone) {
      setError('Nomor telepon wajib diisi.');
      return;
    }
    if (!password) {
      setError('Kata sandi wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    const res = await authService.register({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password,
    });
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Pendaftaran akun berhasil! Mengalihkan ke halaman masuk...');
      setTimeout(() => {
        onNavigate('/login');
      }, 1200);
    } else {
      setError(res.error || 'Gagal mendaftarkan akun.');
    }
  };

  return (
    <div className="h-dvh w-full flex flex-col lg:flex-row overflow-hidden bg-canvas-public font-sans">
      {/* =========================================================================
          LEFT PANEL: EDITORIAL TRAVEL STORY (DESKTOP VISUAL - 100% FIXED)
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
            Registrasi Anggota Resmi
          </span>

          <h1 className="font-serif text-3xl xl:text-4xl leading-tight font-normal text-stone-100">
            &ldquo;Kemudahan bepergian dimulai dari akun yang terhubung langsung ke sistem tiket resmi.&rdquo;
          </h1>

          <div className="space-y-3 text-sm text-stone-300 pt-2 border-t border-stone-800">
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Pesan tiket online cepat tanpa antre di loket fisik</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Pilihan nomor kursi transparan dengan konfirmasi instan</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Simpan riwayat perjalanan dan kelola tiket dalam satu tempat</span>
            </div>
          </div>
        </div>

        {/* Bottom Editorial Note */}
        <div className="relative z-10 flex items-center justify-between text-xs text-stone-400 pt-6 border-t border-stone-800/80">
          <span>Sistem Informasi Tiket Travora</span>
          <span className="font-mono text-[11px]">&copy; 2026 PT Travora Nusantara</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANEL: REGISTRATION FORM (INDEPENDENT INTERNAL SCROLL)
         ========================================================================= */}
      <div className="w-full lg:w-1/2 h-full flex flex-col overflow-y-auto overflow-x-hidden min-h-0 bg-canvas-public">
        <div className="max-w-md w-full mx-auto space-y-5 my-auto px-4 sm:px-8 md:px-12 py-8 sm:py-12">
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
              Daftar Akun Member
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Lengkapi data di bawah ini untuk menikmati reservasi tiket travel antar-kota.
            </p>
          </div>

          {/* Registration Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200/80 p-3.5 flex items-start gap-2.5 text-xs text-red-700"
              >
                <AlertCircleIcon className="size-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800"
              >
                <CheckIcon className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <Input
                  label="Nama Lengkap"
                  placeholder="Contoh: Budi Pratama"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div>
                <Input
                  label="Alamat Email / Username"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Email ini akan digunakan sebagai username saat masuk ke akun.
                </span>
              </div>

              <div>
                <Input
                  label="Nomor Telepon / WhatsApp"
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 px-3.5 pr-10 rounded-lg border shadow-2xs auth-form-field text-sm transition-all focus:ring-2 focus:ring-primary/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi kata sandi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 px-3.5 pr-10 rounded-lg border shadow-2xs auth-form-field text-sm transition-all focus:ring-2 focus:ring-primary/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showConfirmPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center h-11 font-medium text-sm cursor-pointer shadow-xs"
                  disabled={loading}
                >
                  {loading ? 'Mendaftarkan Akun...' : 'Daftar Sebagai Member'}
                </Button>
              </div>
            </form>
          </div>

          {/* Links & Navigation Help */}
          <div className="text-center space-y-2 text-xs text-stone-500">
            <p>
              Sudah memiliki akun member?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Masuk di Sini
              </button>
            </p>
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
