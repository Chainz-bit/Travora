import { useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { XIcon } from './Icons';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={cn(
          'relative w-full max-w-lg max-h-[90dvh] bg-white rounded-2xl border border-stone-200 shadow-2xl p-5 sm:p-6 md:p-7 z-10 flex flex-col animate-modal-enter overflow-hidden',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 shrink-0">
          <div className="min-w-0 pr-2">
            <h2 id="modal-title" className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-950 truncate">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="size-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 shrink-0"
          >
            <XIcon className="size-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1 py-1 space-y-4">{children}</div>
      </div>
    </div>
  );
}

