import { useMemo, useState } from "react";
import { CircleAlert, Save } from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Card } from "@/components/ui/Card/card";
import { Input } from "@/components/ui/Input/input";
import { StatCard } from "@/components/ui/StatCard/stat-card";
import { rubricRows } from "@/features/moderator/mocks/moderator.mock";

export default function ModeratorGradingPage() {
  const [scores, setScores] = useState<Record<string, number>>({
    structure: 1.5,
    accuracy: 2.25,
    method: 2.5,
    presentation: 1.25,
  });

  const total = useMemo(() => {
    const point = rubricRows.reduce((sum, row) => sum + (scores[row.key] ?? 0), 0);
    return Math.round(point * 100) / 100;
  }, [scores]);

  function onScoreChange(key: string, max: number, value: string) {
    const parsed = Number(value);
    const next = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(max, parsed));
    setScores((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Bài đang chấm" value={3} subtitle="Đã nhận rubric" cardClassName="rounded-2xl" />
        <StatCard title="Tổng điểm tạm" value={`${total.toFixed(2)} / 10`} subtitle="Auto clamp theo max từng tiêu chí" cardClassName="rounded-2xl" valueClassName="text-[var(--brand-700)] text-2xl" />
        <StatCard title="SLA còn lại" value="02:14:32" subtitle="Phiên chấm hiện tại" cardClassName="rounded-2xl" />
        <StatCard title="Độ tin cậy" value="96%" subtitle="Theo lịch sử nhất quán" cardClassName="rounded-2xl" valueClassName="text-emerald-700" />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-2xl" title="Rubric chấm tự luận" subtitle="Nhập điểm theo từng tiêu chí, hệ thống tự chặn vượt barem">
          <div className="space-y-3">
            {rubricRows.map((row) => (
              <div key={row.key} className="grid grid-cols-[1fr_9rem] items-center gap-3 rounded-xl border border-[var(--line-soft)] p-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-900)]">{row.label}</p>
                  <p className="text-xs text-[var(--ink-600)]">Tối đa {row.max.toFixed(2)} điểm</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={row.max}
                  step={0.25}
                  value={scores[row.key] ?? 0}
                  onChange={(event) => onScoreChange(row.key, row.max, event.target.value)}
                  inputClassName="h-10 text-right text-sm"
                  containerClassName="gap-0"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl" title="Nhận xét chi tiết" subtitle="Đưa phản hồi cụ thể theo rubric để tăng tính minh bạch">
          <textarea
            className="h-60 w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none"
            defaultValue="Bài làm có hướng giải đúng nhưng thiếu bước biến đổi quan trọng tại đoạn suy luận từ giả thiết sang kết luận."
          />
          <div className="mt-3 rounded-xl border border-[var(--line-soft)] bg-[var(--bg-soft)] p-3">
            <p className="inline-flex items-center gap-2 text-xs text-[var(--ink-600)]">
              <CircleAlert size={13} /> Lưu ý: có 1 đoạn chưa thống nhất đơn vị đo giữa đáp án và nhận xét.
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary">Lưu nháp</Button>
            <Button variant="primary" leftIcon={<Save size={14} />}>
              Lưu kết quả chấm
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
