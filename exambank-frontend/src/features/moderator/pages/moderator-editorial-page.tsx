import { useState } from "react";
import { Save, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Card } from "@/components/ui/Card/card";
import { editorialTemplate } from "@/features/moderator/mocks/moderator.mock";

export default function ModeratorEditorialPage() {
  const [body, setBody] = useState(editorialTemplate);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card
        className="rounded-2xl"
        title="Editorial Studio"
        subtitle="Soạn editorial bằng Markdown/LaTeX, hỗ trợ bản nháp và gửi duyệt"
      >
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="h-[30rem] w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2 font-mono text-sm outline-none"
        />
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" leftIcon={<Save size={14} />}>
            Lưu bản nháp
          </Button>
          <Button variant="primary" leftIcon={<Send size={14} />}>
            Cập nhật editorial
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl" title="Xem trước" subtitle="Preview nội dung Markdown/LaTeX (demo)">
        <div className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-100)] px-2 py-1 text-[10px] font-semibold text-[var(--accent-500)]">
          <Sparkles size={12} /> DRAFT
        </div>

        <pre className="mt-3 h-[22rem] overflow-auto rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] p-3 text-xs text-[var(--ink-700)]">
          {body}
        </pre>

        <div className="mt-3 rounded-xl border border-[var(--line-soft)] bg-[var(--bg-soft)] p-3">
          <p className="text-xs font-semibold text-[var(--ink-700)]">Ảnh đính kèm</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ink-600)]">
            <li>hinh-ve-khong-gian-01.png</li>
            <li>bang-bien-thien-cau-5.jpg</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
