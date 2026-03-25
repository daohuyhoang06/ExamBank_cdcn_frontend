import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  Filter,
  Flag,
  Gavel,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type ModerationStat = {
  title: string;
  value: string;
  hint?: string;
  tone: "primary" | "danger" | "success" | "warning";
};

type ModerationRow = {
  id: string;
  title: string;
  meta: string;
  contributor: string;
  contributorRole: string;
  category: string;
  submittedAt: string;
  status: "Cần review" | "Chờ duyệt" | "Bị báo cáo";
  urgent?: boolean;
};

const stats: ModerationStat[] = [
  {
    title: "Chờ duyệt",
    value: "156",
    hint: "+12%",
    tone: "primary",
  },
  {
    title: "Cần xử lý ngay",
    value: "24",
    hint: "Khẩn cấp",
    tone: "danger",
  },
  {
    title: "Đã duyệt hôm nay",
    value: "85",
    tone: "success",
  },
  {
    title: "Bị báo cáo",
    value: "12",
    tone: "warning",
  },
];

const moderationRows: ModerationRow[] = [
  {
    id: "CT-1021",
    title: "Đề thi Toán cao cấp A1 - Giữa kỳ",
    meta: "50 câu hỏi • 90 phút",
    contributor: "Lê Thanh Hải",
    contributorRole: "Giảng viên Đại học",
    category: "Toán học",
    submittedAt: "Hôm nay, 10:45",
    status: "Cần review",
    urgent: true,
  },
  {
    id: "CT-1018",
    title: "Bài tập Vật lý hạt nhân - Nâng cao",
    meta: "15 câu trắc nghiệm • Tài liệu Community",
    contributor: "Nguyễn Minh Tuấn",
    contributorRole: "Sinh viên Top-tier",
    category: "Vật lý",
    submittedAt: "14 Th05, 2024",
    status: "Chờ duyệt",
  },
  {
    id: "CT-1014",
    title: "Tiếng Anh chuyên ngành Kinh tế",
    meta: "Flashcards từ vựng IELTS 7.5+",
    contributor: "Phạm Thị Lan",
    contributorRole: "Gia sư 5 sao",
    category: "Ngoại ngữ",
    submittedAt: "13 Th05, 2024",
    status: "Bị báo cáo",
  },
];

function statToneClasses(tone: ModerationStat["tone"]) {
  if (tone === "danger") {
    return {
      wrap: "bg-rose-50 border-rose-100",
      value: "text-rose-700",
      badge: "bg-rose-100 text-rose-700",
      icon: "bg-rose-100 text-rose-700",
    };
  }

  if (tone === "success") {
    return {
      wrap: "bg-emerald-50 border-emerald-100",
      value: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
      icon: "bg-emerald-100 text-emerald-700",
    };
  }

  if (tone === "warning") {
    return {
      wrap: "bg-amber-50 border-amber-100",
      value: "text-amber-800",
      badge: "bg-amber-100 text-amber-800",
      icon: "bg-amber-100 text-amber-800",
    };
  }

  return {
    wrap: "bg-white border-[var(--line-soft)]",
    value: "text-[var(--brand-700)]",
    badge: "bg-[var(--accent-100)] text-[var(--accent-500)]",
    icon: "bg-[var(--brand-100)] text-[var(--brand-700)]",
  };
}

function statusClass(status: ModerationRow["status"]) {
  if (status === "Cần review") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "Bị báo cáo") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-blue-100 text-blue-700";
}

export default function AdminContentPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-[var(--ink-900)]">
            Kiểm duyệt nội dung
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-600)]">
            Quản lý và phê duyệt các đề thi, câu hỏi và nội dung từ cộng đồng
            giáo dục Scholarly Sanctuary.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-soft)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)]"
          >
            <Filter size={15} />
            Bộ lọc
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--brand-600),var(--brand-700))] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105"
          >
            <Check size={15} />
            Phê duyệt nhanh
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const tone = statToneClasses(item.tone);

          return (
            <article
              key={item.title}
              className={`rounded-2xl border p-5 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 ${tone.wrap}`}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone.icon}`}>
                  {item.tone === "danger" ? <CircleAlert size={18} /> : null}
                  {item.tone === "success" ? <Check size={18} /> : null}
                  {item.tone === "warning" ? <Flag size={18} /> : null}
                  {item.tone === "primary" ? <TrendingUp size={18} /> : null}
                </span>
                {item.hint ? (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                    {item.hint}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-[var(--ink-600)]">{item.title}</p>
              <p className={`mt-1 text-3xl font-extrabold leading-none ${tone.value}`}>
                {item.value}
              </p>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-[var(--line-soft)] bg-[var(--bg-soft)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <h2 className="font-[var(--font-label)] text-base font-bold text-[var(--ink-900)]">
              Danh sách nội dung
            </h2>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-600)]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              4 đang xem
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-200"
            >
              TỪ CHỐI HÀNG LOẠT
            </button>
            <button
              type="button"
              className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200"
            >
              PHÊ DUYỆT HÀNG LOẠT
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-soft)] text-[0.68rem] uppercase tracking-[0.12em] text-[var(--ink-600)]">
                <th className="px-5 py-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--line-soft)] text-[var(--brand-700)] focus:ring-[var(--brand-300)]"
                  />
                </th>
                <th className="px-4 py-4 font-bold">Tên nội dung</th>
                <th className="px-4 py-4 font-bold">Người đóng góp</th>
                <th className="px-4 py-4 font-bold">Chuyên mục</th>
                <th className="px-4 py-4 font-bold">Ngày gửi</th>
                <th className="px-4 py-4 font-bold">Trạng thái</th>
                <th className="px-5 py-4 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {moderationRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[var(--line-soft)]/70 transition hover:bg-[var(--bg-soft)]/60"
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--line-soft)] text-[var(--brand-700)] focus:ring-[var(--brand-300)]"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-[var(--ink-900)]">{row.title}</p>
                    <p className="mt-1 text-xs text-[var(--ink-600)]">
                      {row.urgent ? (
                        <span className="mr-2 rounded bg-rose-100 px-1.5 py-0.5 font-bold uppercase tracking-[0.05em] text-rose-700">
                          Hỏa tốc
                        </span>
                      ) : null}
                      {row.meta}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-[var(--ink-900)]">{row.contributor}</p>
                    <p className="text-xs text-[var(--ink-600)]">{row.contributorRole}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--ink-700)]">{row.category}</td>
                  <td className="px-4 py-4 text-sm text-[var(--ink-600)]">{row.submittedAt}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] ${statusClass(row.status)}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 transition hover:bg-emerald-100"
                        title="Duyệt"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-700 transition hover:bg-rose-100"
                        title="Từ chối"
                      >
                        <Gavel size={16} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ink-600)] transition hover:bg-[var(--bg-soft)]"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--line-soft)] bg-[var(--bg-soft)] p-5 sm:flex-row">
          <p className="text-sm text-[var(--ink-600)]">Hiển thị 1 - 10 trong tổng số 156 nội dung</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line-soft)] text-[var(--ink-600)] transition hover:bg-white"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-700)] text-xs font-bold text-white"
            >
              1
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-[var(--ink-700)] transition hover:bg-white"
            >
              2
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-[var(--ink-700)] transition hover:bg-white"
            >
              3
            </button>
            <span className="px-1 text-xs text-[var(--ink-600)]">...</span>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-[var(--ink-700)] transition hover:bg-white"
            >
              16
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line-soft)] text-[var(--ink-600)] transition hover:bg-white"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--brand-700)_0%,var(--brand-600)_100%)] p-8 text-white shadow-[var(--shadow-brand)] md:col-span-2">
          <div className="relative z-10">
            <h3 className="font-[var(--font-label)] text-xl font-bold">Ghi nhớ Tiêu chuẩn Kiểm duyệt</h3>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white">
              Mỗi nội dung được phê duyệt cần đảm bảo: tính chính xác của kiến
              thức, không vi phạm bản quyền, ngôn ngữ chuẩn mực sư phạm và định
              dạng câu hỏi tối ưu cho trải nghiệm người dùng. Hãy ưu tiên xử lý
              các mục có gắn nhãn "Khẩn cấp" trước.
            </p>
            <button
              type="button"
              className="mt-6 rounded-lg bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--brand-700)] transition hover:opacity-90"
            >
              Xem quy định chi tiết
            </button>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 right-10 h-52 w-52 rounded-full bg-blue-300/20 blur-3xl" />
        </article>

        <article className="rounded-3xl border border-white/40 bg-[var(--bg-soft)]/70 p-8 backdrop-blur-sm shadow-[var(--shadow-soft)]">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-100)] text-[var(--brand-700)]">
            <Sparkles size={20} />
          </span>
          <h3 className="mt-4 font-[var(--font-label)] text-lg font-bold text-[var(--ink-900)]">Nhắc việc vận hành</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-600)]">
            Hiện có 12 nội dung đang gần quá hạn xử lý theo SLA kiểm duyệt. Ưu
            tiên xử lý các mục bị báo cáo và các đề thi gắn nhãn khẩn cấp.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-700)] transition hover:underline"
          >
            Mở danh sách ưu tiên
            <ArrowRight size={16} />
          </button>
        </article>
      </section>
    </div>
  );
}
