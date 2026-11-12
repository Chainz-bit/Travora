import { useState } from 'react';
import { authService } from '../../features/auth/services/authService';
import { Button } from '../ui/Button';
import {
  BusIcon,
  UserIcon,
  ShieldCheckIcon,
  ReceiptIcon,
  MenuIcon,
  XIcon,
  LogOutIcon,
  ArrowRightIcon,
} from '../ui/Icons';
import type { RoutePath } from '../../hooks/useRouter';

export interface NavbarProps {
  currentPath: string;
  onNavigate: (path: RoutePath) => void;
}

export function Navbar({ currentPath, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuth = authService.isAuthenticated();
  const user = authService.getCurrentUser();
  const role = user?.role || 'member';

  const handleLogout = async () => {
    await authService.logout();
    setMobileOpen(false);
    onNavigate('/');
  };

  const navLinks = [
    { label: 'Beranda', path: '/' as RoutePath },
    { label: 'Jadwal Perjalanan', path: '/schedules' as RoutePath },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-stone-200/90 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-17 flex items-center justify-between gap-4">
        {/* Logo & Brand Identity */}
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1"
          >
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs group-hover:bg-primary-hover transition-colors">
              <BusIcon className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-950 leading-none">
                TRAVORA
              </span>
              <span className="text-[9px] uppercase tracking-widest font-semibold text-stone-600 mt-1">
                Travel Antar-Kota
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Navigasi Utama">
            {navLinks.map((link) => {
              const active = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => onNavigate(link.path)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    active
                      ? 'bg-stone-100 text-stone-950 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Desktop Auth / User Action Button */}
        <div className="hidden sm:flex items-center gap-2.5">
          {isAuth ? (
            <div className="flex items-center gap-2">
              {role === 'admin' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate('/admin')}
                  className="text-xs px-3.5"
                >
                  <ShieldCheckIcon className="size-3.5 mr-1 text-orange-400" />
                  <span>Panel Admin</span>
                </Button>
              ) : role === 'operator' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate('/operator')}
                  className="text-xs px-3.5 bg-amber-950 hover:bg-amber-900"
                >
                  <ReceiptIcon className="size-3.5 mr-1 text-amber-400" />
                  <span>Portal Loket</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('/member')}
                  className="text-xs px-3.5 border-orange-200 bg-orange-50/60 hover:bg-orange-100/70 text-orange-950"
                >
                  <UserIcon className="size-3.5 mr-1 text-primary" />
                  <span>Area Member ({user?.name ? user.name.split(' ')[0] : 'Member'})</span>
                </Button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                title="Keluar dari Akun"
                className="size-8.5 rounded-xl border border-stone-200 text-stone-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Keluar"
              >
                <LogOutIcon className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/login')}
                className="text-xs px-3.5 font-semibold text-stone-700 hover:text-stone-950"
              >
                Masuk
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('/register')}
                className="text-xs px-4"
              >
                Daftar Akun
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="sm:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-stone-600 hover:text-stone-950 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label={mobileOpen ? 'Tutup navigasi' : 'Buka navigasi'}
          >
            {mobileOpen ? <XIcon className="size-5.5" /> : <MenuIcon className="size-5.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-stone-200/90 bg-white/98 backdrop-blur-md px-4 py-4 space-y-3 animate-page-enter">
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onNavigate(link.path);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${
                  currentPath === link.path
                    ? 'bg-orange-50 text-primary'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>{link.label}</span>
                <ArrowRightIcon className="size-4 text-stone-400" />
              </button>
            ))}
          </nav>

          <div className="pt-3 border-t border-stone-100 space-y-2">
            {isAuth ? (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-stone-50 rounded-xl flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {user?.name || 'Pengguna'}
                    </p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-wider font-mono">
                      Peran: {role}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setMobileOpen(false);
                      onNavigate(role === 'admin' ? '/admin' : role === 'operator' ? '/operator' : '/member');
                    }}
                    className="text-xs h-8 px-3"
                  >
                    Buka Dashboard
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-center text-xs text-red-700 hover:bg-red-50 border-red-200"
                >
                  <LogOutIcon className="size-3.5 mr-1.5" />
                  Keluar dari Sesi
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileOpen(false);
                    onNavigate('/login');
                  }}
                  className="w-full justify-center text-xs"
                >
                  Masuk
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setMobileOpen(false);
                    onNavigate('/register');
                  }}
                  className="w-full justify-center text-xs"
                >
                  Daftar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
