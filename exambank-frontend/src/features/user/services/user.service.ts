import { apiClient, getStoredAuthToken } from "@/lib/api-client";
import { isAxiosError } from "axios";
import type {
  AccountStatus,
  ChangePasswordPayload,
  DocumentRatingStats,
  DocumentSummary,
  EducationLevel,
  Exam,
  ExamListItem,
  ExamSessionResult,
  ExamSessionStatusResponse,
  LeaderboardUser,
  Question,
  Ranking,
  SaveAnswerItem,
  SelectedFile,
  StartExamSessionResponse,
  Subject,
  SubmitReason,
  Submission,
  TopicData,
  UpdateUserProfilePayload,
  UploadDocumentPayload,
  UserComment,
  UserProfile,
} from "../types/user.type";
import { getStoredAuthUser } from "@/features/auth/services/auth.service";

const api = apiClient;
const buildAuthConfig = () => {
  const token = getStoredAuthToken();
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;
};

const DEFAULT_EDUCATION_LEVELS: EducationLevel[] = [
  { id: "10", name: "Lớp 10", group: "THPT" },
  { id: "11", name: "Lớp 11", group: "THPT" },
  { id: "12", name: "Lớp 12", group: "THPT" },
  { id: "uni", name: "Sinh viên Đại học", group: "Đại học" },
];

const DEFAULT_SUBJECTS: Subject[] = [
  "Toán học",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Ngữ văn",
  "Tiếng Anh",
  "Lịch sử",
  "Địa lý",
  "Tin học",
];
const SUBMISSION_STORAGE_KEY_PREFIX = "exambank_user_submissions";
const STORAGE_PUBLIC_ENDPOINT = (
  import.meta.env.VITE_STORAGE_PUBLIC_ENDPOINT ??
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_MINIO_PUBLIC_ENDPOINT ??
  ""
).replace(/\/+$/, "");

type BackendDocument = {
  id: number;
  title: string;
  school?: string;
  subject?: string;
  semesterYear?: string;
  semester?: string;
  type?: string;
  className?: string;
  fileUrl?: string;
  previewUrl?: string;
  averageRating?: number;
  downloadCount?: number;
  status?: string;
  submittedAt?: string;
  createdAt?: string;
  moderatorNote?: string;
};

type BackendReview = {
  id: number;
  userId: number;
  userName?: string;
  rating?: number;
  comment?: string;
  createdAt: string;
  canDelete?: boolean;
};

type BackendLeaderBoardEntry = {
  rank?: number;
  userId?: number;
  displayName?: string;
  avatar?: string | null;
  xp?: number;
  streak?: number;
  coinBalance?: number;
  // Legacy shape fallback
  id?: number;
  totalPoints?: number;
  user?: {
    id?: number;
    name?: string;
  };
};

type BackendLeaderBoardResponse = {
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  items?: BackendLeaderBoardEntry[];
};

type BackendSubject = {
  id: number;
  name: string;
};

type BackendTopic = {
  id: number;
  name: string;
};

type BackendExam = {
  id: number;
  title: string;
  subjectId?: number | null;
  subjectName?: string | null;
  subject_name?: string | null;
  subject?:
    | string
    | {
        id?: number | string | null;
        name?: string | null;
        subjectName?: string | null;
        subject_name?: string | null;
        title?: string | null;
      }
    | null;
  className?: string;
  classLevel?: string;
  grade?: string;
  educationLevelName?: string;
  durationMinutes?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  status?: string;
  createdAt?: string;
};

type BackendExamQuestion = {
  questionId: number;
  content: string;
  imageUrl?: string | null;
  options?: string | null;
  answer?: string | null;
  score?: number | string | null;
  maxScore?: number | string | null;
  max_score?: number | string | null;
  point?: number | string | null;
  points?: number | string | null;
  difficulty?: number | null;
};

type BackendQuestionDetail = {
  id?: number;
  maxScore?: number | string | null;
  max_score?: number | string | null;
  score?: number | string | null;
  point?: number | string | null;
  points?: number | string | null;
  difficulty?: number | string | null;
};

type BackendStartExamSession = {
  sessionId: number;
  status: string;
  startTime?: string;
  timeLimitMinutes?: number;
  expiresAt?: string;
};

type BackendExamSessionStatus = {
  sessionId: number;
  status: string;
  submittedAt?: string;
  totalScore?: number;
};

type BackendQuestionResult = {
  questionId?: number;
  question_id?: number;
  isCorrect?: boolean;
  is_correct?: boolean;
  scoreEarned?: number | string;
  score_earned?: number | string;
  maxScore?: number | string;
  max_score?: number | string;
};

type BackendExamSessionResult = {
  sessionId: number;
  totalScore?: number;
  submitReason?: SubmitReason;
  startTime?: string;
  submittedAt?: string;
  timeLimitMinutes?: number;
  questionResults?: BackendQuestionResult[];
};

type BackendExamLeaderboardItem = {
  rank?: number;
  userId?: number;
  userName?: string;
  totalScore?: number;
  currentUser?: boolean;
};

type BackendUser = {
  id: number;
  email: string;
  name: string;
  primaryRole?: string;
  roles?: string[];
  avatarUrl?: string;
  avatar?: string;
  imageUrl?: string;
  photoUrl?: string;
  profileImageUrl?: string;
  xp?: number;
  coinBalance?: number;
  streak?: number;
  status?: string;
  phone?: string;
  birthDate?: string;
  premiumConfirmed?: boolean;
  createdAt?: string;
};

type UserExamAttempt = {
  sessionId: number;
  startedAt: string | null;
  submittedAt: string | null;
  totalScore: number;
  durationSeconds: number | null;
};


type BackendSelfUser = {
  id?: number;
  email?: string;
  name?: string;
  avatarUrl?: string;
  avatar?: string;
  imageUrl?: string;
  photoUrl?: string;
  profileImageUrl?: string;
};

const normalizeExamStatus = (status?: string): string => (status ?? "").trim().toUpperCase();

const isUserVisibleExamStatus = (status?: string): boolean => {
  const normalized = normalizeExamStatus(status);
  return normalized === "PUBLISHED" || normalized === "ONGOING" || normalized === "CLOSED";
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toArrayPayload = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const objectValue = value as Record<string, unknown>;
  const candidates = [
    objectValue.data,
    objectValue.content,
    objectValue.items,
    objectValue.sessions,
    objectValue.payload,
    objectValue.result,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const normalizeUserAttempt = (value: unknown): UserExamAttempt | null => {
  if (!value || typeof value !== "object") return null;
  const objectValue = value as Record<string, unknown>;
  const sessionId = toNumberOrNull(objectValue.sessionId ?? objectValue.session_id ?? objectValue.id);
  if (sessionId === null || sessionId <= 0) return null;

  return {
    sessionId,
    startedAt: toStringOrNull(objectValue.startTime ?? objectValue.start_time),
    submittedAt: toStringOrNull(objectValue.submittedAt ?? objectValue.submitted_at),
    totalScore: toNumberOrNull(objectValue.totalScore ?? objectValue.total_score) ?? 0,
    durationSeconds: toNumberOrNull(objectValue.durationSeconds ?? objectValue.duration_seconds),
  };
};


const toExamSessionStatus = (status?: string): ExamSessionStatusResponse["status"] => {
  const normalized = (status ?? "").trim().toUpperCase();
  if (normalized === "IN_PROGRESS" || normalized === "SUBMITTED" || normalized === "GRADING" || normalized === "COMPLETED" || normalized === "ABANDONED") {
    return normalized;
  }
  return "IN_PROGRESS";
};

const mapSessionStatus = (data: BackendExamSessionStatus): ExamSessionStatusResponse => ({
  sessionId: data.sessionId,
  status: toExamSessionStatus(data.status),
  submittedAt: data.submittedAt,
  totalScore: data.totalScore,
});

const mapStartSession = (data: BackendStartExamSession): StartExamSessionResponse => ({
  sessionId: data.sessionId,
  status: toExamSessionStatus(data.status),
  startTime: data.startTime,
  timeLimitMinutes: data.timeLimitMinutes,
  expiresAt: data.expiresAt,
});

const toFiniteNumberOrUndefined = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return undefined;
};

const toPublicStorageUrl = (fileUrl: string | null | undefined): string | null => {
  if (!fileUrl) {
    return null;
  }

  const normalized = fileUrl.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return `${STORAGE_PUBLIC_ENDPOINT}${normalized}`;
  }

  if (!normalized.startsWith("storage://")) {
    return `${STORAGE_PUBLIC_ENDPOINT}/${normalized.replace(/^\/+/, "")}`;
  }

  const pathWithoutScheme = normalized.slice("storage://".length);
  const firstSlash = pathWithoutScheme.indexOf("/");
  if (firstSlash <= 0) {
    return null;
  }

  const bucket = pathWithoutScheme.slice(0, firstSlash);
  const objectKey = pathWithoutScheme.slice(firstSlash + 1);
  return `${STORAGE_PUBLIC_ENDPOINT}/api/v1/storage/${encodeURIComponent(bucket)}?key=${encodeURIComponent(objectKey)}`;
};

const appendQuestionImageHtml = (content: string, imageUrl: string | null | undefined): string => {
  const resolvedImageUrl = toPublicStorageUrl(imageUrl);
  if (!resolvedImageUrl) {
    return content;
  }

  const escapedImageUrl = resolvedImageUrl.replace(/"/g, "&quot;");
  return `${content}<p><img src="${escapedImageUrl}" alt="Question image" /></p>`;
};

const mapSessionResult = (data: BackendExamSessionResult): ExamSessionResult => ({
  sessionId: data.sessionId,
  totalScore: data.totalScore,
  submitReason: data.submitReason,
  startTime: data.startTime,
  submittedAt: data.submittedAt,
  timeLimitMinutes: data.timeLimitMinutes,
  questionResults: (data.questionResults ?? []).map((item) => ({
    questionId: item.questionId ?? item.question_id ?? 0,
    isCorrect: item.isCorrect ?? item.is_correct,
    scoreEarned: toFiniteNumberOrUndefined(item.scoreEarned ?? item.score_earned),
    maxScore: toFiniteNumberOrUndefined(item.maxScore ?? item.max_score),
  })),
});

const toAccountStatus = (status?: string): AccountStatus => {
  if (status === "INACTIVE" || status === "BANNED") {
    return status;
  }
  return "ACTIVE";
};

const deriveUsername = (email: string, id: number): string => {
  const localPart = email.split("@")[0]?.trim();
  if (localPart && localPart.length > 0) {
    return localPart;
  }
  return `user_${id}`;
};

const toNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveBackendExamSubjectName = (item: BackendExam): string | undefined => {
  const direct = toNonEmptyString(item.subjectName) ?? toNonEmptyString(item.subject_name);
  if (direct) {
    return direct;
  }

  if (typeof item.subject === "string") {
    return toNonEmptyString(item.subject);
  }

  if (!item.subject || typeof item.subject !== "object") {
    return undefined;
  }

  return (
    toNonEmptyString(item.subject.name) ??
    toNonEmptyString(item.subject.subjectName) ??
    toNonEmptyString(item.subject.subject_name) ??
    toNonEmptyString(item.subject.title)
  );
};

const resolveBackendAvatarUrl = (
  user: Pick<BackendUser, "avatarUrl" | "avatar" | "imageUrl" | "photoUrl" | "profileImageUrl">,
): string | undefined => {
  const rawAvatarUrl = (
    toNonEmptyString(user.avatarUrl) ??
    toNonEmptyString(user.avatar) ??
    toNonEmptyString(user.imageUrl) ??
    toNonEmptyString(user.photoUrl) ??
    toNonEmptyString(user.profileImageUrl)
  );

  if (!rawAvatarUrl) {
    return undefined;
  }

  return toPublicStorageUrl(rawAvatarUrl) ?? rawAvatarUrl;
};

const normalizeRoles = (user: BackendUser): string[] => {
  const roleSet = new Set<string>();
  for (const role of user.roles ?? []) {
    if (role && role.trim()) {
      roleSet.add(role.trim());
    }
  }
  if (user.primaryRole && user.primaryRole.trim()) {
    roleSet.add(user.primaryRole.trim());
  }
  if (roleSet.size === 0) {
    roleSet.add("USER");
  }
  return Array.from(roleSet);
};

const mapBackendUserToProfile = (user: BackendUser): UserProfile => ({
  id: user.id,
  name: user.name,
  email: user.email,
  username: deriveUsername(user.email, user.id),
  avatarUrl: resolveBackendAvatarUrl(user),
  roles: normalizeRoles(user),
  status: toAccountStatus(user.status),
  phone: toNonEmptyString(user.phone),
  birthDate: toNonEmptyString(user.birthDate),
  xp: user.xp ?? 0,
  coinBalance: user.coinBalance ?? 0,
  streak: user.streak ?? 0,
  premiumConfirmed: Boolean(user.premiumConfirmed),
  createdAt: user.createdAt,
});

const mapStoredAuthUserToProfile = (): UserProfile | null => {
  const storedUser = getStoredAuthUser();
  if (!storedUser) {
    return null;
  }

  const resolvedId = typeof storedUser.id === "number" ? storedUser.id : Number.parseInt(String(storedUser.id ?? "0"), 10) || 0;
  const resolvedRoles = storedUser.roles?.length
    ? storedUser.roles
    : storedUser.role
      ? [storedUser.role]
      : ["USER"];

  return {
    id: resolvedId,
    name: storedUser.fullName?.trim() || storedUser.email || "Người dùng",
    email: storedUser.email || "",
    username: storedUser.email ? deriveUsername(storedUser.email, resolvedId) : `user_${resolvedId}`,
    avatarUrl: storedUser.avatarUrl,
    roles: resolvedRoles,
    status: "ACTIVE",
    phone: undefined,
    birthDate: undefined,
    xp: 0,
    coinBalance: 0,
    streak: 0,
    premiumConfirmed: false,
    createdAt: undefined,
  };
};

const mapBackendSelfUserToProfile = (selfUser: BackendSelfUser): UserProfile => {
  const storedFallback = mapStoredAuthUserToProfile();
  const id = selfUser.id ?? storedFallback?.id ?? 0;
  const email = toNonEmptyString(selfUser.email) ?? storedFallback?.email ?? "";
  const name = toNonEmptyString(selfUser.name) ?? storedFallback?.name ?? (email || "Nguoi dung");
  const roles = storedFallback?.roles?.length ? storedFallback.roles : ["USER"];

  return {
    id,
    name,
    email,
    username: deriveUsername(email, id),
    avatarUrl: resolveBackendAvatarUrl(selfUser) ?? storedFallback?.avatarUrl,
    roles,
    status: storedFallback?.status ?? "ACTIVE",
    phone: storedFallback?.phone,
    birthDate: storedFallback?.birthDate,
    xp: storedFallback?.xp ?? 0,
    coinBalance: storedFallback?.coinBalance ?? 0,
    streak: storedFallback?.streak ?? 0,
    premiumConfirmed: storedFallback?.premiumConfirmed,
    createdAt: storedFallback?.createdAt,
  };
};

const getHttpStatus = (error: unknown): number | undefined => {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? error.status;
    return typeof status === "number" ? status : undefined;
  }

  if (typeof error === "object" && error !== null) {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    return typeof status === "number" ? status : undefined;
  }

  return undefined;
};

const isLegacyMeFallbackStatus = (status?: number): boolean => status === 404 || status === 405;

const toRelativeTime = (isoDate?: string): string => {
  if (!isoDate) {
    return "Vừa xong";
  }

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (Number.isNaN(diffMins) || diffMins < 1) {
    return "Vừa xong";
  }
  if (diffMins < 60) {
    return `${diffMins} phút trước`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
};

const toDisplayDate = (isoDate?: string): string => {
  if (!isoDate) {
    return "N/A";
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const toDisplayDateTime = (isoDate?: string): string => {
  if (!isoDate) {
    return "N/A";
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const parseOptions = (rawOptions?: string | null): string[] => {
  if (!rawOptions) {
    return [];
  }

  const cleanOptionText = (value: string): string =>
    value
      .trim()
      .replace(/^[A-Da-d]\s*[).:-]\s*/, "")
      .trim();

  const finalize = (source: string[]): string[] => {
    return source
      .map((item) => cleanOptionText(item))
      .filter((item) => item.length > 0);
  };

  const parseStructuredValue = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return finalize(
        value
          .map((item) => {
            if (typeof item === "string") {
              return item;
            }
            if (item && typeof item === "object") {
              const optionObj = item as {
                content?: string;
                text?: string;
                value?: string;
                label?: string;
                option?: string;
              };
              return optionObj.content ?? optionObj.text ?? optionObj.value ?? optionObj.label ?? optionObj.option ?? "";
            }
            return "";
          })
      );
    }

    if (value && typeof value === "object") {
      const optionObj = value as {
        options?: unknown;
        choices?: unknown;
        answers?: unknown;
      };

      const fromOptions = parseStructuredValue(optionObj.options);
      if (fromOptions.length > 0) {
        return fromOptions;
      }

      const fromChoices = parseStructuredValue(optionObj.choices);
      if (fromChoices.length > 0) {
        return fromChoices;
      }

      return parseStructuredValue(optionObj.answers);
    }

    return [];
  };

  try {
    const parsed = JSON.parse(rawOptions) as unknown;
    const structured = parseStructuredValue(parsed);
    if (structured.length > 0) {
      return structured;
    }
  } catch {
    // Fallback parsing is handled below for non-JSON legacy formats.
  }

  // Fallback for legacy/plain-text option formats, e.g. "A. ...\nB. ..." or "opt1|opt2|opt3|opt4".
  const normalized = rawOptions.replace(/\r/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const splitByLabel = normalized
    .split(/(?:^|\n)\s*[A-Da-d]\s*[).:-]\s*/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (splitByLabel.length >= 2) {
    return finalize(splitByLabel);
  }

  for (const separator of ["|", ";", "\n"]) {
    if (!normalized.includes(separator)) {
      continue;
    }

    const parts = normalized
      .split(separator)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (parts.length >= 2) {
      return finalize(parts);
    }
  }

  return [];
};

const looksLikeTrueFalseOptions = (source: string[]): boolean => {
  if (source.length !== 2) {
    return false;
  }

  const normalized = source.map((item) => item.trim().toLowerCase());
  const hasTrue = normalized.some((item) => item === "đúng" || item === "dung" || item === "true");
  const hasFalse = normalized.some((item) => item === "sai" || item === "false");
  return hasTrue && hasFalse;
};

const parseMcqAnswerIndex = (answer: string | null | undefined, options: string[]): number => {
  if (!answer) {
    return 0;
  }

  const normalized = answer.trim();
  const asNumber = Number(normalized);
  if (!Number.isNaN(asNumber) && asNumber >= 0 && asNumber < options.length) {
    return asNumber;
  }

  if (/^[A-Za-z]$/.test(normalized)) {
    const idx = normalized.toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < options.length) {
      return idx;
    }
  }

  const matchIndex = options.findIndex((opt) => opt.trim() === normalized);
  return matchIndex >= 0 ? matchIndex : 0;
};

const mapDocumentToSummary = (doc: BackendDocument): DocumentSummary => ({
  id: doc.id,
  title: doc.title,
  school: doc.school,
  subject: doc.subject,
  semesterYear: doc.semesterYear ?? doc.semester,
  type: doc.type,
  className: doc.className,
  fileUrl: doc.fileUrl ?? doc.previewUrl,
  averageRating: doc.averageRating,
  downloadCount: doc.downloadCount,
  status: doc.status,
  submittedAt: doc.submittedAt,
  createdAt: doc.createdAt,
  moderatorNote: doc.moderatorNote,
});

const getSubmissionStorageKey = (): string => {
  const storedUser = getStoredAuthUser();
  const userId = storedUser?.id;
  if (userId !== undefined && userId !== null && String(userId).trim().length > 0) {
    return `${SUBMISSION_STORAGE_KEY_PREFIX}:${String(userId).trim()}`;
  }

  const email = storedUser?.email?.trim().toLowerCase();
  if (email) {
    return `${SUBMISSION_STORAGE_KEY_PREFIX}:${email}`;
  }

  return `${SUBMISSION_STORAGE_KEY_PREFIX}:guest`;
};

const toStoredBackendDocument = (doc: DocumentSummary): BackendDocument => ({
  id: doc.id,
  title: doc.title,
  school: doc.school,
  subject: doc.subject,
  semesterYear: doc.semesterYear,
  semester: doc.semesterYear,
  type: doc.type,
  className: doc.className,
  fileUrl: doc.fileUrl,
  averageRating: doc.averageRating,
  downloadCount: doc.downloadCount,
  status: doc.status,
  submittedAt: doc.submittedAt,
  createdAt: doc.createdAt,
  moderatorNote: doc.moderatorNote,
});

const normalizeStoredDocument = (value: unknown): BackendDocument | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<BackendDocument>;
  if (typeof item.id !== "number" || typeof item.title !== "string" || item.title.trim().length === 0) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    school: item.school,
    subject: item.subject,
    semesterYear: item.semesterYear ?? item.semester,
    semester: item.semester ?? item.semesterYear,
    type: item.type,
    className: item.className,
    fileUrl: item.fileUrl,
    previewUrl: item.previewUrl,
    averageRating: item.averageRating,
    downloadCount: item.downloadCount,
    status: item.status,
    submittedAt: item.submittedAt,
    createdAt: item.createdAt,
    moderatorNote: item.moderatorNote,
  };
};

const loadStoredSubmissions = (): BackendDocument[] => {
  try {
    const raw = localStorage.getItem(getSubmissionStorageKey());
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeStoredDocument)
      .filter((item): item is BackendDocument => item !== null);
  } catch {
    return [];
  }
};

const saveStoredSubmissions = (documents: BackendDocument[]): void => {
  try {
    localStorage.setItem(getSubmissionStorageKey(), JSON.stringify(documents));
  } catch {
    // Skip persistence when storage is unavailable.
  }
};

const upsertStoredSubmission = (summary: DocumentSummary): void => {
  const nextDocument = {
    ...toStoredBackendDocument(summary),
    status: summary.status ?? "PENDING_REVIEW",
    submittedAt: summary.submittedAt ?? summary.createdAt ?? new Date().toISOString(),
    createdAt: summary.createdAt ?? new Date().toISOString(),
  };

  const existing = loadStoredSubmissions();
  const remaining = existing.filter((item) => item.id !== nextDocument.id);
  const next = [nextDocument, ...remaining].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return right.id - left.id;
  });

  saveStoredSubmissions(next);
};

const normalizeSortByValue = (value: string): string => {
  const normalized = value.trim().toUpperCase();
  if (normalized === "MOST_DOWNLOADED") {
    return "MOST_DOWNLOADED";
  }
  if (normalized === "HIGHEST_RATED" || normalized === "HIGHEST_RATING") {
    return "HIGHEST_RATING";
  }
  return "NEWEST";
};

const normalizeDocumentQueryParams = (
  params?: Record<string, string | number | undefined>,
): Record<string, string | number> | undefined => {
  if (!params) {
    return undefined;
  }

  const normalized: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (key === "status") {
      continue;
    }

    if (key === "sort" || key === "sortBy") {
      normalized.sortBy = normalizeSortByValue(String(value));
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
};

const toLeaderboardEntries = (data: BackendLeaderBoardResponse | BackendLeaderBoardEntry[]): BackendLeaderBoardEntry[] => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  return [];
};

const toLeaderboardPoints = (item: BackendLeaderBoardEntry): number => {
  return Math.round(item.xp ?? item.totalPoints ?? 0);
};

const toLeaderboardDisplayName = (item: BackendLeaderBoardEntry, index: number): string => {
  return item.displayName ?? item.user?.name ?? `User ${item.userId ?? item.user?.id ?? index + 1}`;
};

const toLeaderboardAvatarSeed = (item: BackendLeaderBoardEntry, index: number): string => {
  return String(item.userId ?? item.user?.id ?? item.id ?? index + 1);
};

const mapLeaderBoards = (items: BackendLeaderBoardEntry[]): Ranking[] => {
  return [...items]
    .sort((a, b) => toLeaderboardPoints(b) - toLeaderboardPoints(a))
    .slice(0, 5)
    .map((item, index) => {
      const points = toLeaderboardPoints(item);
      return {
        rank: index + 1,
        name: toLeaderboardDisplayName(item, index),
        score: `${points}/1200`,
        avatar: toLeaderboardAvatarSeed(item, index),
      };
    });
};

const mapLeaderBoardUsers = (items: BackendLeaderBoardEntry[]): LeaderboardUser[] => {
  return [...items]
    .sort((a, b) => toLeaderboardPoints(b) - toLeaderboardPoints(a))
    .slice(0, 10)
    .map((item, index) => ({
      rank: index + 1,
      name: toLeaderboardDisplayName(item, index),
      score: toLeaderboardPoints(item),
      isUser: false,
    }));
};

const mapDocumentToSubmission = (doc: DocumentSummary): Submission => {
  const status = doc.status === "APPROVED" ? "Approved" : doc.status === "REJECTED" ? "Rejected" : "Pending";

  return {
    id: doc.id,
    title: doc.title,
    university: doc.school ?? "Chưa cập nhật",
    year: doc.semesterYear ?? "N/A",
    subject: doc.subject ?? "Chưa phân loại",
    type: doc.type ?? "Tài liệu",
    status,
    submittedAt: toDisplayDateTime(doc.submittedAt ?? doc.createdAt),
    note: doc.moderatorNote,
    reason: doc.moderatorNote,
    date: toDisplayDate(doc.createdAt),
  };
};

const mapQuestion = (item: BackendExamQuestion): Question => {
  const options = parseOptions(item.options);
  const answerText = (item.answer ?? "").trim();
  const questionContent = appendQuestionImageHtml(item.content, item.imageUrl);
  const scoreCandidates = [
    item.score,
    item.maxScore,
    item.max_score,
    item.point,
    item.points,
    item.difficulty,
  ];
  const score = scoreCandidates
    .map((value) => toFiniteNumberOrUndefined(value))
    .find((value): value is number => typeof value === "number" && value > 0) ?? 1;

  if (looksLikeTrueFalseOptions(options)) {
    return {
      id: String(item.questionId),
      type: "true_false",
      question: questionContent,
      correctAnswer: answerText.toLowerCase() === "đúng" || answerText.toLowerCase() === "dung" || answerText.toLowerCase() === "true" || answerText.toLowerCase() === "a",
      score,
    };
  }

  if (options.length > 0) {
    return {
      id: String(item.questionId),
      type: "multiple_choice",
      question: questionContent,
      options,
      correctAnswer: parseMcqAnswerIndex(answerText, options),
      score,
    };
  }

  if (answerText.toLowerCase() === "true" || answerText.toLowerCase() === "false") {
    return {
      id: String(item.questionId),
      type: "true_false",
      question: questionContent,
      correctAnswer: answerText.toLowerCase() === "true",
      score,
    };
  }

  return {
    id: String(item.questionId),
    type: "fill_blank",
    question: questionContent,
    correctAnswer: answerText,
    score,
  };
};

export const userService = {
  getComments: async (documentId: number): Promise<UserComment[]> => {
    try {
      const { data } = await api.get<BackendReview[]>(`/api/v1/documents/${documentId}/reviews`);
      return data.map((item) => ({
        id: item.id,
        author: item.userName ?? `User ${item.userId}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.userId}`,
        rating: item.rating ?? 0,
        time: toRelativeTime(item.createdAt),
        content: item.comment ?? "",
        likes: 0,
        canDelete: item.canDelete,
      }));
    } catch {
      return [];
    }
  },

  getEducationLevels: async (): Promise<EducationLevel[]> => {
    return DEFAULT_EDUCATION_LEVELS;
  },

  getSubjects: async (): Promise<Subject[]> => {
    const supplementalSubjects: Subject[] = [
      "Gi\u00e1o d\u1ee5c c\u00f4ng d\u00e2n",
      "C\u00f4ng ngh\u1ec7",
      "Qu\u1ed1c ph\u00f2ng an ninh",
      "Khoa h\u1ecdc t\u1ef1 nhi\u00ean",
      "Khoa h\u1ecdc x\u00e3 h\u1ed9i",
    ];
    const allSubjectsOption = "Tất cả môn học";
    const normalizeSubjectKey = (value: string): string => value.trim().toLowerCase();
    const mergeSubjects = (dynamicSubjects: string[]): Subject[] => {
      const merged = [...DEFAULT_SUBJECTS, ...supplementalSubjects, ...dynamicSubjects]
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      const deduped = Array.from(new Map(merged.map((item) => [normalizeSubjectKey(item), item])).values());
      return [allSubjectsOption, ...deduped];
    };

    try {
      const { data } = await api.get<BackendSubject[]>("/api/subjects");
      const names = data
        .map((item) => item.name)
        .filter((item) => item.trim().length > 0)
        .map((item) => item.trim());
      return mergeSubjects(names);
    } catch {
      return mergeSubjects([]);
    }
  },

  getRankings: async (): Promise<Ranking[]> => {
    try {
      const { data } = await api.get<BackendLeaderBoardResponse | BackendLeaderBoardEntry[]>("/api/v1/leaderboard", {
        ...buildAuthConfig(),
        params: {
          page: 0,
          size: 20,
          sortMode: "XP",
        },
      });
      return mapLeaderBoards(toLeaderboardEntries(data));
    } catch {
      return [];
    }
  },

  getTopics: async (): Promise<TopicData[]> => {
    try {
      const { data } = await api.get<BackendTopic[]>("/api/topics");
      return data.slice(0, 8).map((item, index) => ({
        name: item.name,
        percentage: Math.max(50, 95 - index * 7),
        color: index % 3 === 0 ? "bg-emerald-500" : index % 3 === 1 ? "bg-blue-500" : "bg-amber-500",
      }));
    } catch {
      return [];
    }
  },

  getLeaderboard: async (): Promise<LeaderboardUser[]> => {
    try {
      const { data } = await api.get<BackendLeaderBoardResponse | BackendLeaderBoardEntry[]>("/api/v1/leaderboard", {
        ...buildAuthConfig(),
        params: {
          page: 0,
          size: 20,
          sortMode: "XP",
        },
      });
      return mapLeaderBoardUsers(toLeaderboardEntries(data));
    } catch {
      return [];
    }
  },

  getSubmissions: async (): Promise<Submission[]> => {
    try {
      const hasToken = Boolean(getStoredAuthToken());
      if (!hasToken) {
        return loadStoredSubmissions()
          .sort((left, right) => {
            const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : left.createdAt ? new Date(left.createdAt).getTime() : 0;
            const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : right.createdAt ? new Date(right.createdAt).getTime() : 0;
            if (leftTime !== rightTime) {
              return rightTime - leftTime;
            }
            return right.id - left.id;
          })
          .map(mapDocumentToSummary)
          .map(mapDocumentToSubmission);
      }

      try {
        const { data } = await api.get<BackendDocument[]>("/api/v1/users/me/documents");
        const normalizedDocuments = data.map((item) => ({
          ...item,
          semesterYear: item.semesterYear ?? item.semester,
          semester: item.semester ?? item.semesterYear,
        }));

        saveStoredSubmissions(normalizedDocuments);

        return normalizedDocuments
          .sort((left, right) => {
            const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : left.createdAt ? new Date(left.createdAt).getTime() : 0;
            const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : right.createdAt ? new Date(right.createdAt).getTime() : 0;
            if (leftTime !== rightTime) {
              return rightTime - leftTime;
            }
            return right.id - left.id;
          })
          .map(mapDocumentToSummary)
          .map(mapDocumentToSubmission);
      } catch {
        return loadStoredSubmissions()
          .sort((left, right) => {
            const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : left.createdAt ? new Date(left.createdAt).getTime() : 0;
            const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : right.createdAt ? new Date(right.createdAt).getTime() : 0;
            if (leftTime !== rightTime) {
              return rightTime - leftTime;
            }
            return right.id - left.id;
          })
          .map(mapDocumentToSummary)
          .map(mapDocumentToSubmission);
      }
    } catch {
      return [];
    }
  },

  getSelectedFile: async (): Promise<SelectedFile | null> => {
    return null;
  },

  getMyProfile: async (): Promise<UserProfile> => {
    try {
      const { data } = await api.get<BackendUser>("/api/v1/users/me");
      return mapBackendUserToProfile(data);
    } catch (error) {
      const status = getHttpStatus(error);
      if (isLegacyMeFallbackStatus(status)) {
        const fallbackProfile = mapStoredAuthUserToProfile();
        if (fallbackProfile) {
          return fallbackProfile;
        }
      }

      const hasToken = Boolean(getStoredAuthToken());
      if (!hasToken) {
        const fallbackProfile = mapStoredAuthUserToProfile();
        if (fallbackProfile) {
          return fallbackProfile;
        }
      }

      throw error instanceof Error ? error : new Error("Khong the tai thong tin ho so.");
    }
  },

  updateMyProfile: async (payload: UpdateUserProfilePayload): Promise<UserProfile> => {
    try {
      const { data: current } = await api.get<BackendUser>("/api/v1/users/me");
      const { data } = await api.put<BackendUser>("/api/v1/users/me", {
        email: payload.email,
        name: payload.name,
        status: payload.status ?? current.status ?? "ACTIVE",
        phone: payload.phone,
        birthDate: payload.birthDate,
      });
      return mapBackendUserToProfile(data);
    } catch (error) {
      const status = getHttpStatus(error);
      if (!isLegacyMeFallbackStatus(status)) {
        throw error;
      }

      const { data } = await api.patch<BackendSelfUser>("/api/v1/me/profile", {
        name: payload.name,
      });
      return mapBackendSelfUserToProfile(data);
    }
  },

  updateMyPassword: async (payload: ChangePasswordPayload): Promise<void> => {
    if (payload.newPassword.trim().length < 8) {
      throw new Error("Mat khau moi phai co it nhat 8 ky tu.");
    }

    try {
      await api.put("/api/v1/users/me/password", {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword,
      });
    } catch (error) {
      const status = getHttpStatus(error);
      if (!isLegacyMeFallbackStatus(status)) {
        throw error;
      }

      await api.post("/api/v1/me/change-password", {
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
        confirmNewPassword: payload.confirmPassword,
      });
    }
  },

  updateMyStatus: async (status: AccountStatus): Promise<UserProfile> => {
    try {
      const { data: current } = await api.get<BackendUser>("/api/v1/users/me");
      const { data } = await api.put<BackendUser>("/api/v1/users/me", {
        email: current.email,
        name: current.name,
        status,
      });
      return mapBackendUserToProfile(data);
    } catch (error) {
      const responseStatus = getHttpStatus(error);
      if (isLegacyMeFallbackStatus(responseStatus)) {
        throw new Error("Backend hien tai chua ho tro cap nhat trang thai tai khoan qua endpoint profile.");
      }
      throw error;
    }
  },

  uploadMyAvatar: async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.put<BackendUser>("/api/v1/users/me/avatar", formData);
      return mapBackendUserToProfile(data);
    } catch (error) {
      const status = getHttpStatus(error);
      if (!isLegacyMeFallbackStatus(status)) {
        throw error;
      }

      const { data } = await api.post<BackendSelfUser>("/api/v1/me/avatar", formData);
      return mapBackendSelfUserToProfile(data);
    }
  },

  getDocuments: async (params?: Record<string, string | number | undefined>): Promise<DocumentSummary[]> => {
    try {
      const { data } = await api.get<BackendDocument[]>("/api/v1/documents", {
        params: normalizeDocumentQueryParams(params),
      });
      return data.map(mapDocumentToSummary);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status ?? error.status;
        if (status === 401 || status === 403) {
          // Some backend builds temporarily require auth for this endpoint.
          return [];
        }
      }
      if ((error as { response?: { status?: number | string } })?.response?.status === "401"
        || (error as { response?: { status?: number | string } })?.response?.status === "403") {
        // Some backend builds temporarily require auth for this endpoint.
        return [];
      }
      throw error;
    }
  },

  getDocumentById: async (documentId: number): Promise<DocumentSummary> => {
    const { data } = await api.get<BackendDocument>(`/api/v1/documents/${documentId}`);
    return mapDocumentToSummary(data);
  },

  getDocumentPreviewBlob: async (documentId: number): Promise<Blob> => {
    const { data } = await api.get<Blob>(`/api/v1/documents/${documentId}/preview`, {
      responseType: "blob",
    });
    return data;
  },

  getDocumentRatingStats: async (documentId: number): Promise<DocumentRatingStats> => {
    try {
      const { data } = await api.get<{ average: number; count: number }>(`/api/v1/documents/${documentId}/reviews/stats`);
      return {
        average: data.average ?? 0,
        count: data.count ?? 0,
      };
    } catch {
      return {
        average: 0,
        count: 0,
      };
    }
  },

  createOrUpdateReview: async (documentId: number, rating: number, comment: string): Promise<void> => {
    await api.post(`/api/v1/documents/${documentId}/reviews`, {
      rating,
      comment,
    });
  },

  uploadDocument: async (payload: UploadDocumentPayload, file: File): Promise<DocumentSummary> => {
    const formData = new FormData();

    const uploadRequest = {
      title: payload.title,
      school: payload.school,
      subject: payload.subject,
      semester: payload.semesterYear,
      type: payload.type,
      className: payload.className,
    };

    formData.append("document", new Blob([JSON.stringify(uploadRequest)], { type: "application/json" }));
    formData.append("file", file);

    const { data } = await api.post<BackendDocument>("/api/v1/documents", formData);
    const summary = mapDocumentToSummary(data);
    upsertStoredSubmission(summary);
    return summary;
  },
};

export const examService = {
  getQuestionScoreById: async (questionId: number): Promise<number | undefined> => {
    try {
      const { data } = await api.get<BackendQuestionDetail>(`/api/questions/${questionId}`);
      return toFiniteNumberOrUndefined(
        data.maxScore ??
          data.max_score ??
          data.score ??
          data.point ??
          data.points ??
          data.difficulty,
      );
    } catch {
      return undefined;
    }
  },

  getExamById: async (id: string): Promise<Exam | null> => {
    try {
      const examId = Number(id);
      if (Number.isNaN(examId)) {
        return null;
      }

      const { data: examData } = await api.get<BackendExam>(`/api/exams/${examId}`, buildAuthConfig());
      if (!isUserVisibleExamStatus(examData.status)) {
        return null;
      }

      const { data: questionData } = await api.get<BackendExamQuestion[]>(`/api/exams/${examId}/questions`, buildAuthConfig());
      return {
        id: String(examData.id),
        title: examData.title,
        description: `Đề thi số #${examData.id}`,
        duration: examData.durationMinutes ?? 30,
        createdAt: examData.createdAt ?? new Date().toISOString(),
        questions: questionData.map(mapQuestion),
      };
    } catch {
      return null;
    }
  },

  getAllExams: async (): Promise<ExamListItem[]> => {
    try {
      const [{ data: exams }, subjectsResponse] = await Promise.all([
        api.get<BackendExam[]>("/api/exams", buildAuthConfig()),
        api.get<BackendSubject[]>("/api/subjects").catch(() => null),
      ]);

      const subjectNameById = new Map<number, string>();
      for (const subject of subjectsResponse?.data ?? []) {
        const normalizedName = subject.name?.trim();
        if (!normalizedName) {
          continue;
        }
        subjectNameById.set(subject.id, normalizedName);
      }

      return exams
        .filter((item) => isUserVisibleExamStatus(item.status))
        .map((item) => ({
          id: item.id,
          title: item.title,
          subjectId: item.subjectId,
          subjectName:
            resolveBackendExamSubjectName(item) ??
            (item.subjectId !== null && item.subjectId !== undefined
              ? subjectNameById.get(item.subjectId)
              : undefined),
          className: item.className ?? item.classLevel ?? item.grade,
          educationLevelName: item.educationLevelName,
          durationMinutes: item.durationMinutes,
          startAt: item.startAt ?? null,
          endAt: item.endAt ?? null,
          status: item.status,
          createdAt: item.createdAt,
        }));
    } catch {
      return [];
    }
  },

  getExamListItemById: async (id: number): Promise<ExamListItem | null> => {
    try {
      const [{ data }, subjectsResponse] = await Promise.all([
        api.get<BackendExam>(`/api/exams/${id}`, buildAuthConfig()),
        api.get<BackendSubject[]>("/api/subjects").catch(() => null),
      ]);
      if (!isUserVisibleExamStatus(data.status)) {
        return null;
      }

      const subjectNameById = new Map<number, string>();
      for (const subject of subjectsResponse?.data ?? []) {
        const normalizedName = subject.name?.trim();
        if (!normalizedName) {
          continue;
        }
        subjectNameById.set(subject.id, normalizedName);
      }

      return {
        id: data.id,
        title: data.title,
        subjectId: data.subjectId,
        subjectName:
          resolveBackendExamSubjectName(data) ??
          (data.subjectId !== null && data.subjectId !== undefined
            ? subjectNameById.get(data.subjectId)
            : undefined),
        className: data.className ?? data.classLevel ?? data.grade,
        educationLevelName: data.educationLevelName,
        durationMinutes: data.durationMinutes,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        status: data.status,
        createdAt: data.createdAt,
      };
    } catch {
      return null;
    }
  },


  startExamSession: async (examId: number): Promise<StartExamSessionResponse> => {
    const { data } = await api.post<BackendStartExamSession>(`/api/exams/${examId}/sessions/start`, undefined, buildAuthConfig());
    return mapStartSession(data);
  },

  saveExamAnswers: async (sessionId: number, answers: SaveAnswerItem[]): Promise<void> => {
    await api.put(`/api/exam-sessions/${sessionId}/answers`, {
      answers,
    });
  },

  submitExamSession: async (sessionId: number, submitReason: SubmitReason = "MANUAL"): Promise<ExamSessionStatusResponse> => {
    const { data } = await api.post<BackendExamSessionStatus>(`/api/exam-sessions/${sessionId}/submit`, {
      submitReason,
    });
    return mapSessionStatus(data);
  },

  getExamSessionStatus: async (sessionId: number): Promise<ExamSessionStatusResponse> => {
    const { data } = await api.get<BackendExamSessionStatus>(`/api/exam-sessions/${sessionId}/status`);
    return mapSessionStatus(data);
  },

  getExamSessionResult: async (sessionId: number): Promise<ExamSessionResult> => {
    const { data } = await api.get<BackendExamSessionResult>(`/api/exam-sessions/${sessionId}/result`);
    return mapSessionResult(data);
  },

  getExamLeaderboard: async (sessionId: number): Promise<LeaderboardUser[]> => {
    try {
      const { data } = await api.get<BackendExamLeaderboardItem[]>(`/api/exam-sessions/${sessionId}/leaderboard`);
      return data
        .map((item, index) => ({
          rank: item.rank ?? index + 1,
          name: item.userName?.trim() || `User ${item.userId ?? index + 1}`,
          score: Math.round(item.totalScore ?? 0),
          isUser: Boolean(item.currentUser),
        }));
    } catch {
      return [];
    }
  },

  getMyExamAttempts: async (examId: number): Promise<UserExamAttempt[]> => {
    try {
      const response = await api.get(`/api/v1/me/exam-sessions?examId=${examId}&page=0&size=50`);
      const attempts = toArrayPayload(response.data)
        .map(normalizeUserAttempt)
        .filter((item): item is UserExamAttempt => item !== null);

      const enriched = await Promise.all(
        attempts.map(async (attempt) => {
          try {
            const result = await examService.getExamSessionResult(attempt.sessionId);
            return {
              ...attempt,
              startedAt: result.startTime ?? attempt.startedAt,
              submittedAt: result.submittedAt ?? attempt.submittedAt,
              totalScore: Number(result.totalScore ?? attempt.totalScore),
              durationSeconds:
                typeof result.durationMinutes === "number" && Number.isFinite(result.durationMinutes)
                  ? Math.round(result.durationMinutes * 60)
                  : attempt.durationSeconds,
            };
          } catch {
            return attempt;
          }
        })
      );

      return enriched
        .sort((a, b) => {
          const aTime = (a.submittedAt ?? a.startedAt) ? new Date((a.submittedAt ?? a.startedAt) as string).getTime() : 0;
          const bTime = (b.submittedAt ?? b.startedAt) ? new Date((b.submittedAt ?? b.startedAt) as string).getTime() : 0;
          return bTime - aTime;
        });
    } catch {
      return [];
    }
  },
};


