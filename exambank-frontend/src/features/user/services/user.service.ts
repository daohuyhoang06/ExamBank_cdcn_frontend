import { apiClient, getStoredAuthToken } from "@/lib/api-client";
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

type BackendDocument = {
  id: number;
  title: string;
  school?: string;
  subject?: string;
  semesterYear?: string;
  semester?: string;
  type?: string;
  lecturer?: string;
  fileUrl?: string;
  previewUrl?: string;
  averageRating?: number;
  downloadCount?: number;
  status?: string;
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

type BackendLeaderBoard = {
  id: number;
  totalPoints?: number;
  user?: {
    id?: number;
    name?: string;
  };
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
  subjectName?: string;
  subject?: string;
  durationMinutes?: number | null;
  status?: string;
  createdAt?: string;
};

type BackendExamQuestion = {
  questionId: number;
  content: string;
  options?: string | null;
  answer?: string | null;
  difficulty?: number | null;
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
  questionId: number;
  isCorrect?: boolean;
  scoreEarned?: number;
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
  createdAt?: string;
};

const isPublishedExamStatus = (status?: string): boolean => {
  return (status ?? "").trim().toUpperCase() === "PUBLISHED";
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

const mapSessionResult = (data: BackendExamSessionResult): ExamSessionResult => ({
  sessionId: data.sessionId,
  totalScore: data.totalScore,
  submitReason: data.submitReason,
  startTime: data.startTime,
  submittedAt: data.submittedAt,
  timeLimitMinutes: data.timeLimitMinutes,
  questionResults: (data.questionResults ?? []).map((item) => ({
    questionId: item.questionId,
    isCorrect: item.isCorrect,
    scoreEarned: item.scoreEarned,
  })),
});

const mapExamLeaderboardUsers = (items: BackendExamLeaderboardItem[]): LeaderboardUser[] => {
  return [...items]
    .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 10)
    .map((item, index) => ({
      rank: item.rank ?? index + 1,
      name: item.userName ?? `User ${item.userId ?? index + 1}`,
      score: Math.round(item.totalScore ?? 0),
      isUser: Boolean(item.currentUser),
    }));
};

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

const resolveBackendAvatarUrl = (user: BackendUser): string | undefined => {
  return (
    toNonEmptyString(user.avatarUrl) ??
    toNonEmptyString(user.avatar) ??
    toNonEmptyString(user.imageUrl) ??
    toNonEmptyString(user.photoUrl) ??
    toNonEmptyString(user.profileImageUrl)
  );
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
  xp: user.xp ?? 0,
  coinBalance: user.coinBalance ?? 0,
  streak: user.streak ?? 0,
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
    xp: 0,
    coinBalance: 0,
    streak: 0,
    createdAt: undefined,
  };
};

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
  lecturer: doc.lecturer,
  fileUrl: doc.fileUrl ?? doc.previewUrl,
  averageRating: doc.averageRating,
  downloadCount: doc.downloadCount,
  status: doc.status,
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
  lecturer: doc.lecturer,
  fileUrl: doc.fileUrl,
  averageRating: doc.averageRating,
  downloadCount: doc.downloadCount,
  status: doc.status,
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
    lecturer: item.lecturer,
    fileUrl: item.fileUrl,
    previewUrl: item.previewUrl,
    averageRating: item.averageRating,
    downloadCount: item.downloadCount,
    status: item.status,
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

const syncStoredSubmissionsWithApproved = (approvedSummaries: DocumentSummary[]): BackendDocument[] => {
  const approvedById = new Map(approvedSummaries.map((item) => [item.id, item]));
  const synced = loadStoredSubmissions().map((item) => {
    const approved = approvedById.get(item.id);
    if (!approved) {
      return item;
    }

    return {
      ...item,
      ...toStoredBackendDocument(approved),
      status: "APPROVED",
      moderatorNote: approved.moderatorNote,
    };
  });

  saveStoredSubmissions(synced);
  return synced;
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

const mapLeaderBoards = (items: BackendLeaderBoard[]): Ranking[] => {
  return [...items]
    .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
    .slice(0, 5)
    .map((item, index) => {
      const points = Math.round(item.totalPoints ?? 0);
      return {
        rank: index + 1,
        name: item.user?.name ?? `User ${item.user?.id ?? index + 1}`,
        score: `${points}/1200`,
        avatar: String(item.user?.id ?? index + 1),
      };
    });
};

const mapLeaderBoardUsers = (items: BackendLeaderBoard[]): LeaderboardUser[] => {
  return [...items]
    .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
    .slice(0, 10)
    .map((item, index) => ({
      rank: index + 1,
      name: item.user?.name ?? `User ${item.user?.id ?? index + 1}`,
      score: Math.round(item.totalPoints ?? 0),
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
    reason: doc.moderatorNote,
    date: toDisplayDate(doc.createdAt),
  };
};

const mapQuestion = (item: BackendExamQuestion): Question => {
  const options = parseOptions(item.options);
  const answerText = (item.answer ?? "").trim();
  const score = item.difficulty && item.difficulty > 0 ? item.difficulty : 1;

  if (looksLikeTrueFalseOptions(options)) {
    return {
      id: String(item.questionId),
      type: "true_false",
      question: item.content,
      correctAnswer: answerText.toLowerCase() === "đúng" || answerText.toLowerCase() === "dung" || answerText.toLowerCase() === "true" || answerText.toLowerCase() === "a",
      score,
    };
  }

  if (options.length > 0) {
    return {
      id: String(item.questionId),
      type: "multiple_choice",
      question: item.content,
      options,
      correctAnswer: parseMcqAnswerIndex(answerText, options),
      score,
    };
  }

  if (answerText.toLowerCase() === "true" || answerText.toLowerCase() === "false") {
    return {
      id: String(item.questionId),
      type: "true_false",
      question: item.content,
      correctAnswer: answerText.toLowerCase() === "true",
      score,
    };
  }

  return {
    id: String(item.questionId),
    type: "fill_blank",
    question: item.content,
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
    try {
      const { data } = await api.get<BackendSubject[]>("/api/subjects");
      const names = data
        .map((item) => item.name)
        .filter((item) => item.trim().length > 0)
        .map((item) => item.trim());

      const unique = Array.from(new Set(names));
      if (unique.length === 0) {
        return ["Tất cả môn học", ...DEFAULT_SUBJECTS];
      }

      return ["Tất cả môn học", ...unique];
    } catch {
      return ["Tất cả môn học", ...DEFAULT_SUBJECTS];
    }
  },

  getRankings: async (): Promise<Ranking[]> => {
    try {
      const { data } = await api.get<BackendLeaderBoard[]>("/api/leaderboards");
      return mapLeaderBoards(data);
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
      const { data } = await api.get<BackendLeaderBoard[]>("/api/leaderboards");
      return mapLeaderBoardUsers(data);
    } catch {
      return [];
    }
  },

  getSubmissions: async (): Promise<Submission[]> => {
    try {
      let approvedDocuments: DocumentSummary[] = [];
      try {
        const { data } = await api.get<BackendDocument[]>("/api/v1/documents", {
          params: {
            sortBy: "NEWEST",
            size: 200,
          },
        });
        approvedDocuments = data.map(mapDocumentToSummary);
      } catch {
        approvedDocuments = [];
      }

      const syncedSubmissions = syncStoredSubmissionsWithApproved(approvedDocuments)
        .sort((left, right) => {
          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
          if (leftTime !== rightTime) {
            return rightTime - leftTime;
          }
          return right.id - left.id;
        })
        .map(mapDocumentToSummary)
        .map(mapDocumentToSubmission);

      return syncedSubmissions;
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
    const { data: current } = await api.get<BackendUser>("/api/v1/users/me");
    const { data } = await api.put<BackendUser>("/api/v1/users/me", {
      email: payload.email,
      name: payload.name,
      status: payload.status ?? current.status ?? "ACTIVE",
    });
    return mapBackendUserToProfile(data);
  },

  updateMyPassword: async (payload: ChangePasswordPayload): Promise<void> => {
    if (payload.newPassword.trim().length < 8) {
      throw new Error("Mat khau moi phai co it nhat 8 ky tu.");
    }

    await api.put("/api/v1/users/me/password", {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
      confirmPassword: payload.confirmPassword,
    });
  },

  updateMyStatus: async (status: AccountStatus): Promise<UserProfile> => {
    const { data: current } = await api.get<BackendUser>("/api/v1/users/me");
    const { data } = await api.put<BackendUser>("/api/v1/users/me", {
      email: current.email,
      name: current.name,
      status,
    });
    return mapBackendUserToProfile(data);
  },

  uploadMyAvatar: async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.put<BackendUser>("/api/v1/users/me/avatar", formData);

    return mapBackendUserToProfile(data);
  },

  getDocuments: async (params?: Record<string, string | number | undefined>): Promise<DocumentSummary[]> => {
    const { data } = await api.get<BackendDocument[]>("/api/v1/documents", {
      params: normalizeDocumentQueryParams(params),
    });
    return data.map(mapDocumentToSummary);
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
      lecturer: payload.lecturer,
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
  getExamById: async (id: string): Promise<Exam | null> => {
    try {
      const examId = Number(id);
      if (Number.isNaN(examId)) {
        return null;
      }

      const { data: examData } = await api.get<BackendExam>(`/api/exams/${examId}`);
      if (!isPublishedExamStatus(examData.status)) {
        return null;
      }

      const { data: questionData } = await api.get<BackendExamQuestion[]>(`/api/exams/${examId}/questions`);
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
      const { data } = await api.get<BackendExam[]>("/api/exams");
      return data
        .filter((item) => isPublishedExamStatus(item.status))
        .map((item) => ({
          id: item.id,
          title: item.title,
          subjectId: item.subjectId,
          subjectName: item.subjectName ?? item.subject,
          durationMinutes: item.durationMinutes,
          status: item.status,
          createdAt: item.createdAt,
        }));
    } catch {
      return [];
    }
  },

  startExamSession: async (examId: number): Promise<StartExamSessionResponse> => {
    const { data } = await api.post<BackendStartExamSession>(`/api/exams/${examId}/sessions/start`);
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
    const { data } = await api.get<BackendExamLeaderboardItem[]>(`/api/exam-sessions/${sessionId}/leaderboard`);
    return mapExamLeaderboardUsers(data);
  },
};
