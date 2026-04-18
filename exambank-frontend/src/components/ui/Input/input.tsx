import React, { useId } from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  inputWrapperClassName?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
};

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  className = '',
  containerClassName = '',
  labelClassName = '',
  inputClassName = '',
  inputWrapperClassName = '',
  startAdornment,
  endAdornment,
  ...props
}) => {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const hasAdornment = Boolean(startAdornment || endAdornment);

  return (
    <div className={`flex flex-col gap-2 ${containerClassName} ${className}`.trim()}>
      {label && (
        <label
          htmlFor={inputId}
          className={`font-[var(--font-label)] text-[0.82rem] font-bold tracking-[0.12em] text-[var(--ink-600)] ${labelClassName}`.trim()}
        >
          {label}
        </label>
      )}

      {hasAdornment ? (
        <div
          className={`flex items-center gap-3 rounded-[var(--radius-field)] border border-[var(--line-soft)] bg-[var(--bg-soft)] px-4 transition duration-200 focus-within:border-[var(--brand-500)] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(31,99,180,0.14)] motion-reduce:transition-none ${error ? 'border-rose-300 bg-rose-50/60 focus-within:shadow-[0_0_0_4px_rgba(244,63,94,0.16)]' : ''} ${inputWrapperClassName}`.trim()}
        >
          {startAdornment ? <span className="inline-flex shrink-0">{startAdornment}</span> : null}
          <input
            id={inputId}
            className={`h-12 w-full border-none bg-transparent text-base text-[var(--ink-900)] outline-none placeholder:text-[var(--ink-500)] disabled:cursor-not-allowed disabled:opacity-50 ${inputClassName}`.trim()}
            aria-invalid={Boolean(error)}
            {...props}
          />
          {endAdornment ? <span className="inline-flex shrink-0">{endAdornment}</span> : null}
        </div>
      ) : (
        <input
          id={inputId}
          className={`h-14 rounded-[var(--radius-field)] border border-transparent bg-[var(--bg-soft)] px-3.5 text-base text-[var(--ink-900)] outline-none transition duration-200 placeholder:text-[var(--ink-500)] focus:border-[var(--brand-500)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${error ? 'border-rose-300 bg-rose-50/60 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.16)]' : ''} ${inputClassName}`.trim()}
          aria-invalid={Boolean(error)}
          {...props}
        />
      )}

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {!error && hint ? <div className="text-sm text-[var(--ink-500)]">{hint}</div> : null}
    </div>
  );
};
