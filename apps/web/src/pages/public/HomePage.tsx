import { useState } from 'react';
import { SearchForm } from '../../features/schedule/components/SearchForm';
import {
  ShieldCheckIcon,
  ClockIcon,
  BusIcon,
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
} from '../../components/ui/Icons';
import type { SearchTicketFormValues } from '../../types';

export interface HomePageProps {
  onSearch: (values: SearchTicketFormValues) => void;
  onQuickRouteSelect?: (originId: string, destinationId: string) => void;
}

export function HomePage({ onSearch }: HomePageProps) {
  const [selectedRouteValues, setSelectedRouteValues] = useState<Partial<SearchTicketFormValues>>({
    originCityId: '101',
    destinationCityId: '201',
    departureDate: '2026-11-13',
  });

  const [notification, setNotification] = useState<string | null>(null);

  function handleSelectRoute(originId: string, destinationId: string, routeLabel: string) {
    setSelectedRouteValues({
      originCityId: originId,
      destinationCityId: destinationId,
    });
    setNotification(`Rute ${routeLabel} telah dipilih pada formulir pencarian.`);

    const el = document.getElementById('search-form-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }

  return (
    <div className="w-full flex flex-col font-sans">
      {/* =========================================================================
          HERO SECTION: REFINED EDITORIAL TRAVEL HERO
         ========================================================================= */}
      <section className="relative w-full bg-canvas-public border-b border-stone-200/90 pt-8 pb-14 lg:pt-14 lg:pb-20 overflow-hidden">
        {/* Subtle Decorative Background Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#1c1917_1px,transparent_1px)] bg-size-[24px_24px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Kolom Kiri: Headline & Elevated Search Card (7 cols) */}
            <div id="search-form-section" className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-800 text-xs font-semibold tracking-wide">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  <span>Transportasi Darat Antar-Kota Terjadwal</span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-stone-950 leading-[1.15]">
                  Perjalanan Antar-Kota Lebih Tenang & Terjadwal
                </h1>

                <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl">
                  Nikmati kemudahan bepergian point-to-point dengan jadwal pasti, armada terdata resmi, dan alur konfirmasi tiket yang tertib di setiap kota tujuan.
                </p>
              </div>

              {/* Notifikasi Pemilihan Rute */}
              {notification && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2.5 animate-toast-enter shadow-xs"
                >
                  <CheckIcon className="size-4 shrink-0 text-emerald-600" />
                  <span>{notification}</span>
                </div>
              )}

              {/* Elevated Search Card */}
              <div className="pt-1">
                <SearchForm
                  key={`${selectedRouteValues.originCityId}-${selectedRouteValues.destinationCityId}`}
                  initialValues={selectedRouteValues}
                  onSearch={onSearch}
                  className="border-stone-200/90 shadow-lg shadow-stone-900/5 bg-white/95"
                />
              </div>

              {/* Quick Trust Highlights under Search */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-center sm:text-left">
                <div className="border-l-2 border-stone-200 pl-3">
                  <p className="text-xs font-bold text-stone-900">Jadwal Pasti</p>
                  <p className="text-[11px] text-stone-500">Berangkat tepat waktu</p>
                </div>
                <div className="border-l-2 border-stone-200 pl-3">
                  <p className="text-xs font-bold text-stone-900">Armada Resmi</p>
                  <p className="text-[11px] text-stone-500">HiAce & Elf ber-AC</p>
                </div>
                <div className="border-l-2 border-stone-200 pl-3">
                  <p className="text-xs font-bold text-stone-900">Pilih Kursi</p>
                  <p className="text-[11px] text-stone-500">Bebas tentukan posisi</p>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Editorial Photography & Travel Vignette (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4 mt-2 lg:mt-0">
              <div className="relative rounded-2xl overflow-hidden border border-stone-200/90 shadow-xl shadow-stone-900/5 bg-stone-100 group">
                <div className="relative aspect-4/3 sm:aspect-16/11 w-full overflow-hidden">
                  <img
                    src="/hero-travel.jpg"
                    alt="Panorama perjalanan darat antar-kota di Pulau Jawa"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-stone-950/80 via-stone-950/20 to-transparent flex flex-col justify-between p-5">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest font-semibold bg-stone-900/80 backdrop-blur-md text-amber-200 border border-stone-700/60">
                        <SparklesIcon className="size-3 text-amber-300" />
                        Koridor Utama Jawa
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="font-serif text-lg font-bold text-white drop-shadow-sm leading-snug">
                        Menghubungkan Kota Utama dengan Nyaman
                      </p>
                      <p className="text-xs text-stone-300 font-sans">
                        Rute Bandung, Jakarta, Yogyakarta, Semarang, dan Surabaya
                      </p>
                    </div>
                  </div>
                </div>

                {/* Editorial Details Strip */}
                <div className="p-4 bg-white grid grid-cols-2 gap-3 border-t border-stone-100 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                      Kenyamanan Kabin
                    </span>
                    <span className="font-semibold text-stone-800">
                      Kursi Reclining & Charger
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                      Verifikasi Tiket
                    </span>
                    <span className="font-semibold text-stone-800">
                      Loket Resmi Keberangkatan
                    </span>
                  </div>
                </div>
              </div>

              {/* Photo Attribution Footer */}
              <p className="text-[11px] text-stone-500 text-right px-1">
                Foto perjalanan oleh{' '}
                <a
                  href="https://unsplash.com/photos/an-empty-road-in-the-middle-of-a-forest-4jUOijefE1g"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-stone-800"
                >
                  Found New Path
                </a>{' '}
                (Unsplash)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: RUTE POPULER (VARIED EDITORIAL COMPOSITION)
         ========================================================================= */}
      <section className="w-full bg-white py-16 border-b border-stone-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <span className="text-xs uppercase tracking-widest font-semibold text-primary">
                Jalur Perjalanan Favorit
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
                Pilihan Rute Paling Sering Ditempuh
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Pilih koridor di bawah ini untuk langsung mengisi formulir pencarian dengan waktu keberangkatan terdekat.
              </p>
            </div>

            <div className="text-xs font-mono text-stone-500">
              <span>Tersedia Armada Pagi, Siang & Malam</span>
            </div>
          </div>

          {/* Varied Grid: 1 Featured Card (Full Col) + 3 Compact Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Featured Route Card: Bandung - Jakarta (5 cols) */}
            <div className="lg:col-span-5 bg-canvas-public border border-orange-200/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover-editorial-lift relative overflow-hidden group">
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-orange-100 text-primary text-[11px] font-mono font-bold tracking-wider">
                    JALUR UTAMA • BDG ⇄ JKT
                  </span>
                  <span className="text-xs text-stone-500">Setiap 60 Menit</span>
                </div>

                <div>
                  <h3 className="font-serif text-2xl font-bold text-stone-950">
                    Bandung — Jakarta
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Koridor paling populer via Tol Cipularang. Titik kumpul Pasteur dan Dipatiukur menuju Semanggi, Tebet, dan Bandara Soekarno-Hatta.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-4 text-xs text-stone-700">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="size-3.5 text-primary" /> ± 2.5 - 3 Jam
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BusIcon className="size-3.5 text-primary" /> Toyota HiAce
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-orange-200/60 flex items-center justify-between mt-4 relative z-10">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">
                    Tarif Mulai
                  </span>
                  <span className="font-serif text-xl font-bold text-stone-950">
                    Rp 120.000
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectRoute('101', '201', 'Bandung — Jakarta')}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                >
                  Pilih Rute Ini <ArrowRightIcon className="size-3.5" />
                </button>
              </div>
            </div>

            {/* 3 Supporting Cards (7 cols: 3 cards stacked or sub-grid) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 2: Jakarta - Bandung */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col justify-between hover-editorial-lift">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-stone-500 font-semibold block">
                    JKT ⇄ BDG
                  </span>
                  <h3 className="font-serif text-base font-bold text-stone-950">
                    Jakarta — Bandung
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Akses cepat dari pusat kota Jakarta menuju Kota Kembang setiap jam.
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[10px] text-stone-500 block font-mono">Tarif</span>
                    <span className="text-sm font-bold text-stone-900">Rp 120.000</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectRoute('102', '202', 'Jakarta — Bandung')}
                    className="size-8 rounded-lg bg-stone-100 hover:bg-primary hover:text-white text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                    title="Pilih rute Jakarta - Bandung"
                  >
                    <ArrowRightIcon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Card 3: Bandung - Yogyakarta */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col justify-between hover-editorial-lift">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-stone-500 font-semibold block">
                    BDG ⇄ YGY
                  </span>
                  <h3 className="font-serif text-base font-bold text-stone-950">
                    Bandung — Yogyakarta
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Perjalanan lintas provinsi Jawa Barat ke D.I. Yogyakarta dengan armada malam.
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[10px] text-stone-500 block font-mono">Tarif</span>
                    <span className="text-sm font-bold text-stone-900">Rp 230.000</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectRoute('101', '204', 'Bandung — Yogyakarta')}
                    className="size-8 rounded-lg bg-stone-100 hover:bg-primary hover:text-white text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                    title="Pilih rute Bandung - Yogyakarta"
                  >
                    <ArrowRightIcon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Card 4: Yogyakarta - Surabaya */}
              <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col justify-between hover-editorial-lift">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-stone-500 font-semibold block">
                    YGY ⇄ SBY
                  </span>
                  <h3 className="font-serif text-base font-bold text-stone-950">
                    Yogyakarta — Surabaya
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Koneksi cepat Jawa Tengah menuju Jawa Timur via Tol Trans Jawa.
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[10px] text-stone-500 block font-mono">Tarif</span>
                    <span className="text-sm font-bold text-stone-900">Rp 180.000</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectRoute('103', '203', 'Yogyakarta — Surabaya')}
                    className="size-8 rounded-lg bg-stone-100 hover:bg-primary hover:text-white text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                    title="Pilih rute Yogyakarta - Surabaya"
                  >
                    <ArrowRightIcon className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: STANDAR OPERASIONAL TRAVORA (EDITORIAL EDITORIAL LAYOUT)
         ========================================================================= */}
      <section className="w-full bg-canvas-public py-18 border-b border-stone-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs uppercase tracking-widest font-semibold text-primary">
              Prinsip Layanan
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-950">
              Standar Operasional Travora
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Tiga komitmen utama yang kami terapkan di setiap rute untuk menghadirkan pengalaman perjalanan yang teratur, nyaman, dan bertanggung jawab.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Standar 1 */}
            <div className="space-y-4">
              <span className="font-serif text-3xl font-bold text-primary/40 block">
                01.
              </span>
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-bold text-stone-950">
                  Informasi Jadwal Jelas & Pasti
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Semua waktu keberangkatan, kota asal, dan kota tujuan bersumber langsung dari sistem jadwal aktif. Penumpang mendapatkan kepastian jadwal tanpa informasi simpang siur.
                </p>
              </div>
              <div className="pt-2 text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                <ClockIcon className="size-4 text-primary" />
                <span>Ketepatan Waktu Terpantau</span>
              </div>
            </div>

            {/* Standar 2 */}
            <div className="space-y-4">
              <span className="font-serif text-3xl font-bold text-primary/40 block">
                02.
              </span>
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-bold text-stone-950">
                  Armada Resmi & Kursi Terjamin
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Identitas kendaraan, nomor plat, dan kapasitas kursi tertera secara transparan. Setiap penumpang memilih nomor kursi yang pasti sehingga tidak terjadi tumpang tindih kursi di armada.
                </p>
              </div>
              <div className="pt-2 text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                <BusIcon className="size-4 text-primary" />
                <span>Toyota HiAce & Isuzu Elf</span>
              </div>
            </div>

            {/* Standar 3 */}
            <div className="space-y-4">
              <span className="font-serif text-3xl font-bold text-primary/40 block">
                03.
              </span>
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-bold text-stone-950">
                  Verifikasi Tertib & Layanan Keluhan
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Bukti transfer diverifikasi secara cermat oleh petugas loket resmi. Jika terdapat kendala selama perjalanan, kanal pengaduan langsung tersambung ke meja administrator.
                </p>
              </div>
              <div className="pt-2 text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                <ShieldCheckIcon className="size-4 text-primary" />
                <span>Pelayanan Penumpang 100% Resmi</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
