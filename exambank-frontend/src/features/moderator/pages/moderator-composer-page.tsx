import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confirm, alert as showAlert } from "@/lib/dialog";
import { useToast } from "@/components/ui/Toast/toast-system";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  BookOpen,
  CheckCircle2,
  Eye,
  FilePenLine,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCcw,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { ComposerJsonImportModal } from "@/features/moderator/components/composer-json-import-modal";
import { StatCard } from "@/components/ui/StatCard/stat-card";
import { Pagination } from "@/components/ui/Pagination/pagination";
import {
  createComposerExam,
  createComposerQuestion,
  createComposerSubject,
  deleteComposerExam,
  getModeratorAiImport,
  listComposerOwnedExams,
  listComposerQuestions,
  listComposerSubjects,
  parseModeratorAiDraft,
  uploadModeratorAiImport,
  updateComposerExam,
} from "@/features/moderator/services/moderator-composer.service";
import {
  COMPOSER_AI_IMPORT_DRAFT_KEY,
  readPendingModeratorAiImportJobs,
  removePendingModeratorAiImportJob,
  upsertPendingModeratorAiImportJob,
  type PendingModeratorAiImportJob,
} from "@/features/moderator/services/moderator-ai-import-tracker";
import type {
  ComposerAiImportJob,
  ComposerExamPayload,
  ComposerExamRecord,
  ComposerQuestionRecord,
  ComposerQuestionPayload,
  ComposerSubjectRecord,
} from "@/features/moderator/types/moderator-composer.type";

type OverviewExamStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "ONGOING"
  | "CLOSED"
  | "LOCKED"
  | "REJECTED";

type OverviewFilterStatus = "ALL" | OverviewExamStatus;
type OverviewFilterSubject = string;

type OverviewExamRow = {
  id: string;
  examId: number;
  title: string;
  subject: string;
  level: string;
  questionCount: number;
  startAt: string;
  endAt: string;
  updatedAt: string;
  updatedEpoch: number;
  status: OverviewExamStatus;
  source: ComposerExamRecord;
};

type OverviewStatTone = "primary" | "success" | "warning" | "danger";

type OverviewStatItem = {
  title: string;
  value: string;
  badge: string;
  tone: OverviewStatTone;
  icon: typeof BookOpen;
};

type JsonImportSummary = {
  importedExamCount: number;
  importedQuestionCount: number;
  failedExamCount: number;
  failedExamMessages: string[];
};

const OVERVIEW_PAGE_SIZE = 10;
const JSON_IMPORT_API_EXAMPLE = {
  exams: [
    {
      title: "Äá» thi thá»­ ToÃ¡n 10 - ChÆ°Æ¡ng HÃ m sá»‘",
      subject: "ToÃ¡n há»c",
      durationMinutes: 45,
      status: "DRAFT",
      questions: [
        {
          content: "HÃ m sá»‘ y = x^2 cÃ³ Ä‘á»“ thá»‹ lÃ  gÃ¬?",
          type: "MCQ",
          topicTag: "Äáº¡i sá»‘",
          maxScore: 1,
          options: ["ÄÆ°á»ng tháº³ng", "Parabol", "ÄÆ°á»ng trÃ²n", "Hyperbol"],
          answer: "B",
          answerExplanation: "HÃ m báº­c hai cÃ³ Ä‘á»“ thá»‹ lÃ  parabol.",
        },
        {
          content: "Giáº£i phÆ°Æ¡ng trÃ¬nh: 2x + 3 = 9",
          type: "FILL_IN_BLANK",
          topicTag: "PhÆ°Æ¡ng trÃ¬nh báº­c nháº¥t",
          maxScore: 1,
          answer: "3",
          answerExplanation: "2x = 6 => x = 3.",
        },
        {
          content: "TrÃ¬nh bÃ y cÃ¡c bÆ°á»›c chá»©ng minh báº¥t Ä‘áº³ng thá»©c AM-GM cho hai sá»‘ dÆ°Æ¡ng.",
          type: "ESSAY",
          topicTag: "Báº¥t Ä‘áº³ng thá»©c",
          maxScore: 2,
          answer: "NÃªu Ä‘Æ°á»£c Ä‘iá»u kiá»‡n a,b > 0 vÃ  chá»©ng minh (a-b)^2 >= 0.",
        },
      ],
    },
  ],
};
const JSON_IMPORT_API_EXAMPLE_TEXT = JSON.stringify(JSON_IMPORT_API_EXAMPLE, null, 2);

const AI_IMPORT_POLL_INTERVAL_MS = 3000;

type JsonImportObject = Record<string, unknown>;

const AI_IMPORT_CLASS_OPTIONS = Array.from({ length: 12 }, (_, index) => `Lá»›p ${index + 1}`);


function statusBadgeClassName(status: OverviewExamStatus) {
  if (status === "ONGOING") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "PUBLISHED") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "CLOSED") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "LOCKED") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "PENDING_REVIEW") {
    return "bg-violet-100 text-violet-700";
  }

  if (status === "REJECTED") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-600";
}

function statusDotClassName(status: OverviewExamStatus) {
  if (status === "ONGOING") {
    return "bg-emerald-500";
  }

  if (status === "PUBLISHED") {
    return "bg-blue-500";
  }

  if (status === "CLOSED") {
    return "bg-amber-500";
  }

  if (status === "LOCKED" || status === "REJECTED") {
    return "bg-rose-500";
  }

  if (status === "PENDING_REVIEW") {
    return "bg-violet-500";
  }

  return "bg-slate-400";
}

function overviewStatToneClasses(tone: OverviewStatTone) {
  if (tone === "success") {
    return {
      border: "border-emerald-200",
      iconWrap: "bg-emerald-50 text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }

  if (tone === "warning") {
    return {
      border: "border-amber-200",
      iconWrap: "bg-amber-50 text-amber-700",
      badge: "bg-amber-100 text-amber-700",
    };
  }

  if (tone === "danger") {
    return {
      border: "border-rose-200",
      iconWrap: "bg-rose-50 text-rose-700",
      badge: "bg-rose-100 text-rose-700",
    };
  }

  return {
    border: "border-blue-200",
    iconWrap: "bg-[var(--brand-050)] text-[var(--brand-700)]",
    badge: "bg-[var(--brand-100)] text-[var(--brand-700)]",
  };
}

function formatOverviewUpdatedAt(input: string | null) {
  if (!input) {
    return "--";
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const datePart = date.toLocaleDateString("vi-VN");
  const timePart = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${datePart} - ${timePart}`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatOverviewStatus(status: OverviewExamStatus) {
  if (status === "PUBLISHED") return "Published";
  if (status === "ONGOING") return "Ongoing";
  if (status === "CLOSED") return "Closed";
  if (status === "LOCKED") return "Locked";
  if (status === "PENDING_REVIEW") return "Pending Review";
  if (status === "REJECTED") return "Rejected";
  return "Draft";
}

function normalizeOverviewExamStatus(status?: string): OverviewExamStatus {
  const normalized = (status ?? "").trim().toUpperCase();
  if (
    normalized === "DRAFT" ||
    normalized === "PENDING_REVIEW" ||
    normalized === "PUBLISHED" ||
    normalized === "ONGOING" ||
    normalized === "CLOSED" ||
    normalized === "LOCKED" ||
    normalized === "REJECTED"
  ) {
    return normalized;
  }
  return "DRAFT";
}

function isEditableOverviewStatus(status: OverviewExamStatus): boolean {
  return status === "DRAFT" || status === "PENDING_REVIEW" || status === "REJECTED";
}

function isPublishableOverviewStatus(status: OverviewExamStatus): boolean {
  return status === "DRAFT" || status === "PENDING_REVIEW" || status === "REJECTED";
}

function mapExamStatusToOverview(exam: ComposerExamRecord): OverviewExamStatus {
  return normalizeOverviewExamStatus(exam.status);
}

function formatPreviewQuestionType(type: string | null | undefined) {
  const normalized = (type ?? "").trim().toUpperCase();
  if (normalized === "MCQ") return "Multiple choice";
  if (normalized === "FILL_IN_BLANK") return "Fill in blank";
  if (normalized === "ESSAY") return "Essay";
  return normalized || "Question";
}

function parsePreviewQuestionOptions(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    // fallback plain text split
  }

  return raw
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function collectApiErrorMessagesFromData(value: unknown, depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectApiErrorMessagesFromData(item, depth + 1));
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const fieldName = typeof record.field === "string" ? record.field.trim() : "";
  const directMessage = [record.message, record.error, record.detail, record.defaultMessage, record.reason]
    .flatMap((item) => collectApiErrorMessagesFromData(item, depth + 1))
    .find((item) => item.length > 0);

  if (fieldName && directMessage) {
    return [`${fieldName}: ${directMessage}`];
  }

  const priorityMessages = [
    record.message,
    record.error,
    record.detail,
    record.defaultMessage,
    record.reason,
    record.errors,
    record.violations,
    record.fieldErrors,
  ].flatMap((item) => collectApiErrorMessagesFromData(item, depth + 1));

  if (priorityMessages.length > 0) {
    return priorityMessages;
  }

  return Object.entries(record).flatMap(([key, nestedValue]) => {
    const nestedMessages = collectApiErrorMessagesFromData(nestedValue, depth + 1);
    if (nestedMessages.length === 0) {
      return [];
    }

    if (typeof nestedValue === "string") {
      return [`${key}: ${nestedMessages[0]}`];
    }

    return nestedMessages.map((message) => `${key}: ${message}`);
  });
}

function normalizeApiErrorMessages(messages: string[]): string[] {
  const uniqueMessages = new Set<string>();

  for (const message of messages) {
    const normalized = message.trim();
    if (!normalized) {
      continue;
    }

    uniqueMessages.add(normalized);
  }

  return Array.from(uniqueMessages);
}

function extractApiErrorMessages(error: unknown, fallbackMessage: string): string[] {
  if (!isAxiosError(error)) {
    if (error instanceof Error && error.message.trim()) {
      return [error.message.trim()];
    }

    return [fallbackMessage];
  }

  const responseMessages = normalizeApiErrorMessages(
    collectApiErrorMessagesFromData(error.response?.data)
  );
  if (responseMessages.length > 0) {
    return responseMessages;
  }

  if (error.message?.trim()) {
    return [error.message.trim()];
  }

  return [fallbackMessage];
}

function extractApiErrorMessage(error: unknown, fallbackMessage: string) {
  return extractApiErrorMessages(error, fallbackMessage)[0] ?? fallbackMessage;
}

function toTrimmedString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeImportKey(value: unknown) {
  return toTrimmedString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeImportedExamStatus(value: unknown): ComposerExamPayload["status"] {
  const normalized = toTrimmedString(value).toUpperCase();

  if (
    normalized === "DRAFT" ||
    normalized === "PENDING_REVIEW" ||
    normalized === "PUBLISHED" ||
    normalized === "ONGOING" ||
    normalized === "CLOSED" ||
    normalized === "LOCKED" ||
    normalized === "REJECTED"
  ) {
    return normalized;
  }

  return "DRAFT";
}

function normalizeImportedQuestionType(value: unknown): ComposerQuestionPayload["type"] {
  const normalized = normalizeImportKey(value);

  if (normalized.includes("fill") || normalized.includes("blank") || normalized.includes("dien")) {
    return "FILL_IN_BLANK";
  }

  if (normalized.includes("essay") || normalized.includes("luan")) {
    return "ESSAY";
  }

  return "MCQ";
}

function extractOptionsFromJson(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toTrimmedString(item))
      .filter((item) => item.length > 0);
  }

  if (value && typeof value === "object") {
    const objectValue = value as JsonImportObject;
    const orderedByChoiceLabel = ["A", "B", "C", "D", "a", "b", "c", "d"]
      .map((key) => toTrimmedString(objectValue[key]))
      .filter((item) => item.length > 0);

    if (orderedByChoiceLabel.length > 0) {
      return orderedByChoiceLabel;
    }

    return Object.values(objectValue)
      .map((item) => toTrimmedString(item))
      .filter((item) => item.length > 0);
  }

  const rawString = toTrimmedString(value);
  if (!rawString) {
    return [];
  }

  if (rawString.startsWith("[") || rawString.startsWith("{")) {
    try {
      return extractOptionsFromJson(JSON.parse(rawString));
    } catch {
      // Keep fallback split below when JSON parsing fails.
    }
  }

  return rawString
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toImportObjectArray(value: unknown): JsonImportObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is JsonImportObject => Boolean(item) && typeof item === "object");
}

function extractExamImportItems(payload: unknown): JsonImportObject[] {
  if (Array.isArray(payload)) {
    return toImportObjectArray(payload);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload = payload as JsonImportObject;
  const listCandidates = [
    objectPayload.exams,
    objectPayload.items,
    objectPayload.data,
    objectPayload.payload,
    objectPayload.result,
  ];

  for (const candidate of listCandidates) {
    if (Array.isArray(candidate)) {
      return toImportObjectArray(candidate);
    }
  }

  return [objectPayload];
}

function buildExamUpdatePayload(
  exam: ComposerExamRecord,
  patch: Partial<ComposerExamPayload>
): ComposerExamPayload | null {
  if (!exam.subjectId) {
    return null;
  }

  return {
    title: exam.title,
    subjectId: exam.subjectId,
    uploadedBy: exam.uploadedBy,
    approvedBy: exam.approvedBy,
    durationMinutes: exam.durationMinutes,
    status: exam.status,
    moderatorNote: exam.moderatorNote,
    startAt: exam.startAt,
    endAt: exam.endAt,
    publishedAt: exam.publishedAt,
    createdAt: exam.createdAt,
    ...patch,
  };
}

export default function ModeratorComposerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [overviewStatus, setOverviewStatus] = useState<OverviewFilterStatus>("ALL");
  const [overviewSubject, setOverviewSubject] = useState<OverviewFilterSubject>("Táº¥t cáº£ mÃ´n há»c");
  const [overviewExamRows, setOverviewExamRows] = useState<OverviewExamRow[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busyExamId, setBusyExamId] = useState<number | null>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [isJsonImportModalOpen, setIsJsonImportModalOpen] = useState(false);
  const [jsonImportText, setJsonImportText] = useState(JSON_IMPORT_API_EXAMPLE_TEXT);
  const [jsonImportUiError, setJsonImportUiError] = useState("");
  const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
  const [isSubmittingAiImport, setIsSubmittingAiImport] = useState(false);
  const [aiImportError, setAiImportError] = useState("");
  const [aiImportTitle, setAiImportTitle] = useState("Äá» thi AI import");
  const [aiImportFile, setAiImportFile] = useState<File | null>(null);
  const [aiImportClassName, setAiImportClassName] = useState("Lá»›p 12");
  const [aiImportDurationMinutes, setAiImportDurationMinutes] = useState("45");
  const [availableComposerSubjects, setAvailableComposerSubjects] = useState<ComposerSubjectRecord[]>([]);
  const [aiImportSubjectId, setAiImportSubjectId] = useState<number | "">("");
  const [allOverviewQuestions, setAllOverviewQuestions] = useState<ComposerQuestionRecord[]>([]);
  const [previewExamRow, setPreviewExamRow] = useState<OverviewExamRow | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<ComposerQuestionRecord[]>([]);
  const [pendingAiImportJobs, setPendingAiImportJobs] = useState<PendingModeratorAiImportJob[]>(() =>
    readPendingModeratorAiImportJobs()
  );
  const [liveAiImportJobs, setLiveAiImportJobs] = useState<ComposerAiImportJob[]>([]);
  const [completedAiImportJobs, setCompletedAiImportJobs] = useState<ComposerAiImportJob[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);
  const aiImportInputRef = useRef<HTMLInputElement | null>(null);

  const subjectFilterOptions = useMemo(() => {
    const values = Array.from(new Set(overviewExamRows.map((item) => item.subject))).sort((a, b) =>
      a.localeCompare(b, "vi")
    );

    return ["Táº¥t cáº£ mÃ´n há»c", ...values];
  }, [overviewExamRows]);

  useEffect(() => {
    if (!subjectFilterOptions.includes(overviewSubject)) {
      setOverviewSubject("Táº¥t cáº£ mÃ´n há»c");
    }
  }, [overviewSubject, subjectFilterOptions]);

  useEffect(() => {
    setPendingAiImportJobs(readPendingModeratorAiImportJobs());
  }, []);

  useEffect(() => {
    if (pendingAiImportJobs.length === 0) {
      setLiveAiImportJobs([]);
      return;
    }

    let cancelled = false;

    async function syncPendingJobs() {
      const nextLiveJobs: ComposerAiImportJob[] = [];

      for (const pendingJob of pendingAiImportJobs) {
        try {
          const job = await getModeratorAiImport(pendingJob.jobId);
          if (cancelled) {
            return;
          }

          const normalizedStatus = String(job.status ?? "").toUpperCase();
          if (job.draftJson || normalizedStatus === "NORMALIZED" || normalizedStatus === "COMPLETED") {
            removePendingModeratorAiImportJob(job.id);
            setPendingAiImportJobs(readPendingModeratorAiImportJobs());
            setCompletedAiImportJobs((currentJobs) => {
              if (currentJobs.some((item) => item.id === job.id)) {
                return currentJobs;
              }
              return [job, ...currentJobs];
            });
            toast.success({
              title: "AI import",
              message: `Đã trích xuất xong \"${job.title?.trim() || pendingJob.title}\".`,
              actionText: "Mở bản nháp",
              onAction: () => openAiImportDraft(job),
              duration: 9000,
              showProgress: true,
            });
            continue;
          }

          if (normalizedStatus === "FAILED") {
            removePendingModeratorAiImportJob(job.id);
            setPendingAiImportJobs(readPendingModeratorAiImportJobs());
            toast.error({
              title: "AI import thất bại",
              message: job.errorMessage?.trim() || `Không thể trích xuất \"${pendingJob.title}\".`,
            });
            continue;
          }

          nextLiveJobs.push(job);
        } catch (error) {
          if (!cancelled) {
            nextLiveJobs.push({
              id: pendingJob.jobId,
              status: "PENDING",
              originalFileName: pendingJob.title,
              title: pendingJob.title,
              createdAt: pendingJob.createdAt,
            });
          }
        }
      }

      if (!cancelled) {
        setLiveAiImportJobs(nextLiveJobs);
      }
    }

    void syncPendingJobs();
    const intervalId = window.setInterval(() => {
      void syncPendingJobs();
    }, AI_IMPORT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pendingAiImportJobs, toast]);

  const filteredOverviewRows = useMemo(() => {
    return overviewExamRows.filter((item) => {
      const byStatus = overviewStatus === "ALL" || item.status === overviewStatus;
      const bySubject = overviewSubject === "Táº¥t cáº£ mÃ´n há»c" || item.subject === overviewSubject;

      return byStatus && bySubject;
    });
  }, [overviewExamRows, overviewStatus, overviewSubject]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredOverviewRows.length / OVERVIEW_PAGE_SIZE));
  }, [filteredOverviewRows.length]);

  const paginatedOverviewRows = useMemo(() => {
    const startIndex = (currentPage - 1) * OVERVIEW_PAGE_SIZE;
    return filteredOverviewRows.slice(startIndex, startIndex + OVERVIEW_PAGE_SIZE);
  }, [currentPage, filteredOverviewRows]);

  const trackedAiImportJobs = useMemo(() => {
    const liveById = new Map(liveAiImportJobs.map((job) => [job.id, job]));
    const pendingRows = pendingAiImportJobs.map((pendingJob) => {
      const liveJob = liveById.get(pendingJob.jobId);
      return {
        id: pendingJob.jobId,
        title: liveJob?.title?.trim() || pendingJob.title,
        status: liveJob?.status ?? "PENDING",
        progressPercent: liveJob?.progressPercent ?? 0,
        progressMessage: liveJob?.progressMessage ?? "AI đang trích xuất đề...",
        completed: false,
        job: liveJob,
      };
    });
    const completedRows = completedAiImportJobs.map((job) => ({
      id: job.id,
      title: job.title?.trim() || `AI import #${job.id}`,
      status: job.status,
      progressPercent: 100,
      progressMessage: "Đã trích xuất xong, chờ moderator xác nhận.",
      completed: true,
      job,
    }));

    return [...completedRows, ...pendingRows];
  }, [completedAiImportJobs, liveAiImportJobs, pendingAiImportJobs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [overviewStatus, overviewSubject]);

  useEffect(() => {
    setCurrentPage((prev) => Math.max(1, Math.min(prev, totalPages)));
  }, [totalPages]);

  const overviewStatItems = useMemo<OverviewStatItem[]>(() => {
    const editableCount = overviewExamRows.filter((item) => isEditableOverviewStatus(item.status)).length;
    const publicCount = overviewExamRows.filter((item) => item.status === "PUBLISHED" || item.status === "ONGOING").length;
    const closedOrLockedCount = overviewExamRows.filter((item) => item.status === "CLOSED" || item.status === "LOCKED").length;
    const totalExams = overviewExamRows.length;

    return [
      {
        title: "CÃ³ thá»ƒ chá»‰nh sá»­a",
        value: formatCompactNumber(editableCount),
        badge: "Draft / chá» duyá»‡t / tá»« chá»‘i",
        tone: "warning",
        icon: FilePenLine,
      },
      {
        title: "Äang hiá»ƒn thá»‹",
        value: formatCompactNumber(publicCount),
        badge: "Published / Ongoing",
        tone: "success",
        icon: CheckCircle2,
      },
      {
        title: "ÄÃ£ Ä‘Ã³ng / khÃ³a",
        value: formatCompactNumber(closedOrLockedCount),
        badge: "Closed / Locked",
        tone: "danger",
        icon: Zap,
      },
      {
        title: "Tá»•ng Ä‘á» thi",
        value: formatCompactNumber(totalExams),
        badge: "",
        tone: "primary",
        icon: BookOpen,
      },
    ];
  }, [overviewExamRows]);

  const refreshOverviewData = useCallback(async () => {
    setIsLoadingRows(true);
    setLoadError("");

    try {
      const [exams, questions, subjects] = await Promise.all([
        listComposerOwnedExams(),
        listComposerQuestions(),
        listComposerSubjects(),
      ]);
      setAvailableComposerSubjects(subjects);

      const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));
      const questionCountByExam = new Map<number, number>();

      questions.forEach((question) => {
        if (question.examId === null) {
          return;
        }

        questionCountByExam.set(
          question.examId,
          (questionCountByExam.get(question.examId) ?? 0) + 1
        );
      });

      const mappedRows = exams
        .map((exam) => {
          const updatedSource = exam.publishedAt ?? exam.createdAt;
          const parsedUpdatedTime = updatedSource ? new Date(updatedSource).getTime() : 0;
          const updatedEpoch = Number.isNaN(parsedUpdatedTime) ? 0 : parsedUpdatedTime;

          return {
            id: `OV-${exam.id}`,
            examId: exam.id,
            title: exam.title,
            subject: subjectNameById.get(exam.subjectId ?? -1) ?? "ChÆ°a gÃ¡n mÃ´n",
            level: exam.durationMinutes ? `${exam.durationMinutes} phÃºt` : "ChÆ°a Ä‘áº·t thá»i lÆ°á»£ng",
            questionCount: questionCountByExam.get(exam.id) ?? 0,
            startAt: formatOverviewUpdatedAt(exam.startAt ?? null),
            endAt: formatOverviewUpdatedAt(exam.endAt ?? null),
            updatedAt: formatOverviewUpdatedAt(updatedSource),
            updatedEpoch,
            status: mapExamStatusToOverview(exam),
            source: exam,
          } satisfies OverviewExamRow;
        })
        .sort((a, b) => b.updatedEpoch - a.updatedEpoch);

      setAllOverviewQuestions(questions);
      setOverviewExamRows(mappedRows);
    } catch (error) {
      setLoadError(extractApiErrorMessage(error, "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch Ä‘á» thi tá»« backend."));
    } finally {
      setIsLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    void refreshOverviewData();
  }, [refreshOverviewData]);

  const iconActionClassName =
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-500)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-45";

  function openComposerForm(examId?: number) {
    if (!examId) {
      navigate("/moderator/composer/form");
      return;
    }

    navigate(`/moderator/composer/form?examId=${examId}`);
  }

  function resetAiImportModalState() {
    setIsSubmittingAiImport(false);
    setAiImportError("");
    setAiImportFile(null);
    if (aiImportInputRef.current) {
      aiImportInputRef.current.value = "";
    }
    setAiImportTitle("Äá» thi AI import");
    setAiImportClassName("Lá»›p 12");
    setAiImportDurationMinutes("45");
    setAiImportSubjectId(availableComposerSubjects[0]?.id ?? "");
  }

  function openAiImportModal() {
    resetAiImportModalState();
    setIsAiImportModalOpen(true);
  }

  function closeAiImportModal() {
    if (isSubmittingAiImport) {
      return;
    }

    setIsAiImportModalOpen(false);
  }

  function openAiImportDraft(job: ComposerAiImportJob) {
    const parsedDraft = parseModeratorAiDraft(job.draftJson);
    if (!parsedDraft) {
      toast.error({
        title: "AI import",
        message: job.errorMessage?.trim() || "Báº£n nhÃ¡p AI import khÃ´ng há»£p lá»‡.",
      });
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(COMPOSER_AI_IMPORT_DRAFT_KEY, JSON.stringify(parsedDraft));
    }
    removePendingModeratorAiImportJob(job.id);
    setPendingAiImportJobs(readPendingModeratorAiImportJobs());
    setCompletedAiImportJobs((currentJobs) => currentJobs.filter((item) => item.id !== job.id));
    navigate(`/moderator/composer/form?aiImportJobId=${job.id}`);
  }

  async function submitAiImport() {
    if (!aiImportFile) {
      setAiImportError("Vui lÃ²ng chá»n file PDF hoáº·c áº£nh Ä‘á»ƒ AI xá»­ lÃ½.");
      return;
    }

    if (!aiImportTitle.trim()) {
      setAiImportError("Vui lÃ²ng nháº­p tiÃªu Ä‘á» Ä‘á» thi.");
      return;
    }

    const resolvedDuration = Number(aiImportDurationMinutes);
    if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) {
      setAiImportError("Thá»i lÆ°á»£ng lÃ m bÃ i pháº£i lá»›n hÆ¡n 0.");
      return;
    }

    setIsSubmittingAiImport(true);
    setAiImportError("");

    try {
      const selectedSubject = availableComposerSubjects.find((item) => item.id === aiImportSubjectId);
      const job = await uploadModeratorAiImport({
        file: aiImportFile,
        title: aiImportTitle.trim(),
        subjectId: typeof aiImportSubjectId === "number" ? aiImportSubjectId : undefined,
        subjectName: selectedSubject?.name,
        className: aiImportClassName,
        durationMinutes: resolvedDuration,
      });

      upsertPendingModeratorAiImportJob({
        jobId: job.id,
        title: job.title?.trim() || aiImportTitle.trim() || `AI import #${job.id}`,
        createdAt: job.createdAt ?? new Date().toISOString(),
      });
      setPendingAiImportJobs(readPendingModeratorAiImportJobs());
      setLiveAiImportJobs((currentJobs) => [job, ...currentJobs.filter((item) => item.id !== job.id)]);
      setIsAiImportModalOpen(false);
      toast.info({
        title: "AI import",
        message: "AI đang trích xuất đề trong nền. Bạn có thể chuyển sang việc khác và quay lại sau.",
        duration: 5200,
        showProgress: true,
      });
    } catch (error) {
      setAiImportError(
        extractApiErrorMessage(error, "KhÃ´ng thá»ƒ khá»Ÿi táº¡o tÃ¡c vá»¥ AI import tá»« file Ä‘Ã£ chá»n.")
      );
    } finally {
      setIsSubmittingAiImport(false);
    }
  }

  function openExamPreview(row: OverviewExamRow) {
    setPreviewExamRow(row);
    const orderedQuestions = allOverviewQuestions
      .filter((question) => question.examId === row.examId)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    setPreviewQuestions(orderedQuestions);
  }

  function closeExamPreview() {
    setPreviewExamRow(null);
    setPreviewQuestions([]);
  }

  async function updateExamWithPatch(
    row: OverviewExamRow,
    patch: Partial<ComposerExamPayload>,
    successMessage: string
  ) {
    const requestPayload = buildExamUpdatePayload(row.source, patch);
    if (!requestPayload) {
      await showAlert("Äá» thi nÃ y chÆ°a cÃ³ mÃ´n há»c há»£p lá»‡ nÃªn chÆ°a thá»ƒ cáº­p nháº­t.");
      return;
    }

    setBusyExamId(row.examId);
    try {
      await updateComposerExam(row.examId, requestPayload);
      toast.success({
        title: "Há»‡ thá»‘ng",
        message: successMessage,
        duration: 3600,
        showProgress: true,
      });
      await refreshOverviewData();
    } catch (error) {
      await showAlert(extractApiErrorMessage(error, "Cáº­p nháº­t tráº¡ng thÃ¡i Ä‘á» thi tháº¥t báº¡i."));
    } finally {
      setBusyExamId(null);
    }
  }

  async function publishOverviewExam(examId: number) {
    const targetExam = overviewExamRows.find((item) => item.examId === examId);
    if (!targetExam || !isPublishableOverviewStatus(targetExam.status)) {
      return;
    }

    if (targetExam.questionCount <= 0) {
      await showAlert(
        `Äá» "${targetExam.title}" chÆ°a cÃ³ cÃ¢u há»i trÃªn há»‡ thá»‘ng. Vui lÃ²ng má»Ÿ form táº¡o Ä‘á», thÃªm cÃ¢u há»i vÃ  báº¥m "LÆ°u báº£n nhÃ¡p" trÆ°á»›c khi xuáº¥t báº£n.`
      );
      return;
    }

    const shouldPublish = await confirm(
      `Xuáº¥t báº£n Ä‘á» "${targetExam.title}" Ä‘á»ƒ ngÆ°á»i dÃ¹ng cÃ³ thá»ƒ truy cáº­p ngay bÃ¢y giá»?`,
      {
        title: "Xuáº¥t báº£n Ä‘á» thi",
        type: "info",
        confirmText: "Xuáº¥t báº£n",
        cancelText: "Há»§y",
      }
    );
    if (!shouldPublish) {
      return;
    }

    await updateExamWithPatch(
      targetExam,
      {
        status: "PUBLISHED",
        publishedAt: new Date().toISOString(),
      },
      "ÄÃ£ xuáº¥t báº£n Ä‘á» thi thÃ nh cÃ´ng."
    );
  }

  async function deleteOverviewExam(examId: number) {
    const targetExam = overviewExamRows.find((item) => item.examId === examId);
    if (!targetExam) {
      return;
    }

    const shouldDelete = await confirm(
      `XÃ³a Ä‘á» "${targetExam.title}"? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.`,
      {
        title: "XÃ³a Ä‘á» thi",
        type: "danger",
        confirmText: "XÃ³a",
        cancelText: "Há»§y",
      }
    );
    if (!shouldDelete) {
      return;
    }

    setBusyExamId(examId);
    try {
      await deleteComposerExam(examId);
      toast.success({
        title: "Há»‡ thá»‘ng",
        message: "ÄÃ£ xÃ³a Ä‘á» thi.",
        duration: 3600,
        showProgress: true,
      });
      await refreshOverviewData();
    } catch (error) {
      await showAlert(extractApiErrorMessage(error, "XÃ³a Ä‘á» thi tháº¥t báº¡i."));
    } finally {
      setBusyExamId(null);
    }
  }

  function openJsonImportModal() {
    if (isImportingJson) {
      return;
    }

    setJsonImportUiError("");
    setIsJsonImportModalOpen(true);
  }

  function closeJsonImportModal() {
    if (isImportingJson) {
      return;
    }

    setIsJsonImportModalOpen(false);
  }

  function openJsonImportPicker() {
    if (isImportingJson) {
      return;
    }

    jsonImportInputRef.current?.click();
  }

  async function handleJsonImportFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    try {
      const rawContent = await selectedFile.text();
      setJsonImportText(rawContent);
      setJsonImportUiError("");
    } catch (error) {
      setJsonImportUiError(extractApiErrorMessage(error, "KhÃ´ng thá»ƒ Ä‘á»c ná»™i dung file JSON."));
    } finally {
      event.target.value = "";
    }
  }

  async function importExamsFromJsonPayload(parsedPayload: unknown): Promise<JsonImportSummary> {
    const examItems = extractExamImportItems(parsedPayload);

    if (examItems.length === 0) {
      throw new Error("JSON khÃ´ng chá»©a Ä‘á» thi há»£p lá»‡ Ä‘á»ƒ nháº­p.");
    }

    const existingSubjects = await listComposerSubjects();
    const subjectIdByKey = new Map(
      existingSubjects.map((subject) => [normalizeImportKey(subject.name), subject.id])
    );

    const resolveSubjectId = async (value: unknown) => {
      const fallbackSubjectName = "ChÆ°a phÃ¢n loáº¡i";
      const subjectName = toTrimmedString(value) || fallbackSubjectName;
      const subjectKey = normalizeImportKey(subjectName);

      const existingId = subjectIdByKey.get(subjectKey);
      if (existingId) {
        return existingId;
      }

      const createdSubject = await createComposerSubject({ name: subjectName });
      subjectIdByKey.set(subjectKey, createdSubject.id);
      return createdSubject.id;
    };

    let importedExamCount = 0;
    let importedQuestionCount = 0;
    let failedExamCount = 0;
    const failedExamMessages: string[] = [];

    for (let index = 0; index < examItems.length; index += 1) {
      const examItem = examItems[index];
      const examLabel =
        toTrimmedString(examItem.title ?? examItem.examTitle ?? examItem.name) ||
        `Äá» import ${index + 1}`;

      try {
        const title = examLabel;
        const durationRaw = toFiniteNumber(
          examItem.durationMinutes ?? examItem.duration ?? examItem.timeLimit
        );
        const durationMinutes = durationRaw && durationRaw > 0 ? Math.round(durationRaw) : 60;
        const subjectId = await resolveSubjectId(
          examItem.subject ?? examItem.subjectName ?? examItem.monHoc
        );

        const createdExam = await createComposerExam({
          title,
          subjectId,
          durationMinutes,
          status: normalizeImportedExamStatus(examItem.status),
        });

        importedExamCount += 1;

        const questionItems = toImportObjectArray(
          examItem.questions ?? examItem.questionList ?? examItem.items
        );

        let orderIndex = 1;
        for (const questionItem of questionItems) {
          const content =
            toTrimmedString(questionItem.content ?? questionItem.question ?? questionItem.text);
          if (!content) {
            continue;
          }

          const maxScoreRaw = toFiniteNumber(
            questionItem.maxScore ?? questionItem.score ?? questionItem.points
          );

          const options = extractOptionsFromJson(
            questionItem.options ?? questionItem.choices ?? questionItem.answers
          );

          const answer =
            toTrimmedString(
              questionItem.answer ??
                questionItem.correctAnswer ??
                questionItem.correct ??
                questionItem.solution
            ) || null;

          const payload: ComposerQuestionPayload = {
            examId: createdExam.id,
            subjectId,
            content,
            type: normalizeImportedQuestionType(questionItem.type ?? questionItem.questionType),
            topicTag:
              toTrimmedString(questionItem.topicTag ?? questionItem.tag ?? questionItem.tags) ||
              null,
            maxScore: maxScoreRaw && maxScoreRaw > 0 ? maxScoreRaw : 1,
            options: options.length > 0 ? JSON.stringify(options) : null,
            answer,
            answerExplanation:
              toTrimmedString(
                questionItem.answerExplanation ?? questionItem.explanation ?? questionItem.note
              ) || null,
            difficulty: toFiniteNumber(questionItem.difficulty),
            orderIndex,
            active: true,
          };

          await createComposerQuestion(payload);
          importedQuestionCount += 1;
          orderIndex += 1;
        }
      } catch (error) {
        failedExamCount += 1;
        const backendMessage = extractApiErrorMessage(error, "Lá»—i xÃ¡c thá»±c dá»¯ liá»‡u tá»« backend.");
        failedExamMessages.push(`${examLabel}: ${backendMessage}`);
      }
    }

    if (importedExamCount === 0) {
      throw new Error("KhÃ´ng thá»ƒ nháº­p Ä‘á» thi nÃ o tá»« JSON Ä‘Ã£ nháº­p.");
    }

    return {
      importedExamCount,
      importedQuestionCount,
      failedExamCount,
      failedExamMessages: normalizeApiErrorMessages(failedExamMessages),
    };
  }

  async function submitJsonImport() {
    const normalizedInput = jsonImportText.trim();
    if (!normalizedInput) {
      setJsonImportUiError("Vui lÃ²ng nháº­p JSON trÆ°á»›c khi báº¯t Ä‘áº§u import.");
      return;
    }

    setIsImportingJson(true);
    setJsonImportUiError("");

    try {
      const parsedPayload = JSON.parse(normalizedInput) as unknown;
      const summary = await importExamsFromJsonPayload(parsedPayload);

      await refreshOverviewData();

      if (summary.failedExamCount > 0) {
        const previewMessages = summary.failedExamMessages.slice(0, 5);
        const overflowCount = summary.failedExamMessages.length - previewMessages.length;
        const detailLines =
          previewMessages.length > 0
            ? previewMessages.map((message) => `- ${message}`).join("\n")
            : "- Backend tráº£ lá»—i nhÆ°ng chÆ°a cÃ³ ná»™i dung chi tiáº¿t.";
        const moreLine = overflowCount > 0 ? `\n- ... vÃ  ${overflowCount} lá»—i khÃ¡c.` : "";

        setJsonImportUiError(
          `CÃ³ ${summary.failedExamCount} Ä‘á» import lá»—i. Chi tiáº¿t tá»« backend:\n${detailLines}${moreLine}`
        );
        toast.warning({
          title: "Nháº­p JSON",
          message: `ÄÃ£ nháº­p ${summary.importedExamCount} Ä‘á» (${summary.importedQuestionCount} cÃ¢u há»i), ${summary.failedExamCount} Ä‘á» lá»—i.`,
          duration: 5200,
          showProgress: true,
        });
        return;
      }

      toast.success({
        title: "Nháº­p JSON",
        message: `ÄÃ£ nháº­p thÃ nh cÃ´ng ${summary.importedExamCount} Ä‘á» vÃ  ${summary.importedQuestionCount} cÃ¢u há»i tá»« JSON.`,
        duration: 3800,
        showProgress: true,
      });

      setIsJsonImportModalOpen(false);
    } catch (error) {
      const backendMessages = extractApiErrorMessages(error, "Nháº­p JSON tháº¥t báº¡i.");
      const previewMessages = backendMessages.slice(0, 5);
      const overflowCount = backendMessages.length - previewMessages.length;

      if (previewMessages.length <= 1) {
        setJsonImportUiError(previewMessages[0] ?? "Nháº­p JSON tháº¥t báº¡i.");
      } else {
        const detailLines = previewMessages.map((message) => `- ${message}`).join("\n");
        const moreLine = overflowCount > 0 ? `\n- ... vÃ  ${overflowCount} lá»—i khÃ¡c.` : "";
        setJsonImportUiError(`Nháº­p JSON tháº¥t báº¡i:\n${detailLines}${moreLine}`);
      }
    } finally {
      setIsImportingJson(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-1 pb-20">
      <ComposerJsonImportModal
        open={isJsonImportModalOpen}
        isImporting={isImportingJson}
        jsonImportText={jsonImportText}
        jsonImportUiError={jsonImportUiError}
        jsonImportInputRef={jsonImportInputRef}
        exampleValueText={JSON_IMPORT_API_EXAMPLE_TEXT}
        onClose={closeJsonImportModal}
        onOpenFilePicker={openJsonImportPicker}
        onFileSelected={handleJsonImportFileSelected}
        onJsonImportTextChange={setJsonImportText}
        onSubmit={() => {
          void submitJsonImport();
        }}
      />

      <input
        ref={aiImportInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff"
        className="hidden"
        onChange={(event) => {
          setAiImportFile(event.target.files?.[0] ?? null);
          setAiImportError("");
        }}
      />

      {isAiImportModalOpen ? (
        <div className="fixed inset-0 z-[1260] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <button type="button" className="absolute inset-0" onClick={closeAiImportModal} aria-label="ÄÃ³ng" />
          <section className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--line-soft)] bg-white shadow-[0_28px_64px_rgba(15,23,42,0.22)]">
            <div className="border-b border-[var(--line-soft)] bg-[linear-gradient(135deg,#f5f9ff_0%,#eef6ff_100%)] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-100)] text-[var(--brand-700)]">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="pt-2 text-xl font-black text-[var(--ink-900)]">Táº¡o Ä‘á» báº±ng AI tá»« PDF hoáº·c áº£nh</h2>
                  <p className="text-sm text-[var(--ink-600)]">
                    AI sáº½ bÃ³c tÃ¡ch cÃ¢u há»i vÃ  Ä‘á»• vÃ o form moderator Ä‘á»ƒ báº¡n rÃ  soÃ¡t, chá»‰nh sá»­a vÃ  lÆ°u nhÆ° luá»“ng táº¡o Ä‘á» hiá»‡n táº¡i.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAiImportModal}
                  disabled={isSubmittingAiImport}
                  className="rounded-xl p-2 text-[var(--ink-500)] transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-[var(--ink-700)]">
                  <span>TiÃªu Ä‘á» Ä‘á» thi</span>
                  <input
                    value={aiImportTitle}
                    onChange={(event) => setAiImportTitle(event.target.value)}
                    className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                    disabled={isSubmittingAiImport}
                  />
                </label>
                <label className="space-y-2 text-sm font-semibold text-[var(--ink-700)]">
                  <span>MÃ´n há»c</span>
                  <select
                    value={aiImportSubjectId}
                    onChange={(event) => setAiImportSubjectId(event.target.value ? Number(event.target.value) : "")}
                    className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                    disabled={isSubmittingAiImport || availableComposerSubjects.length === 0}
                  >
                    {availableComposerSubjects.length === 0 ? (
                      <option value="">ChÆ°a cÃ³ mÃ´n há»c</option>
                    ) : null}
                    {availableComposerSubjects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold text-[var(--ink-700)]">
                  <span>Lá»›p há»c</span>
                  <select
                    value={aiImportClassName}
                    onChange={(event) => setAiImportClassName(event.target.value)}
                    className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                    disabled={isSubmittingAiImport}
                  >
                    {AI_IMPORT_CLASS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold text-[var(--ink-700)]">
                  <span>Thá»i lÆ°á»£ng (phÃºt)</span>
                  <input
                    type="number"
                    min={1}
                    value={aiImportDurationMinutes}
                    onChange={(event) => setAiImportDurationMinutes(event.target.value)}
                    className="w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 py-2.5 outline-none transition focus:border-[var(--brand-500)]"
                    disabled={isSubmittingAiImport}
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-dashed border-[var(--line-soft)] bg-[var(--bg-soft)]/50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-800)]">File nguá»“n cho AI</p>
                    <p className="mt-1 text-sm text-[var(--ink-500)]">
                      Há»— trá»£ PDF vÃ  áº£nh. AI sáº½ parse ná»™i dung rá»“i chuyá»ƒn sang form moderator Ä‘á»ƒ báº¡n duyá»‡t láº¡i.
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--ink-700)]">{aiImportFile ? aiImportFile.name : "ChÆ°a chá»n file"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => aiImportInputRef.current?.click()}
                      disabled={isSubmittingAiImport}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line-soft)] bg-white px-4 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Upload size={14} /> Chá»n file
                    </button>
                  </div>
                </div>
              </div>

              {aiImportError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{aiImportError}</div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAiImportModal}
                  disabled={isSubmittingAiImport}
                  className="inline-flex h-11 items-center rounded-xl border border-[var(--line-soft)] bg-white px-4 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Há»§y
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void submitAiImport();
                  }}
                  disabled={isSubmittingAiImport}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--brand-600)_0%,var(--brand-700)_100%)] px-5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingAiImport ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isSubmittingAiImport ? "Äang xá»­ lÃ½ AI..." : "Táº¡o báº£n nhÃ¡p AI"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-[var(--ink-900)]">Quáº£n lÃ½ Äá» thi</h1>
          <p className="text-sm font-medium text-[var(--ink-600)] md:text-base">
            Theo dÃµi, xuáº¥t báº£n vÃ  quáº£n lÃ½ há»‡ thá»‘ng Ä‘á» thi toÃ n quá»‘c.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openJsonImportModal}
            disabled={isImportingJson}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line-soft)] bg-white px-4 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)]"
          >
            <Upload size={14} /> Nháº­p tá»« JSON
          </button>
          <button
            type="button"
            onClick={openAiImportModal}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] px-4 text-sm font-semibold text-[var(--brand-700)] transition hover:border-[var(--brand-300)] hover:bg-[var(--brand-100)]"
          >
            <Sparkles size={14} /> Táº¡o Ä‘á» báº±ng AI
          </button>
          <button
            type="button"
            onClick={() => openComposerForm()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--brand-600)_0%,var(--brand-700)_100%)] px-5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105"
          >
            <Plus size={14} /> Táº¡o Ä‘á» theo form
          </button>
        </div>
      </section>

      {trackedAiImportJobs.length > 0 ? (
        <section className="rounded-2xl border border-sky-100 bg-white px-5 py-4 shadow-[0_8px_28px_rgba(16,21,38,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Sparkles size={17} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[var(--ink-900)]">AI import đang chạy nền</h2>
                <p className="text-xs font-medium text-[var(--ink-500)]">
                  Trạng thái được lưu trong tab này, có thể quay lại để mở bản nháp khi hoàn tất.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {trackedAiImportJobs.map((item) => {
              const clampedProgress = Math.max(0, Math.min(100, item.progressPercent ?? 0));
              const completedJob = item.completed ? item.job : undefined;
              return (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--bg-soft)]/50 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-[var(--ink-900)]">{item.title}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-[var(--ink-500)]">
                        {item.completed ? "DONE" : item.status}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all"
                        style={{ width: `${item.completed ? 100 : clampedProgress}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-[var(--ink-500)]">{item.progressMessage}</p>
                  </div>
                  {completedJob ? (
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 text-sm font-bold text-white transition hover:bg-sky-700"
                      onClick={() => openAiImportDraft(completedJob)}
                    >
                      <CheckCircle2 size={14} /> Mở bản nháp
                    </button>
                  ) : (
                    <span className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-sky-100 bg-white px-3 text-sm font-semibold text-sky-700">
                      <Loader2 size={14} className="animate-spin" /> Đang chạy
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewStatItems.map((item) => {
          const tone = overviewStatToneClasses(item.tone);
          const Icon = item.icon;

          return (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              icon={<Icon size={19} />}
              badge={item.badge}
              cardClassName={`border ${tone.border}`}
              iconWrapClassName={`h-11 w-11 ${tone.iconWrap}`}
              badgeClassName={tone.badge}
              valueClassName="font-bold text-[var(--ink-900)]"
            />
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-white shadow-[0_8px_28px_rgba(16,21,38,0.06)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line-soft)] bg-[var(--bg-soft)]/45 px-5 py-4 md:px-6">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-500)]">Bá»™ lá»c:</span>

          <select
            value={overviewStatus}
            onChange={(event) => setOverviewStatus(event.target.value as OverviewFilterStatus)}
            className="h-9 rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-500)]"
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="PUBLISHED">Published</option>
            <option value="ONGOING">Ongoing</option>
            <option value="CLOSED">Closed</option>
            <option value="LOCKED">Locked</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={overviewSubject}
            onChange={(event) => setOverviewSubject(event.target.value)}
            className="h-9 rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-500)]"
          >
            {subjectFilterOptions.map((subjectOption) => (
              <option key={subjectOption}>{subjectOption}</option>
            ))}
          </select>

          <select
            title="Sáº¯p xáº¿p thá»i gian"
            className="h-9 rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-500)]"
          >
            <option>Thá»i gian: Má»›i nháº¥t</option>
            <option>Thá»i gian: CÅ© nháº¥t</option>
          </select>

          <button
            type="button"
            className="ml-auto inline-flex h-9 items-center rounded-lg border border-[var(--line-soft)] bg-white px-3 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)]"
            onClick={() => {
              void refreshOverviewData();
            }}
            disabled={isLoadingRows}
          >
            <RefreshCcw size={13} className={isLoadingRows ? "animate-spin" : ""} />
            <span className="ml-2">LÃ m má»›i</span>
          </button>
        </div>

        {loadError ? (
          <div className="space-y-3 px-6 py-12 text-center">
            <p className="text-sm font-medium text-rose-700">{loadError}</p>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--line-soft)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)]"
              onClick={() => {
                void refreshOverviewData();
              }}
            >
              <RefreshCcw size={14} /> Thá»­ táº£i láº¡i
            </button>
          </div>
        ) : null}

        {!loadError && isLoadingRows ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-[var(--ink-500)]">
            Äang táº£i danh sÃ¡ch Ä‘á» thi tá»« backend...
          </div>
        ) : null}

        {!loadError && !isLoadingRows && filteredOverviewRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-[var(--ink-500)]">
            KhÃ´ng cÃ³ Ä‘á» thi khá»›p bá»™ lá»c hiá»‡n táº¡i.
          </div>
        ) : null}

        {!loadError && !isLoadingRows && filteredOverviewRows.length > 0 ? (
          <div className="overflow-x-auto px-4 md:px-6">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-soft)]/35">
                  <th className="px-8 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Äá» thi / ThÃ´ng tin</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Tráº¡ng thÃ¡i</th>
                  <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Sá»‘ cÃ¢u</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Báº¯t Ä‘áº§u</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Káº¿t thÃºc</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">NgÃ y cáº­p nháº­t</th>
                  <th className="px-8 py-3 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Thao tÃ¡c</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-soft)]">
                {paginatedOverviewRows.map((item) => {
                  const [startDate, startTime = ""] = item.startAt.split(" - ");
                  const [endDate, endTime = ""] = item.endAt.split(" - ");
                  const [updatedDate, updatedTime = ""] = item.updatedAt.split(" - ");
                  const isBusy = busyExamId === item.examId;
                  const canEdit = isEditableOverviewStatus(item.status);
                  const canPublish = isPublishableOverviewStatus(item.status);

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-[var(--bg-soft)]/45">
                      <td className="px-8 py-4 align-top">
                        <p className="max-w-[30rem] text-[1.05rem] font-bold leading-snug text-[var(--ink-900)]">{item.title}</p>
                        <div className="mt-1.5 flex items-center gap-3 text-xs font-medium text-[var(--ink-500)]">
                          <span className="inline-flex items-center gap-1">
                            <BookOpen size={12} /> {item.subject}
                          </span>
                          <span>â€¢ {item.level}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClassName(item.status)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDotClassName(item.status)}`} />
                          {formatOverviewStatus(item.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center align-top text-sm font-bold text-[var(--ink-900)]">{item.questionCount}</td>

                      <td className="px-5 py-4 align-top text-xs">
                        <p className="font-semibold text-[var(--ink-700)]">{startDate}</p>
                        <p className="text-[var(--ink-500)]">{startTime}</p>
                      </td>

                      <td className="px-5 py-4 align-top text-xs">
                        <p className="font-semibold text-[var(--ink-700)]">{endDate}</p>
                        <p className="text-[var(--ink-500)]">{endTime}</p>
                      </td>

                      <td className="px-5 py-4 align-top text-xs">
                        <p className="font-semibold text-[var(--ink-700)]">{updatedDate}</p>
                        <p className="text-[var(--ink-500)]">{updatedTime}</p>
                      </td>

                      <td className="px-8 py-4 align-top">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openComposerForm(item.examId)}
                                className={iconActionClassName}
                                title="Sá»­a"
                                disabled={isBusy}
                              >
                                <FilePenLine size={14} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Xuáº¥t báº£n cho ngÆ°á»i dÃ¹ng"
                                disabled={isBusy || !canPublish}
                                onClick={() => {
                                  void publishOverviewExam(item.examId);
                                }}
                              >
                                <Upload size={14} />
                              </button>
                              <button
                                type="button"
                                className={iconActionClassName}
                                title="XÃ³a"
                                disabled={isBusy}
                                onClick={() => {
                                  void deleteOverviewExam(item.examId);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={iconActionClassName}
                                title="Xem"
                                disabled={isBusy}
                                onClick={() => openExamPreview(item)}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className={iconActionClassName}
                                title="XÃ³a"
                                disabled={isBusy}
                                onClick={() => {
                                  void deleteOverviewExam(item.examId);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {filteredOverviewRows.length > 0 && totalPages > 1 ? (
          <div className="border-t border-[var(--line-soft)] bg-[var(--bg-soft)]/25 px-6 py-4">
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 pt-2 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="group relative overflow-hidden rounded-3xl bg-[linear-gradient(130deg,#1a4b84_0%,#0f4c93_100%)] p-8 text-white shadow-[var(--shadow-brand)]">
          <div className="relative z-10 max-w-xl space-y-3">
            <h2 className="font-[var(--font-display)] text-3xl font-black leading-tight">Báº¡n cáº§n há»— trá»£ xá»­ lÃ½ Ä‘á» thi?</h2>
            <p className="text-sm leading-relaxed text-white/85">
              Kiá»ƒm tra ná»™i dung trÆ°á»›c khi xuáº¥t báº£n Ä‘á»ƒ Ä‘áº£m báº£o ngÆ°á»i dÃ¹ng chá»‰ tháº¥y cÃ¡c Ä‘á» hoÃ n chá»‰nh vÃ  Ä‘Ãºng chuáº©n.
            </p>
            <button
              type="button"
              className="mt-1 inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-[var(--brand-700)] transition hover:bg-white/90"
            >
              Xem hÆ°á»›ng dáº«n
            </button>
          </div>
          <HelpCircle size={180} className="absolute -bottom-10 -right-7 text-white/10 transition-transform duration-500 group-hover:scale-105" />
        </article>

        <article className="flex flex-col justify-center gap-4 rounded-2xl border border-[var(--line-soft)] bg-white p-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ink-500)]">Máº¹o Moderator</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 text-sm text-[var(--ink-700)]">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Zap size={13} />
              </span>
              <p>
                <span className="font-bold text-[var(--ink-900)]">Xem nhanh:</span> Sá»­ dá»¥ng phÃ­m táº¯t{" "}
                <kbd className="rounded border border-[var(--line-soft)] bg-[var(--bg-soft)] px-1.5 py-0.5 text-[10px] font-bold">Space</kbd> Ä‘á»ƒ má»Ÿ nhanh trÃ¬nh xem trÆ°á»›c Ä‘á» thi.
              </p>
            </li>
            <li className="flex items-start gap-3 text-sm text-[var(--ink-700)]">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Star size={13} />
              </span>
              <p>
                <span className="font-bold text-[var(--ink-900)]">Äá» Ä‘Ã£ xuáº¥t báº£n:</span> Sau khi xuáº¥t báº£n, chá»‰ nÃªn xem láº¡i hoáº·c xÃ³a; khÃ´ng chá»‰nh sá»­a trá»±c tiáº¿p Ä‘á»ƒ trÃ¡nh sai lá»‡ch dá»¯ liá»‡u.
              </p>
            </li>
          </ul>
        </article>
      </section>

      {previewExamRow ? (
        <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm">
          <button type="button" className="absolute inset-0" onClick={closeExamPreview} aria-label="ÄÃ³ng" />
          <section className="relative z-10 flex h-[min(88vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#d6d9df] bg-white shadow-[0_28px_64px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between bg-[linear-gradient(90deg,#eef5ff_0%,#fff6ea_55%,#eef7ff_100%)] px-3 py-1.5">
              <h3 className="truncate text-[1.1rem] font-bold tracking-tight text-[#111827]">Ná»™i dung Ä‘á» thi</h3>
              <button
                type="button"
                className="rounded-lg p-1.5 text-[#6b7280] hover:bg-white/70"
                onClick={closeExamPreview}
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <section className="mb-3 rounded-lg border border-[#dde5f3] bg-[#fbfdff] px-4 py-3">
                <p className="text-xs text-[var(--ink-600)]">TiÃªu Ä‘á» Ä‘á» thi</p>
                <p className="mt-1 text-[1rem] font-semibold text-[var(--ink-900)]">{previewExamRow.title}</p>
              </section>

              {previewQuestions.length === 0 ? (
                <div className="rounded-lg border border-[var(--line-soft)] px-3 py-8 text-center text-sm text-[var(--ink-600)]">
                  Äá» thi chÆ°a cÃ³ cÃ¢u há»i.
                </div>
              ) : null}

              {previewQuestions.length > 0 ? (
                <div className="space-y-3">
                  {previewQuestions.map((question, index) => {
                    const options = parsePreviewQuestionOptions(question.options);
                    const normalizedAnswer = (question.answer ?? "").trim().toLowerCase();

                    return (
                      <article key={question.id} className="rounded-lg border border-[#dce4f3] bg-white p-3">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">Q{index + 1}</span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                            {formatPreviewQuestionType(question.type)}
                          </span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                            {question.maxScore ?? 0} point{question.maxScore === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="prose prose-sm max-w-none text-[var(--ink-900)]" dangerouslySetInnerHTML={{ __html: question.content ?? "" }} />

                        {question.imageUrl ? (
                          <img
                            src={question.imageUrl}
                            alt={`question-${question.id}`}
                            className="mt-2 max-h-36 w-auto max-w-full rounded border border-[var(--line-soft)] object-contain"
                          />
                        ) : null}

                        {options.length > 0 ? (
                          <ul className="mt-3 space-y-1.5 text-[12px]">
                            {options.map((option, optionIndex) => {
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
                                  {isCorrect ? <CheckCircle2 size={14} className="text-emerald-600" /> : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

