import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      {/* Modal Dialog Card */}
      <div
        className={cn(
          'relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-stone-200 shadow-2xl p-5 sm:p-6 z-10 flex flex-col animate-modal-enter',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3.5 shrink-0">
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

        <div className="pt-3 space-y-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
