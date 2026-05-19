import { apiClient } from "@/lib/api-client";
import type {
  CompetitionAccessResult,
  ExamDraft,
  ExamImportJob,
  PremiumCompetition,
  SubjectOption,
} from "@/features/user/types/premium-competition.type";

const api = apiClient;

export const parseDraftJson = (draftJson?: string): ExamDraft | null => {
  if (!draftJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(draftJson) as ExamDraft;
    return {
      title: parsed.title ?? "Đề thi private",
      subjectId: parsed.subjectId ?? null,
      className: parsed.className ?? "Lớp 12",
      durationMinutes: Number(parsed.durationMinutes ?? 45),
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.map((question) => ({
            ...question,
            imageUrls: Array.isArray((question as { imageUrls?: unknown }).imageUrls)
              ? ((question as { imageUrls: unknown[] }).imageUrls
                  .filter((item): item is string => typeof item === "string" && item.trim().length > 0))
              : [],
          }))
        : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch {
    return null;
  }
};

export const premiumCompetitionService = {
  listSubjects: async (): Promise<SubjectOption[]> => {
    const { data } = await api.get<SubjectOption[]>("/api/subjects");
    return data;
  },

  uploadExamImport: async (payload: {
    file: File;
    title: string;
    subjectId?: number;
    subjectName?: string;
    className?: string;
    durationMinutes?: number;
  }): Promise<ExamImportJob> => {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("title", payload.title);
    if (payload.subjectId !== undefined) {
      formData.append("subjectId", String(payload.subjectId));
    }
    if (payload.subjectName?.trim()) {
      formData.append("subjectName", payload.subjectName.trim());
    }
    if (payload.className) {
      formData.append("className", payload.className);
    }
    if (payload.durationMinutes) {
      formData.append("durationMinutes", String(payload.durationMinutes));
    }
    const { data } = await api.post<ExamImportJob>("/api/v1/premium/exam-imports", formData);
    return data;
  },

  updateImportDraft: async (jobId: number, draft: ExamDraft): Promise<ExamImportJob> => {
    const { data } = await api.put<ExamImportJob>(`/api/v1/premium/exam-imports/${jobId}/draft`, {
      draftJson: JSON.stringify(draft),
    });
    return data;
  },

  getExamImport: async (jobId: number): Promise<ExamImportJob> => {
    const { data } = await api.get<ExamImportJob>(`/api/v1/premium/exam-imports/${jobId}`);
    return data;
  },

  uploadQuestionImage: async (jobId: number, orderIndex: number, file: File): Promise<ExamImportJob> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post<ExamImportJob>(
      `/api/v1/premium/exam-imports/${jobId}/questions/${orderIndex}/image`,
      formData,
    );
    return data;
  },

  confirmImport: async (jobId: number, draft: ExamDraft): Promise<ExamImportJob> => {
    const { data } = await api.post<ExamImportJob>(`/api/v1/premium/exam-imports/${jobId}/confirm`, {
      draftJson: JSON.stringify(draft),
      publish: true,
    });
    return data;
  },

  createCompetition: async (payload: {
    examId: number;
    title: string;
    accessCode: string;
    password: string;
    startAt?: string;
    endAt?: string;
    maxAttemptsPerUser?: number;
  }): Promise<PremiumCompetition> => {
    const { data } = await api.post<PremiumCompetition>("/api/v1/premium/competitions", payload);
    return data;
  },

  listMine: async (): Promise<PremiumCompetition[]> => {
    const { data } = await api.get<PremiumCompetition[]>("/api/v1/premium/competitions/mine");
    return data;
  },

  closeCompetition: async (competitionId: number): Promise<PremiumCompetition> => {
    const { data } = await api.post<PremiumCompetition>(`/api/v1/premium/competitions/${competitionId}/close`);
    return data;
  },

  unlockCompetition: async (accessCode: string, password: string): Promise<CompetitionAccessResult> => {
    const { data } = await api.post<CompetitionAccessResult>("/api/v1/private-competitions/access", {
      accessCode,
      password,
    });
    return data;
  },
};
