import {
  Award,
  Database,
  Eye,
  Flag,
  Pencil,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Input } from "@/components/ui/Input/input";
import { Pagination } from "@/components/ui/Pagination/pagination";
import { StatCard } from "@/components/ui/StatCard/stat-card";

type StatCard = {
  title: string;
  value: string;
  subtitle?: string;
  tone: "brand" | "success" | "danger" | "warning";
};

type QuestionStatus = "Approved" | "Pending" | "Flagged";

type QuestionRow = {
  id: string;
  content: string;
  updatedAt: string;
  subject: string;
  difficulty: "Dễ" | "Trung bình" | "Khó";
  kind: "Trắc nghiệm" | "Tự luận";
  status: QuestionStatus;
};

const stats: StatCard[] = [
  {
    title: "Tổng Câu hỏi",
    value: "45,200",
    tone: "brand",
  },
  {
    title: "Mới tuần này",
    value: "+1,240",
    subtitle: "Tăng trưởng ổn định",
    tone: "success",
  },
  {
    title: "Cần xem xét",
    value: "86",
    subtitle: "Có báo cáo mới",
    tone: "danger",
  },
  {
    title: "Người đóng góp top",
    value: "TS. Nguyễn Văn A",
    tone: "warning",
  },
];

const questionRows: QuestionRow[] = [
  {
    id: "Q-10492",
    content: "Cho hàm số f(x) = ax^3 + bx^2 + cx + d. Tìm điều kiện của a...",
    updatedAt: "Cập nhật 2 giờ trước",
    subject: "Toán học",
    difficulty: "Khó",
    kind: "Trắc nghiệm",
    status: "Approved",
  },
  {
    id: "Q-10491",
    content: "Phân tích tác động của các yếu tố ngoại lực đến địa hình...",
    updatedAt: "Cập nhật 5 giờ trước",
    subject: "Địa lý",
    difficulty: "Trung bình",
    kind: "Tự luận",
    status: "Pending",
  },
  {
    id: "Q-10490",
    content: "Tính pH của dung dịch CH3COOH 0.1M biết Ka = 1.8x10^-5...",
    updatedAt: "Cập nhật 1 ngày trước",
    subject: "Hóa học",
    difficulty: "Dễ",
    kind: "Trắc nghiệm",
    status: "Flagged",
  },
  {
    id: "Q-10489",
    content: "Xác định các thành phần của lực đẩy Archimedes khi vật...",
    updatedAt: "Cập nhật 2 ngày trước",
    subject: "Vật lý",
    difficulty: "Trung bình",
    kind: "Trắc nghiệm",
    status: "Approved",
  },
];

function statToneClasses(tone: StatCard["tone"]) {
  if (tone === "success") {
    return {
      iconWrap: "bg-emerald-100 text-emerald-700",
      border: "border-emerald-200",
    };
  }

  if (tone === "danger") {
    return {
      iconWrap: "bg-rose-100 text-rose-700",
      border: "border-rose-200",
    };
  }

  if (tone === "warning") {
    return {
      iconWrap: "bg-amber-100 text-amber-800",
      border: "border-amber-200",
    };
  }

  return {
    iconWrap: "bg-[var(--brand-100)] text-[var(--brand-700)]",
    border: "border-[var(--line-soft)]",
  };
}

function statIcon(title: StatCard["title"], tone: StatCard["tone"]) {
  if (title.includes("Tổng")) {
    return <Database size={18} />;
  }

  if (tone === "success") {
    return <TrendingUp size={18} />;
  }

  if (tone === "danger") {
    return <Flag size={18} />;
  }

  return <Award size={18} />;
}

function statusClasses(status: QuestionStatus) {
  if (status === "Approved") {
    return { dot: "bg-emerald-500", text: "text-emerald-700" };
  }

  if (status === "Pending") {
    return { dot: "bg-amber-500", text: "text-amber-700" };
  }

  return { dot: "bg-rose-500", text: "text-rose-700" };
}

function difficultyClass(difficulty: QuestionRow["difficulty"]) {
  if (difficulty === "Khó") {
    return "bg-orange-100 text-orange-700";
  }

  if (difficulty === "Trung bình") {
    return "bg-[var(--brand-100)] text-[var(--brand-700)]";
  }

  return "bg-slate-200 text-slate-700";
}

export default function AdminQuestionBankPage() {
  return (
    <div className="space-y-7">
      <section className="space-y-4">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-[var(--font-label)] text-[clamp(1.8rem,3vw,2.3rem)] font-extrabold tracking-tight text-[var(--ink-900)]">
              Ngân hàng câu hỏi
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-600)]">
              Tổng cộng: <span className="font-semibold text-[var(--brand-700)]">45,200 câu hỏi</span>
              {" "}trong hệ thống
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            leftIcon={<PlusCircle size={18} />}
            className="rounded-xl font-bold"
          >
            Thêm Câu hỏi Mới
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const tone = statToneClasses(item.tone);

          return (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              subtitle={item.subtitle}
              icon={statIcon(item.title, item.tone)}
              layout="inline-title"
              cardClassName={`border ${tone.border}`}
              iconWrapClassName={tone.iconWrap}
              valueClassName="truncate text-2xl text-[var(--ink-900)]"
            />
          );
        })}
      </section>

      <section className="rounded-3xl border border-[var(--line-soft)] bg-[var(--bg-soft)] p-5 shadow-[var(--shadow-soft)]">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))_auto]">
          <Input
            type="text"
            containerClassName="pt-[1.35rem]"
            placeholder="ID hoặc nội dung câu hỏi..."
            startAdornment={<Search size={16} className="text-[var(--ink-500)]" />}
            inputWrapperClassName="h-11 rounded-xl border border-[var(--line-soft)] bg-white px-3 focus-within:border-[var(--brand-300)] focus-within:ring-2 focus-within:ring-[var(--brand-100)] focus-within:shadow-none"
            inputClassName="h-11 text-sm text-[var(--ink-700)]"
          />

          <label className="space-y-2">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-500)]">
              Môn học
            </span>
            <select className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]">
              <option>Tất cả</option>
              <option>Toán học</option>
              <option>Vật lý</option>
              <option>Hóa học</option>
              <option>Sinh học</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-500)]">
              Độ khó
            </span>
            <select className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]">
              <option>Tất cả</option>
              <option>Dễ</option>
              <option>Trung bình</option>
              <option>Khó</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-500)]">
              Loại
            </span>
            <select className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]">
              <option>Tất cả</option>
              <option>Trắc nghiệm</option>
              <option>Tự luận</option>
            </select>
          </label>

          <div className="flex items-end">
            <Button type="button" variant="icon" size="icon" className="h-11 w-11 rounded-xl">
              <SlidersHorizontal size={16} />
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left">
            <thead className="border-b border-[var(--line-soft)] bg-[var(--bg-soft)]">
              <tr className="text-[0.68rem] uppercase tracking-[0.12em] text-[var(--ink-600)]">
                <th className="px-6 py-4 font-bold">ID</th>
                <th className="px-6 py-4 font-bold">Nội dung câu hỏi</th>
                <th className="px-6 py-4 font-bold">Môn</th>
                <th className="px-6 py-4 font-bold">Độ khó</th>
                <th className="px-6 py-4 font-bold">Loại</th>
                <th className="px-6 py-4 font-bold">Trạng thái</th>
                <th className="px-6 py-4 text-right font-bold">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {questionRows.map((row) => {
                const status = statusClasses(row.status);

                return (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--line-soft)]/60 transition hover:bg-[var(--bg-soft)]/55"
                  >
                    <td className="px-6 py-5 text-sm font-semibold text-[var(--brand-700)]">
                      #{row.id}
                    </td>
                    <td className="px-6 py-5">
                      <p className="line-clamp-1 text-sm font-medium text-[var(--ink-900)]">
                        {row.content}
                      </p>
                      <p className="text-[0.68rem] text-[var(--ink-500)]">{row.updatedAt}</p>
                    </td>
                    <td className="px-6 py-5 text-sm text-[var(--ink-700)]">{row.subject}</td>
                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${difficultyClass(row.difficulty)}`}
                      >
                        {row.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-[var(--ink-700)]">{row.kind}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-2 text-xs font-semibold ${status.text}`}>
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 text-[var(--ink-500)] hover:bg-[var(--bg-page)] hover:text-[var(--brand-700)]"
                          title="Xem"
                        >
                          <Eye size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 text-[var(--ink-500)] hover:bg-[var(--bg-page)] hover:text-[var(--brand-700)]"
                          title="Sửa"
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 text-[var(--ink-500)] hover:bg-red-100 hover:text-rose-700"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 bg-[var(--bg-soft)] px-6 py-5 sm:flex-row sm:items-center">
          <span className="text-xs font-medium text-[var(--ink-500)]">
            Hiển thị 1 - 10 trên 45,200 câu hỏi
          </span>

          <Pagination currentPage={1} totalPages={4520} />
        </div>
      </section>
    </div>
  );
}
