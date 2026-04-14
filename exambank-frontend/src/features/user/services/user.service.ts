import { apiClient } from "@/lib/api-client";
import type {
  AccountStatus,
  ChangePasswordPayload,
  DocumentRatingStats,
  DocumentSummary,
  EducationLevel,
  Exam,
  ExamListItem,
  LeaderboardUser,
  Question,
  Ranking,
  Recommendation,
  SelectedFile,
  Subject,
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

type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type BackendDocument = {
  id: number;
  title: string;
  school?: string;
  subject?: string;
  semesterYear?: string;
  type?: string;
  lecturer?: string;
  fileUrl?: string;
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
  ratingValue: number;
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

type BackendUser = {
  id: number;
  email: string;
  name: string;
  primaryRole?: string;
  roles?: string[];
  xp?: number;
  coinBalance?: number;
  streak?: number;
  status?: string;
  createdAt?: string;
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

  try {
    const parsed = JSON.parse(rawOptions) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (item && typeof item === "object") {
            const optionObj = item as { content?: string; text?: string; value?: string };
            return optionObj.content ?? optionObj.text ?? optionObj.value ?? "";
          }
          return "";
        })
        .filter((item) => item.trim().length > 0);
    }
    return [];
  } catch {
    return [];
  }
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
  semesterYear: doc.semesterYear,
  type: doc.type,
  lecturer: doc.lecturer,
  fileUrl: doc.fileUrl,
  averageRating: doc.averageRating,
  downloadCount: doc.downloadCount,
  status: doc.status,
  createdAt: doc.createdAt,
  moderatorNote: doc.moderatorNote,
});

const mapDocumentsToRecommendations = (docs: DocumentSummary[]): Recommendation[] => {
  return docs.slice(0, 3).map((doc, index) => {
    const rating = doc.averageRating ?? 0;
    return {
      title: doc.title,
      description:
        doc.lecturer || doc.school
          ? `${doc.lecturer ?? "Giảng viên chưa cập nhật"} • ${doc.school ?? "Trường chưa cập nhật"}`
          : "Đề thi được đề xuất theo mức độ phù hợp với bạn.",
      tag: rating >= 4.5 ? "Nổi bật" : "Khuyến nghị",
      color: index % 2 === 0 ? "primary" : "secondary",
      stats: `${doc.downloadCount ?? 0} lượt tải • ${doc.subject ?? "Đa môn"}`,
      documentId: doc.id,
    };
  });
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
    const { data } = await api.get<BackendReview[]>(`/api/documents/${documentId}/reviews`);
    return data.map((item) => ({
      id: item.id,
      author: item.userName ?? `User ${item.userId}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.userId}`,
      rating: item.ratingValue,
      time: toRelativeTime(item.createdAt),
      content: item.comment ?? "",
      likes: 0,
      canDelete: item.canDelete,
    }));
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

  getRecommendations: async (): Promise<Recommendation[]> => {
    try {
      const { data } = await api.get<SpringPage<BackendDocument>>("/api/documents", {
        params: {
          status: "APPROVED",
          sort: "highest_rated",
          size: 6,
        },
      });
      return mapDocumentsToRecommendations(data.content.map(mapDocumentToSummary));
    } catch {
      return [];
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
      const { data } = await api.get<BackendDocument[]>("/api/documents/my");
      return data.map(mapDocumentToSummary).map(mapDocumentToSubmission);
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
    } catch {
      const fallbackProfile = mapStoredAuthUserToProfile();
      if (fallbackProfile) {
        return fallbackProfile;
      }

      throw new Error("Khong the tai thong tin ho so.");
    }
  },

  updateMyProfile: async (payload: UpdateUserProfilePayload): Promise<UserProfile> => {
    const { data: current } = await api.get<BackendUser>("/api/v1/users/me");
    const { data } = await api.put<BackendUser>("/api/v1/users/me", {
      email: payload.email,
      name: payload.name,
      status: current.status ?? "ACTIVE",
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

  getDocuments: async (params?: Record<string, string | number | undefined>): Promise<DocumentSummary[]> => {
    const { data } = await api.get<SpringPage<BackendDocument>>("/api/documents", {
      params,
    });
    return data.content.map(mapDocumentToSummary);
  },

  getDocumentById: async (documentId: number): Promise<DocumentSummary> => {
    const { data } = await api.get<BackendDocument>(`/api/documents/${documentId}`);
    return mapDocumentToSummary(data);
  },

  getDocumentRatingStats: async (documentId: number): Promise<DocumentRatingStats> => {
    const { data } = await api.get<{ average: number; count: number }>(`/api/documents/${documentId}/reviews/stats`);
    return {
      average: data.average ?? 0,
      count: data.count ?? 0,
    };
  },

  createOrUpdateReview: async (documentId: number, rating: number, comment: string): Promise<void> => {
    await api.post(`/api/documents/${documentId}/reviews`, {
      rating,
      comment,
    });
  },

  uploadDocument: async (payload: UploadDocumentPayload, file: File): Promise<DocumentSummary> => {
    const formData = new FormData();
    formData.append("title", payload.title);
    if (payload.school) formData.append("school", payload.school);
    if (payload.subject) formData.append("subject", payload.subject);
    if (payload.semesterYear) formData.append("semesterYear", payload.semesterYear);
    if (payload.type) formData.append("type", payload.type);
    if (payload.lecturer) formData.append("lecturer", payload.lecturer);
    formData.append("file", file);

    const { data } = await api.post<BackendDocument>("/api/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return mapDocumentToSummary(data);
  },
};

export const examService = {
  getExamById: async (id: string): Promise<Exam | null> => {
    try {
      const examId = Number(id);
      if (Number.isNaN(examId)) {
        return null;
      }

      const [examResponse, questionsResponse] = await Promise.all([
        api.get<BackendExam>(`/api/exams/${examId}`),
        api.get<BackendExamQuestion[]>(`/api/exams/${examId}/questions`),
      ]);

      const examData = examResponse.data;
      return {
        id: String(examData.id),
        title: examData.title,
        description: `Đề thi số #${examData.id}`,
        duration: examData.durationMinutes ?? 30,
        createdAt: examData.createdAt ?? new Date().toISOString(),
        questions: questionsResponse.data.map(mapQuestion),
      };
    } catch {
      return null;
    }
  },

  getAllExams: async (): Promise<ExamListItem[]> => {
    try {
      const { data } = await api.get<BackendExam[]>("/api/exams");
      return data.map((item) => ({
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
};
