import { useState, useEffect, type ReactNode } from 'react';
import type { RoutePath } from '../../../hooks/useRouter';
import { authService } from '../../auth/services/authService';
import {
  LayoutDashboardIcon,
  ReceiptIcon,
  CheckCircle2Icon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  BusIcon,
  UserIcon,
} from '../../../components/ui/Icons';
import { cn } from '../../../lib/utils';

export interface OperatorLayoutProps {
  currentPath: RoutePath;
  onNavigate: (path: RoutePath) => void;
  children: ReactNode;
  pageTitle?: string;
}

export function OperatorLayout({
  currentPath,
  onNavigate,
  children,
  pageTitle,
}: OperatorLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = authService.getCurrentUser();

  // Kunci scroll background saat mobile drawer terbuka
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await authService.logout();
    onNavigate('/login');
  };

  const navItems: { label: string; path: RoutePath; icon: typeof LayoutDashboardIcon }[] = [
    { label: 'Dashboard Operator', path: '/operator', icon: LayoutDashboardIcon },
    { label: 'Verifikasi Transfer', path: '/operator/confirmations', icon: ReceiptIcon },
    { label: 'Validasi Keberangkatan', path: '/operator/validation', icon: CheckCircle2Icon },
  ];

  return (
    <div className="h-dvh w-full bg-canvas-dashboard text-stone-900 flex flex-col md:flex-row overflow-hidden font-sans">
      {/* =====================================================================
          MOBILE HEADER (Sticky Top Bar on Mobile Viewports < 768px)
         ===================================================================== */}
      <header className="md:hidden w-full bg-white border-b border-stone-200/90 shrink-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            title="Kembali ke Beranda Publik (Sesi Tetap Aktif)"
            aria-label="Kembali ke Beranda Travora"
            className="flex items-center gap-2.5 text-left group cursor-pointer rounded-xl p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
          >
            <div className="size-8.5 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs group-hover:bg-primary-hover transition-colors shrink-0">
              <BusIcon className="size-4.5" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold text-stone-950 block leading-tight group-hover:text-primary transition-colors">
                TRAVORA
              </span>
              <span className="text-[9px] uppercase tracking-wider font-semibold text-primary block">
                Operator Loket
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Buka menu navigasi operator"
          >
            {mobileMenuOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </header>

      {/* =====================================================================
          MOBILE DRAWER & BACKDROP (Slide-Over Drawer on Mobile)
         ===================================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-modal-enter">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-950/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 border-r border-stone-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  onNavigate('/');
                  setMobileMenuOpen(false);
                }}
                title="Kembali ke Beranda Publik (Sesi Tetap Aktif)"
                aria-label="Kembali ke Beranda Travora"
                className="flex items-center gap-2.5 text-left group cursor-pointer rounded-xl p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
              >
                <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white group-hover:bg-primary-hover transition-colors shrink-0">
                  <BusIcon className="size-4" />
                </div>
                <div>
                  <span className="font-serif text-lg font-bold text-stone-950 block leading-tight group-hover:text-primary transition-colors">
                    TRAVORA
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-primary block">
                    Operator Loket
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Tutup menu"
              >
                <XIcon className="size-4.5" />
              </button>
            </div>

            {/* User Profile Card inside Drawer */}
            <div className="p-3 bg-stone-50/80 mx-3 mt-3 rounded-xl flex items-center gap-2.5 border border-stone-200/70 shrink-0">
              <div className="size-8.5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs shrink-0">
                <UserIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {user?.name || 'Ahmad Hidayat'}
                </p>
                <p className="text-[10px] text-amber-800 font-semibold uppercase tracking-wider font-mono">
                  Operator Loket
                </p>
              </div>
            </div>

            {/* Nav Items Scrollable */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
              <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400">
                Operasional Loket
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                return (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() => {
                      onNavigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left cursor-pointer',
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-50'
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Logout pinned at bottom */}
            <div className="p-3 border-t border-stone-200/80 shrink-0 bg-stone-50/50">
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOutIcon className="size-4 shrink-0" />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DESKTOP SIDEBAR (Fixed 100dvh, w-64, Never Scrolls Away)
         ===================================================================== */}
      <aside className="hidden md:flex flex-col w-64 lg:w-66 h-full bg-white border-r border-stone-200/90 shrink-0 select-none z-20 overflow-hidden">
        {/* Brand */}
        <div className="p-5 border-b border-stone-100 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            title="Kembali ke Beranda Publik (Sesi Tetap Aktif)"
            aria-label="Kembali ke Beranda Travora"
            className="flex items-center gap-2.5 text-left group cursor-pointer rounded-xl p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
          >
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs group-hover:bg-primary-hover transition-colors shrink-0">
              <BusIcon className="size-5" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-stone-950 block leading-tight group-hover:text-primary transition-colors">
                TRAVORA
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary block mt-0.5">
                Petugas Loket
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto min-h-0 scrollbar-thin">
          <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400">
            Operasional Loket
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                type="button"
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer',
                  isActive
                    ? 'bg-primary text-white shadow-xs shadow-orange-950/10'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-50'
                )}
              >
                <Icon className={cn('size-4 shrink-0', isActive ? 'text-white' : 'text-stone-400')} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Card & Logout (Pinned at Bottom) */}
        <div className="p-3.5 border-t border-stone-100 bg-stone-50/70 shrink-0 mt-auto">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="size-8.5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs shrink-0">
              <UserIcon className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-stone-900 truncate">
                {user?.name || 'Ahmad Hidayat'}
              </p>
              <p className="text-[10px] text-amber-800 font-semibold uppercase tracking-wider">
                Operator Loket
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-red-700 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOutIcon className="size-3.5 shrink-0" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          MAIN VIEWPORT SHELL (Right Side: Independent Smooth Vertical Scroll)
         ===================================================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 focus:outline-none scrollbar-thin scrollbar-thumb-stone-200 hover:scrollbar-thumb-stone-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
            {pageTitle && (
              <div className="shrink-0 mb-2">
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 tracking-tight">
                  {pageTitle}
                </h1>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
