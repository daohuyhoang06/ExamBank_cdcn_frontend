import React, { forwardRef } from 'react';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'success' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {
  const baseClass =
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius-field)] border border-transparent font-semibold outline-none transition duration-200 active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2';

  const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[linear-gradient(180deg,var(--brand-600)_0%,var(--brand-700)_100%)] text-white shadow-[var(--shadow-brand)] enabled:hover:brightness-105',
    secondary:
      'bg-white text-[var(--ink-700)] border-[var(--line-soft)] enabled:hover:bg-[var(--bg-soft)]',
    ghost: 'bg-transparent text-[var(--brand-700)] enabled:hover:bg-[var(--brand-100)]/60',
    soft: 'bg-[var(--bg-soft)] text-[var(--ink-800)] border-[var(--line-soft)] enabled:hover:bg-[var(--brand-100)]',
    danger: 'bg-rose-100 text-rose-700 enabled:hover:bg-rose-200',
    success: 'bg-emerald-100 text-emerald-700 enabled:hover:bg-emerald-200',
    icon: 'bg-white text-[var(--ink-600)] border-[var(--line-soft)] enabled:hover:bg-[var(--bg-soft)]',
  };

  const sizeClass: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
    xl: 'h-[58px] px-6 text-base font-bold',
    icon: 'h-10 w-10 p-0',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      className={`${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {leftIcon ? <span className="inline-flex shrink-0">{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span className="inline-flex shrink-0">{rightIcon}</span> : null}
    </button>
  );
});

Button.displayName = 'Button';
