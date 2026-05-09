import React from 'react';
import { Card } from '@/components/ui/Card/card';

type StatCardLayout = 'stacked' | 'inline-title';

type StatCardProps = {
  title: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  layout?: StatCardLayout;
  cardClassName?: string;
  iconWrapClassName?: string;
  badgeClassName?: string;
  titleClassName?: string;
  valueClassName?: string;
  subtitleClassName?: string;
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  layout = 'stacked',
  cardClassName = '',
  iconWrapClassName = '',
  badgeClassName = '',
  titleClassName = '',
  valueClassName = '',
  subtitleClassName = '',
}: StatCardProps) {
  return (
    <Card
      variant="default"
      padding="md"
      className={`rounded-2xl transition duration-200 hover:-translate-y-0.5 ${cardClassName}`.trim()}
    >
      <div className={`mb-4 flex items-start justify-between gap-2 ${layout === 'inline-title' ? 'items-center' : ''}`}>
        {layout === 'inline-title' ? (
          <p className={`text-sm font-semibold text-[var(--ink-600)] ${titleClassName}`.trim()}>{title}</p>
        ) : null}

        {icon ? (
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconWrapClassName}`.trim()}
          >
            {icon}
          </span>
        ) : null}

        {badge ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassName}`.trim()}>
            {badge}
          </span>
        ) : null}
      </div>

      {layout === 'stacked' ? (
        <div className={`text-sm text-[var(--ink-600)] ${titleClassName}`.trim()}>{title}</div>
      ) : null}

      <div className={`mt-1 text-3xl font-extrabold leading-none ${valueClassName}`.trim()}>{value}</div>
      {subtitle ? <div className={`mt-1 text-xs text-[var(--ink-500)] ${subtitleClassName}`.trim()}>{subtitle}</div> : null}
    </Card>
  );
}
