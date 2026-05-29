import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confirm } from "@/lib/dialog";
import { useToast } from "@/components/ui/Toast/toast-system";
import { Editor as TinyMceEditor } from "@tinymce/tinymce-react";
import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autoresize";
import "tinymce/plugins/code";
import "tinymce/plugins/image";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/table";
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/content/default/content.min.css";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  listComposerTopics,
  parseModeratorAiDraft,
  removeComposerExamQuestion,
  uploadComposerQuestionImage,
  updateComposerExam,
} from "@/features/moderator/services/moderator-composer.service";
import type {
  ComposerAiDraft,
  ComposerAiDraftQuestion,
  ComposerQuestionPayload,
  ComposerQuestionRecord,
  ComposerSubjectRecord,
  ComposerTopicRecord,
} from "@/features/moderator/types/moderator-composer.type";
import { COMPOSER_AI_IMPORT_DRAFT_KEY, COMPOSER_FLASH_NOTICE_KEY } from "@/features/moderator/services/moderator-ai-import-tracker";
import { extractApiErrorMessage as extractSharedApiErrorMessage } from "@/lib/error-utils";

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
  imageUrl?: string | null;
  pendingImageFile?: File | null;
  localImagePreviewUrl?: string | null;
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
  imageUrl: string | null;
  pendingImageFile: File | null;
  localImagePreviewUrl: string | null;
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
  className: string;
  durationMinutes: number;
  startAtInput: string;
  endAtInput: string;
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

const DEFAULT_EXAM_TITLE = "Kiểm tra cuối kỳ";
const DEFAULT_SUBJECT = "Toán học";
const DEFAULT_DURATION_MINUTES = 90;
const DEFAULT_CLASS_NAME = "Lớp 12";
const CLASS_NAME_OPTIONS = Array.from({ length: 12 }, (_, index) => `Lớp ${index + 1}`);
const SUBJECT_DISPLAY_NAME_BY_CANONICAL: Record<string, string> = {
  "toan hoc": "Toán học",
  "vat ly": "Vật lý",
  "hoa hoc": "Hóa học",
  "sinh hoc": "Sinh học",
  "ngu van": "Ngữ văn",
  "tieng anh": "Tiếng Anh",
  "lich su": "Lịch sử",
  "dia ly": "Địa lý",
  "tin hoc": "Tin học",
  "giao duc cong dan": "Giáo dục công dân",
  gdcd: "Giáo dục công dân",
  "cong nghe": "Công nghệ",
};

const initialQuestions: QuestionDraft[] = [];
function optionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function editorIdForQuestionType(type: QuestionType) {
  const index = questionTypeConfigs.findIndex((item) => item.type === type);
  return `question-content-editor-${Math.max(index, 0)}`;
}

function buildNewQuestionForm(subject: string): NewQuestionForm {
  return {
    subjectLine: subject,
    content: "",
    imageUrl: null,
    pendingImageFile: null,
    localImagePreviewUrl: null,
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
    imageUrl: question.imageUrl?.trim() ?? null,
    hasPendingImage: Boolean(question.pendingImageFile),
    points: question.points,
    tags: question.tags.trim(),
    options: question.options ? [...question.options.map((option) => option.trim())] : undefined,
    correctOption: question.correctOption ?? null,
    trueAnswer: question.trueAnswer ?? null,
    answer: question.answer?.trim() ?? null,
  }));

  return JSON.stringify(normalized);
}

function parseTagNames(value: string) {
  const deduplicated = new Map<string, string>();
  value
    .split(/[,\n;]+/)
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter((item) => item.length > 0)
    .forEach((item) => {
      const key = item.toLocaleLowerCase("vi-VN");
      if (!deduplicated.has(key)) {
        deduplicated.set(key, item);
      }
    });
  return Array.from(deduplicated.values());
}

function joinTagNames(values: string[]) {
  return parseTagNames(values.join(", ")).join(", ");
}

function filterTagNamesByCatalog(value: string, topics: ComposerTopicRecord[]) {
  const allowedKeys = new Set(topics.map((item) => item.name.toLocaleLowerCase("vi-VN")));
  return joinTagNames(
    parseTagNames(value).filter((item) => allowedKeys.has(item.toLocaleLowerCase("vi-VN")))
  );
}

function normalizeSubjectName(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN");
}

function toDisplaySubjectName(value: string) {
  const normalized = normalizeSubjectName(value);
  return SUBJECT_DISPLAY_NAME_BY_CANONICAL[normalized] ?? value;
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

function parseStoredAiDraft(): ComposerAiDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawDraft = window.sessionStorage.getItem(COMPOSER_AI_IMPORT_DRAFT_KEY);
  if (!rawDraft) {
    return null;
  }

  const parsedDraft = parseModeratorAiDraft(rawDraft);
  if (!parsedDraft) {
    window.sessionStorage.removeItem(COMPOSER_AI_IMPORT_DRAFT_KEY);
    return null;
  }

  return parsedDraft;
}

function resolveAiDraftSubjectName(
  draft: ComposerAiDraft,
  subjects: ComposerSubjectRecord[],
  fallbackSubject: string
) {
  if (draft.subjectId != null) {
    const matchedSubject = subjects.find((item) => item.id === draft.subjectId);
    if (matchedSubject?.name?.trim()) {
      return toDisplaySubjectName(matchedSubject.name);
    }
  }

  return fallbackSubject;
}

function extractApiErrorMessage(error: unknown, fallbackMessage: string) {
  return extractSharedApiErrorMessage(error, fallbackMessage);
}

function toDateTimeLocalInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const pad = (input: number) => String(input).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function normalizeDateTimeLocalInput(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function hasMeaningfulEditorContent(value: string) {
  const normalized = value.replace(/&nbsp;/g, " ").trim();
  if (!normalized) {
    return false;
  }

  if (typeof document === "undefined") {
    return normalized.replace(/<[^>]*>/g, "").trim().length > 0;
  }

  const container = document.createElement("div");
  container.innerHTML = normalized;

  const text = (container.textContent ?? "").replace(/\u00a0/g, " ").trim();
  if (text.length > 0) {
    return true;
  }

  return Boolean(container.querySelector("img,math,svg,table,iframe,video,audio"));
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

function isModeratorEditableExamStatus(status?: string): boolean {
  const normalized = String(status ?? "").trim().toUpperCase();
  return normalized === "DRAFT" || normalized === "PENDING_REVIEW" || normalized === "REJECTED";
}

function mapBackendQuestionToDraft(question: ComposerQuestionRecord, subjectName: string): QuestionDraft {
  if (question.type === "FILL_IN_BLANK" || question.type === "ESSAY") {
    return {
      id: `Q-${question.id}`,
      persistedQuestionId: question.id,
      type: "Tự điền đáp án (Fill in blank)",
      subjectLine: subjectName,
      content: question.content,
      imageUrl: question.imageUrl,
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
      imageUrl: question.imageUrl,
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
    imageUrl: question.imageUrl,
    points: question.maxScore ?? 1,
    tags: question.topicTag ?? "",
    options: normalizedOptions,
    correctOption: resolveMcqAnswerIndex(question.answer, normalizedOptions),
  };
}

function resolveAiDraftQuestionType(question: ComposerAiDraftQuestion): QuestionType {
  const normalizedType = String(question.type ?? "").trim().toUpperCase();
  if (normalizedType === "TRUE_FALSE") {
    return "Đúng/Sai (True/False)";
  }
  if (normalizedType === "FILL_IN_BLANK") {
    return "Tự điền đáp án (Fill in blank)";
  }
  return "Trắc nghiệm (Multiple Choice)";
}

function resolveAiDraftMcqAnswerIndex(answer: string | null | undefined, options: string[]) {
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

function mapAiDraftQuestionToComposerDraft(
  question: ComposerAiDraftQuestion,
  subjectName: string,
  index: number
): QuestionDraft {
  const type = resolveAiDraftQuestionType(question);
  const baseDraft = {
    subjectLine: subjectName,
    content: question.content ?? "",
    imageUrl: question.imageUrl ?? question.imageUrls?.[0] ?? null,
    points: question.maxScore && question.maxScore > 0 ? question.maxScore : 1,
    tags: "",
  };

  if (type === "Đúng/Sai (True/False)") {
    return {
      id: `AI-TF-${index + 1}`,
      type,
      ...baseDraft,
      trueAnswer: resolveTrueFalseAnswer(question.answer ?? null),
    };
  }

  if (type === "Tự điền đáp án (Fill in blank)") {
    return {
      id: `AI-FIB-${index + 1}`,
      type,
      ...baseDraft,
      answer: question.answer ?? "",
    };
  }

  const normalizedOptions = normalizeMcqOptions(Array.isArray(question.options) ? question.options : []);
  return {
    id: `AI-MCQ-${index + 1}`,
    type,
    ...baseDraft,
    options: normalizedOptions,
    correctOption: resolveAiDraftMcqAnswerIndex(question.answer ?? null, normalizedOptions),
  };
}

function buildQuestionPayload(
  question: QuestionDraft,
  subjectId: number,
  examId: number,
  orderIndex: number,
  availableSubjectTopics: ComposerTopicRecord[]
): ComposerQuestionPayload {
  const normalizedTopicTag = filterTagNamesByCatalog(question.tags, availableSubjectTopics) || null;

  if (question.type === "Đúng/Sai (True/False)") {
    return {
      examId,
      subjectId,
      content: question.content.trim(),
      type: "MCQ",
      topicTag: normalizedTopicTag,
      imageUrl: question.imageUrl?.trim() || null,
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
      topicTag: normalizedTopicTag,
      imageUrl: question.imageUrl?.trim() || null,
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
    topicTag: normalizedTopicTag,
    imageUrl: question.imageUrl?.trim() || null,
    maxScore: question.points,
    options: JSON.stringify(normalizedOptions),
    answer: optionLabel(selectedCorrect),
    orderIndex,
    active: true,
  };
}

type TinyImageBlobInfo = {
  blob: () => Blob;
  filename: () => string;
};

const TEMPORARY_INLINE_IMAGE_SRC_PATTERN = /src=(["'])(blob:[^"']+|data:image\/[^"']+)\1/gi;
const TEMPORARY_INLINE_IMAGE_FIGURE_PATTERN = /<figure\b[^>]*>\s*<img\b[^>]*\bsrc=(["'])(blob:[^"']+|data:image\/[^"']+)\1[^>]*>\s*<\/figure>/gi;
const TEMPORARY_INLINE_IMAGE_TAG_PATTERN = /<img\b[^>]*\bsrc=(["'])(blob:[^"']+|data:image\/[^"']+)\1[^>]*>/gi;

function replaceTemporaryInlineImageSources(content: string, imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return content;
  }

  const escapedUrl = imageUrl.replace(/"/g, "&quot;");
  return content.replace(TEMPORARY_INLINE_IMAGE_SRC_PATTERN, `src="${escapedUrl}"`);
}

function replaceExactImageSource(content: string, oldSource: string | null | undefined, nextSource: string | null | undefined): string {
  if (!oldSource || !nextSource || oldSource === nextSource) {
    return content;
  }

  return content.split(oldSource).join(nextSource);
}

function stripTemporaryInlineImageMarkup(content: string): string {
  return content
    .replace(TEMPORARY_INLINE_IMAGE_FIGURE_PATTERN, "")
    .replace(TEMPORARY_INLINE_IMAGE_TAG_PATTERN, "");
}

function TopicTagSelector({
  value,
  topics,
  disabled,
  emptyLabel,
  onChange,
}: {
  value: string;
  topics: ComposerTopicRecord[];
  disabled: boolean;
  emptyLabel: string;
  onChange: (nextValue: string) => void;
}) {
  const selectedTags = parseTagNames(value);
  const selectedKeys = new Set(selectedTags.map((item) => item.toLocaleLowerCase("vi-VN")));
  const availableKeys = new Set(topics.map((item) => item.name.toLocaleLowerCase("vi-VN")));
  const orphanedTags = selectedTags.filter((item) => !availableKeys.has(item.toLocaleLowerCase("vi-VN")));

  const toggleTag = (topicName: string) => {
    const topicKey = topicName.toLocaleLowerCase("vi-VN");
    if (selectedKeys.has(topicKey)) {
      onChange(joinTagNames(selectedTags.filter((item) => item.toLocaleLowerCase("vi-VN") !== topicKey)));
      return;
    }
    onChange(joinTagNames([...selectedTags, topicName]));
  };

  const removeOrphanedTag = (topicName: string) => {
    const topicKey = topicName.toLocaleLowerCase("vi-VN");
    onChange(joinTagNames(selectedTags.filter((item) => item.toLocaleLowerCase("vi-VN") !== topicKey)));
  };

  return (
    <div className="space-y-3">
      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => {
            const isOrphaned = orphanedTags.some((item) => item.toLocaleLowerCase("vi-VN") === tag.toLocaleLowerCase("vi-VN"));
            return (
              <button
                key={`selected-${tag}`}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  isOrphaned
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-[var(--brand-200)] bg-[var(--brand-100)] text-[var(--brand-700)]"
                }`}
                onClick={() => (isOrphaned ? removeOrphanedTag(tag) : toggleTag(tag))}
                disabled={disabled}
                title={isOrphaned ? "Tag này không thuộc danh mục môn hiện tại. Bấm để gỡ." : "Bấm để bỏ chọn tag"}
              >
                {tag}
              </button>
            );
          })}
        </div>
      ) : null}

      {topics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line-soft)] bg-[var(--bg-soft)] px-3 py-3 text-sm text-[var(--ink-500)]">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[var(--line-soft)] bg-[var(--bg-soft)] p-3">
          {topics.map((topic) => {
            const selected = selectedKeys.has(topic.name.toLocaleLowerCase("vi-VN"));
            return (
              <button
                key={topic.id}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "border-[var(--brand-500)] bg-[var(--brand-600)] text-white"
                    : "border-[var(--line-soft)] bg-white text-[var(--ink-700)] hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)]"
                }`}
                onClick={() => toggleTag(topic.name)}
                disabled={disabled}
              >
                {topic.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === "undefined") {
      reject(new Error("FileReader is not available in this environment."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:image/")) {
        resolve(result);
        return;
      }
      reject(new Error("Could not encode image preview."));
    };
    reader.onerror = () => {
      reject(new Error("Could not read image file."));
    };
    reader.readAsDataURL(blob);
  });
}

function QuestionContentEditor({
  id,
  value,
  disabled,
  onChange,
  onImagePicked,
}: {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onImagePicked: (file: File, previewUrl: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#c8ccd4] bg-white transition focus-within:border-[var(--brand-500)]">
      <TinyMceEditor
        id={id}
        disabled={disabled}
        value={value}
        onEditorChange={onChange}
        init={{
          height: 170,
          menubar: false,
          statusbar: false,
          branding: false,
          resize: true,
          automatic_uploads: true,
          paste_data_images: true,
          skin: false,
          content_css: false,
          plugins: "advlist autoresize code image link lists table",
          images_upload_handler: (blobInfo: TinyImageBlobInfo) =>
            new Promise((resolve, reject) => {
              if (disabled || typeof window === "undefined") {
                reject("Editor is currently disabled.");
                return;
              }

              const blob = blobInfo.blob();
              if (!blob.type.startsWith("image/")) {
                reject("Only image files are supported.");
                return;
              }

              const suggestedName = blobInfo.filename()?.trim();
              const file =
                blob instanceof File
                  ? blob
                  : new File([blob], suggestedName || `question-image-${Date.now()}.png`, {
                      type: blob.type || "image/png",
                    });
              void readBlobAsDataUrl(file)
                .then((previewUrl) => {
                  onImagePicked(file, previewUrl);
                  resolve(previewUrl);
                })
                .catch((error) => {
                  const message = error instanceof Error ? error.message : "Could not process selected image.";
                  reject(message);
                });
            }),
          external_plugins: {
            tiny_mce_wiris: "/tinymce-plugins/wiris/plugin.min.js",
          },
          toolbar:
            "bold italic underline | tiny_mce_wiris_formulaEditor tiny_mce_wiris_formulaEditorChemistry | bullist numlist | alignleft aligncenter | image table link",
          toolbar_mode: "wrap",
          draggable_modal: true,
          placeholder: "Nhập nội dung câu hỏi...",
          content_style:
            "body { font-family: Inter, Arial, sans-serif; font-size: 16px; line-height: 1.65; color: #191c1e; padding: 18px 24px; } p { margin: 0 0 10px; } img:not(.Wirisformula):not([class*='Wiris']) { display: block; max-width: min(100%, 360px); height: auto; margin: 10px auto; border-radius: 10px; } figure.image { max-width: min(100%, 360px); margin: 10px auto; } figure.image img:not(.Wirisformula):not([class*='Wiris']) { width: 100%; height: auto; } img.Wirisformula, img[class*='Wiris'] { display: inline-block; max-width: none; margin: 0; border-radius: 0; vertical-align: middle; }",
        }}
      />
    </div>
  );
}

export default function ModeratorComposerFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
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
  const [className, setClassName] = useState(DEFAULT_CLASS_NAME);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [startAtInput, setStartAtInput] = useState("");
  const [endAtInput, setEndAtInput] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>(initialQuestions);


  const [availableSubjects, setAvailableSubjects] = useState<ComposerSubjectRecord[]>([]);
  const [availableTopics, setAvailableTopics] = useState<ComposerTopicRecord[]>([]);
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot | null>(null);

  const [newQuestionForms, setNewQuestionForms] = useState<Record<QuestionType, NewQuestionForm>>(() =>
    buildQuestionForms(DEFAULT_SUBJECT)
  );
  const [formErrors, setFormErrors] = useState<Partial<Record<QuestionType, string>>>({});
  const [loadError, setLoadError] = useState("");
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishedReadonly, setIsPublishedReadonly] = useState(false);
  const objectPreviewUrlsRef = useRef<Set<string>>(new Set());
  const lastNoticeKeyRef = useRef<string | null>(null);

  const isFormLocked = isLoadingForm || isSaving || isPublishedReadonly;

  const registerObjectPreviewUrl = useCallback((url: string | null | undefined) => {
    if (!url || !url.startsWith("blob:")) {
      return;
    }
    objectPreviewUrlsRef.current.add(url);
  }, []);

  const revokeObjectPreviewUrl = useCallback((url: string | null | undefined) => {
    if (!url || !url.startsWith("blob:")) {
      return;
    }
    if (typeof window !== "undefined") {
      window.URL.revokeObjectURL(url);
    }
    objectPreviewUrlsRef.current.delete(url);
  }, []);

  const activeSubjectRecord = useMemo(() => {
    return findSubjectByName(availableSubjects, subject);
  }, [availableSubjects, subject]);

  const filteredTopics = useMemo(() => {
    if (!activeSubjectRecord) {
      return [];
    }
    return availableTopics.filter((item) => item.subjectId === activeSubjectRecord.id);
  }, [activeSubjectRecord, availableTopics]);

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
      className !== DEFAULT_CLASS_NAME ||
      durationMinutes !== DEFAULT_DURATION_MINUTES ||
      startAtInput.trim().length > 0 ||
      endAtInput.trim().length > 0
    );
  }, [className, durationMinutes, endAtInput, examTitle, questions.length, startAtInput, subject]);

  const questionSignature = useMemo(() => buildQuestionSignature(questions), [questions]);

  const hasUnsavedChanges = useMemo(() => {
    if (!savedSnapshot) {
      return hasMeaningfulProgress;
    }

    return (
      examTitle.trim() !== savedSnapshot.title ||
      subject !== savedSnapshot.subject ||
      className !== savedSnapshot.className ||
      durationMinutes !== savedSnapshot.durationMinutes ||
      startAtInput !== savedSnapshot.startAtInput ||
      endAtInput !== savedSnapshot.endAtInput ||
      questionSignature !== savedSnapshot.questionSignature
    );
  }, [className, durationMinutes, endAtInput, examTitle, hasMeaningfulProgress, questionSignature, savedSnapshot, startAtInput, subject]);

  const loadInitialData = useCallback(async () => {
    setIsLoadingForm(true);
    setLoadError("");

    try {
      const fetchedSubjects = await listComposerSubjects();
      setAvailableSubjects(fetchedSubjects);

      const fallbackSubject = toDisplaySubjectName(
        fetchedSubjects.find((item) => normalizeSubjectName(item.name) === normalizeSubjectName(DEFAULT_SUBJECT))?.name ??
          fetchedSubjects[0]?.name ??
          DEFAULT_SUBJECT
      );

      if (!editingExamIdFromQuery) {
        const storedAiDraft = parseStoredAiDraft();
        if (storedAiDraft) {
          const subjectFromDraft = resolveAiDraftSubjectName(storedAiDraft, fetchedSubjects, fallbackSubject);
          const normalizedTitle = storedAiDraft.title?.trim() || DEFAULT_EXAM_TITLE;
          const normalizedClassName = storedAiDraft.className?.trim() || DEFAULT_CLASS_NAME;
          const normalizedDuration =
            storedAiDraft.durationMinutes && storedAiDraft.durationMinutes > 0
              ? storedAiDraft.durationMinutes
              : DEFAULT_DURATION_MINUTES;
          const mappedQuestions = (storedAiDraft.questions ?? []).map((item, index) =>
            mapAiDraftQuestionToComposerDraft(item, subjectFromDraft, index)
          );

          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(COMPOSER_AI_IMPORT_DRAFT_KEY);
          }

          setIsPublishedReadonly(false);
          setActiveExamId(null);
          setExamTitle(normalizedTitle);
          setSubject(subjectFromDraft);
          setClassName(normalizedClassName);
          setDurationMinutes(normalizedDuration);
          setStartAtInput("");
          setEndAtInput("");
          setQuestions((previousQuestions) => {
            previousQuestions.forEach((question) => {
              revokeObjectPreviewUrl(question.localImagePreviewUrl);
            });
            return mappedQuestions;
          });
          setFormErrors({});
          setNewQuestionForms((previousForms) => {
            Object.values(previousForms).forEach((form) => {
              revokeObjectPreviewUrl(form.localImagePreviewUrl);
            });
            return buildQuestionForms(subjectFromDraft);
          });
          setSavedSnapshot(null);
          toast.info({
            title: "AI import",
            message: `Đã nạp ${mappedQuestions.length} câu hỏi từ file AI import vào form moderator. Hãy rà soát lại trước khi lưu.`,
            duration: 4200,
            showProgress: true,
          });
          return;
        }

        setIsPublishedReadonly(false);
        setStartAtInput("");
        setEndAtInput("");
        setSubject((currentSubject) => {
          return currentSubject.trim().length === 0 ? fallbackSubject : currentSubject;
        });
        setClassName((currentClassName) => {
          return currentClassName.trim().length === 0 ? DEFAULT_CLASS_NAME : currentClassName;
        });
        return;
      }

      const exam = await getComposerExamById(editingExamIdFromQuery);
      const nextReadonly = isViewOnlyFromQuery || !isModeratorEditableExamStatus(exam.status);
      const subjectFromExam = toDisplaySubjectName(
        fetchedSubjects.find((item) => item.id === exam.subjectId)?.name ?? fallbackSubject
      );
      const classNameFromExam = exam.className?.trim() || DEFAULT_CLASS_NAME;
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
      const normalizedStartAtInput = toDateTimeLocalInputValue(exam.startAt);
      const normalizedEndAtInput = toDateTimeLocalInputValue(exam.endAt);

      setExamTitle(normalizedTitle);
      setSubject(subjectFromExam);
      setClassName(classNameFromExam);
      setDurationMinutes(normalizedDuration);
      setStartAtInput(normalizedStartAtInput);
      setEndAtInput(normalizedEndAtInput);
      setQuestions((previousQuestions) => {
        previousQuestions.forEach((question) => {
          revokeObjectPreviewUrl(question.localImagePreviewUrl);
        });
        return mappedQuestions;
      });
      setActiveExamId(exam.id);
      setIsPublishedReadonly(nextReadonly);
      setFormErrors({});
      const noticeKey = `${exam.id}:${nextReadonly ? "view" : "edit"}`;
      if (lastNoticeKeyRef.current !== noticeKey) {
        lastNoticeKeyRef.current = noticeKey;
        toast.info({
          title: "Trạng thái đề thi",
          message: nextReadonly
            ? "Đề đang ở chế độ chỉ xem vì trạng thái hiện tại không cho phép chỉnh sửa."
            : "Đang chỉnh sửa đề đã lưu trên hệ thống.",
          duration: 4200,
          showProgress: true,
        });
      }
      setNewQuestionForms((previousForms) => {
        Object.values(previousForms).forEach((form) => {
          revokeObjectPreviewUrl(form.localImagePreviewUrl);
        });
        return buildQuestionForms(subjectFromExam);
      });
      setSavedSnapshot({
        examId: exam.id,
        title: normalizedTitle,
        subject: subjectFromExam,
        className: classNameFromExam,
        durationMinutes: normalizedDuration,
        startAtInput: normalizedStartAtInput,
        endAtInput: normalizedEndAtInput,
        questionSignature: buildQuestionSignature(mappedQuestions),
      });
    } catch (error) {
      setLoadError(
        extractApiErrorMessage(error, "Không thể tải dữ liệu form tạo đề từ backend.")
      );
    } finally {
      setIsLoadingForm(false);
    }
  }, [editingExamIdFromQuery, isViewOnlyFromQuery, revokeObjectPreviewUrl, toast]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!activeSubjectRecord) {
      setAvailableTopics([]);
      return;
    }

    let active = true;
    void listComposerTopics({ subjectId: activeSubjectRecord.id })
      .then((topics) => {
        if (active) {
          setAvailableTopics(topics);
        }
      })
      .catch(() => {
        if (active) {
          setAvailableTopics([]);
        }
      });

    return () => {
      active = false;
    };
  }, [activeSubjectRecord]);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") {
        return;
      }

      objectPreviewUrlsRef.current.forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
      objectPreviewUrlsRef.current.clear();
    };
  }, []);

  function updateCreateForm(type: QuestionType, patch: Partial<NewQuestionForm>) {
    setNewQuestionForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        ...patch,
      },
    }));
  }

  function handleCreateFormEditorImage(type: QuestionType, file: File, previewUrl: string) {
    registerObjectPreviewUrl(previewUrl);
    setNewQuestionForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        imageUrl: null,
        pendingImageFile: file,
        localImagePreviewUrl: previewUrl,
      },
    }));
  }

  function resetCreateForm(type: QuestionType) {
    setNewQuestionForms((prev) => {
      revokeObjectPreviewUrl(prev[type].localImagePreviewUrl);
      return {
        ...prev,
        [type]: buildNewQuestionForm(subject),
      };
    });
    setFormErrors((prev) => ({
      ...prev,
      [type]: "",
    }));
  }

  function handleSubjectChange(nextSubject: string) {
    const previousSubject = subject;
    setSubject(nextSubject);
    setQuestions((prev) =>
      prev.map((question) => ({
        ...question,
        subjectLine: nextSubject,
        tags: "",
      }))
    );

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
            tags: "",
          };
        }
      });

      return nextForms;
    });
  }

  async function saveDraft(options?: { showSuccessToast?: boolean }) {
    const showSuccessToast = options?.showSuccessToast ?? true;
    if (isPublishedReadonly) {
      toast.warning({
        title: "Không thể lưu",
        message: "Đề đã xuất bản không thể chỉnh sửa. Bạn chỉ có thể xem hoặc xóa ở trang quản lý.",
        duration: 5200,
        showProgress: true,
      });
      return null;
    }

    const normalizedTitle = examTitle.trim() || "Đề chưa đặt tên";
    const normalizedSubject = subject.trim();
    const normalizedClassName = className.trim() || DEFAULT_CLASS_NAME;

    if (!normalizedSubject) {
      toast.warning({
        title: "Thiếu thông tin",
        message: "Vui lòng nhập hoặc chọn môn học trước khi lưu.",
        duration: 4200,
        showProgress: true,
      });
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
        setSubject(toDisplaySubjectName(createdSubject.name));
        resolvedSubjectRecord = createdSubject;
      } catch (error) {
        toast.error({
          title: "Lỗi hệ thống",
          message: extractApiErrorMessage(
            error,
            "Môn học hiện tại không hợp lệ và không thể tạo mới trên backend."
          ),
          duration: 6200,
          showProgress: false,
        });
        return null;
      }
    }

    if (!resolvedSubjectRecord) {
      toast.error({
        title: "Lỗi hệ thống",
        message: "Không thể xác định môn học hợp lệ để lưu đề thi.",
        duration: 6200,
        showProgress: false,
      });
      return null;
    }

    if (questions.length === 0) {
      const shouldContinue = await confirm(
        "Đề thi này chưa có câu hỏi. Bạn vẫn muốn lưu bản nháp?"
      );
      if (!shouldContinue) {
        return null;
      }
    }

    setIsSaving(true);

    try {
      const normalizedDuration = durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION_MINUTES;
      const normalizedStartAt = normalizeDateTimeLocalInput(startAtInput);
      const normalizedEndAt = normalizeDateTimeLocalInput(endAtInput);

      if ((normalizedStartAt && !normalizedEndAt) || (!normalizedStartAt && normalizedEndAt)) {
        toast.warning({
          title: "Thời gian chưa hợp lệ",
          message: "Vui lòng nhập đầy đủ cả thời gian bắt đầu và thời gian kết thúc.",
          duration: 4200,
          showProgress: true,
        });
        return null;
      }

      if (normalizedStartAt && normalizedEndAt) {
        const startMs = new Date(normalizedStartAt).getTime();
        const endMs = new Date(normalizedEndAt).getTime();
        if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
          toast.warning({
            title: "Thời gian chưa hợp lệ",
            message: "Định dạng thời gian không hợp lệ, vui lòng chọn lại.",
            duration: 4200,
            showProgress: true,
          });
          return null;
        }

        if (endMs <= startMs) {
          toast.warning({
            title: "Thời gian chưa hợp lệ",
            message: "Thời gian kết thúc phải lớn hơn thời gian bắt đầu.",
            duration: 4200,
            showProgress: true,
          });
          return null;
        }
      }

      const examPayload = {
        title: normalizedTitle,
        subjectId: resolvedSubjectRecord.id,
        className: normalizedClassName,
        durationMinutes: normalizedDuration,
        startAt: normalizedStartAt,
        endAt: normalizedEndAt,
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

      let normalizedQuestions = questions;
      if (questions.length > 0) {
        const questionsForCreate = questions.map((question) => ({
          ...question,
          content: stripTemporaryInlineImageMarkup(question.content),
          tags: filterTagNamesByCatalog(question.tags, filteredTopics),
        }));
        const payloads = questionsForCreate.map((question, index) =>
          buildQuestionPayload(question, resolvedSubjectRecord.id, savedExam.id, index + 1, filteredTopics)
        );
        const createdQuestions = await Promise.all(payloads.map((payload) => createComposerQuestion(payload)));
        const finalizedQuestions = await Promise.all(
          createdQuestions.map(async (createdQuestion, index) => {
            const sourceQuestion = questions[index];
            if (!sourceQuestion.pendingImageFile) {
              return createdQuestion;
            }
            return uploadComposerQuestionImage(createdQuestion.id, sourceQuestion.pendingImageFile);
          })
        );

        normalizedQuestions = questions.map((question, index) => {
          const finalizedQuestion = finalizedQuestions[index];
          revokeObjectPreviewUrl(question.localImagePreviewUrl);
          const normalizedContent = stripTemporaryInlineImageMarkup(
            replaceTemporaryInlineImageSources(question.content, finalizedQuestion.imageUrl ?? null)
          );
          return {
            ...question,
            content: normalizedContent,
            persistedQuestionId: finalizedQuestion.id,
            imageUrl: finalizedQuestion.imageUrl ?? null,
            pendingImageFile: null,
            localImagePreviewUrl: null,
          };
        });
        setQuestions(normalizedQuestions);
      }

      const nextSignature = buildQuestionSignature(normalizedQuestions);
      setSavedSnapshot({
        examId: savedExam.id,
        title: normalizedTitle,
        subject: toDisplaySubjectName(resolvedSubjectRecord.name),
        className: normalizedClassName,
        durationMinutes: normalizedDuration,
        startAtInput: normalizedStartAt ?? "",
        endAtInput: normalizedEndAt ?? "",
        questionSignature: nextSignature,
      });
      if (showSuccessToast) {
        toast.success({
          title: "Hệ thống",
          message: updatingExisting
            ? "Đã cập nhật bản nháp trên backend."
            : "Đã lưu bản nháp mới lên backend.",
          duration: 3600,
          showProgress: true,
        });
      }
      return savedExam.id;
    } catch (error) {
      toast.error({
        title: "Cảnh báo hệ thống",
        message: extractApiErrorMessage(error, "Không thể lưu bản nháp lên backend."),
        duration: 6200,
        showProgress: false,
        actionText: "Thử lại",
        onAction: () => {
          void saveDraft();
        },
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDraftAndBackToOverview() {
    const isUpdatingDraft = Boolean(activeExamId);
    const savedId = await saveDraft({ showSuccessToast: false });
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

  async function backToOverview() {
    if (hasUnsavedChanges) {
      const shouldLeave = await confirm(
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
      const duplicatedPendingFile = current.pendingImageFile ?? null;
      const duplicatedPreviewUrl = duplicatedPendingFile ? current.localImagePreviewUrl ?? null : null;
      const duplicatedContent =
        duplicatedPendingFile && duplicatedPreviewUrl
          ? replaceExactImageSource(current.content, current.localImagePreviewUrl, duplicatedPreviewUrl)
          : current.content;
      const duplicated: QuestionDraft = {
        ...current,
        id: `Q-${Date.now()}`,
        persistedQuestionId: undefined,
        content: duplicatedContent,
        imageUrl: duplicatedPendingFile ? null : current.imageUrl ?? null,
        pendingImageFile: duplicatedPendingFile,
        localImagePreviewUrl: duplicatedPreviewUrl ?? null,
        options: current.options ? [...current.options] : undefined,
      };

      const next = [...prev];
      next.splice(currentIndex + 1, 0, duplicated);
      return next;
    });
  }

  function removeQuestion(questionId: string) {
    setQuestions((prev) => {
      const toRemove = prev.find((item) => item.id === questionId);
      if (toRemove) {
        revokeObjectPreviewUrl(toRemove.localImagePreviewUrl);
      }
      return prev.filter((item) => item.id !== questionId);
    });
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

    if (!hasMeaningfulEditorContent(content)) {
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
      imageUrl: currentForm.imageUrl,
      pendingImageFile: currentForm.pendingImageFile,
      localImagePreviewUrl: currentForm.localImagePreviewUrl,
      points,
      tags: filterTagNamesByCatalog(currentForm.tags, filteredTopics),
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
    setNewQuestionForms((prev) => ({
      ...prev,
      [type]: buildNewQuestionForm(subject),
    }));
    setFormErrors((prev) => ({
      ...prev,
      [type]: "",
    }));
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-1 pb-20">
      <section className="space-y-6">
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[var(--ink-900)]">Cấu hình bài thi</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 rounded-2xl bg-[var(--bg-soft)] p-6 md:grid-cols-2 xl:grid-cols-12">
          <div className="space-y-2 md:col-span-2 xl:col-span-6">
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

          <div className="space-y-2 xl:col-span-2">
            <label className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">
              Lớp học
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border border-transparent bg-white px-4 py-3 font-medium text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                disabled={isFormLocked}
              >
                {CLASS_NAME_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-3 text-[var(--ink-500)]">▾</span>
            </div>
          </div>

          <div className="space-y-2 xl:col-span-2">
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
                  <option value={subject}>{toDisplaySubjectName(subject)}</option>
                ) : (
                  availableSubjects.map((item) => (
                    <option key={item.id} value={toDisplaySubjectName(item.name)}>
                      {toDisplaySubjectName(item.name)}
                    </option>
                  ))
                )}
              </select>
              <span className="pointer-events-none absolute right-3 top-3 text-[var(--ink-500)]">▾</span>
            </div>
          </div>

          <div className="space-y-2 xl:col-span-2">
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

          <div className="space-y-2 xl:col-span-3 xl:col-start-7">
            <label className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">
              Bắt đầu
            </label>
            <input
              className="w-full rounded-xl border border-transparent bg-white px-4 py-3 font-medium text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
              type="datetime-local"
              value={startAtInput}
              onChange={(event) => setStartAtInput(event.target.value)}
              disabled={isFormLocked}
            />
          </div>

          <div className="space-y-2 xl:col-span-3">
            <label className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">
              Kết thúc
            </label>
            <input
              className="w-full rounded-xl border border-transparent bg-white px-4 py-3 font-medium text-[var(--ink-900)] outline-none transition focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_rgba(31,99,180,0.14)]"
              type="datetime-local"
              value={endAtInput}
              onChange={(event) => setEndAtInput(event.target.value)}
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
                        disabled
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

                    <div className="space-y-2 md:col-span-3">
                      <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Tags theo môn học</span>
                      <TopicTagSelector
                        value={currentForm.tags}
                        topics={filteredTopics}
                        disabled={isFormLocked}
                        emptyLabel={activeSubjectRecord ? "Môn này chưa có tag trong danh mục." : "Hãy chọn môn học trước để hiển thị danh mục tag."}
                        onChange={(nextValue) => updateCreateForm(config.type, { tags: nextValue })}
                      />
                    </div>
                  </div>

                  <div className="mt-4 block space-y-2">
                    <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Nội dung câu hỏi</span>
                    <QuestionContentEditor
                      id={editorIdForQuestionType(config.type)}
                      value={currentForm.content}
                      onChange={(content) => updateCreateForm(config.type, { content })}
                      onImagePicked={(file, previewUrl) =>
                        handleCreateFormEditorImage(config.type, file, previewUrl)
                      }
                      disabled={isFormLocked}
                    />
                  </div>

                  {config.type === "Trắc nghiệm (Multiple Choice)" ? (
                    <div className="mt-4 space-y-3">
                      <span className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">Phương án trả lời</span>
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
                            <div
                              className="prose max-w-none font-medium leading-relaxed text-[var(--ink-900)] [&_img]:my-2 [&_img]:mx-auto [&_img]:block [&_img]:h-auto [&_img]:max-w-[min(100%,360px)] [&_img]:rounded-lg [&_figure.image]:my-2 [&_figure.image]:mx-auto [&_figure.image]:max-w-[min(100%,360px)]"
                              dangerouslySetInnerHTML={{ __html: question.content }}
                            />
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
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-500)]">
                                  <Tag size={14} />
                                  <span>Tags theo môn học</span>
                                </div>
                                <TopicTagSelector
                                  value={question.tags}
                                  topics={filteredTopics}
                                  disabled={isFormLocked}
                                  emptyLabel={
                                    activeSubjectRecord
                                      ? "Môn này chưa có tag trong danh mục."
                                      : "Hãy chọn môn học trước để hiển thị danh mục tag."
                                  }
                                  onChange={(nextValue) => updateQuestion(question.id, { tags: nextValue })}
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


