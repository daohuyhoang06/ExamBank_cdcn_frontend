import { getAdminUsers } from "@/features/admin/services/admin-users.service";
import { apiClient, getStoredAuthToken } from "@/lib/api-client";
import {
  deleteComposerExam,
  getComposerQuestionById,
  listComposerExams,
  listComposerExamQuestions,
  listComposerSubjects,
} from "@/features/moderator/services/moderator-composer.service";
import {
  listModeratorExamSessions,
  type ModeratorExamSessionRecord,
} from "@/features/moderator/services/moderator-exam-session.service";

export type ContestLifecycle = "DRAFT" | "PUBLISHED" | "ONGOING" | "ENDED";
export type AdminExamBackendStatus = "DRAFT" | "PUBLISHED" | "ONGOING" | "CLOSED" | "LOCKED";
export type AdminExamQuestionType = "MCQ" | "FILL_IN_BLANK" | "ESSAY" | string;

export type Participant = {
  id: string;
  user: string;
  score: number;
  durationMinutes: number;
  status: string;
};

export type OverrideLog = {
  id: string;
  by: string;
  reason: string;
  at: string;
};

export type AdminExamContest = {
  id: number;
  title: string;
  description: string;
  subjectId: number | null;
  subjectName: string | null;
  className: string | null;
  durationMinutes: number | null;
  uploadedBy: number | null;
  approvedBy: number | null;
  moderatorNote: string | null;
  rawStatus: string;
  creatorId: number;
  creatorName: string;
  lifecycle: ContestLifecycle;
  participants: number;
  startAt: string | null;
  endAt: string | null;
  intervened: boolean;
  participantsRows: Participant[];
  overrideLogs: OverrideLog[];
};

export type AdminExamQuestionDetail = {
  id: number;
  type: AdminExamQuestionType;
  content: string;
  options: string[];
  answer: string | null;
  maxScore: number | null;
  topicTag: string | null;
  orderIndex: number | null;
  imageUrl: string | null;
};

function toTimeOrZero(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getExamSortTime(exam: {
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  startAt?: string | null;
  endAt?: string | null;
}): number {
  return (
    toTimeOrZero(exam.createdAt) ||
    toTimeOrZero(exam.updatedAt) ||
    toTimeOrZero(exam.publishedAt) ||
    toTimeOrZero(exam.startAt) ||
    toTimeOrZero(exam.endAt)
  );
}

function normalizeLifecycle(
  status: string | null | undefined,
  startAt: string | null,
  endAt: string | null
): ContestLifecycle {
  const normalized = (status ?? "").toUpperCase();

  if (normalized === "LOCKED" || normalized === "CLOSED") {
    return "ENDED";
  }

  if (normalized === "ONGOING") {
    const now = Date.now();
    const endTime = endAt ? new Date(endAt).getTime() : null;
    if (endTime !== null && now > endTime) {
      return "ENDED";
    }
    return "ONGOING";
  }

  if (normalized === "PUBLISHED") {
    const now = Date.now();
    const startTime = startAt ? new Date(startAt).getTime() : null;
    const endTime = endAt ? new Date(endAt).getTime() : null;

    if (startTime !== null && endTime !== null && now >= startTime && now <= endTime) {
      return "ONGOING";
    }

    if (endTime !== null && now > endTime) {
      return "ENDED";
    }

    return "PUBLISHED";
  }

  return "DRAFT";
}

function isAdminVisibleExamStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toUpperCase();
  return (
    normalized === "PUBLISHED" ||
    normalized === "ONGOING" ||
    normalized === "CLOSED" ||
    normalized === "LOCKED"
  );
}

function mapSessionsToParticipants(sessions: ModeratorExamSessionRecord[]): Participant[] {
  return sessions.map((session) => ({
    id: String(session.id),
    user: session.userDisplayName ?? (session.userId ? `User #${session.userId}` : "Không xác định"),
    score: Number(session.totalScore ?? 0),
    durationMinutes: Math.max(0, Math.round(Number(session.durationSeconds ?? 0) / 60)),
    status: session.status ?? "UNKNOWN",
  }));
}

function buildAuthConfig() {
  const token = getStoredAuthToken();
  const normalizedToken = token?.replace(/^Bearer\s+/i, "").trim();

  return normalizedToken
    ? {
        headers: {
          Authorization: `Bearer ${normalizedToken}`,
        },
      }
    : undefined;
}

function buildStatusUpdatePayload(contest: AdminExamContest, status: AdminExamBackendStatus) {
  return {
    title: contest.title,
    subjectId: contest.subjectId,
    className: contest.className,
    uploadedBy: contest.uploadedBy,
    approvedBy: contest.approvedBy,
    durationMinutes: contest.durationMinutes,
    status,
    moderatorNote: contest.moderatorNote,
    startAt: contest.startAt,
    endAt: contest.endAt,
  };
}

function parseQuestionOptions(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    // fallback to plain text split
  }

  return raw
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export async function getAdminExamContests(): Promise<AdminExamContest[]> {
  const [rawExams, users, subjects] = await Promise.all([
    listComposerExams(),
    getAdminUsers().catch(() => []),
    listComposerSubjects().catch(() => []),
  ]);
  const exams = [...rawExams]
    .filter((exam) => isAdminVisibleExamStatus(exam.status))
    .sort((a, b) => {
    const diff = getExamSortTime(b) - getExamSortTime(a);
    if (diff !== 0) {
      return diff;
    }

    return b.id - a.id;
  });

  const userNameById = new Map<number, string>();
  const subjectNameById = new Map<number, string>();
  users.forEach((user) => {
    const id = Number(user.id);
    const name = user.name?.trim();
    if (Number.isFinite(id) && name) {
      userNameById.set(id, name);
    }
  });
  subjects.forEach((subject) => {
    const id = Number(subject.id);
    const name = subject.name?.trim();
    if (Number.isFinite(id) && name) {
      subjectNameById.set(id, name);
    }
  });

  const sessionResults = await Promise.allSettled(
    exams.map((exam) => listModeratorExamSessions(exam.id))
  );

  return exams.map((exam, index) => {
    const rawStatus = (exam.status ?? "DRAFT").toUpperCase();
    const startAt = exam.startAt ?? null;
    const endAt = exam.endAt ?? null;
    const lifecycle = normalizeLifecycle(rawStatus, startAt, endAt);
    const sessionResult = sessionResults[index];
    const sessions =
      sessionResult && sessionResult.status === "fulfilled"
        ? sessionResult.value.sessions
        : [];

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description ?? `Đề thi số #${exam.id}`,
      subjectId: exam.subjectId ?? null,
      subjectName:
        (exam.subjectId ? subjectNameById.get(exam.subjectId) : null) ??
        null,
      className: exam.className ?? null,
      durationMinutes: exam.durationMinutes ?? null,
      uploadedBy: exam.uploadedBy ?? null,
      approvedBy: exam.approvedBy ?? null,
      moderatorNote: exam.moderatorNote ?? null,
      rawStatus,
      creatorId: exam.uploadedBy ?? 0,
      creatorName:
        (exam.uploadedBy ? userNameById.get(exam.uploadedBy) : null) ??
        (exam.uploadedBy ? `User #${exam.uploadedBy}` : "Không xác định"),
      lifecycle,
      participants: sessions.length,
      startAt,
      endAt,
      intervened: rawStatus === "LOCKED",
      participantsRows: mapSessionsToParticipants(sessions),
      overrideLogs: [],
    };
  });
}

export async function deleteAdminExam(examId: number): Promise<void> {
  await deleteComposerExam(examId);
}

export async function updateAdminExamStatus(
  contest: AdminExamContest,
  status: AdminExamBackendStatus
): Promise<void> {
  const payload = buildStatusUpdatePayload(contest, status);
  await apiClient.put(`/api/exams/${contest.id}`, payload, buildAuthConfig());
}

export async function updateAdminExamStatuses(
  contests: AdminExamContest[],
  status: AdminExamBackendStatus
): Promise<{ successCount: number; failCount: number }> {
  const results = await Promise.allSettled(
    contests.map((contest) => updateAdminExamStatus(contest, status))
  );

  const successCount = results.filter((item) => item.status === "fulfilled").length;
  const failCount = results.length - successCount;

  return {
    successCount,
    failCount,
  };
}

export async function getAdminExamQuestions(examId: number): Promise<AdminExamQuestionDetail[]> {
  const links = await listComposerExamQuestions(examId);
  const records = await Promise.all(
    links.map((item) => getComposerQuestionById(item.questionId))
  );

  return records
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0) || a.id - b.id)
    .map((record) => ({
      id: record.id,
      type: record.type,
      content: record.content,
      options: parseQuestionOptions(record.options),
      answer: record.answer ?? null,
      maxScore: record.maxScore ?? null,
      topicTag: record.topicTag ?? null,
      orderIndex: record.orderIndex ?? null,
      imageUrl: record.imageUrl ?? null,
    }));
}
