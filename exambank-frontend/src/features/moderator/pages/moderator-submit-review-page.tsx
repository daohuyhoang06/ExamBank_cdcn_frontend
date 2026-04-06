import { AlertTriangle, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Card } from "@/components/ui/Card/card";

const checklist = [
  "Đã duyệt metadata và tag chủ đề",
  "Đã xử lý report hoặc gắn nhãn cần theo dõi",
  "Đã kiểm tra trùng lặp ở mức chấp nhận được",
  "Đã hoàn tất barem, đáp án, lời giải",
  "Đã hoàn thiện editorial Markdown/LaTeX",
];

export default function ModeratorSubmitReviewPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <Card
        className="rounded-2xl"
        title="Submit bộ đề chuẩn hóa"
        subtitle="Luồng 2 bước: Moderator submit, Admin review trước khi publish"
      >
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item} className="inline-flex w-full items-center gap-2 rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--ink-700)]">
              <Check size={14} className="text-emerald-600" />
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="rounded-2xl" title="Gửi Admin review" subtitle="Thêm ghi chú để giảm vòng phản hồi">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800">
            <AlertTriangle size={14} /> Lưu ý
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Sau khi gửi, mọi chỉnh sửa sẽ tạo phiên bản mới và cần review lại từ đầu.
          </p>
        </div>

        <textarea
          placeholder="Ghi chú cho Admin review: các case đặc biệt, quyết định chuẩn hóa, điểm cần chú ý..."
          className="mt-3 h-40 w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none"
        />

        <Button className="mt-3" fullWidth leftIcon={<Send size={14} />}>
          Gửi Admin review
        </Button>
      </Card>
    </div>
  );
}
