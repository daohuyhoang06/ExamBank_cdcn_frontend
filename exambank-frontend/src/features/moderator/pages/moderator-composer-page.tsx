import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Card } from "@/components/ui/Card/card";
import { Input } from "@/components/ui/Input/input";
import { Table, type TableColumn } from "@/components/ui/Table/table";
import { composerQuestions } from "@/features/moderator/mocks/moderator.mock";
import type { ComposerQuestion } from "@/features/moderator/types/moderator.type";

export default function ModeratorComposerPage() {
  const [items, setItems] = useState(composerQuestions);

  function move(index: number, direction: "up" | "down") {
    const next = direction === "up" ? index - 1 : index + 1;
    if (next < 0 || next >= items.length) {
      return;
    }

    setItems((prev) => {
      const draft = [...prev];
      const current = draft[index];
      draft[index] = draft[next];
      draft[next] = current;
      return draft;
    });
  }

  const totalPoints = useMemo(() => {
    return items.reduce((sum, item) => sum + item.points, 0);
  }, [items]);

  const columns: TableColumn<ComposerQuestion>[] = [
    {
      key: "order",
      label: "Thứ tự",
      render: (_, index) => <span className="font-semibold">#{index + 1}</span>,
    },
    { key: "type", label: "Dạng" },
    { key: "content", label: "Nội dung" },
    { key: "level", label: "Mức độ" },
    { key: "points", label: "Điểm" },
    {
      key: "actions",
      label: "Sắp xếp",
      render: (_, index) => (
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" onClick={() => move(index, "up")}> 
            <ArrowUp size={12} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => move(index, "down")}> 
            <ArrowDown size={12} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card
        className="rounded-2xl"
        title="Exam Composer"
        subtitle="Chuẩn hóa bộ đề: trắc nghiệm, đúng/sai, trắc luận; kéo luồng theo thứ tự xử lý"
      >
        <Table columns={columns} data={items} rowKey={(row) => row.id} />
      </Card>

      <Card className="rounded-2xl" title="Thiết lập đề" subtitle="Quản lý thời gian, barem, đáp án và lời giải">
        <div className="space-y-3">
          <Input label="Tên bộ đề" defaultValue="Đề thi HK1 Toán 12 - chuẩn hóa" inputClassName="h-10 text-sm" labelClassName="text-[10px]" />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Thời gian (phút)" type="number" defaultValue={90} inputClassName="h-10 text-sm" labelClassName="text-[10px]" />
            <Input label="Barem tổng" type="number" defaultValue={10} inputClassName="h-10 text-sm" labelClassName="text-[10px]" />
          </div>
          <textarea
            defaultValue="Phần I: 1A 2C 3D...\nPhần II: Đúng/Sai\nPhần III: Rubric tự luận"
            className="h-28 w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none"
          />
          <textarea
            defaultValue="Nhập lời giải chi tiết để phục vụ editorial và phản hồi cho user."
            className="h-28 w-full rounded-xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none"
          />
          <div className="flex items-center justify-between rounded-xl bg-[var(--bg-soft)] p-3">
            <p className="text-sm text-[var(--ink-700)]">Tổng điểm hiện tại</p>
            <p className="text-lg font-bold text-[var(--brand-700)]">{totalPoints.toFixed(2)}</p>
          </div>
          <Button variant="soft" leftIcon={<Plus size={14} />}>
            Thêm câu hỏi mới
          </Button>
        </div>
      </Card>
    </div>
  );
}
