import type { RoutePath } from '../../hooks/useRouter';
import { BusIcon } from '../ui/Icons';

export interface FooterProps {
  onNavigate?: (path: RoutePath) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="w-full bg-text-main text-stone-300 border-t border-stone-800 mt-auto font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Kolom 1: Brand & Filosofi Layanan (5 cols) */}
          <div className="space-y-4 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
                <BusIcon className="size-4.5" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-white">
                TRAVORA
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              Layanan transportasi darat antar-kota terpadu yang menghubungkan kota-kota utama dengan jadwal pasti, informasi armada transparan, dan kenyamanan pemesanan tiket yang tertib.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-stone-400">
              <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sistem Operasional Tiket Aktif 24/7</span>
            </div>
          </div>

          {/* Kolom 2: Rute Populer (2 cols) */}
          <div className="space-y-3.5 md:col-span-2">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-stone-200">
              Rute Populer
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>Bandung — Jakarta</li>
              <li>Jakarta — Bandung</li>
              <li>Bandung — Yogyakarta</li>
              <li>Yogyakarta — Surabaya</li>
              <li>Semarang — Surabaya</li>
            </ul>
          </div>

          {/* Kolom 3: Layanan Penumpang (2 cols) */}
          <div className="space-y-3.5 md:col-span-2">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-stone-200">
              Layanan
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>Pencarian Jadwal Real-time</li>
              <li>Pemilihan Nomor Kursi</li>
              <li>Konfirmasi Pembayaran Transfer</li>
              <li>Pusat Bantuan & Pengaduan</li>
            </ul>
          </div>

          {/* Kolom 4: Akses Cepat Portal (3 cols) */}
          <div className="space-y-3.5 md:col-span-3">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-stone-200">
              Akses Portal Pengguna
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('/member')}
                  className="hover:text-white transition-colors text-left cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-primary font-bold">›</span> Area Member (Penumpang)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('/admin/login')}
                  className="hover:text-white transition-colors text-left cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-stone-500">›</span> Portal Administrator
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.('/operator/login')}
                  className="hover:text-white transition-colors text-left cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-stone-500">›</span> Portal Pengelola Loket
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-stone-800/80 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p>© 2026 TRAVORA Transportasi Antar-Kota. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-4 text-[11px] font-sans text-stone-400">
            <span>Privasi & Kebijakan</span>
            <span>•</span>
            <span>Ketentuan Layanan</span>
            <span>•</span>
            <span className="font-mono text-stone-400">v2.1 Editorial</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
