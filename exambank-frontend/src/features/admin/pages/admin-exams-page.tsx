import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  Check,
  Calendar,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  ListChecks,
  Lock,
  MessageSquare,
  PieChart,
  RotateCcw,
  ShieldAlert,
  StopCircle,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button/button";
import { Pagination } from "@/components/ui/Pagination/pagination";
import { StatCard } from "@/components/ui/StatCard/stat-card";
import { confirm } from "@/lib/dialog";
import { useToast } from "@/components/ui/Toast/toast-system";
import {
  deleteAdminExam,
  getAdminExamContests,
  getAdminExamQuestions,
  updateAdminExamStatus,
  updateAdminExamStatuses,
  type AdminExamBackendStatus,
  type AdminExamContest as Contest,
  type AdminExamQuestionDetail,
  type ContestLifecycle,
} from "@/features/admin/services/admin-exam.service";

type RowAction = "FORCE_END" | "UNPUBLISH" | "REOPEN" | "DELETE";
type StatusAction = "FORCE_END" | "UNPUBLISH" | "REOPEN";

const PAGE_SIZE = 8;
type ExamStat = {
  title: string;
  value: string;
  hint?: string;
  tone: "primary" | "danger" | "success" | "warning" | "info";
};

const SEED_CONTESTS: Contest[] = [];

function mapActionToStatus(action: StatusAction): AdminExamBackendStatus {
  if (action === "FORCE_END") {
    return "LOCKED";
  }
  if (action === "UNPUBLISH") {
    return "DRAFT";
  }
  return "PUBLISHED";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function statToneClasses(tone: ExamStat["tone"]) {
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

  if (tone === "info") {
    return {
      wrap: "bg-blue-50 border-blue-100",
      value: "text-blue-700",
      badge: "bg-blue-100 text-blue-700",
      icon: "bg-blue-100 text-blue-700",
    };
  }

  return {
    wrap: "bg-white border-[var(--line-soft)]",
    value: "text-[var(--brand-700)]",
    badge: "bg-[var(--accent-100)] text-[var(--accent-500)]",
    icon: "bg-[var(--brand-100)] text-[var(--brand-700)]",
  };
}

function statusMeta(lifecycle: ContestLifecycle, intervened: boolean) {
  if (intervened) {
    return { label: "Bị can thiệp · Admin", className: "bg-rose-100 text-rose-700 border-rose-200" };
  }
  if (lifecycle === "DRAFT") {
    return { label: "Draft", className: "bg-slate-100 text-slate-700 border-slate-200" };
  }
  if (lifecycle === "PUBLISHED") {
    return { label: "Published", className: "bg-blue-100 text-blue-700 border-blue-200" };
  }
  if (lifecycle === "ONGOING") {
    return { label: "Ongoing", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }
  return { label: "Closed", className: "bg-slate-300 text-slate-700 border-slate-400" };
}

function canAdminUpdateContest(contest: Contest): boolean {
  return (
    contest.lifecycle === "PUBLISHED" ||
    contest.lifecycle === "ONGOING" ||
    contest.lifecycle === "ENDED"
  );
}

function formatQuestionType(type: string): string {
  const normalized = (type ?? "").trim().toUpperCase();
  if (normalized === "MCQ") return "Multiple choice";
  if (normalized === "FILL_IN_BLANK") return "Fill in blank";
  if (normalized === "ESSAY") return "Essay";
  return normalized || "Unknown";
}

export default function AdminExamsPage() {
  const toast = useToast();
  const [contests, setContests] = useState<Contest[]>(SEED_CONTESTS);
  const [search, setSearch] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ContestLifecycle>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailQuestions, setDetailQuestions] = useState<AdminExamQuestionDetail[]>([]);
  const [loadingDetailQuestions, setLoadingDetailQuestions] = useState(false);
  const [detailQuestionsError, setDetailQuestionsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const contestsFromApi = await getAdminExamContests();
      setContests(contestsFromApi);
      setSelectedIds([]);
      setPage(1);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Không tải được dữ liệu cuộc thi.";
      setError(message);
      setContests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const creators = useMemo(() => {
    const map = new Map<number, string>();
    contests.forEach((item) => map.set(item.creatorId, item.creatorName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [contests]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return contests.filter((item) => {
      if (statusFilter !== "ALL" && item.lifecycle !== statusFilter) return false;
      if (creatorFilter !== "all" && item.creatorId !== Number(creatorFilter)) return false;
      if (keyword && !item.title.toLowerCase().includes(keyword)) return false;
      if (fromDate && item.startAt && new Date(item.startAt) < new Date(`${fromDate}T00:00:00`)) return false;
      if (toDate && item.startAt && new Date(item.startAt) > new Date(`${toDate}T23:59:59`)) return false;
      return true;
    });
  }, [contests, statusFilter, creatorFilter, search, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allOnPageSelected = paged.length > 0 && paged.every((item) => selectedIds.includes(item.id));
  const detail = contests.find((item) => item.id === detailId) ?? null;

  useEffect(() => {
    if (!detailId) {
      setDetailQuestions([]);
      setDetailQuestionsError(null);
      setLoadingDetailQuestions(false);
      return;
    }

    let isActive = true;
    setLoadingDetailQuestions(true);
    setDetailQuestionsError(null);

    void getAdminExamQuestions(detailId)
      .then((questions) => {
        if (!isActive) {
          return;
        }
        setDetailQuestions(questions);
      })
      .catch((questionError) => {
        if (!isActive) {
          return;
        }
        const message =
          questionError instanceof Error ? questionError.message : "Khong tai duoc noi dung de thi.";
        setDetailQuestionsError(message);
        setDetailQuestions([]);
      })
      .finally(() => {
        if (isActive) {
          setLoadingDetailQuestions(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [detailId]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (detail) {
      document.body.classList.add("admin-detail-modal-open");
    } else {
      document.body.classList.remove("admin-detail-modal-open");
    }

    return () => {
      document.body.classList.remove("admin-detail-modal-open");
    };
  }, [detail]);

  const summary = useMemo(() => {
    const participants = detail?.participantsRows ?? [];
    const scores = participants.filter((p) => p.score > 0).map((p) => p.score);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const max = scores.length ? Math.max(...scores) : 0;
    const completed = participants.filter((p) => p.status !== "IN_PROGRESS").length;
    return {
      avg,
      max,
      completionRate: participants.length ? (completed / participants.length) * 100 : 0,
      anomaly: participants.length >= 2 && max >= 9.5 && avg >= 8.5,
    };
  }, [detail]);

  const contestStats = useMemo<ExamStat[]>(() => {
    const total = contests.length;
    const published = contests.filter((item) => item.lifecycle === "PUBLISHED").length;
    const ongoing = contests.filter((item) => item.lifecycle === "ONGOING").length;
    const locked = contests.filter((item) => item.intervened).length;

    return [
      {
        title: "Tất cả đề thi",
        value: formatNumber(total),
        hint: "Toàn hệ thống",
        tone: "primary",
      },
      {
        title: "Published",
        value: formatNumber(published),
        hint: "PUBLISHED",
        tone: "info",
      },
      {
        title: "Ongoing",
        value: formatNumber(ongoing),
        hint: "Đang diễn ra",
        tone: "warning",
      },
      {
        title: "Locked",
        value: formatNumber(locked),
        hint: "Admin intervention",
        tone: "danger",
      },
    ];
  }, [contests]);

  async function applyBulk(action: StatusAction) {
    if (!selectedIds.length) return;
    const labels = {
      FORCE_END: "Khóa đề thi",
      UNPUBLISH: "Ẩn cuộc thi",
      REOPEN: "Mở lại cuộc thi",
    } as const;

    const ok = await confirm(`${labels[action]} ${selectedIds.length} cuộc thi đã chọn?`, {
      title: labels[action],
      confirmText: "Xác nhận",
      cancelText: "Hủy",
      type: action === "FORCE_END" ? "danger" : "warning",
    });
    if (!ok) return;

    const targets = contests.filter((item) => selectedIds.includes(item.id) && canAdminUpdateContest(item));
    if (targets.length === 0) {
      toast.warning({
        title: "Admin Override",
        message: "Chi co de da public/ongoing/closed moi duoc cap nhat.",
      });
      return;
    }
    const status = mapActionToStatus(action);

    try {
      const { successCount, failCount } = await updateAdminExamStatuses(targets, status);
      await loadData();

      if (failCount === 0) {
        toast.success({ title: "Admin Override", message: `${labels[action]} thành công.` });
        return;
      }

      if (successCount > 0) {
        toast.info({
          title: "Admin Override",
          message: `${labels[action]} thành công ${successCount}/${targets.length} cuộc thi.`,
        });
        return;
      }

      toast.error({ title: "Admin Override", message: `Không thể ${labels[action].toLowerCase()}.` });
    } catch (bulkError) {
      const message = bulkError instanceof Error ? bulkError.message : `Không thể ${labels[action].toLowerCase()}.`;
      toast.error({ title: "Admin Override", message });
    }
  }

  async function applyRowAction(target: Contest, action: RowAction) {
    const labels: Record<RowAction, string> = {
      FORCE_END: "Khóa đề thi",
      UNPUBLISH: "Ẩn cuộc thi",
      REOPEN: "Mở lại cuộc thi",
      DELETE: "Xóa cuộc thi",
    };

    if (
      (action === "FORCE_END" || action === "UNPUBLISH" || action === "REOPEN")
      && !canAdminUpdateContest(target)
    ) {
      toast.warning({
        title: "Contest Management",
        message: "Chi co de da public/ongoing/closed moi duoc cap nhat.",
      });
      return;
    }

    const ok = await confirm(`${labels[action]} "${target.title}"?`, {
      title: labels[action],
      confirmText: "Xác nhận",
      cancelText: "Hủy",
      type: action === "DELETE" || action === "FORCE_END" ? "danger" : "warning",
    });
    if (!ok) return;

    if (action === "DELETE") {
      try {
        await deleteAdminExam(target.id);
        await loadData();
        toast.success({ title: "Contest Management", message: "Xóa cuộc thi thành công." });
      } catch (deleteError) {
        const message = deleteError instanceof Error ? deleteError.message : "Không thể xóa cuộc thi.";
        toast.error({ title: "Contest Management", message });
      }
      return;
    }

    if (action === "FORCE_END" || action === "UNPUBLISH" || action === "REOPEN") {
      try {
        await updateAdminExamStatus(target, mapActionToStatus(action));
        await loadData();
        toast.info({ title: "Contest Management", message: `${labels[action]} thành công.` });
      } catch (updateError) {
        const message = updateError instanceof Error ? updateError.message : `Không thể ${labels[action].toLowerCase()}.`;
        toast.error({ title: "Contest Management", message });
      }
      return;
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-[var(--font-label)] text-3xl font-extrabold tracking-tight text-[var(--ink-900)]">
            Quản lý cuộc thi
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-600)]">
            Giám sát toàn bộ cuộc thi, theo dõi trạng thái, lọc theo người tạo và thời gian để can thiệp nhanh khi có sự cố.
          </p>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {contestStats.map((item) => {
          const tone = statToneClasses(item.tone);
          const icon = item.tone === "danger"
            ? <Lock size={18} />
            : item.tone === "success"
              ? <Clock3 size={18} />
              : item.tone === "warning"
                ? <StopCircle size={18} />
                : <FileText size={18} />;

          return (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              icon={icon}
              badge={item.hint}
              cardClassName={`border shadow-[var(--shadow-soft)] ${tone.wrap}`}
              iconWrapClassName={tone.icon}
              badgeClassName={tone.badge}
              valueClassName={tone.value}
            />
          );
        })}
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-[var(--line-soft)] bg-[var(--bg-soft)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-5">
              <h2 className="font-[var(--font-label)] text-base font-bold text-[var(--ink-900)]">
                Danh sách đề thi
              </h2>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-600)]">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {formatNumber(filtered.length)} đề thi
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="md"
                variant="danger"
                leftIcon={<StopCircle size={14} />}
                disabled={selectedIds.length === 0}
                className="rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => void applyBulk("FORCE_END")}
              >
                Khóa đề thi
              </Button>
              <Button
                type="button"
                size="md"
                variant="secondary"
                leftIcon={<EyeOff size={14} />}
                disabled={selectedIds.length === 0}
                className="rounded-full border border-[#cfdbe2] bg-white px-5 text-sm font-semibold text-[#1a4b84] shadow-sm hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => void applyBulk("UNPUBLISH")}
              >
                Ẩn cuộc thi
              </Button>
              <Button
                type="button"
                size="md"
                variant="primary"
                leftIcon={<RotateCcw size={14} />}
                disabled={selectedIds.length === 0}
                className="rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => void applyBulk("REOPEN")}
              >
                Mở lại cuộc thi
              </Button>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên cuộc thi..."
              className="min-w-[240px] rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition placeholder:text-[var(--ink-400)] focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            />
            <select
              value={creatorFilter}
              onChange={(e) => setCreatorFilter(e.target.value)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            >
              <option value="all">Người tạo: Tất cả</option>
              {creators.map((creator) => (
                <option key={creator.id} value={String(creator.id)}>
                  {creator.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | ContestLifecycle)}
              className="rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 text-sm text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-300)] focus:ring-2 focus:ring-[var(--brand-100)]"
            >
              <option value="ALL">Trạng thái: Tất cả</option>
              <option value="PUBLISHED">Published</option>
              <option value="ONGOING">Ongoing</option>
              <option value="ENDED">Closed</option>
            </select>
            <Button
              type="button"
              variant="icon"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => {
                setCreatorFilter("all");
                setFromDate("");
                setToDate("");
                setStatusFilter("ALL");
                setSearch("");
              }}
            >
              <Filter size={16} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-soft)] text-xs uppercase tracking-[0.08em] text-[var(--ink-600)]">
                <th className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={() => {
                      if (allOnPageSelected) {
                        setSelectedIds((prev) => prev.filter((id) => !paged.some((x) => x.id === id)));
                      } else {
                        setSelectedIds((prev) => Array.from(new Set([...prev, ...paged.map((x) => x.id)])));
                      }
                    }}
                  />
                </th>
                <th className="px-3 py-3">Tên cuộc thi</th>
                <th className="px-3 py-3 text-center">Người tạo</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="px-3 py-3 text-center">Số người tham gia</th>
                <th className="px-3 py-3 text-center">Bắt đầu</th>
                <th className="px-3 py-3 text-center">Kết thúc</th>
                <th className="px-3 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-b border-[var(--line-soft)]">
                  <td className="px-3 py-8 text-center text-sm text-[var(--ink-600)]" colSpan={8}>
                    Đang tải dữ liệu cuộc thi...
                  </td>
                </tr>
              ) : paged.length > 0 ? (
                paged.map((item) => {
                  const badge = statusMeta(item.lifecycle, item.intervened);
                  const isSelected = selectedIds.includes(item.id);
                  const isAnomaly = item.participantsRows.length >= 2 && item.participantsRows.filter((x) => x.score >= 9.5).length >= 2;
                  return (
                    <tr key={item.id} className={`border-b border-[var(--line-soft)] ${item.intervened ? "bg-rose-50/40" : ""}`}>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => setSelectedIds((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]))}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => setDetailId(item.id)} className="text-left">
                          <p className="font-semibold text-[var(--ink-900)] hover:text-[var(--brand-700)] hover:underline">{item.title}</p>
                          <p className="mt-1 text-xs text-[var(--ink-600)]">
                            Môn học: {item.subjectName ?? (item.subjectId ? `#${item.subjectId}` : "Chưa gán môn học")}
                          </p>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center text-sm">{item.creatorName}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm font-semibold">
                        {item.participants}
                        {isAnomaly ? <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"><AlertTriangle size={11} /> Bất thường</span> : null}
                      </td>
                      <td className="px-3 py-3 text-center text-sm whitespace-nowrap">{formatDateTime(item.startAt)}</td>
                      <td className="px-3 py-3 text-center text-sm whitespace-nowrap">{formatDateTime(item.endAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Xem chi tiết" onClick={() => setDetailId(item.id)}><Eye size={14} /></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-700 hover:bg-red-50" title="Xóa cuộc thi" onClick={() => void applyRowAction(item, "DELETE")}><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-b border-[var(--line-soft)]">
                  <td className="px-3 py-8 text-center text-sm text-[var(--ink-600)]" colSpan={8}>
                    Chưa có cuộc thi nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line-soft)] bg-[var(--bg-soft)] px-4 py-3">
          <p className="text-sm text-[var(--ink-600)]">Hiển thị {paged.length}/{filtered.length} cuộc thi</p>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </section>

      {detail ? (
        <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm">
          <button type="button" className="absolute inset-0" onClick={() => setDetailId(null)} aria-label="Đóng" />
          <section className="relative z-10 flex h-[min(90vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#d6d9df] bg-white shadow-[0_28px_64px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between bg-[linear-gradient(90deg,#eef5ff_0%,#fff6ea_55%,#eef7ff_100%)] px-3 py-1.5">
              <h3 className="text-[1.1rem] font-bold tracking-tight text-[#111827]">Chi tiết cuộc thi</h3>
              <button
                type="button"
                className="rounded-lg p-1.5 text-[#6b7280] hover:bg-white/70"
                onClick={() => setDetailId(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid flex-1 gap-3 overflow-hidden p-4 lg:grid-cols-[1.9fr_1fr]">
              <div className="grid h-full min-h-0 grid-rows-[auto,1fr] gap-3 overflow-hidden">
                <section className="rounded-xl border border-[#dde5f3] px-4 py-3">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <FileText size={16} />
                    </span>
                    <p className="text-[1.05rem] font-bold text-[var(--ink-900)]">Thông tin đề thi</p>
                  </div>

                  <div className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[var(--ink-600)]">
                        <FileText size={15} className="text-[#365ea8]" />
                        <span className="font-semibold">Tên đề thi</span>
                      </p>
                      <p className="pl-6 text-[0.95rem] font-normal text-[var(--ink-900)]">{detail.title}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[var(--ink-600)]">
                        <Calendar size={15} className="text-[#365ea8]" />
                        <span className="font-semibold">Bắt đầu</span>
                      </p>
                      <p className="pl-6 text-[0.95rem] font-normal text-[var(--ink-900)]">{formatDateTime(detail.startAt)}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[var(--ink-600)]">
                        <ListChecks size={15} className="text-[#365ea8]" />
                        <span className="font-semibold">Tổng số câu hỏi</span>
                      </p>
                      <p className="pl-6 text-[0.95rem] font-normal text-[var(--ink-900)]">
                        {loadingDetailQuestions || detailQuestionsError ? "--" : `${detailQuestions.length} câu`}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[var(--ink-600)]">
                        <MessageSquare size={15} className="text-[#365ea8]" />
                        <span className="font-semibold">Mô tả</span>
                      </p>
                      <p className="pl-6 text-[0.95rem] font-normal text-[var(--ink-900)]">{detail.description}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[var(--ink-600)]">
                        <Clock3 size={15} className="text-[#365ea8]" />
                        <span className="font-semibold">Kết thúc</span>
                      </p>
                      <p className="pl-6 text-[0.95rem] font-normal text-[var(--ink-900)]">{formatDateTime(detail.endAt)}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[var(--ink-600)]">
                        <Clock3 size={15} className="text-[#365ea8]" />
                        <span className="font-semibold">Thời lượng</span>
                      </p>
                      <p className="pl-6 text-[0.95rem] font-normal text-[var(--ink-900)]">
                        {detail.durationMinutes ? `${detail.durationMinutes} phút` : "--"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[var(--ink-600)]">
                        <User size={15} className="text-[#365ea8]" />
                        <span className="font-semibold">Người tạo</span>
                      </p>
                      <p className="pl-6 text-[0.95rem] font-normal text-[var(--ink-900)]">{detail.creatorName}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[var(--ink-600)]">
                        <Activity size={15} className="text-emerald-600" />
                        <span className="font-semibold">Trạng thái</span>
                      </p>
                      <div className="pl-6">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusMeta(detail.lifecycle, detail.intervened).className}`}>
                          {statusMeta(detail.lifecycle, detail.intervened).label}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--line-soft)]">
                  <div className="border-b border-[var(--line-soft)] px-3 py-2">
                    <p className="inline-flex items-center gap-2 text-sm font-bold">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                        <ListChecks size={13} />
                      </span>
                      Nội dung đề thi
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                    {loadingDetailQuestions ? (
                      <div className="rounded-lg border border-[var(--line-soft)] px-3 py-4 text-sm text-[var(--ink-600)]">
                        Đang tải nội dung đề thi...
                      </div>
                    ) : null}
                    {!loadingDetailQuestions && detailQuestionsError ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-4 text-sm text-rose-700">
                        {detailQuestionsError}
                      </div>
                    ) : null}
                    {!loadingDetailQuestions && !detailQuestionsError && detailQuestions.length === 0 ? (
                      <div className="rounded-lg border border-[var(--line-soft)] px-3 py-8 text-center text-sm text-[var(--ink-600)]">
                        Đề thi chưa có câu hỏi.
                      </div>
                    ) : null}
                    {!loadingDetailQuestions && !detailQuestionsError && detailQuestions.length > 0 ? (
                      detailQuestions.map((question, index) => {
                        const normalizedAnswer = (question.answer ?? "").trim().toLowerCase();
                        return (
                          <article key={question.id} className="rounded-lg border border-[#dce4f3] bg-white p-3">
                            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">Q{index + 1}</span>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">{formatQuestionType(question.type)}</span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                                {question.maxScore ?? 0} point{question.maxScore === 1 ? "" : "s"}
                              </span>
                            </div>

                            <div className="prose prose-sm max-w-none text-[var(--ink-900)]" dangerouslySetInnerHTML={{ __html: question.content }} />

                            {question.imageUrl ? (
                              <img src={question.imageUrl} alt={`question-${question.id}`} className="mt-2 max-h-36 w-auto max-w-full rounded border border-[var(--line-soft)] object-contain" />
                            ) : null}

                            {question.options.length > 0 ? (
                              <ul className="mt-3 space-y-1.5 text-[12px]">
                                {question.options.map((option, optionIndex) => {
                                  const letter = String.fromCharCode(65 + optionIndex);
                                  const isCorrect =
                                    normalizedAnswer === letter.toLowerCase()
                                    || normalizedAnswer === option.trim().toLowerCase();
                                  return (
                                    <li
                                      key={`${question.id}-option-${optionIndex}`}
                                      className={`flex items-center justify-between rounded-md px-2.5 py-1.5 ${
                                        isCorrect
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      <span>
                                        <span className="mr-1 font-bold">{letter}.</span>
                                        {option}
                                      </span>
                                      {isCorrect ? <Check size={14} className="text-emerald-600" /> : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </article>
                        );
                      })
                    ) : null}
                  </div>
                </section>
              </div>

              <div className="space-y-3 overflow-y-auto">
                <section className="rounded-lg border border-[var(--line-soft)] p-3">
                  <p className="mb-2 text-sm font-bold">Thống kê</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-blue-50 p-2">
                      <p className="inline-flex items-center gap-1 text-xs text-blue-700"><Users size={12} /> Người tham gia</p>
                      <p className="text-lg font-black text-blue-800">{detail.participants}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <p className="inline-flex items-center gap-1 text-xs text-emerald-700"><Activity size={12} /> Điểm trung bình</p>
                      <p className="text-lg font-black text-emerald-800">{summary.avg.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2">
                      <p className="inline-flex items-center gap-1 text-xs text-amber-700"><Award size={12} /> Điểm cao nhất</p>
                      <p className="text-lg font-black text-amber-800">{summary.max.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-2">
                      <p className="inline-flex items-center gap-1 text-xs text-slate-700"><PieChart size={12} /> Tỷ lệ hoàn thành</p>
                      <p className="text-lg font-black text-slate-800">{summary.completionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                  {summary.anomaly ? <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700"><AlertTriangle size={12} /> Có dấu hiệu bất thường điểm cao.</p> : null}
                </section>

                <section className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
                  <div className="mb-3 flex items-center gap-2 text-rose-700">
                    <ShieldAlert size={14} />
                    <p className="text-sm font-bold">Hành động Admin</p>
                  </div>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      disabled={!canAdminUpdateContest(detail)}
                      onClick={() => void applyRowAction(detail, "FORCE_END")}
                      className="w-full rounded-lg border border-rose-200 bg-rose-100/70 px-3 py-2 text-left transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-rose-700">
                        <StopCircle size={14} />
                        Dừng cuộc thi
                      </span>
                      <p className="mt-0.5 text-xs text-rose-700/90">Tạm dừng tất cả thí sinh</p>
                    </button>

                    <button
                      type="button"
                      disabled={!canAdminUpdateContest(detail)}
                      onClick={() => void applyRowAction(detail, "REOPEN")}
                      className="w-full rounded-lg border border-emerald-200 bg-emerald-100/70 px-3 py-2 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
                        <RotateCcw size={14} />
                        Mở lại cuộc thi
                      </span>
                      <p className="mt-0.5 text-xs text-emerald-700/90">Cho phép thí sinh tiếp tục</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => void applyRowAction(detail, "DELETE")}
                      className="w-full rounded-lg border border-rose-200 bg-rose-100/70 px-3 py-2 text-left transition hover:bg-rose-100"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-rose-700">
                        <Trash2 size={14} />
                        Xóa cuộc thi
                      </span>
                      <p className="mt-0.5 text-xs text-rose-700/90">Xóa vĩnh viễn cuộc thi</p>
                    </button>

                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
