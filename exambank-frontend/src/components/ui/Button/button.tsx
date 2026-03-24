import React from 'react';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'inverted' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseClass =
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius-field)] border border-transparent font-[var(--font-label)] font-semibold uppercase tracking-[0.06em] outline-none transition duration-200 active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-100 disabled:shadow-none disabled:bg-[var(--surface-dim)] disabled:text-[rgba(16,21,38,0.52)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2';

  const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-[var(--hero-gradient)] text-[var(--on-primary)] enabled:hover:shadow-[inset_0_0_0_999px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.18)]',
    secondary: 'bg-transparent text-[var(--on-surface)] shadow-[inset_0_0_0_1px_rgba(95,103,130,0.2)] enabled:hover:bg-[var(--surface-container-low)]',
    tertiary: 'bg-transparent px-1 text-[var(--primary)] enabled:hover:text-[var(--primary-container)]',
    danger: 'bg-[#c81e1e] text-white',
    success: 'bg-[#0f7a4f] text-[#f5fff9]',
    inverted: 'bg-[#1f2937] text-[#f4f7fb] enabled:hover:shadow-[inset_0_0_0_999px_rgba(255,255,255,0.06)]',
    outlined: 'bg-transparent text-[#2a3344] shadow-[inset_0_0_0_1px_rgba(75,85,99,0.25)] enabled:hover:bg-[rgba(238,242,248,0.9)]',
  };

  const sizeClass: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'px-3 py-2 text-[var(--label-sm)]',
    md: 'px-4 py-2.5 text-[var(--label-md)]',
    lg: 'px-5 py-3 text-[0.88rem]',
  };

  return (
    <button
      className={`${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};
