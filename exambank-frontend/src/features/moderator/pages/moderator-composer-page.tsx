import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  FilePenLine,
  HelpCircle,
  Plus,
  RefreshCcw,
  Star,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { ComposerJsonImportModal } from "@/features/moderator/components/composer-json-import-modal";
import { StatCard } from "@/components/ui/StatCard/stat-card";
import {
  createComposerExam,
  createComposerQuestion,
  createComposerSubject,
  deleteComposerExam,
  listComposerExams,
  listComposerQuestions,
  listComposerSubjects,
  updateComposerExam,
} from "@/features/moderator/services/moderator-composer.service";
import type {
  ComposerExamPayload,
  ComposerExamRecord,
  ComposerQuestionPayload,
} from "@/features/moderator/types/moderator-composer.type";

type OverviewExamStatus = "DRAFT" | "PUBLISHED";

type OverviewFilterStatus = "ALL" | OverviewExamStatus;
type OverviewFilterSubject = string;

type OverviewExamRow = {
  id: string;
  examId: number;
  title: string;
  subject: string;
  level: string;
  questionCount: number;
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

const COMPOSER_FLASH_NOTICE_KEY = "moderator-composer-flash-notice";
const OVERVIEW_PAGE_SIZE = 10;
const JSON_IMPORT_API_EXAMPLE = {
  exams: [
    {
      title: "Đề thi thử Toán 10 - Chương Hàm số",
      subject: "Toán học",
      durationMinutes: 45,
      status: "DRAFT",
      questions: [
        {
          content: "Hàm số y = x^2 có đồ thị là gì?",
          type: "MCQ",
          topicTag: "Đại số",
          maxScore: 1,
          options: ["Đường thẳng", "Parabol", "Đường tròn", "Hyperbol"],
          answer: "B",
          answerExplanation: "Hàm bậc hai có đồ thị là parabol.",
        },
        {
          content: "Giải phương trình: 2x + 3 = 9",
          type: "FILL_IN_BLANK",
          topicTag: "Phương trình bậc nhất",
          maxScore: 1,
          answer: "3",
          answerExplanation: "2x = 6 => x = 3.",
        },
        {
          content: "Trình bày các bước chứng minh bất đẳng thức AM-GM cho hai số dương.",
          type: "ESSAY",
          topicTag: "Bất đẳng thức",
          maxScore: 2,
          answer: "Nêu được điều kiện a,b > 0 và chứng minh (a-b)^2 >= 0.",
        },
      ],
    },
  ],
};
const JSON_IMPORT_API_EXAMPLE_TEXT = JSON.stringify(JSON_IMPORT_API_EXAMPLE, null, 2);

type JsonImportObject = Record<string, unknown>;

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("ellipsis-left");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis-right");
  }

  items.push(totalPages);
  return items;
}

function statusBadgeClassName(status: OverviewExamStatus) {
  if (status === "PUBLISHED") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-600";
}

function statusDotClassName(status: OverviewExamStatus) {
  if (status === "PUBLISHED") {
    return "bg-blue-500";
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
  return status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp";
}

function mapExamStatusToOverview(exam: ComposerExamRecord): OverviewExamStatus {
  const normalized = (exam.status ?? "").toUpperCase();

  if (normalized === "PUBLISHED") {
    return "PUBLISHED";
  }

  // Any non-published status is still editable by moderator.
  return "DRAFT";
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
    publishedAt: exam.publishedAt,
    createdAt: exam.createdAt,
    ...patch,
  };
}

export default function ModeratorComposerPage() {
  const navigate = useNavigate();
  const [overviewStatus, setOverviewStatus] = useState<OverviewFilterStatus>("ALL");
  const [overviewSubject, setOverviewSubject] = useState<OverviewFilterSubject>("Tất cả môn học");
  const [overviewExamRows, setOverviewExamRows] = useState<OverviewExamRow[]>([]);
  const [flashNotice, setFlashNotice] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const noticeMessage = window.sessionStorage.getItem(COMPOSER_FLASH_NOTICE_KEY) ?? "";
    if (noticeMessage) {
      window.sessionStorage.removeItem(COMPOSER_FLASH_NOTICE_KEY);
    }

    return noticeMessage;
  });
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busyExamId, setBusyExamId] = useState<number | null>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [isJsonImportModalOpen, setIsJsonImportModalOpen] = useState(false);
  const [jsonImportText, setJsonImportText] = useState(JSON_IMPORT_API_EXAMPLE_TEXT);
  const [jsonImportUiError, setJsonImportUiError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);

  const subjectFilterOptions = useMemo(() => {
    const values = Array.from(new Set(overviewExamRows.map((item) => item.subject))).sort((a, b) =>
      a.localeCompare(b, "vi")
    );

    return ["Tất cả môn học", ...values];
  }, [overviewExamRows]);

  useEffect(() => {
    if (!subjectFilterOptions.includes(overviewSubject)) {
      setOverviewSubject("Tất cả môn học");
    }
  }, [overviewSubject, subjectFilterOptions]);

  useEffect(() => {
    if (!flashNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFlashNotice("");
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [flashNotice]);

  const filteredOverviewRows = useMemo(() => {
    return overviewExamRows.filter((item) => {
      const byStatus = overviewStatus === "ALL" || item.status === overviewStatus;
      const bySubject = overviewSubject === "Tất cả môn học" || item.subject === overviewSubject;

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

  const paginationItems = useMemo(() => {
    return buildPaginationItems(currentPage, totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [overviewStatus, overviewSubject]);

  useEffect(() => {
    setCurrentPage((prev) => Math.max(1, Math.min(prev, totalPages)));
  }, [totalPages]);

  const overviewStatItems = useMemo<OverviewStatItem[]>(() => {
    const draftCount = overviewExamRows.filter((item) => item.status === "DRAFT").length;
    const publishedCount = overviewExamRows.filter((item) => item.status === "PUBLISHED").length;
    const totalExams = overviewExamRows.length;
    const totalQuestions = overviewExamRows.reduce((sum, item) => sum + item.questionCount, 0);

    return [
      {
        title: "Bản nháp",
        value: formatCompactNumber(draftCount),
        badge: "Có thể chỉnh sửa",
        tone: "warning",
        icon: FilePenLine,
      },
      {
        title: "Đã xuất bản",
        value: formatCompactNumber(publishedCount),
        badge: "Đang hiển thị cho user",
        tone: "success",
        icon: CheckCircle2,
      },
      {
        title: "Tổng đề thi",
        value: formatCompactNumber(totalExams),
        badge: "",
        tone: "primary",
        icon: BookOpen,
      },
      {
        title: "Tổng câu hỏi",
        value: formatCompactNumber(totalQuestions),
        badge: "",
        tone: "primary",
        icon: Plus,
      },
    ];
  }, [overviewExamRows]);

  const refreshOverviewData = useCallback(async () => {
    setIsLoadingRows(true);
    setLoadError("");

    try {
      const [exams, questions, subjects] = await Promise.all([
        listComposerExams(),
        listComposerQuestions(),
        listComposerSubjects(),
      ]);

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
            subject: subjectNameById.get(exam.subjectId ?? -1) ?? "Chưa gán môn",
            level: exam.durationMinutes ? `${exam.durationMinutes} phút` : "Chưa đặt thời lượng",
            questionCount: questionCountByExam.get(exam.id) ?? 0,
            updatedAt: formatOverviewUpdatedAt(updatedSource),
            updatedEpoch,
            status: mapExamStatusToOverview(exam),
            source: exam,
          } satisfies OverviewExamRow;
        })
        .sort((a, b) => b.updatedEpoch - a.updatedEpoch);

      setOverviewExamRows(mappedRows);
    } catch (error) {
      setLoadError(extractApiErrorMessage(error, "Không thể tải danh sách đề thi từ backend."));
    } finally {
      setIsLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    void refreshOverviewData();
  }, [refreshOverviewData]);

  const iconActionClassName =
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-500)] transition hover:bg-[var(--bg-soft)] hover:text-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-45";

  function openComposerForm(examId?: number, viewOnly = false) {
    if (!examId) {
      navigate("/moderator/composer/form");
      return;
    }

    const viewQuery = viewOnly ? "&view=1" : "";
    navigate(`/moderator/composer/form?examId=${examId}${viewQuery}`);
  }

  async function updateExamWithPatch(
    row: OverviewExamRow,
    patch: Partial<ComposerExamPayload>,
    successMessage: string
  ) {
    const requestPayload = buildExamUpdatePayload(row.source, patch);
    if (!requestPayload) {
      window.alert("Đề thi này chưa có môn học hợp lệ nên chưa thể cập nhật.");
      return;
    }

    setBusyExamId(row.examId);
    try {
      await updateComposerExam(row.examId, requestPayload);
      setFlashNotice(successMessage);
      await refreshOverviewData();
    } catch (error) {
      window.alert(extractApiErrorMessage(error, "Cập nhật trạng thái đề thi thất bại."));
    } finally {
      setBusyExamId(null);
    }
  }

  async function publishOverviewExam(examId: number) {
    const targetExam = overviewExamRows.find((item) => item.examId === examId);
    if (!targetExam || targetExam.status !== "DRAFT") {
      return;
    }

    if (targetExam.questionCount <= 0) {
      window.alert(
        `Đề "${targetExam.title}" chưa có câu hỏi trên hệ thống. Vui lòng mở form tạo đề, thêm câu hỏi và bấm "Lưu bản nháp" trước khi xuất bản.`
      );
      return;
    }

    const shouldPublish = window.confirm(
      `Xuất bản đề "${targetExam.title}" để người dùng có thể truy cập ngay bây giờ?`
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
      "Đã xuất bản đề thi thành công."
    );
  }

  async function deleteOverviewExam(examId: number) {
    const targetExam = overviewExamRows.find((item) => item.examId === examId);
    if (!targetExam) {
      return;
    }

    const shouldDelete = window.confirm(
      `Xóa đề "${targetExam.title}"? Hành động này không thể hoàn tác.`
    );
    if (!shouldDelete) {
      return;
    }

    setBusyExamId(examId);
    try {
      await deleteComposerExam(examId);
      setFlashNotice("Đã xóa đề thi.");
      await refreshOverviewData();
    } catch (error) {
      window.alert(extractApiErrorMessage(error, "Xóa đề thi thất bại."));
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
      setJsonImportUiError(extractApiErrorMessage(error, "Không thể đọc nội dung file JSON."));
    } finally {
      event.target.value = "";
    }
  }

  async function importExamsFromJsonPayload(parsedPayload: unknown): Promise<JsonImportSummary> {
    const examItems = extractExamImportItems(parsedPayload);

    if (examItems.length === 0) {
      throw new Error("JSON không chứa đề thi hợp lệ để nhập.");
    }

    const existingSubjects = await listComposerSubjects();
    const subjectIdByKey = new Map(
      existingSubjects.map((subject) => [normalizeImportKey(subject.name), subject.id])
    );

    const resolveSubjectId = async (value: unknown) => {
      const fallbackSubjectName = "Chưa phân loại";
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
        `Đề import ${index + 1}`;

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
        const backendMessage = extractApiErrorMessage(error, "Lỗi xác thực dữ liệu từ backend.");
        failedExamMessages.push(`${examLabel}: ${backendMessage}`);
      }
    }

    if (importedExamCount === 0) {
      throw new Error("Không thể nhập đề thi nào từ JSON đã nhập.");
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
      setJsonImportUiError("Vui lòng nhập JSON trước khi bắt đầu import.");
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
            : "- Backend trả lỗi nhưng chưa có nội dung chi tiết.";
        const moreLine = overflowCount > 0 ? `\n- ... và ${overflowCount} lỗi khác.` : "";

        setJsonImportUiError(
          `Có ${summary.failedExamCount} đề import lỗi. Chi tiết từ backend:\n${detailLines}${moreLine}`
        );
        setFlashNotice(
          `Đã nhập ${summary.importedExamCount} đề (${summary.importedQuestionCount} câu hỏi), ${summary.failedExamCount} đề lỗi.`
        );
        return;
      }

      setFlashNotice(
        `Đã nhập thành công ${summary.importedExamCount} đề và ${summary.importedQuestionCount} câu hỏi từ JSON.`
      );

      setIsJsonImportModalOpen(false);
    } catch (error) {
      const backendMessages = extractApiErrorMessages(error, "Nhập JSON thất bại.");
      const previewMessages = backendMessages.slice(0, 5);
      const overflowCount = backendMessages.length - previewMessages.length;

      if (previewMessages.length <= 1) {
        setJsonImportUiError(previewMessages[0] ?? "Nhập JSON thất bại.");
      } else {
        const detailLines = previewMessages.map((message) => `- ${message}`).join("\n");
        const moreLine = overflowCount > 0 ? `\n- ... và ${overflowCount} lỗi khác.` : "";
        setJsonImportUiError(`Nhập JSON thất bại:\n${detailLines}${moreLine}`);
      }
    } finally {
      setIsImportingJson(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-1 pb-20">
      {flashNotice ? (
        <div className="fixed right-6 top-24 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 shadow-[0_8px_24px_rgba(16,21,38,0.12)]">
          {flashNotice}
        </div>
      ) : null}

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

      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="font-[var(--font-display)] text-4xl font-black tracking-tight text-[var(--ink-900)]">Quản lý Đề thi</h1>
          <p className="text-sm font-medium text-[var(--ink-600)] md:text-base">
            Theo dõi, xuất bản và quản lý hệ thống đề thi toàn quốc.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openJsonImportModal}
            disabled={isImportingJson}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line-soft)] bg-white px-4 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)]"
          >
            <Upload size={14} /> Nhập từ JSON
          </button>
          <button
            type="button"
            onClick={() => openComposerForm()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--brand-600)_0%,var(--brand-700)_100%)] px-5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105"
          >
            <Plus size={14} /> Tạo đề theo form
          </button>
        </div>
      </section>

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
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-500)]">Bộ lọc:</span>

          <select
            value={overviewStatus}
            onChange={(event) => setOverviewStatus(event.target.value as OverviewFilterStatus)}
            className="h-9 rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-500)]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
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
            title="Sắp xếp thời gian"
            className="h-9 rounded-lg border border-transparent bg-white px-3 text-sm font-medium text-[var(--ink-700)] outline-none transition focus:border-[var(--brand-500)]"
          >
            <option>Thời gian: Mới nhất</option>
            <option>Thời gian: Cũ nhất</option>
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
            <span className="ml-2">Làm mới</span>
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
              <RefreshCcw size={14} /> Thử tải lại
            </button>
          </div>
        ) : null}

        {!loadError && isLoadingRows ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-[var(--ink-500)]">
            Đang tải danh sách đề thi từ backend...
          </div>
        ) : null}

        {!loadError && !isLoadingRows && filteredOverviewRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm font-medium text-[var(--ink-500)]">
            Không có đề thi khớp bộ lọc hiện tại.
          </div>
        ) : null}

        {!loadError && !isLoadingRows && filteredOverviewRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-soft)]/35">
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Đề thi / Thông tin</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Trạng thái</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Số câu</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Ngày cập nhật</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-500)]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-soft)]">
                {paginatedOverviewRows.map((item) => {
                  const [updatedDate, updatedTime = ""] = item.updatedAt.split(" - ");
                  const isBusy = busyExamId === item.examId;

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-[var(--bg-soft)]/45">
                      <td className="px-6 py-4 align-top">
                        <p className="max-w-[30rem] text-[1.05rem] font-bold leading-snug text-[var(--ink-900)]">{item.title}</p>
                        <div className="mt-1.5 flex items-center gap-3 text-xs font-medium text-[var(--ink-500)]">
                          <span className="inline-flex items-center gap-1">
                            <BookOpen size={12} /> {item.subject}
                          </span>
                          <span>• {item.level}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClassName(item.status)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDotClassName(item.status)}`} />
                          {formatOverviewStatus(item.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center align-top text-sm font-bold text-[var(--ink-900)]">{item.questionCount}</td>

                      <td className="px-4 py-4 align-top text-xs">
                        <p className="font-semibold text-[var(--ink-700)]">{updatedDate}</p>
                        <p className="text-[var(--ink-500)]">{updatedTime}</p>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center justify-end gap-1">
                          {item.status === "DRAFT" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openComposerForm(item.examId)}
                                className={iconActionClassName}
                                title="Sửa"
                                disabled={isBusy}
                              >
                                <FilePenLine size={14} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Xuất bản cho người dùng"
                                disabled={isBusy}
                                onClick={() => {
                                  void publishOverviewExam(item.examId);
                                }}
                              >
                                <Upload size={14} />
                              </button>
                              <button
                                type="button"
                                className={iconActionClassName}
                                title="Xóa"
                                disabled={isBusy}
                                onClick={() => {
                                  void deleteOverviewExam(item.examId);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : null}

                          {item.status === "PUBLISHED" ? (
                            <>
                              <button
                                type="button"
                                className={iconActionClassName}
                                title="Xem"
                                disabled={isBusy}
                                onClick={() => openComposerForm(item.examId, true)}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className={iconActionClassName}
                                title="Xóa"
                                disabled={isBusy}
                                onClick={() => {
                                  void deleteOverviewExam(item.examId);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-[var(--line-soft)] bg-[var(--bg-soft)]/25 px-6 py-4">
          <button
            type="button"
            className={`inline-flex items-center gap-1 text-sm font-semibold transition ${
              currentPage <= 1
                ? "cursor-not-allowed text-slate-400"
                : "text-[var(--brand-700)] hover:text-[var(--brand-600)]"
            }`}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1 || filteredOverviewRows.length === 0}
          >
            <ArrowLeft size={14} /> Trước
          </button>

          <div className="flex items-center gap-1.5">
            {paginationItems.map((item) => {
              if (typeof item !== "number") {
                return (
                  <span key={item} className="px-1 text-sm text-[var(--ink-500)]">
                    ...
                  </span>
                );
              }

              const isCurrent = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold transition ${
                    isCurrent
                      ? "bg-[var(--brand-700)] font-bold text-white"
                      : "text-[var(--ink-700)] hover:bg-[var(--bg-soft)]"
                  }`}
                  onClick={() => setCurrentPage(item)}
                  disabled={isCurrent}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={`inline-flex items-center gap-1 text-sm font-semibold transition ${
              currentPage >= totalPages || filteredOverviewRows.length === 0
                ? "cursor-not-allowed text-slate-400"
                : "text-[var(--brand-700)] hover:text-[var(--brand-600)]"
            }`}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages || filteredOverviewRows.length === 0}
          >
            Tiếp theo <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section className="grid gap-6 pt-2 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="group relative overflow-hidden rounded-3xl bg-[linear-gradient(130deg,#1a4b84_0%,#0f4c93_100%)] p-8 text-white shadow-[var(--shadow-brand)]">
          <div className="relative z-10 max-w-xl space-y-3">
            <h2 className="font-[var(--font-display)] text-3xl font-black leading-tight">Bạn cần hỗ trợ xử lý đề thi?</h2>
            <p className="text-sm leading-relaxed text-white/85">
              Kiểm tra nội dung trước khi xuất bản để đảm bảo người dùng chỉ thấy các đề hoàn chỉnh và đúng chuẩn.
            </p>
            <button
              type="button"
              className="mt-1 inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-[var(--brand-700)] transition hover:bg-white/90"
            >
              Xem hướng dẫn
            </button>
          </div>
          <HelpCircle size={180} className="absolute -bottom-10 -right-7 text-white/10 transition-transform duration-500 group-hover:scale-105" />
        </article>

        <article className="flex flex-col justify-center gap-4 rounded-2xl border border-[var(--line-soft)] bg-white p-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ink-500)]">Mẹo Moderator</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 text-sm text-[var(--ink-700)]">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Zap size={13} />
              </span>
              <p>
                <span className="font-bold text-[var(--ink-900)]">Xem nhanh:</span> Sử dụng phím tắt{" "}
                <kbd className="rounded border border-[var(--line-soft)] bg-[var(--bg-soft)] px-1.5 py-0.5 text-[10px] font-bold">Space</kbd> để mở nhanh trình xem trước đề thi.
              </p>
            </li>
            <li className="flex items-start gap-3 text-sm text-[var(--ink-700)]">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Star size={13} />
              </span>
              <p>
                <span className="font-bold text-[var(--ink-900)]">Đề đã xuất bản:</span> Sau khi xuất bản, chỉ nên xem lại hoặc xóa; không chỉnh sửa trực tiếp để tránh sai lệch dữ liệu.
              </p>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
