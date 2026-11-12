import { Button } from '../../../components/ui/Button';
import { ClockIcon, BusIcon, MapPinIcon, ArrowRightIcon } from '../../../components/ui/Icons';
import { formatCurrency } from '../../../lib/utils';
import type { ScheduleViewModel } from '../../../types/index';

export interface ScheduleCardProps {
  schedule: ScheduleViewModel;
  onSelectTicket: (schedule: ScheduleViewModel) => void;
}

export function ScheduleCard({ schedule, onSelectTicket }: ScheduleCardProps) {
  return (
    <article className="w-full bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-stone-300 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6 hover-editorial-lift">
      {/* Kolom Kiri: Waktu, Rute, dan Kendaraan */}
      <div className="flex-1 space-y-3.5">
        {/* Baris Atas: Jam Keberangkatan & Plat Nomor */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-50/90 border border-orange-200/80 text-orange-950 font-bold font-mono text-sm">
            <ClockIcon className="size-4 text-primary" />
            <span>{schedule.departureTime}</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200/80 text-xs font-mono font-medium text-stone-700">
            <span>{schedule.vehiclePlate}</span>
          </div>

          {typeof schedule.availableSeats === 'number' && (
            <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Sisa {schedule.availableSeats} Kursi
            </span>
          )}
        </div>

        {/* Baris Tengah: Rute Perjalanan */}
        <div className="flex items-center gap-2 text-base sm:text-lg font-bold font-serif text-stone-950">
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="size-4 text-primary" />
            {schedule.originCityName}
          </span>
          <span className="text-stone-300 mx-1">→</span>
          <span className="flex items-center gap-1.5">
            <MapPinIcon className="size-4 text-slate-800" />
            {schedule.destinationCityName}
          </span>
        </div>

        {/* Baris Bawah: Armada Kendaraan */}
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <BusIcon className="size-4 text-stone-400" />
          <span>Armada: {schedule.vehicleName}</span>
          <span>•</span>
          <span className="text-emerald-700 font-medium">Point-to-Point Terjadwal</span>
        </div>
      </div>

      {/* Kolom Kanan: Tarif & Aksi */}
      <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
        <div className="text-left md:text-right">
          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block">
            Tarif per Penumpang
          </span>
          <span className="text-xl sm:text-2xl font-bold font-serif text-stone-950 tabular-nums">
            {formatCurrency(schedule.price)}
          </span>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => onSelectTicket(schedule)}
          rightIcon={<ArrowRightIcon className="size-4" />}
          className="px-5 whitespace-nowrap text-xs sm:text-sm font-semibold"
        >
          Pilih Tiket
        </Button>
      </div>
    </article>
  );
}

