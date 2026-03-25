type Props = {
  title: string;
  description: string;
};

export default function AdminModulePage({ title, description }: Props) {
  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)]">
      <p className="font-[var(--font-label)] text-xs uppercase tracking-[0.12em] text-[var(--brand-600)]">
        Module
      </p>
      <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm text-[var(--ink-600)]">{description}</p>
      <p className="mt-4 text-sm text-[var(--ink-500)]">
        Trang này là điểm đến điều hướng từ dashboard tổng quan.
      </p>
    </section>
  );
}
