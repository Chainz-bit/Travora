import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TableScrollContainerProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string; // e.g. 'max-h-[420px]' or 'max-h-[500px]'
  header?: ReactNode; // Optional top header / toolbar outside the scroll area
  footer?: ReactNode; // Optional bottom footer / pagination outside the scroll area
}

/**
 * TableScrollContainer
 * Menyediakan scroll container khusus untuk tabel panjang dashboard:
 * - Scroll vertikal independen (tidak memanjangkan seluruh halaman)
 * - Scroll horizontal aman untuk viewport tablet / mobile (tidak merusak shell dashboard)
 * - Header tabel tetap sticky di bagian atas container (sticky top-0 z-10)
 * - Menjaga tombol aksi dan konten tabel tetap terlihat utuh
 */
export function TableScrollContainer({
  children,
  className,
  maxHeight = 'max-h-[460px] md:max-h-[520px]',
  header,
  footer,
}: TableScrollContainerProps) {
  return (
    <div
      className={cn(
        'w-full bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden flex flex-col',
        className
      )}
    >
      {/* Optional Sticky Header Bar (Title, Search, Action Button) */}
      {header && <div className="shrink-0">{header}</div>}

      {/* Internal Scroll Area for Table */}
      <div
        className={cn(
          'w-full overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-stone-200 hover:scrollbar-thumb-stone-300 min-h-0 flex-1',
          maxHeight
        )}
      >
        {children}
      </div>

      {/* Optional Sticky Footer Bar (Summary, Pagination) */}
      {footer && <div className="shrink-0 border-t border-stone-100 bg-stone-50/70">{footer}</div>}
    </div>
  );
}

