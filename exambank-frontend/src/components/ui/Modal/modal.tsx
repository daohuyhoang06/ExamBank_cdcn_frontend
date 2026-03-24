import React, { useEffect, useId } from 'react';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(16,21,38,0.22)] p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="relative min-w-[min(320px,92vw)] max-w-[90vw] rounded-[var(--radius-lg)] border border-[rgba(95,103,130,0.2)] bg-[var(--glass-surface)] p-8 shadow-[var(--ambient-shadow)] backdrop-blur-[12px]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {title && <div id={titleId} className="mb-4 font-[var(--font-display)] text-[1.6rem] font-bold text-[var(--on-surface)]">{title}</div>}
        <div className="mb-6">{children}</div>
        <button
          className="absolute right-2 top-2 h-8 w-8 cursor-pointer rounded-[var(--radius-sm)] border-none bg-transparent text-[1.8rem] leading-none text-[var(--on-surface-variant)] transition duration-200 hover:bg-[var(--surface-container-low)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 motion-reduce:transition-none"
          onClick={onClose}
          type="button"
          aria-label="Đóng hộp thoại"
        >
          &times;
        </button>
      </div>
    </div>
  );
};
