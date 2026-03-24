import React from 'react';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  footer?: React.ReactNode;
};

export const Card: React.FC<CardProps> = ({ title, footer, children, className = '', ...props }) => {
  return (
    <div
      className={`relative mb-8 flex flex-col gap-4 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-container-low)] p-6 before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(132deg,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_44%)] before:content-[''] ${className}`.trim()}
      {...props}
    >
      {title && <div className="mb-2 font-[var(--font-display)] text-[1.45rem] font-bold text-[var(--on-surface)]">{title}</div>}
      <div className="z-10 flex-1 rounded-[calc(var(--radius-lg)-0.25rem)] bg-[var(--surface-container-lowest)] p-6">{children}</div>
      {footer && <div className="mt-4 rounded-[calc(var(--radius-lg)-0.25rem)] bg-[var(--surface-container-lowest)] p-4 text-right">{footer}</div>}
    </div>
  );
};
