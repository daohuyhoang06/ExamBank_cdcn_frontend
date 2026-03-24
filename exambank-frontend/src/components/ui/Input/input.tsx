import React, { useId } from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;

  return (
    <div className={`mb-6 flex flex-col gap-2 ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="font-[var(--font-label)] text-[var(--label-md)] font-semibold uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`rounded-[var(--radius-field)] border border-transparent px-3.5 pb-[0.65rem] pt-3.5 font-[var(--font-body)] text-[var(--body-md)] text-[var(--on-surface)] outline-none transition duration-200 focus:border-[var(--brand-500)] focus:bg-[var(--surface-bright)] focus:ring-2 focus:ring-[var(--brand-100)] disabled:cursor-not-allowed disabled:bg-[var(--surface-dim)] disabled:text-[rgba(16,21,38,0.5)] motion-reduce:transition-none ${error ? 'bg-[var(--error-container)] ring-1 ring-[var(--error)]' : 'bg-[var(--surface-container-lowest)] shadow-[inset_0_-1px_0_rgba(95,103,130,0.2)]'}`.trim()}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <div className="mt-0.5 text-[var(--label-sm)] text-[var(--error)]">{error}</div>}
    </div>
  );
};
