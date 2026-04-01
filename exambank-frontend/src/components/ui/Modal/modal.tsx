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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(17,24,39,0.26)] p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative min-w-[min(320px,92vw)] max-w-[90vw] rounded-xl border border-[#d8dee8] bg-white p-6 shadow-[0_24px_48px_rgba(15,23,42,0.18)]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {title ? (
          <div id={titleId} className="mb-1 pr-10 font-[var(--font-label)] text-3xl font-black tracking-tight text-[var(--brand-700)]">
            {title}
          </div>
        ) : null}
        <div className="mb-6">{children}</div>
        <button
          className="absolute right-3 top-3 h-8 w-8 cursor-pointer rounded-md border-none bg-transparent text-[1.5rem] leading-none text-[#6b7280] transition duration-200 hover:bg-[#eef2f7] hover:text-[var(--brand-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 motion-reduce:transition-none"
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
