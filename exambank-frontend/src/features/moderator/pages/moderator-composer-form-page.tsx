import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Plus,
  RefreshCcw,
  Save,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  createComposerSubject,
  createComposerExam,
  createComposerQuestion,
  getComposerExamById,
  getComposerQuestionById,
  listComposerExamQuestions,
  listComposerSubjects,
  removeComposerExamQuestion,
  updateComposerExam,
} from "@/features/moderator/services/moderator-composer.service";
import type {
  ComposerQuestionPayload,
  ComposerQuestionRecord,
  ComposerSubjectRecord,
} from "@/features/moderator/types/moderator-composer.type";

type QuestionType =
  | "Trắc nghiệm (Multiple Choice)"
  | "Đúng/Sai (True/False)"
  | "Tự điền đáp án (Fill in blank)";

type QuestionDraft = {
  id: string;
  persistedQuestionId?: number;
  type: QuestionType;
  subjectLine: string;
  content: string;
  points: number;
  tags: string;
  options?: string[];
  correctOption?: number;
  trueAnswer?: boolean;
  answer?: string;
};

type NewQuestionForm = {
  subjectLine: string;
  content: string;
  points: string;
  tags: string;
  options: string[];
  correctOption: string;
  trueAnswer: "true" | "false";
  answer: string;
};

type QuestionTypeConfig = {
  type: QuestionType;
  title: string;
  subtitle: string;
  accentClassName: string;
};

type SavedSnapshot = {
  examId: number | null;
  title: string;
  subject: string;
  durationMinutes: number;
  questionSignature: string;
};

const questionTypeConfigs: QuestionTypeConfig[] = [
  {
    type: "Trắc nghiệm (Multiple Choice)",
    title: "Phần trắc nghiệm",
    subtitle: "Dành cho câu hỏi có nhiều phương án lựa chọn.",
    accentClassName: "text-[var(--brand-700)] bg-[var(--brand-100)]",
  },
  {
    type: "Đúng/Sai (True/False)",
    title: "Phần đúng sai",
    subtitle: "Dành cho câu khẳng định kiểm tra nhận định.",
    accentClassName: "text-emerald-700 bg-emerald-100",
  },
  {
    type: "Tự điền đáp án (Fill in blank)",
    title: "Phần tự điền đáp án",
    subtitle: "Dành cho câu yêu cầu nhập kết quả chính xác.",
    accentClassName: "text-amber-700 bg-amber-100",
  },
];

const COMPOSER_FLASH_NOTICE_KEY = "moderator-composer-flash-notice";
const DEFAULT_EXAM_TITLE = "Kiểm tra cuối kỳ - Giải tích & Lịch sử";
const DEFAULT_SUBJECT = "Toán học";
const DEFAULT_DURATION_MINUTES = 90;
const DRAFT_NOTICE_HIDE_SCROLL_Y = 320;

const initialQuestions: QuestionDraft[] = [];

function optionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function buildNewQuestionForm(subject: string): NewQuestionForm {
  return {
    subjectLine: subject,
    content: "",
    points: "1",
    tags: "",
    options: ["", "", "", ""],
    correctOption: "0",
    trueAnswer: "true",
    answer: "",
  };
}

function buildQuestionForms(subject: string): Record<QuestionType, NewQuestionForm> {
  return {
    "Trắc nghiệm (Multiple Choice)": buildNewQuestionForm(subject),
    "Đúng/Sai (True/False)": buildNewQuestionForm(subject),
    "Tự điền đáp án (Fill in blank)": buildNewQuestionForm(subject),
  };
}

function buildQuestionSignature(source: QuestionDraft[]) {
  const normalized = source.map((question) => ({
    type: question.type,
    content: question.content.trim(),
    points: question.points,
    tags: question.tags.trim(),
    options: question.options ? [...question.options.map((option) => option.trim())] : undefined,
    correctOption: question.correctOption ?? null,
    trueAnswer: question.trueAnswer ?? null,
    answer: question.answer?.trim() ?? null,
  }));

  return JSON.stringify(normalized);
}

function normalizeSubjectName(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function findSubjectByName(subjects: ComposerSubjectRecord[], subjectName: string) {
  const normalizedName = normalizeSubjectName(subjectName);
  if (!normalizedName) {
    return null;
  }

  return (
    subjects.find((item) => normalizeSubjectName(item.name) === normalizedName) ?? null
  );
}

function extractApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!isAxiosError(error)) {
    return fallbackMessage;
  }

  const responseData = error.response?.data;
  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    const data = responseData as Record<string, unknown>;
    const message = data.message ?? data.error ?? data.detail;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function parseOptionsJson(rawOptions: string | null): string[] {
  if (!rawOptions) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawOptions) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => String(item));
  } catch {
    return [];
  }
}

function normalizeMcqOptions(source: string[]) {
  if (source.length >= 4) {
    return source.slice(0, 4);
  }

  const fallback = [...source];
  while (fallback.length < 4) {
    fallback.push("");
  }

  return fallback;
}

function looksLikeTrueFalseOptions(source: string[]) {
  if (source.length !== 2) {
    return false;
  }

  const normalized = source.map((item) => item.trim().toLowerCase());
  const hasTrue = normalized.some((item) => item === "đúng" || item === "dung" || item === "true");
  const hasFalse = normalized.some((item) => item === "sai" || item === "false");

  return hasTrue && hasFalse;
}

function resolveTrueFalseAnswer(answer: string | null) {
  const normalized = (answer ?? "").trim().toLowerCase();
  if (normalized === "sai" || normalized === "false" || normalized === "b") {
    return false;
  }

  return true;
}

function resolveMcqAnswerIndex(answer: string | null, options: string[]) {
  const normalized = (answer ?? "").trim().toLowerCase();
  const byLabel = ["a", "b", "c", "d"].indexOf(normalized);
  if (byLabel >= 0) {
    return byLabel;
  }

  const byOptionText = options.findIndex((option) => option.trim().toLowerCase() === normalized);
  if (byOptionText >= 0) {
    return byOptionText;
  }

  return 0;
}

function mapBackendQuestionToDraft(question: ComposerQuestionRecord, subjectName: string): QuestionDraft {
  if (question.type === "FILL_IN_BLANK" || question.type === "ESSAY") {
    return {
      id: `Q-${question.id}`,
      persistedQuestionId: question.id,
      type: "Tự điền đáp án (Fill in blank)",
      subjectLine: subjectName,
      content: question.content,
      points: question.maxScore ?? 1,
      tags: question.topicTag ?? "",
      answer: question.answer ?? "",
    };
  }

  const parsedOptions = parseOptionsJson(question.options);
  if (looksLikeTrueFalseOptions(parsedOptions)) {
    return {
      id: `Q-${question.id}`,
      persistedQuestionId: question.id,
      type: "Đúng/Sai (True/False)",
      subjectLine: subjectName,
      content: question.content,
      points: question.maxScore ?? 1,
      tags: question.topicTag ?? "",
      trueAnswer: resolveTrueFalseAnswer(question.answer),
    };
  }

  const normalizedOptions = normalizeMcqOptions(parsedOptions);
  return {
    id: `Q-${question.id}`,
    persistedQuestionId: question.id,
    type: "Trắc nghiệm (Multiple Choice)",
    subjectLine: subjectName,
    content: question.content,
    points: question.maxScore ?? 1,
    tags: question.topicTag ?? "",
    options: normalizedOptions,
    correctOption: resolveMcqAnswerIndex(question.answer, normalizedOptions),
  };
}

function buildQuestionPayload(
  question: QuestionDraft,
  subjectId: number,
  examId: number,
  orderIndex: number
): ComposerQuestionPayload {
  if (question.type === "Đúng/Sai (True/False)") {
    return {
      examId,
      subjectId,
      content: question.content.trim(),
      type: "MCQ",
      topicTag: question.tags.trim() || null,
      maxScore: question.points,
      options: JSON.stringify(["Đúng", "Sai"]),
      answer: question.trueAnswer ? "Đúng" : "Sai",
      orderIndex,
      active: true,
    };
  }

  if (question.type === "Tự điền đáp án (Fill in blank)") {
    return {
      examId,
      subjectId,
      content: question.content.trim(),
      type: "FILL_IN_BLANK",
      topicTag: question.tags.trim() || null,
      maxScore: question.points,
      options: null,
      answer: question.answer?.trim() || "",
      orderIndex,
      active: true,
    };
  }

  const normalizedOptions = normalizeMcqOptions(question.options ?? []);
  const selectedCorrect = Math.max(0, Math.min(question.correctOption ?? 0, 3));

  return {
    examId,
    subjectId,
    content: question.content.trim(),
    type: "MCQ",
    topicTag: question.tags.trim() || null,
    maxScore: question.points,
    options: JSON.stringify(normalizedOptions),
    answer: optionLabel(selectedCorrect),
    orderIndex,
    active: true,
  };
}

export default function ModeratorComposerFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewOnlyFromQuery = useMemo(() => searchParams.get("view") === "1", [searchParams]);
  const editingExamIdFromQuery = useMemo(() => {
    const rawExamId = searchParams.get("examId");
    if (!rawExamId) {
      return null;
    }

    const parsed = Number(rawExamId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const [examTitle, setExamTitle] = useState(DEFAULT_EXAM_TITLE);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [questions, setQuestions] = useState<QuestionDraft[]>(initialQuestions);

  const [availableSubjects, setAvailableSubjects] = useState<ComposerSubjectRecord[]>([]);
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot | null>(null);

  const [newQuestionForms, setNewQuestionForms] = useState<Record<QuestionType, NewQuestionForm>>(() =>
    buildQuestionForms(DEFAULT_SUBJECT)
  );
  const [formErrors, setFormErrors] = useState<Partial<Record<QuestionType, string>>>({});
  const [draftNotice, setDraftNotice] = useState("");
  const [isDraftNoticeHiddenByScroll, setIsDraftNoticeHiddenByScroll] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishedReadonly, setIsPublishedReadonly] = useState(false);

  const shouldShowDraftNotice = Boolean(draftNotice) && !isDraftNoticeHiddenByScroll;
  const isFormLocked = isLoadingForm || isSaving || isPublishedReadonly;

  const activeSubjectRecord = useMemo(() => {
    return findSubjectByName(availableSubjects, subject);
  }, [availableSubjects, subject]);

  const groupedQuestions = useMemo(() => {
    return questionTypeConfigs.map((config) => {
      return {
        config,
        items: questions.filter((question) => question.type === config.type),
      };
    });
  }, [questions]);

  const hasMeaningfulProgress = useMemo(() => {
    return (
      questions.length > 0 ||
      examTitle.trim() !== DEFAULT_EXAM_TITLE ||
      subject !== DEFAULT_SUBJECT ||
      durationMinutes !== DEFAULT_DURATION_MINUTES
    );
  }, [durationMinutes, examTitle, questions.length, subject]);

  const questionSignature = useMemo(() => buildQuestionSignature(questions), [questions]);

  const hasUnsavedChanges = useMemo(() => {
    if (!savedSnapshot) {
      return hasMeaningfulProgress;
    }

    return (
      examTitle.trim() !== savedSnapshot.title ||
      subject !== savedSnapshot.subject ||
      durationMinutes !== savedSnapshot.durationMinutes ||
      questionSignature !== savedSnapshot.questionSignature
    );
  }, [durationMinutes, examTitle, hasMeaningfulProgress, questionSignature, savedSnapshot, subject]);

  const loadInitialData = useCallback(async () => {
    setIsLoadingForm(true);
    setLoadError("");

    try {
      const fetchedSubjects = await listComposerSubjects();
      setAvailableSubjects(fetchedSubjects);

      const fallbackSubject =
        fetchedSubjects.find((item) => item.name === DEFAULT_SUBJECT)?.name ??
        fetchedSubjects[0]?.name ??
        DEFAULT_SUBJECT;

      if (!editingExamIdFromQuery) {
        setIsPublishedReadonly(false);
        setSubject((currentSubject) => {
          return currentSubject.trim().length === 0 ? fallbackSubject : currentSubject;
        });
        setSaveError("");
        return;
      }

      const exam = await getComposerExamById(editingExamIdFromQuery);
      const publishedByStatus = String(exam.status ?? "").toUpperCase() === "PUBLISHED";
      const nextReadonly = isViewOnlyFromQuery || publishedByStatus;
      const subjectFromExam =
        fetchedSubjects.find((item) => item.id === exam.subjectId)?.name ?? fallbackSubject;
      const linkedQuestions = await listComposerExamQuestions(exam.id);
      const questionRecords = await Promise.all(
        linkedQuestions.map((item) => getComposerQuestionById(item.questionId))
      );

      const mappedQuestions = questionRecords
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        .map((item) => mapBackendQuestionToDraft(item, subjectFromExam));

      const normalizedTitle = exam.title?.trim() || DEFAULT_EXAM_TITLE;
      const normalizedDuration =
        exam.durationMinutes && exam.durationMinutes > 0
          ? exam.durationMinutes
          : DEFAULT_DURATION_MINUTES;

      setExamTitle(normalizedTitle);
      setSubject(subjectFromExam);
      setDurationMinutes(normalizedDuration);
      setQuestions(mappedQuestions);
      setActiveExamId(exam.id);
      setIsPublishedReadonly(nextReadonly);
      setSaveError("");
      setFormErrors({});
      setDraftNotice(
        nextReadonly
          ? `Đề #${exam.id} đang ở chế độ chỉ xem vì đã xuất bản.`
          : `Đang chỉnh sửa đề đã lưu trên hệ thống (ID: ${exam.id}).`
      );
      setNewQuestionForms(buildQuestionForms(subjectFromExam));
      setSavedSnapshot({
        examId: exam.id,
        title: normalizedTitle,
        subject: subjectFromExam,
        durationMinutes: normalizedDuration,
        questionSignature: buildQuestionSignature(mappedQuestions),
      });
    } catch (error) {
      setLoadError(
        extractApiErrorMessage(error, "Không thể tải dữ liệu form tạo đề từ backend.")
      );
    } finally {
      setIsLoadingForm(false);
    }
  }, [editingExamIdFromQuery, isViewOnlyFromQuery]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!draftNotice || typeof window === "undefined") {
      setIsDraftNoticeHiddenByScroll(false);
      return;
    }

    const handleScroll = () => {
      setIsDraftNoticeHiddenByScroll(window.scrollY > DRAFT_NOTICE_HIDE_SCROLL_Y);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [draftNotice]);

  function updateCreateForm(type: QuestionType, patch: Partial<NewQuestionForm>) {
    setNewQuestionForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        ...patch,
      },
    }));
  }

  function resetCreateForm(type: QuestionType) {
    setNewQuestionForms((prev) => ({
      ...prev,
      [type]: buildNewQuestionForm(subject),
    }));
    setFormErrors((prev) => ({
      ...prev,
      [type]: "",
    }));
  }

  function handleSubjectChange(nextSubject: string) {
    const previousSubject = subject;
    setSubject(nextSubject);

    setNewQuestionForms((prev) => {
      const nextForms = { ...prev };
      questionTypeConfigs.forEach((config) => {
        const currentForm = prev[config.type];
        if (
          currentForm.subjectLine.trim().length === 0 ||
          currentForm.subjectLine === previousSubject
        ) {
          nextForms[config.type] = {
            ...currentForm,
            subjectLine: nextSubject,
          };
        }
      });

      return nextForms;
    });
  }

  async function saveDraft() {
    if (isPublishedReadonly) {
      setSaveError("Đề đã xuất bản không thể chỉnh sửa. Bạn chỉ có thể xem hoặc xóa ở trang quản lý.");
      return null;
    }

    const normalizedTitle = examTitle.trim() || "Đề chưa đặt tên";
    const normalizedSubject = subject.trim();

    if (!normalizedSubject) {
      setSaveError("Vui lòng nhập hoặc chọn môn học trước khi lưu.");
      return null;
    }

    let resolvedSubjectRecord = activeSubjectRecord;
    if (!resolvedSubjectRecord) {
      try {
        const createdSubject = await createComposerSubject({
          name: normalizedSubject,
        });

        setAvailableSubjects((prev) => {
          if (prev.some((item) => item.id === createdSubject.id)) {
            return prev;
          }

          return [...prev, createdSubject];
        });
        setSubject(createdSubject.name);
        resolvedSubjectRecord = createdSubject;
      } catch (error) {
        setSaveError(
          extractApiErrorMessage(
            error,
            "Môn học hiện tại không hợp lệ và không thể tạo mới trên backend."
          )
        );
        return null;
      }
    }

    if (!resolvedSubjectRecord) {
      setSaveError("Không thể xác định môn học hợp lệ để lưu đề thi.");
      return null;
    }

    if (questions.length === 0) {
      const shouldContinue = window.confirm(
        "Đề thi này chưa có câu hỏi. Bạn vẫn muốn lưu bản nháp?"
      );
      if (!shouldContinue) {
        return null;
      }
    }

    setIsSaving(true);
    setSaveError("");

    try {
      const normalizedDuration = durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION_MINUTES;
      const examPayload = {
        title: normalizedTitle,
        subjectId: resolvedSubjectRecord.id,
        durationMinutes: normalizedDuration,
        status: "DRAFT",
      } as const;

      const updatingExisting = Boolean(activeExamId);
      const savedExam = updatingExisting
        ? await updateComposerExam(activeExamId as number, examPayload)
        : await createComposerExam(examPayload);

      // Keep the created exam id immediately to avoid losing context after partial failures.
      setActiveExamId(savedExam.id);

      const existingLinkedQuestions = await listComposerExamQuestions(savedExam.id);
      if (existingLinkedQuestions.length > 0) {
        await Promise.all(
          existingLinkedQuestions.map((item) =>
            removeComposerExamQuestion(savedExam.id, item.questionId).catch(() => undefined)
          )
        );
      }

      if (questions.length > 0) {
        const payloads = questions.map((question, index) =>
          buildQuestionPayload(question, resolvedSubjectRecord.id, savedExam.id, index + 1)
        );

        await Promise.all(payloads.map((payload) => createComposerQuestion(payload)));
      }

      const nextSignature = buildQuestionSignature(questions);
      setSavedSnapshot({
        examId: savedExam.id,
        title: normalizedTitle,
        subject: resolvedSubjectRecord.name,
        durationMinutes: normalizedDuration,
        questionSignature: nextSignature,
      });
      setDraftNotice(
        updatingExisting
          ? "Đã cập nhật bản nháp trên backend."
          : "Đã lưu bản nháp mới lên backend."
      );
      return savedExam.id;
    } catch (error) {
      setSaveError(extractApiErrorMessage(error, "Không thể lưu bản nháp lên backend."));
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDraftAndBackToOverview() {
    const isUpdatingDraft = Boolean(activeExamId);
    const savedId = await saveDraft();
    if (!savedId) {
      return;
    }

    if (typeof window !== "undefined") {
      const noticeMessage = isUpdatingDraft
        ? "Đã cập nhật bản nháp thành công."
        : "Đã lưu bản nháp thành công.";
      window.sessionStorage.setItem(COMPOSER_FLASH_NOTICE_KEY, noticeMessage);
    }

    navigate("/moderator/composer");
  }

  function backToOverview() {
    if (hasUnsavedChanges) {
      const shouldLeave = window.confirm(
        "Bạn đang có thay đổi chưa lưu. Quay lại màn hình quản lý đề thi có thể khiến bạn quên lưu bản nháp. Vẫn quay lại?"
      );
      if (!shouldLeave) {
        return;
      }
    }

    navigate("/moderator/composer");
  }

  function moveWithinType(questionId: string, direction: "up" | "down") {
    setQuestions((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === questionId);
      if (currentIndex < 0) {
        return prev;
      }

      const currentType = prev[currentIndex].type;
      const sameTypeIndices = prev
        .map((item, index) => (item.type === currentType ? index : -1))
        .filter((index) => index >= 0);
      const typePosition = sameTypeIndices.indexOf(currentIndex);
      const nextTypePosition = direction === "up" ? typePosition - 1 : typePosition + 1;

      if (nextTypePosition < 0 || nextTypePosition >= sameTypeIndices.length) {
        return prev;
      }

      const nextIndex = sameTypeIndices[nextTypePosition];
      const draft = [...prev];
      const current = draft[currentIndex];
      draft[currentIndex] = draft[nextIndex];
      draft[nextIndex] = current;
      return draft;
    });
  }

  function duplicateQuestion(questionId: string) {
    setQuestions((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === questionId);
      if (currentIndex < 0) {
        return prev;
      }

      const current = prev[currentIndex];
      const duplicated: QuestionDraft = {
        ...current,
        id: `Q-${Date.now()}`,
        persistedQuestionId: undefined,
        options: current.options ? [...current.options] : undefined,
      };

      const next = [...prev];
      next.splice(currentIndex + 1, 0, duplicated);
      return next;
    });
  }

  function removeQuestion(questionId: string) {
    setQuestions((prev) => prev.filter((item) => item.id !== questionId));
  }

  function updateQuestion(questionId: string, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => {
      return prev.map((item) => {
        if (item.id !== questionId) {
          return item;
        }

        return {
          ...item,
          ...patch,
        };
      });
    });
  }

  function updateNewQuestionOption(type: QuestionType, index: number, value: string) {
    setNewQuestionForms((prev) => {
      const nextOptions = [...prev[type].options];
      nextOptions[index] = value;
      return {
        ...prev,
        [type]: {
          ...prev[type],
          options: nextOptions,
        },
      };
    });
  }

  function createQuestion(type: QuestionType) {
    const currentForm = newQuestionForms[type];
    const content = currentForm.content.trim();
    const points = Number(currentForm.points);

    if (content.length === 0) {
      setFormErrors((prev) => ({
        ...prev,
        [type]: "Vui lòng nhập nội dung câu hỏi.",
      }));
      return;
    }

    if (!Number.isFinite(points) || points <= 0) {
      setFormErrors((prev) => ({
        ...prev,
        [type]: "Điểm số phải là số lớn hơn 0.",
      }));
      return;
    }

    if (
      type === "Trắc nghiệm (Multiple Choice)" &&
      currentForm.options.some((option) => option.trim().length === 0)
    ) {
      setFormErrors((prev) => ({
        ...prev,
        [type]: "Vui lòng nhập đầy đủ 4 phương án cho câu trắc nghiệm.",
      }));
      return;
    }

    if (
      type === "Tự điền đáp án (Fill in blank)" &&
      currentForm.answer.trim().length === 0
    ) {
      setFormErrors((prev) => ({
        ...prev,
        [type]: "Vui lòng nhập đáp án đúng cho câu tự điền.",
      }));
      return;
    }

    const nextQuestion: QuestionDraft = {
      id: `Q-${Date.now()}`,
      type,
      subjectLine: currentForm.subjectLine.trim() || subject,
      content,
      points,
      tags: currentForm.tags.trim(),
      ...(type === "Trắc nghiệm (Multiple Choice)"
        ? {
            options: currentForm.options.map((option) => option.trim()),
            correctOption: Number(currentForm.correctOption),
          }
        : {}),
      ...(type === "Đúng/Sai (True/False)"
        ? {
            trueAnswer: currentForm.trueAnswer === "true",
          }
        : {}),
      ...(type === "Tự điền đáp án (Fill in blank)"
        ? {
            answer: currentForm.answer.trim(),
          }
        : {}),
    };

    setQuestions((prev) => [...prev, nextQuestion]);
    resetCreateForm(type);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-1 pb-20">
      <section className={`space-y-6 ${shouldShowDraftNotice ? "pt-14" : ""}`}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line-soft)] bg-white px-4 text-sm font-semibold text-[var(--ink-700)] transition hover:bg-[var(--bg-soft)]"
              onClick={backToOverview}
              disabled={isSaving}
            >
              <ArrowLeft size={14} /> Quay lại quản lý đề
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => {
                void saveDraftAndBackToOverview();
              }}
              disabled={isFormLocked}
            >
              <Save size={14} /> {isSaving ? "Đang lưu..." : "Lưu bản nháp"}
            </button>
          </div>

        </div>

        {isLoadingForm ? (
          <p className="rounded-lg border border-[var(--line-soft)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink-700)]">
            Đang tải dữ liệu từ backend...
          </p>
        ) : null}

        {loadError ? (
          <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p className="font-semibold">{loadError}</p>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 transition hover:bg-rose-100"
              onClick={() => {
                void loadInitialData();
              }}
              disabled={isLoadingForm}
            >
              <RefreshCcw size={14} /> Tải lại dữ liệu
            </button>
          </div>
        ) : null}

        {shouldShowDraftNotice ? (
          <div className="fixed left-1/2 top-24 z-50 w-[min(92vw,42rem)] -translate-x-1/2 rounded-xl border border-sky-200 bg-sky-50/95 px-4 py-2.5 text-sm font-semibold text-sky-800 shadow-[0_14px_34px_rgba(14,84,129,0.2)] backdrop-blur-sm">
            {draftNotice}
          </div>
        ) : null}

        {saveError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{saveError}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[var(--ink-900)]">Cấu hình bài thi</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 rounded-2xl bg-[var(--bg-soft)] p-6 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <label className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">
              Tiêu đề bài thi
            </label>
            <input
              className="w-full rounded-xl border border-transparent bg-white px-4 py-3 text-lg font-bold text-[var(--brand-700)] outline-none transition focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
              placeholder="Nhập tiêu đề bài thi..."
              type="text"
              value={examTitle}
              onChange={(event) => setExamTitle(event.target.value)}
              disabled={isFormLocked}
            />
          </div>

          <div className="space-y-2">
            <label className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">
              Môn học
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border border-transparent bg-white px-4 py-3 font-medium text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
                value={subject}
                onChange={(event) => handleSubjectChange(event.target.value)}
                disabled={isFormLocked}
              >
                {availableSubjects.length === 0 ? (
                  <option>{subject}</option>
                ) : (
                  availableSubjects.map((item) => <option key={item.id}>{item.name}</option>)
                )}
              </select>
              <span className="pointer-events-none absolute right-3 top-3 text-[var(--ink-500)]">▾</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">
              Thời gian (Phút)
            </label>
            <input
              className="w-full rounded-xl border border-transparent bg-white px-4 py-3 font-medium text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
              type="number"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value) || 0)}
              min={1}
              disabled={isFormLocked}
            />
          </div>
        </div>
      </section>

      <section className="space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[var(--ink-900)]">Danh sách câu hỏi</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {questionTypeConfigs.map((config) => (
            <div key={config.type} className="rounded-2xl border border-[var(--line-soft)] bg-white p-4">
              <div className="mb-3">
                <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${config.accentClassName}`}>
                  {config.title}
                </span>
              </div>
              <p className="text-xs text-[var(--ink-600)]">{config.subtitle}</p>
            </div>
          ))}
        </div>

        <div className="space-y-10">
          {groupedQuestions.map(({ config, items }) => {
            const currentForm = newQuestionForms[config.type];
            const currentError = formErrors[config.type];

            return (
              <section key={config.type} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${config.accentClassName}`}>
                      {config.title}
                    </span>
                    <span className="text-xs font-semibold text-[var(--ink-500)]">{items.length} câu</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--brand-100)] bg-white p-5 shadow-[0_12px_24px_rgba(16,21,38,0.08)]">
                  <h3 className="text-base font-extrabold text-[var(--ink-900)]">Form tạo câu hỏi - {config.title}</h3>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Lĩnh vực</span>
                      <input
                        className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--bg-soft)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-500)]"
                        value={currentForm.subjectLine}
                        onChange={(event) => updateCreateForm(config.type, { subjectLine: event.target.value })}
                        disabled={isFormLocked}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Điểm số</span>
                      <input
                        className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--bg-soft)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-500)]"
                        type="number"
                        step="0.5"
                        min="0"
                        value={currentForm.points}
                        onChange={(event) => updateCreateForm(config.type, { points: event.target.value })}
                        disabled={isFormLocked}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Tags</span>
                      <input
                        className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--bg-soft)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-500)]"
                        placeholder="Ví dụ: Đạo hàm, Giải tích"
                        value={currentForm.tags}
                        onChange={(event) => updateCreateForm(config.type, { tags: event.target.value })}
                        disabled={isFormLocked}
                      />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2">
                    <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Nội dung câu hỏi</span>
                    <textarea
                      className="h-24 w-full rounded-lg border border-[var(--line-soft)] bg-[var(--bg-soft)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-500)]"
                      value={currentForm.content}
                      onChange={(event) => updateCreateForm(config.type, { content: event.target.value })}
                      disabled={isFormLocked}
                    />
                  </label>

                  {config.type === "Trắc nghiệm (Multiple Choice)" ? (
                    <div className="mt-4 space-y-3">
                      <p className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Phương án trả lời</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {currentForm.options.map((option, index) => (
                          <label key={`new-option-${config.type}-${index}`} className="flex items-center gap-2 rounded-lg bg-[var(--bg-soft)] p-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-500)] text-xs font-bold text-white">
                              {optionLabel(index)}
                            </span>
                            <input
                              className="w-full rounded-md border border-transparent bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-[var(--brand-500)]"
                              value={option}
                              onChange={(event) => updateNewQuestionOption(config.type, index, event.target.value)}
                              placeholder={`Nhập phương án ${optionLabel(index)}`}
                              disabled={isFormLocked}
                            />
                          </label>
                        ))}
                      </div>

                      <label className="space-y-2">
                        <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Đáp án đúng</span>
                        <select
                          className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--bg-soft)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-500)]"
                          value={currentForm.correctOption}
                          onChange={(event) => updateCreateForm(config.type, { correctOption: event.target.value })}
                          disabled={isFormLocked}
                        >
                          <option value="0">A</option>
                          <option value="1">B</option>
                          <option value="2">C</option>
                          <option value="3">D</option>
                        </select>
                      </label>
                    </div>
                  ) : null}

                  {config.type === "Đúng/Sai (True/False)" ? (
                    <label className="mt-4 block space-y-2">
                      <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Đáp án đúng</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                            currentForm.trueAnswer === "true"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-[var(--line-soft)] bg-[var(--bg-soft)] text-[var(--ink-600)]"
                          }`}
                          onClick={() => updateCreateForm(config.type, { trueAnswer: "true" })}
                          disabled={isFormLocked}
                        >
                          ĐÚNG
                        </button>
                        <button
                          type="button"
                          className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                            currentForm.trueAnswer === "false"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-[var(--line-soft)] bg-[var(--bg-soft)] text-[var(--ink-600)]"
                          }`}
                          onClick={() => updateCreateForm(config.type, { trueAnswer: "false" })}
                          disabled={isFormLocked}
                        >
                          SAI
                        </button>
                      </div>
                    </label>
                  ) : null}

                  {config.type === "Tự điền đáp án (Fill in blank)" ? (
                    <label className="mt-4 block space-y-2">
                      <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Đáp án đúng</span>
                      <input
                        className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--bg-soft)] px-3 py-2 text-sm font-semibold text-[var(--brand-700)] outline-none transition focus:border-[var(--brand-500)]"
                        value={currentForm.answer}
                        onChange={(event) => updateCreateForm(config.type, { answer: event.target.value })}
                        disabled={isFormLocked}
                      />
                    </label>
                  ) : null}

                  {currentError ? (
                    <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{currentError}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                      onClick={() => createQuestion(config.type)}
                      disabled={isFormLocked}
                    >
                      <Plus size={14} /> Thêm câu hỏi
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line-soft)] bg-white px-4 py-2 text-sm font-bold text-[var(--ink-600)] transition hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                      onClick={() => resetCreateForm(config.type)}
                      disabled={isFormLocked}
                    >
                      Làm mới form
                    </button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--line-soft)] bg-white px-4 py-4 text-sm text-[var(--ink-500)]">
                    Chưa có câu hỏi nào trong phần này.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {items.map((question, sectionIndex) => (
                      <article
                        key={question.id}
                        className="group relative overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-white p-6 shadow-[0_8px_24px_rgba(25,28,30,0.05)] transition-all hover:shadow-[0_12px_28px_rgba(16,21,38,0.12)]"
                      >
                        <div className="absolute left-0 top-0 h-full w-1 bg-[var(--brand-500)] opacity-0 transition-opacity group-hover:opacity-100" />

                        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-soft)] text-sm font-bold text-[var(--brand-700)]">
                              {String(sectionIndex + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <h3 className="font-bold text-[var(--ink-900)]">{question.type}</h3>
                              <p className="text-xs font-medium text-[var(--ink-500)]">Lĩnh vực: {question.subjectLine}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg p-2 text-[var(--ink-500)] transition-colors hover:bg-[var(--brand-100)] hover:text-[var(--brand-700)]"
                              onClick={() => duplicateQuestion(question.id)}
                              title="Nhân bản"
                              disabled={isFormLocked}
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-2 text-[var(--ink-500)] transition-colors hover:bg-rose-100 hover:text-rose-700"
                              onClick={() => removeQuestion(question.id)}
                              title="Xóa"
                              disabled={isFormLocked}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-5">
                          <div className="rounded-xl bg-[var(--bg-soft)] p-4">
                            <p className="font-medium leading-relaxed text-[var(--ink-900)]">{question.content}</p>
                          </div>

                          {question.type === "Trắc nghiệm (Multiple Choice)" && question.options ? (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              {question.options.map((option, optionIndex) => {
                                const isCorrect = optionIndex === question.correctOption;

                                return (
                                  <div
                                    key={`${question.id}-option-${optionIndex}`}
                                    className={`flex items-center gap-3 rounded-lg p-4 ${
                                      isCorrect
                                        ? "border border-emerald-200 bg-emerald-50"
                                        : "border border-[var(--line-soft)] bg-[var(--bg-soft)]"
                                    }`}
                                  >
                                    <span
                                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                        isCorrect ? "bg-emerald-600 text-white" : "bg-[var(--brand-500)] text-white"
                                      }`}
                                    >
                                      {optionLabel(optionIndex)}
                                    </span>
                                    <span className={`text-sm ${isCorrect ? "font-bold text-emerald-700" : "font-medium text-[var(--ink-800)]"}`}>
                                      {option}
                                    </span>
                                    {isCorrect ? <CheckCircle2 size={16} className="ml-auto text-emerald-600" /> : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          {question.type === "Đúng/Sai (True/False)" ? (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <button
                                type="button"
                                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold ${
                                  question.trueAnswer
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-[var(--line-soft)] bg-[var(--bg-soft)] text-[var(--ink-600)]"
                                }`}
                                disabled
                              >
                                <CheckCircle2 size={16} /> ĐÚNG
                              </button>
                              <button
                                type="button"
                                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold ${
                                  question.trueAnswer
                                    ? "border-[var(--line-soft)] bg-[var(--bg-soft)] text-[var(--ink-600)]"
                                    : "border-rose-200 bg-rose-50 text-rose-700"
                                }`}
                                disabled
                              >
                                <XCircle size={16} /> SAI
                              </button>
                            </div>
                          ) : null}

                          {question.type === "Tự điền đáp án (Fill in blank)" ? (
                            <div className="space-y-2">
                              <label className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Đáp án đúng</label>
                              <input
                                className="w-full rounded-xl border border-[var(--brand-100)] bg-[var(--bg-soft)] px-5 py-3 text-2xl font-bold text-[var(--brand-700)] outline-none transition focus:border-[var(--brand-500)]"
                                value={question.answer ?? ""}
                                onChange={(event) => updateQuestion(question.id, { answer: event.target.value })}
                                disabled={isFormLocked}
                              />
                              <p className="px-1 text-[10px] text-[var(--ink-500)]">
                                Hệ thống sẽ chấp nhận các đáp án khớp chính xác với chuỗi văn bản trên.
                              </p>
                            </div>
                          ) : null}

                          <div className="flex flex-col gap-4 pt-1 md:flex-row md:items-center md:justify-between">
                            <div className="flex-1">
                              <div className="relative flex items-center">
                                <Tag size={14} className="pointer-events-none absolute left-3 text-[var(--ink-500)]" />
                                <input
                                  className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--bg-soft)] py-2 pl-9 pr-3 text-sm text-[var(--ink-800)] outline-none transition focus:border-[var(--brand-500)]"
                                  placeholder="Gắn thẻ chủ đề..."
                                  value={question.tags}
                                  onChange={(event) => updateQuestion(question.id, { tags: event.target.value })}
                                  disabled={isFormLocked}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-soft)] px-4 py-2">
                              <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Điểm số:</span>
                              <input
                                className="w-16 border-none bg-transparent p-0 text-right font-bold text-[var(--brand-700)] outline-none"
                                type="number"
                                step="0.5"
                                min="0"
                                value={question.points}
                                onChange={(event) => {
                                  const nextPoints = Number(event.target.value);
                                  updateQuestion(question.id, {
                                    points: Number.isFinite(nextPoints) ? nextPoints : 0,
                                  });
                                }}
                                disabled={isFormLocked}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line-soft)] bg-white text-[var(--ink-600)] transition hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => moveWithinType(question.id, "up")}
                                disabled={sectionIndex === 0 || isFormLocked}
                                title="Đưa lên"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line-soft)] bg-white text-[var(--ink-600)] transition hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => moveWithinType(question.id, "down")}
                                disabled={sectionIndex === items.length - 1 || isFormLocked}
                                title="Đưa xuống"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}

