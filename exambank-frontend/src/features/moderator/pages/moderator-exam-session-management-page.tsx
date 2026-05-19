import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  CheckCircle2,
  Eye,
  FileDown,
  Loader2,
  LockKeyhole,
  PlayCircle,
  RefreshCcw,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button/button";
import { Card } from "@/components/ui/Card/card";
import { listComposerOwnedExams, listComposerSubjects } from "@/features/moderator/services/moderator-composer.service";
import type { ComposerExamRecord, ComposerSubjectRecord } from "@/features/moderator/types/moderator-composer.type";
import {
  listModeratorExamSessions,
  type ModeratorExamSessionListResponse,
  type ModeratorExamSessionRecord,
} from "@/features/moderator/services/moderator-exam-session.service";
import { extractApiErrorMessage } from "@/lib/error-utils";

const PAGE_SIZE = 10;

type SortKey = "startTime" | "submittedAt" | "totalScore";
type SortDirection = "asc" | "desc";

type SessionFilterState = {
  keyword: string;
  status: string;
  locked: string;
  startFrom: string;
  scoreMin: string;
  scoreMax: string;
};

const DEFAULT_FILTERS: SessionFilterState = {
  keyword: "",
  status: "ALL",
  locked: "ALL",
  startFrom: "",
  scoreMin: "",
  scoreMax: "",
};

const STATUS_OPTIONS = [
  "IN_PROGRESS",
  "SUBMITTED",
  "GRADING",
  "COMPLETED",
  "TIMEOUT",
  "LOCKED",
  "ABANDONED",
  "NOT_STARTED",
] as const;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(parsed);
}

function formatDateTimeParts(value: string | null) {
  if (!value) {
    return { time: "--:--", date: "--/--/----" };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { time: "--:--", date: "--/--/----" };
  }

  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(parsed);

  const date = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(parsed);

  return { time, date };
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function secondsBetween(startTime: string | null, submittedAt: string | null) {
  if (!startTime) {
    return null;
  }

  const startMs = new Date(startTime).getTime();
  if (Number.isNaN(startMs)) {
    return null;
  }

  const endMs = submittedAt ? new Date(submittedAt).getTime() : Date.now();
  if (Number.isNaN(endMs) || endMs < startMs) {
    return null;
  }

  return Math.floor((endMs - startMs) / 1000);
}

function getSessionDurationSeconds(session: ModeratorExamSessionRecord) {
  return session.durationSeconds ?? secondsBetween(session.startTime, session.submittedAt);
}

function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "--";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function getUserDisplayName(session: Pick<ModeratorExamSessionRecord, "userId" | "userDisplayName">) {
  const explicitName = session.userDisplayName?.trim();
  if (explicitName) {
    return explicitName;
  }

  return session.userId === null ? "Ẩn danh" : `User ${session.userId}`;
}

function getUserInitials(session: Pick<ModeratorExamSessionRecord, "userId" | "userDisplayName">) {
  const label = getUserDisplayName(session);
  const parts = label.split(/\s+/).filter(Boolean);
  return parts
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function getDurationProgress(session: ModeratorExamSessionRecord) {
  const durationSeconds = getSessionDurationSeconds(session);
  if (durationSeconds === null || session.timeLimitMinutes === null || session.timeLimitMinutes <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round((durationSeconds / (session.timeLimitMinutes * 60)) * 100)));
}

function getExamCode(examId: number | null) {
  if (!examId) {
    return "#EXAM-UNKNOWN";
  }

  return `#EXAM-${examId}`;
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    IN_PROGRESS: "Đang làm",
    SUBMITTED: "Đã nộp",
    GRADING: "Đang chấm",
    COMPLETED: "Hoàn thành",
    TIMEOUT: "Hết giờ",
    LOCKED: "Bị khóa",
    ABANDONED: "Bỏ dở",
    NOT_STARTED: "Chưa bắt đầu",
  };

  return labels[status] ?? status;
}

function getStatusBadgeClass(status: string) {
  if (status === "IN_PROGRESS") {
    return "bg-blue-100 text-blue-700 ring-blue-200";
  }

  if (status === "SUBMITTED" || status === "COMPLETED") {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }

  if (status === "TIMEOUT" || status === "GRADING") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  if (status === "LOCKED" || status === "ABANDONED") {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getLockedBadgeClass(isLocked: boolean | null) {
  if (isLocked === true) {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }

  if (isLocked === false) {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function compareNullableNumber(left: number | null, right: number | null, direction: SortDirection) {
  const leftValue = left ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
  const rightValue = right ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
  return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
}

function timestampValue(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function sortSessions(
  sessions: ModeratorExamSessionRecord[],
  sortKey: SortKey,
  sortDirection: SortDirection
) {
  return [...sessions].sort((left, right) => {
    if (sortKey === "totalScore") {
      const scoreDiff = compareNullableNumber(left.totalScore, right.totalScore, sortDirection);
      return scoreDiff !== 0 ? scoreDiff : right.id - left.id;
    }

    const timeDiff = compareNullableNumber(
      timestampValue(left[sortKey]),
      timestampValue(right[sortKey]),
      sortDirection
    );

    return timeDiff !== 0 ? timeDiff : right.id - left.id;
  });
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(sessions: ModeratorExamSessionRecord[]) {
  const headers = [
    "Session ID",
    "User ID",
    "Exam ID",
    "Mode",
    "Status",
    "Start Time",
    "Submitted At",
    "Duration",
    "Time Limit",
    "Score",
    "Locked",
    "Submit Reason",
    "Practice Tags",
  ];

  const rows = sessions.map((session) => [
    session.id,
    session.userId ?? "",
    session.examId ?? "",
    session.mode ?? "",
    session.status,
    session.startTime ?? "",
    session.submittedAt ?? "",
    formatDuration(getSessionDurationSeconds(session)),
    session.timeLimitMinutes ?? "",
    session.totalScore ?? "",
    session.isLocked === null ? "" : session.isLocked ? "TRUE" : "FALSE",
    session.submitReason ?? "",
    session.practiceTopicTags ?? "",
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function DetailLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--bg-page)] px-4 py-3">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-500)]">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-[var(--ink-900)]">{value}</div>
    </div>
  );
}

function SummaryMetricCard({
  icon,
  toneClassName,
  eyebrow,
  value,
  label,
  accentClassName,
}: {
  icon: React.ReactNode;
  toneClassName: string;
  eyebrow: string;
  value: React.ReactNode;
  label: string;
  accentClassName: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--line-soft)] bg-white p-4 shadow-[0_8px_24px_rgba(16,21,38,0.08)] ${accentClassName}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={`inline-flex rounded-xl p-2.5 ${toneClassName}`}>{icon}</span>
        <span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">{eyebrow}</span>
      </div>
      <p className="text-[1.8rem] font-extrabold leading-none text-[var(--ink-900)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--ink-600)]">{label}</p>
    </div>
  );
}

export default function ModeratorExamSessionManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedExamId = Number(searchParams.get("examId"));

  const [exams, setExams] = useState<ComposerExamRecord[]>([]);
  const [subjects, setSubjects] = useState<ComposerSubjectRecord[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(
    Number.isFinite(requestedExamId) && requestedExamId > 0 ? requestedExamId : null
  );
  const [sessionResponse, setSessionResponse] = useState<ModeratorExamSessionListResponse>({
    sessions: [],
    usedFallback: false,
    fallbackLookupCount: 0,
    inaccessibleSessionCount: 0,
  });
  const [filters, setFilters] = useState<SessionFilterState>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("startTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [topOnly, setTopOnly] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ModeratorExamSessionRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selectedExamId) ?? null,
    [exams, selectedExamId]
  );
  const subjectNameById = useMemo(() => {
    return new Map(subjects.map((subject) => [subject.id, subject.name]));
  }, [subjects]);
  const selectedSubjectName = useMemo(() => {
    if (!selectedExam?.subjectId) {
      return "--";
    }

    return subjectNameById.get(selectedExam.subjectId) ?? `Môn #${selectedExam.subjectId}`;
  }, [selectedExam, subjectNameById]);

  const refreshExams = useCallback(async () => {
    setIsLoadingExams(true);
    setErrorMessage("");

    try {
      const [records, subjectRecords] = await Promise.all([listComposerOwnedExams(), listComposerSubjects()]);
      const sorted = [...records].sort((left, right) => right.id - left.id);
      setExams(sorted);
      setSubjects(subjectRecords);
      setSelectedExamId((current) => {
        if (current && sorted.some((exam) => exam.id === current)) {
          return current;
        }

        return sorted[0]?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error, "Không thể tải danh sách cuộc thi."));
    } finally {
      setIsLoadingExams(false);
    }
  }, []);

  const refreshSessions = useCallback(async (examId: number) => {
    setIsLoadingSessions(true);

    setErrorMessage("");

    try {
      const response = await listModeratorExamSessions(examId);
      setSessionResponse(response);
      setCurrentPage(1);
      setTopOnly(false);
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error, "Không thể tải danh sách phiên làm bài."));
      setSessionResponse({
        sessions: [],
        usedFallback: true,
        fallbackLookupCount: 0,
        inaccessibleSessionCount: 0,
      });
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void refreshExams();
  }, [refreshExams]);

  useEffect(() => {
    if (!selectedExamId) {
      return;
    }

    setSearchParams({ examId: String(selectedExamId) });
    void refreshSessions(selectedExamId);
  }, [refreshSessions, selectedExamId, setSearchParams]);

  function updateFilter<K extends keyof SessionFilterState>(key: K, value: SessionFilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  }

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("desc");
  }

  const filteredSessions = useMemo(() => {
    const normalizedKeyword = normalizeText(filters.keyword);
    const startFromMs = filters.startFrom ? new Date(filters.startFrom).getTime() : null;
    const scoreMin = filters.scoreMin.trim() ? Number(filters.scoreMin) : null;
    const scoreMax = filters.scoreMax.trim() ? Number(filters.scoreMax) : null;

    return sessionResponse.sessions.filter((session) => {
      const matchesKeyword =
        !normalizedKeyword ||
        String(session.id).includes(normalizedKeyword) ||
        String(session.userId ?? "").includes(normalizedKeyword);
      const matchesStatus = filters.status === "ALL" || session.status === filters.status;
      const matchesLocked =
        filters.locked === "ALL" ||
        (filters.locked === "LOCKED" && session.isLocked === true) ||
        (filters.locked === "UNLOCKED" && session.isLocked === false) ||
        (filters.locked === "UNKNOWN" && session.isLocked === null);
      const startMs = timestampValue(session.startTime);
      const matchesStartFrom = startFromMs === null || (startMs !== null && startMs >= startFromMs);
      const matchesScoreMin = scoreMin === null || (session.totalScore !== null && session.totalScore >= scoreMin);
      const matchesScoreMax = scoreMax === null || (session.totalScore !== null && session.totalScore <= scoreMax);

      return (
        matchesKeyword &&
        matchesStatus &&
        matchesLocked &&
        matchesStartFrom &&
        matchesScoreMin &&
        matchesScoreMax
      );
    });
  }, [filters, sessionResponse.sessions]);

  const visibleBaseSessions = useMemo(() => {
    const sorted = sortSessions(filteredSessions, sortKey, sortDirection);
    if (!topOnly) {
      return sorted;
    }

    return sortSessions(sorted, "totalScore", "desc").slice(0, 10);
  }, [filteredSessions, sortDirection, sortKey, topOnly]);

  const totalPages = Math.max(1, Math.ceil(visibleBaseSessions.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedSessions = visibleBaseSessions.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const summary = useMemo(() => {
    const sessions = sessionResponse.sessions;
    const scores = sessions
      .map((session) => session.totalScore)
      .filter((score): score is number => score !== null && Number.isFinite(score));
    const averageScore = scores.length > 0 ? scores.reduce((total, score) => total + score, 0) / scores.length : null;
    const maxScore = scores.length > 0 ? Math.max(...scores) : null;

    return {
      total: sessions.length,
      inProgress: sessions.filter((session) => session.status === "IN_PROGRESS").length,
      submitted: sessions.filter(
        (session) => session.status === "SUBMITTED" || session.status === "COMPLETED" || Boolean(session.submittedAt)
      ).length,
      locked: sessions.filter((session) => session.isLocked === true || session.status === "LOCKED").length,
      averageScore,
      maxScore,
    };
  }, [sessionResponse.sessions]);

  function handleExportCsv() {
    const csv = buildCsv(visibleBaseSessions);
    downloadCsv(`exam-${selectedExamId ?? "unknown"}-sessions.csv`, csv);
  }

  function handleViewSession(session: ModeratorExamSessionRecord) {
    setSelectedSession(session);
    setIsDrawerOpen(true);
  }

  const isLoading = isLoadingExams || isLoadingSessions;

  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-[var(--ink-900)]">
              Chi tiết Cuộc thi
            </h1>
            <p className="text-sm font-medium text-[var(--ink-600)] md:text-base">
              Theo dõi trạng thái, kết quả và tiến độ các phiên làm bài theo từng đề thi.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              leftIcon={<FileDown size={14} />}
              disabled={visibleBaseSessions.length === 0}
              onClick={handleExportCsv}
              className="h-10 rounded-lg border border-[var(--line-soft)] bg-white px-4 text-sm font-semibold text-[var(--ink-700)] shadow-[0_8px_20px_rgba(16,21,38,0.12)] transition hover:-translate-y-px hover:bg-[var(--bg-soft)]"
            >
              Export CSV
            </Button>
            <Button
              type="button"
              variant="primary"
              leftIcon={<Trophy size={14} />}
              disabled={filteredSessions.length === 0}
              onClick={() => {
                setTopOnly((current) => !current);
                setSortKey("totalScore");
                setSortDirection("desc");
                setCurrentPage(1);
              }}
              className="h-10 rounded-lg bg-[linear-gradient(135deg,var(--brand-600)_0%,var(--brand-700)_100%)] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(12,75,146,0.34)] ring-1 ring-white/25 transition hover:-translate-y-px hover:brightness-105"
            >
              Xem top 10
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedExamId ?? ""}
            onChange={(event) => setSelectedExamId(Number(event.target.value))}
            className="h-8 min-w-[128px] rounded-md border border-[var(--line-soft)] bg-[var(--brand-050)] px-2 text-[11px] font-semibold text-[var(--brand-700)] outline-none transition focus:border-[var(--brand-500)] focus:ring-2 focus:ring-[var(--brand-100)]"
            disabled={isLoadingExams}
          >
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {getExamCode(exam.id)}
              </option>
            ))}
          </select>
          <p className="flex flex-wrap items-center text-[11px] font-medium text-[var(--ink-600)]">
            <span className="inline-block max-w-[220px] truncate align-middle">{selectedExam?.title ?? "--"}</span>
            <span className="px-1.5 text-[var(--ink-500)]">|</span>
            <span>{selectedSubjectName}</span>
            <span className="px-1.5 text-[var(--ink-500)]">|</span>
            <span>{selectedExam?.durationMinutes ?? "--"} phút</span>
          </p>
        </div>
      </section>

      {sessionResponse.usedFallback ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="inline-flex items-center gap-2 font-bold">
            <AlertTriangle size={16} /> Fallback API
          </span>{" "}
          Backend hiện tại không trả danh sách session theo exam cho moderator, nên trang đang hiển thị top session từ API thống kê.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryMetricCard
          icon={<UsersRound size={20} />}
          toneClassName="bg-[var(--brand-100)] text-[var(--brand-700)]"
          eyebrow="Total"
          value={summary.total}
          label="Tổng phiên làm bài"
          accentClassName=""
        />
        <SummaryMetricCard
          icon={<PlayCircle size={20} />}
          toneClassName="bg-sky-100 text-sky-700"
          eyebrow="Active"
          value={summary.inProgress}
          label="Đang làm"
          accentClassName=""
        />
        <SummaryMetricCard
          icon={<CheckCircle2 size={20} />}
          toneClassName="bg-emerald-100 text-emerald-700"
          eyebrow="Success"
          value={summary.submitted}
          label="Đã nộp"
          accentClassName=""
        />
        <SummaryMetricCard
          icon={<LockKeyhole size={20} />}
          toneClassName="bg-rose-100 text-rose-700"
          eyebrow="Alert"
          value={summary.locked}
          label="Bị khóa"
          accentClassName=""
        />
        <SummaryMetricCard
          icon={<Activity size={20} />}
          toneClassName="bg-amber-100 text-amber-700"
          eyebrow="Average"
          value={formatScore(summary.averageScore)}
          label="Điểm trung bình"
          accentClassName=""
        />
        <SummaryMetricCard
          icon={<Award size={20} />}
          toneClassName="bg-orange-100 text-orange-700"
          eyebrow="Top"
          value={formatScore(summary.maxScore)}
          label="Điểm cao nhất"
          accentClassName=""
        />
      </section>

      <Card
        className="overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-white shadow-[0_8px_28px_rgba(16,21,38,0.08)]"
        padding="none"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-soft)] bg-[var(--bg-soft)]/45 px-5 py-4 md:px-6">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-500)]">Bộ lọc:</span>
          <input
            type="text"
            placeholder="Session ID / User ID"
            value={filters.keyword}
            onChange={(event) => updateFilter("keyword", event.target.value)}
            className="h-9 min-w-[210px] rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-500)]"
          />
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              className="h-9 rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-500)]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
            <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-[var(--ink-700)]">
              <input
                type="checkbox"
                checked={filters.locked === "LOCKED"}
                onChange={(event) => updateFilter("locked", event.target.checked ? "LOCKED" : "ALL")}
                className="h-4 w-4 accent-[var(--brand-600)]"
              />
              <span>Locked</span>
            </label>
            <input
              type="date"
              value={filters.startFrom}
              onChange={(event) => updateFilter("startFrom", event.target.value)}
              className="h-9 min-w-[170px] rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-500)]"
              title="Start from"
            />
            <button
              type="button"
              className="ml-auto inline-flex h-9 items-center rounded-lg border border-[var(--line-soft)] bg-white px-3 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={async () => {
                setFilters(DEFAULT_FILTERS);
                setTopOnly(false);
                setCurrentPage(1);
                if (selectedExamId) {
                  await refreshSessions(selectedExamId);
                }
              }}
              disabled={isLoadingSessions}
            >
              <RefreshCcw size={13} className={isLoadingSessions ? "animate-spin" : ""} />
              <span className="ml-2">Làm mới</span>
            </button>
        </div>

        <div className="overflow-x-auto bg-white">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-[var(--line-soft)] bg-[var(--bg-soft)]/35">
                <th className="px-4 py-3 align-middle text-[11px] font-bold uppercase tracking-[0.16em] leading-none whitespace-nowrap text-[var(--ink-500)]">Session ID</th>
                <th className="px-4 py-3 align-middle text-[11px] font-bold uppercase tracking-[0.16em] leading-none whitespace-nowrap text-[var(--ink-500)]">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 shrink-0" aria-hidden="true" />
                    <span>Thí sinh</span>
                  </div>
                </th>
                <th className="px-4 py-3 align-middle text-[11px] font-bold uppercase tracking-[0.16em] leading-none whitespace-nowrap text-[var(--ink-500)]">Trạng thái</th>
                <th className="px-4 py-3 align-middle text-[11px] font-bold uppercase tracking-[0.16em] leading-none whitespace-nowrap text-[var(--ink-500)]">
                  <button
                    type="button"
                    className="inline-flex items-center whitespace-nowrap font-inherit text-inherit"
                    onClick={() => handleSort("startTime")}
                  >
                    THỜI GIAN
                  </button>
                </th>
                <th className="px-4 py-3 align-middle text-[11px] font-bold uppercase tracking-[0.16em] leading-none whitespace-nowrap text-[var(--ink-500)]">Thời lượng</th>
                <th className="px-4 py-3 align-middle text-right text-[11px] font-bold uppercase tracking-[0.16em] leading-none whitespace-nowrap text-[var(--ink-500)]">
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-end gap-1 whitespace-nowrap font-inherit text-inherit"
                    onClick={() => handleSort("totalScore")}
                  >
                    ĐIỂM {sortKey === "totalScore" ? sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}
                  </button>
                </th>
                <th className="px-4 py-3 align-middle text-right text-[11px] font-bold uppercase tracking-[0.16em] leading-none whitespace-nowrap text-[var(--ink-500)]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-soft)]">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm font-semibold text-[var(--ink-500)]" colSpan={7}>
                    <Loader2 size={16} className="mr-2 inline animate-spin" /> Đang tải session...
                  </td>
                </tr>
              ) : paginatedSessions.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-[var(--ink-500)]" colSpan={7}>
                    Không có session nào theo bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((session) => {
                  const durationProgress = getDurationProgress(session);
                  const startedAt = formatDateTimeParts(session.startTime);
                  const durationText = formatDuration(getSessionDurationSeconds(session));
                  const timeLimitText = session.timeLimitMinutes ? `${session.timeLimitMinutes}m` : "--";

                  return (
                  <tr
                    key={session.id}
                    className={`transition-colors hover:bg-[var(--bg-soft)]/45 ${
                      selectedSession?.id === session.id ? "bg-[var(--brand-050)]" : ""
                    }`}
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1">
                        <span className="font-mono text-sm font-semibold leading-snug text-[var(--brand-700)]">#SESS-{session.id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-100)] text-xs font-bold text-[var(--brand-700)]">
                          {getUserInitials(session)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-snug text-[var(--ink-900)]">{getUserDisplayName(session)}</p>
                          <p className="font-mono text-[11px] font-semibold text-[var(--ink-500)]">ID: USER-{session.userId ?? "--"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${getStatusBadgeClass(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[var(--ink-700)]">{startedAt.time}</p>
                        <p className="text-[var(--ink-500)]">{startedAt.date}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-[var(--ink-700)]">
                          {durationText} / {timeLimitText}
                        </p>
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--brand-100)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-600),var(--brand-700))]"
                            style={{ width: `${durationProgress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-right text-sm font-bold text-[var(--ink-900)]">
                      {formatScore(session.totalScore)}
                    </td>
                    <td className="px-5 py-4 align-top text-right">
                      <Button
                        type="button"
                        variant={selectedSession?.id === session.id ? "soft" : "ghost"}
                        size="sm"
                        leftIcon={<Eye size={15} />}
                        onClick={() => handleViewSession(session)}
                        className={`h-8 w-8 rounded-md p-0 ${
                          selectedSession?.id === session.id
                            ? "bg-[var(--brand-100)] text-[var(--brand-700)]"
                            : "text-[var(--brand-700)] hover:bg-[var(--brand-100)]/60"
                        }`}
                        aria-label={`Xem session ${session.id}`}
                      />
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--line-soft)] bg-[var(--bg-soft)]/45 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--ink-600)]">
            <span className="font-bold text-[var(--brand-700)]">{paginatedSessions.length}</span> /{" "}
            <span className="font-bold text-[var(--brand-700)]">{visibleBaseSessions.length}</span> session
            {topOnly ? " trong top 10" : ""}.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="rounded-lg border-[var(--line-soft)] bg-white"
            >
              Trước
            </Button>
            <span className="rounded-lg border border-[var(--line-soft)] bg-white px-3 py-2 text-sm font-bold text-[var(--ink-700)]">
              {safeCurrentPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              className="rounded-lg border-[var(--line-soft)] bg-white"
            >
              Tiếp
            </Button>
          </div>
        </div>
      </Card>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
          <button
            type="button"
            aria-label="Đóng drawer"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-[var(--line-soft)] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-[var(--line-soft)] bg-[var(--bg-soft)]/65 p-5 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-500)]">Session</p>
                  <h3 className="mt-1 font-[var(--font-label)] text-2xl font-extrabold text-[var(--brand-700)]">
                    Session #{selectedSession?.id ?? "--"}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--ink-500)]">Chi tiết phiên làm bài</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="rounded-full border border-[var(--line-soft)] p-2 text-[var(--ink-600)] transition hover:bg-[var(--bg-soft)]"
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {selectedSession ? (
              <div className="space-y-5 p-5">
                <div className="flex items-center gap-4 rounded-[1.4rem] bg-[var(--bg-soft)] p-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand-600),var(--brand-700))] text-lg font-extrabold text-white shadow-[var(--shadow-brand)]">
                    {getUserInitials(selectedSession)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-extrabold text-[var(--ink-900)]">
                      {getUserDisplayName(selectedSession)}
                    </h3>
                    <p className="font-mono text-[11px] font-semibold text-[var(--brand-700)]">USER-{selectedSession.userId ?? "UNKNOWN"}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--line-soft)] bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Status</p>
                    <div className="mt-2 inline-flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getStatusBadgeClass(selectedSession.status)}`}>
                        {getStatusLabel(selectedSession.status)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--line-soft)] bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Score</p>
                    <div className="mt-2 text-xl font-extrabold text-[var(--ink-900)]">
                      {formatScore(selectedSession.totalScore)} / 10.0
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailLine label="Session ID" value={selectedSession.id} />
                  <DetailLine label="User ID" value={selectedSession.userId ?? "--"} />
                  <DetailLine label="Exam ID" value={selectedSession.examId ?? selectedExamId ?? "--"} />
                  <DetailLine
                    label="Status"
                    value={
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getStatusBadgeClass(selectedSession.status)}`}>
                        {getStatusLabel(selectedSession.status)}
                      </span>
                    }
                  />
                  <DetailLine
                    label="Is Locked"
                    value={
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${getLockedBadgeClass(selectedSession.isLocked)}`}>
                        {selectedSession.isLocked === null ? "Unknown" : selectedSession.isLocked ? "Locked" : "Open"}
                      </span>
                    }
                  />
                  <DetailLine label="Start Time" value={formatDateTime(selectedSession.startTime)} />
                  <DetailLine
                    label="Time Limit"
                    value={selectedSession.timeLimitMinutes ? `${selectedSession.timeLimitMinutes} phút` : "--"}
                  />
                  <DetailLine label="Duration" value={formatDuration(getSessionDurationSeconds(selectedSession))} />
                  <DetailLine label="Total Score" value={formatScore(selectedSession.totalScore)} />
                  <DetailLine label="Submit Reason" value={selectedSession.submitReason ?? "--"} />
                  <div className="sm:col-span-2">
                    <DetailLine label="Practice Topic Tags" value={selectedSession.practiceTopicTags ?? "--"} />
                  </div>
                </div>

              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
