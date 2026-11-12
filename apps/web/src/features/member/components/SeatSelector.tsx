import { useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { mockSeatAvailabilityService } from '../services/mockSeatAvailabilityService';
import { CheckIcon, InfoIcon } from '../../../components/ui/Icons';

export interface SeatSelectorProps {
  scheduleId: string;
  selectedSeat: string;
  onSelectSeat: (seatNumber: string) => void;
  className?: string;
}

export function SeatSelector({
  scheduleId,
  selectedSeat,
  onSelectSeat,
  className,
}: SeatSelectorProps) {
  const seats = useMemo(() => {
    return mockSeatAvailabilityService.getSeatsForSchedule(scheduleId);
  }, [scheduleId]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200/80 pb-3">
        <div>
          <h3 className="font-sans text-sm font-semibold text-stone-900">
            Pilihan Nomor Kursi
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Pilih satu nomor kursi preferensi Anda untuk keberangkatan.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-stone-600">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3.5 rounded-md border border-stone-300 bg-white shadow-2xs" />
            <span>Tersedia</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3.5 rounded-md border border-primary bg-primary shadow-xs" />
            <span>Dipilih</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-3.5 rounded-md border border-stone-200 bg-stone-100" />
            <span>Terisi</span>
          </div>
        </div>
      </div>

      {/* Button Grid List */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2.5">
        {seats.map((seat) => {
          const isSelected = selectedSeat === seat.seatNumber;
          const isAvailable = seat.isAvailable;

          let seatStyle = '';
          if (isSelected) {
            seatStyle =
              'border-primary bg-primary text-white shadow-sm font-semibold ring-2 ring-primary/20';
          } else if (isAvailable) {
            seatStyle =
              'border-stone-300 bg-white text-stone-900 hover:border-primary hover:bg-primary/5 active:scale-95 shadow-2xs';
          } else {
            seatStyle =
              'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed';
          }

          return (
            <button
              key={seat.seatNumber}
              type="button"
              disabled={!isAvailable}
              onClick={() => {
                if (isAvailable) {
                  onSelectSeat(seat.seatNumber);
                }
              }}
              className={cn(
                'relative flex flex-col items-center justify-center h-14 rounded-xl border transition-all text-sm font-medium cursor-pointer',
                seatStyle
              )}
              aria-label={`Kursi nomor ${seat.seatNumber} ${isSelected ? '(Dipilih)' : isAvailable ? '(Tersedia)' : '(Sudah Terisi)'}`}
            >
              <span className="font-mono text-[10px] text-stone-400">No.</span>
              <span className="font-mono text-base font-bold tabular-nums">
                {seat.seatNumber}
              </span>
              {isSelected && (
                <span className="absolute top-1 right-1">
                  <CheckIcon className="size-3 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection Feedback */}
      <div className="rounded-xl bg-orange-50/70 border border-orange-200/80 p-3.5 text-xs text-orange-950 flex items-start gap-2.5">
        <InfoIcon className="size-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-orange-950">
            {selectedSeat ? (
              <>
                Kursi terpilih: <span className="font-mono font-bold text-primary">Nomor {selectedSeat}</span>
              </>
            ) : (
              'Silakan tentukan salah satu nomor kursi yang tersedia di atas.'
            )}
          </p>
          <p className="text-orange-900 leading-relaxed text-[11px]">
            Nomor kursi yang dipilih akan tertera langsung pada e-tiket dan manifes keberangkatan armada.
          </p>
        </div>
      </div>
    </div>
  );
}

