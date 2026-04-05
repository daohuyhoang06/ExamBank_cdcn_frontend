import React from 'react';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  bodyClassName?: string;
  headerClassName?: string;
  variant?: 'default' | 'soft' | 'outline' | 'brandTint' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  footer,
  children,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  variant = 'default',
  padding = 'md',
  ...props
}) => {
  const variantClass: Record<NonNullable<CardProps['variant']>, string> = {
    default: 'border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]',
    soft: 'border border-[var(--line-soft)] bg-[var(--bg-soft)] shadow-[var(--shadow-soft)]',
    outline: 'border border-[var(--line-soft)] bg-transparent',
    brandTint: 'border border-[var(--brand-100)] bg-[var(--brand-100)]/35',
    glass: 'border border-white/30 bg-white/70 backdrop-blur-md',
  };

  const paddingClass: Record<NonNullable<CardProps['padding']>, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-8',
  };

  return (
    <div
      className={`overflow-hidden rounded-3xl ${variantClass[variant]} ${paddingClass[padding]} ${className}`.trim()}
      {...props}
    >
      {title ? (
        <div className={headerClassName}>
          <h3 className="font-[var(--font-label)] text-lg font-bold text-[var(--ink-900)]">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-[var(--ink-600)]">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
};
