import {
  BarChart3,
  CalendarClock,
  CopyPlus,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FlaskConical,
  GraduationCap,
  Orbit,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Input } from "@/components/ui/Input/input";
import { Pagination } from "@/components/ui/Pagination/pagination";
import { StatCard } from "@/components/ui/StatCard/stat-card";

type StatCard = {
  title: string;
  value: string;
  hint?: string;
  tone: "brand" | "green" | "amber" | "blue";
};

type ExamStatus = "Đang diễn ra" | "Sắp tới" | "Kết thúc";

type ExamRow = {
  code: string;
  title: string;
  category: "Toán học" | "Tiếng Anh" | "Vật lý" | "Hóa học";
  participants: string;
  startedAt: string;
  duration: string;
  status: ExamStatus;
};

const stats: StatCard[] = [
  {
    title: "Tổng số kỳ thi",
    value: "1,240",
    hint: "+8% tăng trưởng",
    tone: "brand",
  },
  {
    title: "Đang diễn ra",
    value: "12",
    tone: "green",
  },
  {
    title: "Sắp tới",
    value: "45",
    tone: "amber",
  },
  {
    title: "Thí sinh tháng này",
    value: "15.4K",
    tone: "blue",
  },
];

const exams: ExamRow[] = [
  {
    code: "EXAM-2024-001",
    title: "Toán học Tư duy Q4",
    category: "Toán học",
    participants: "1.2K",
    startedAt: "15/10/2024",
    duration: "90 phút",
    status: "Đang diễn ra",
  },
  {
    code: "EXAM-2024-015",
    title: "IELTS Mock Test May",
    category: "Tiếng Anh",
    participants: "850",
    startedAt: "20/05/2024",
    duration: "180 phút",
    status: "Sắp tới",
  },
  {
    code: "EXAM-2024-098",
    title: "Vật lý Hạt nhân 2024",
    category: "Vật lý",
    participants: "2.1K",
    startedAt: "01/03/2024",
    duration: "60 phút",
    status: "Kết thúc",
  },
  {
    code: "EXAM-2024-102",
    title: "Olympic Hóa học Mini",
    category: "Hóa học",
    participants: "420",
    startedAt: "12/11/2024",
    duration: "45 phút",
    status: "Sắp tới",
  },
];

function statToneClass(tone: StatCard["tone"]) {
  if (tone === "green") {
    return {
      iconWrap: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-700",
      hint: "bg-emerald-100 text-emerald-700",
      border: "border-emerald-200",
    };
  }

  if (tone === "amber") {
    return {
      iconWrap: "bg-amber-100 text-amber-800",
      value: "text-amber-800",
      hint: "bg-amber-100 text-amber-800",
      border: "border-amber-200",
    };
  }

  if (tone === "blue") {
    return {
      iconWrap: "bg-blue-100 text-blue-700",
      value: "text-blue-700",
      hint: "bg-blue-100 text-blue-700",
      border: "border-blue-200",
    };
  }

  return {
    iconWrap: "bg-[var(--brand-100)] text-[var(--brand-700)]",
    value: "text-[var(--brand-700)]",
    hint: "bg-[var(--accent-100)] text-[var(--accent-500)]",
    border: "border-[var(--brand-200)]",
  };
}

function statusClass(status: ExamStatus) {
  if (status === "Đang diễn ra") {
    return {
      wrap: "text-emerald-700",
      dot: "bg-emerald-500 animate-pulse",
    };
  }

  if (status === "Sắp tới") {
    return {
      wrap: "text-blue-700",
      dot: "bg-blue-500",
    };
  }

  return {
    wrap: "text-slate-500",
    dot: "bg-slate-400",
  };
}

function categoryClass(category: ExamRow["category"]) {
  if (category === "Tiếng Anh") {
    return "bg-amber-100 text-amber-800";
  }

  if (category === "Vật lý") {
    return "bg-slate-200 text-slate-700";
  }

  if (category === "Hóa học") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-blue-100 text-blue-700";
}

function statIcon(title: StatCard["title"], tone: StatCard["tone"]) {
  if (title.includes("Thí sinh")) {
    return <Users size={20} />;
  }

  if (tone === "green") {
    return <Orbit size={20} />;
  }

  if (tone === "amber") {
    return <CalendarClock size={20} />;
  }

  return <FileSpreadsheet size={20} />;
}

export default function AdminExamsPage() {
  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-[var(--font-label)] text-[clamp(1.8rem,3vw,2.25rem)] font-extrabold tracking-tight text-[var(--brand-700)]">
            Quản lý Kỳ thi
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--ink-600)]">
            Giám sát, cấu hình và tổ chức các kỳ thi/cuộc thi trên toàn hệ thống
            Scholarly Sanctuary.
          </p>
        </div>

      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const tone = statToneClass(item.tone);

          return (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              icon={statIcon(item.title, item.tone)}
              badge={item.hint}
              cardClassName={`border border-[var(--line-soft)] ${tone.border}`}
              iconWrapClassName={`h-11 w-11 ${tone.iconWrap}`}
              badgeClassName={tone.hint}
              valueClassName={tone.value}
            />
          );
        })}
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-[var(--line-soft)] bg-[var(--bg-soft)] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <Input
              type="text"
              placeholder="Tìm theo tên kỳ thi..."
              startAdornment={<Search size={16} className="text-[var(--ink-500)]" />}
              containerClassName="min-w-[250px] flex-1 xl:max-w-sm"
              inputWrapperClassName="h-11"
              inputClassName="h-11 text-sm"
            />

            <select className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]">
              <option>Tất cả danh mục</option>
              <option>Toán học</option>
              <option>Tiếng Anh</option>
              <option>Vật lý</option>
              <option>Hóa học</option>
            </select>

            <select className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]">
              <option>Tất cả loại hình</option>
              <option>Hàng tuần</option>
              <option>Hàng tháng</option>
              <option>Giải đấu đặc biệt</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="icon"
              size="icon"
              className="h-10 w-10 rounded-lg"
              title="Xuất dữ liệu"
            >
              <Download size={16} />
            </Button>
            <Button
              type="button"
              variant="icon"
              size="icon"
              className="h-10 w-10 rounded-lg"
              title="In"
            >
              <FileSpreadsheet size={16} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-soft)] text-[0.68rem] uppercase tracking-[0.12em] text-[var(--ink-600)]">
                <th className="px-6 py-4 font-bold">Kỳ thi</th>
                <th className="px-6 py-4 font-bold">Danh mục</th>
                <th className="px-6 py-4 text-center font-bold">Thí sinh</th>
                <th className="px-6 py-4 font-bold">Bắt đầu</th>
                <th className="px-6 py-4 font-bold">Thời lượng</th>
                <th className="px-6 py-4 font-bold">Trạng thái</th>
                <th className="px-6 py-4 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => {
                const status = statusClass(exam.status);

                return (
                  <tr
                    key={exam.code}
                    className="border-b border-[var(--line-soft)]/60 transition hover:bg-[var(--bg-page)]/70"
                  >
                    <td className="px-6 py-5">
                      <p className="font-[var(--font-label)] text-sm font-bold text-[var(--brand-700)]">
                        {exam.title}
                      </p>
                      <p className="text-xs text-[var(--ink-500)]">ID: {exam.code}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] ${categoryClass(exam.category)}`}
                      >
                        {exam.category}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center text-sm font-semibold text-[var(--ink-700)]">
                      {exam.participants}
                    </td>
                    <td className="px-6 py-5 text-sm text-[var(--ink-600)]">{exam.startedAt}</td>
                    <td className="px-6 py-5 text-sm text-[var(--ink-600)]">{exam.duration}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] ${status.wrap}`}>
                        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                        {exam.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md text-blue-700 transition hover:bg-blue-50 hover:text-blue-800"
                          title="Chỉnh sửa"
                        >
                          <Edit3 size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md text-[var(--ink-500)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--brand-700)]"
                          title="Thống kê"
                        >
                          <BarChart3 size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md text-red-600 transition hover:bg-red-100 hover:text-red-700"
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

        <div className="flex flex-col items-start justify-between gap-3 bg-[var(--bg-soft)] px-6 py-4 sm:flex-row sm:items-center">
          <p className="text-sm text-[var(--ink-600)]">
            Hiển thị <span className="font-bold text-[var(--brand-700)]">1 - 10</span>
            {" "}trong số <span className="font-bold text-[var(--brand-700)]">1,240</span>{" "}
            kỳ thi
          </p>
          <Pagination currentPage={1} totalPages={124} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="relative overflow-hidden rounded-3xl bg-[linear-gradient(140deg,var(--brand-600)_0%,var(--brand-700)_55%,#072b59_100%)] p-8 text-white shadow-[var(--shadow-brand)] lg:col-span-2">
          <div className="relative z-10">
            <h2 className="font-[var(--font-label)] text-2xl font-extrabold">
              Thông số Hiệu suất Hệ thống
            </h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              Hệ thống vận hành ổn định với tỷ lệ phản hồi cao trong các khung
              giờ thi cao điểm. Theo dõi chỉ số theo phiên để dự phòng sự cố.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-blue-100">
                  Uptime
                </p>
                <p className="mt-1 text-2xl font-bold">99.9%</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-blue-100">
                  Latency
                </p>
                <p className="mt-1 text-2xl font-bold">120ms</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-blue-100">
                  Concurrent
                </p>
                <p className="mt-1 text-2xl font-bold">4.2K</p>
              </div>
            </div>
          </div>

          <BarChart3
            size={122}
            className="pointer-events-none absolute right-8 top-8 text-white/10"
          />
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
        </article>

        <article className="rounded-3xl border border-[var(--line-soft)] bg-white p-8 shadow-[var(--shadow-soft)]">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-100)] text-[var(--brand-700)]">
            <Trophy size={24} />
          </span>
          <h3 className="mt-4 font-[var(--font-label)] text-lg font-bold text-[var(--ink-900)]">
            Gợi ý vận hành kỳ thi
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-600)]">
            Khối Vật lý đang có tỷ lệ đăng ký tăng 26% trong 10 ngày gần đây.
            Bạn có thể mở thêm một kỳ thi chuyên đề để tận dụng nhu cầu.
          </p>

          <div className="mt-5 space-y-2">
            <Button
              type="button"
              variant="soft"
              size="md"
              fullWidth
              leftIcon={<CopyPlus size={16} />}
              className="rounded-xl text-sm font-semibold text-[var(--brand-700)] hover:bg-[var(--brand-100)]"
            >
              Tạo từ mẫu đề
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              leftIcon={<Eye size={16} />}
              className="rounded-xl text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--bg-page)]"
            >
              Xem phân tích đăng ký
            </Button>
          </div>

          <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-700)]">
            <Sparkles size={14} />
            Cập nhật 2 phút trước
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-[var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-[var(--font-label)] text-lg font-bold text-[var(--ink-900)]">
              Quick Ops
            </h3>
            <p className="text-sm text-[var(--ink-600)]">
              Bộ thao tác nhanh cho quản trị kỳ thi trong ngày.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<GraduationCap size={15} />}
              className="rounded-lg px-3 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--bg-page)]"
            >
              Gửi thông báo thí sinh
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<FlaskConical size={15} />}
              className="rounded-lg px-3 text-sm font-semibold text-[var(--ink-700)] hover:bg-[var(--bg-page)]"
            >
              Mở sandbox đề thi
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
