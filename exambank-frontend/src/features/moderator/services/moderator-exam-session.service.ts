import { isAxiosError } from "axios";
import { apiClient, getStoredAuthToken } from "@/lib/api-client";

const EXAM_SESSIONS_PATH = "/api/exam-sessions";
const EXAM_SESSION_STATISTICS_PATH = `${EXAM_SESSIONS_PATH}/statistics`;
const USER_LOOKUP_ENDPOINTS = ["/api/v1/users"] as const;
const USER_BY_ID_LOOKUP_ENDPOINTS = ["/api/v1/users"] as const;

type ApiEnvelope = {
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  content?: unknown;
  items?: unknown;
  sessions?: unknown;
  sessionIds?: unknown;
};

export type ModeratorSessionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "GRADING"
  | "COMPLETED"
  | "TIMEOUT"
  | "LOCKED"
  | "ABANDONED"
  | string;

export type ModeratorExamSessionRecord = {
  id: number;
  userId: number | null;
  userDisplayName: string | null;
  examId: number | null;
  mode: string | null;
  status: ModeratorSessionStatus;
  practiceTopicTags: string | null;
  startTime: string | null;
  submittedAt: string | null;
  timeLimitMinutes: number | null;
  isLocked: boolean | null;
  submitReason: string | null;
  totalScore: number | null;
  durationSeconds: number | null;
  source: "exam-sessions" | "future-exam-sessions" | "statistics" | "status-result";
};

export type ModeratorTopSessionItem = {
  sessionId: number;
  totalScore: number;
  durationSeconds: number | null;
};

export type ModeratorExamTopSessions = {
  examId: number;
  sessions: ModeratorTopSessionItem[];
};

export type ModeratorExamSessionIds = {
  sessionIds: number[];
};

export type ModeratorExamSessionListResponse = {
  sessions: ModeratorExamSessionRecord[];
  usedFallback: boolean;
  fallbackLookupCount: number;
  inaccessibleSessionCount: number;
};

function toObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoDateTimeOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Math.floor(Number(nano) / 1_000_000)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const year = toNumber(objectValue.year);
  const month = toNumber(objectValue.monthValue ?? objectValue.month);
  const day = toNumber(objectValue.dayOfMonth ?? objectValue.day);
  if (year === null || month === null || day === null) {
    return null;
  }

  const hour = toNumber(objectValue.hour) ?? 0;
  const minute = toNumber(objectValue.minute) ?? 0;
  const second = toNumber(objectValue.second) ?? 0;
  const nano = toNumber(objectValue.nano) ?? 0;
  const parsed = new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1_000_000));

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function unwrapPayload(value: unknown): unknown {
  let current = value;

  for (let depth = 0; depth < 4; depth += 1) {
    const objectValue = toObject(current);
    if (!objectValue) {
      return current;
    }

    const wrapped = objectValue as ApiEnvelope;
    const next = wrapped.data ?? wrapped.result ?? wrapped.payload;
    if (next === undefined) {
      return current;
    }

    current = next;
  }

  return current;
}

function extractArray(value: unknown): unknown[] {
  const unwrapped = unwrapPayload(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  const objectValue = toObject(unwrapped);
  if (!objectValue) {
    return [];
  }

  const candidates = [
    (objectValue as ApiEnvelope).content,
    (objectValue as ApiEnvelope).items,
    (objectValue as ApiEnvelope).sessions,
    (objectValue as ApiEnvelope).sessionIds,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractUserNameFromRecord(record: Record<string, unknown>) {
  return (
    toStringOrNull(record.fullName) ??
    toStringOrNull(record.name) ??
    toStringOrNull(record.displayName) ??
    toStringOrNull(record.userName) ??
    toStringOrNull(record.username) ??
    toStringOrNull(record.email) ??
    null
  );
}

function extractUsersFromPayload(value: unknown): Record<string, unknown>[] {
  const unwrapped = unwrapPayload(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped
      .map((item) => toObject(item))
      .filter((item): item is Record<string, unknown> => item !== null);
  }

  const objectValue = toObject(unwrapped);
  if (!objectValue) {
    return [];
  }

  const candidates = [
    objectValue.content,
    objectValue.items,
    objectValue.users,
    objectValue.data,
    objectValue.result,
    objectValue.payload,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => toObject(item))
        .filter((item): item is Record<string, unknown> => item !== null);
    }
  }

  return [];
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

function isEndpointMissingError(error: unknown) {
  if (!isAxiosError(error)) {
    return false;
  }

  const statusCode = error.response?.status;
  return statusCode === 404 || statusCode === 405;
}

async function fetchUserDisplayNameByIdMap() {
  const nameByUserId = new Map<number, string>();

  for (const endpoint of USER_LOOKUP_ENDPOINTS) {
    try {
      const response = await apiClient.get(endpoint, buildAuthConfig());
      const users = extractUsersFromPayload(response.data);
      for (const userRecord of users) {
        const userId = toNumber(userRecord.id ?? userRecord.userId ?? userRecord.user_id);
        const userName = extractUserNameFromRecord(userRecord);
        if (userId !== null && userName) {
          nameByUserId.set(userId, userName);
        }
      }

      if (nameByUserId.size > 0) {
        return nameByUserId;
      }
    } catch {
      // Best-effort lookup only. Skip unavailable/forbidden endpoints.
    }
  }

  return nameByUserId;
}

async function fetchUserDisplayNameById(userId: number): Promise<string | null> {
  for (const endpoint of USER_BY_ID_LOOKUP_ENDPOINTS) {
    try {
      const response = await apiClient.get(`${endpoint}/${userId}`, buildAuthConfig());
      const userRecord = toObject(unwrapPayload(response.data));
      if (!userRecord) {
        continue;
      }

      const userName = extractUserNameFromRecord(userRecord);
      if (userName) {
        return userName;
      }
    } catch {
      // Best-effort lookup only. Skip unavailable/forbidden endpoints.
    }
  }

  return null;
}

async function enrichSessionsWithUserNames(sessions: ModeratorExamSessionRecord[]) {
  const unresolvedUserIds = Array.from(
    new Set(
      sessions
        .filter((session) => session.userId !== null && !session.userDisplayName)
        .map((session) => session.userId)
        .filter((userId): userId is number => userId !== null)
    )
  );

  if (unresolvedUserIds.length === 0) {
    return sessions;
  }

  const nameByUserId = await fetchUserDisplayNameByIdMap();
  const unresolvedIds = unresolvedUserIds.filter((userId) => !nameByUserId.has(userId));
  if (unresolvedIds.length > 0) {
    const resolvedPairs = await Promise.all(
      unresolvedIds.map(async (userId) => {
        const userName = await fetchUserDisplayNameById(userId);
        return userName ? ([userId, userName] as const) : null;
      })
    );

    for (const pair of resolvedPairs) {
      if (!pair) {
        continue;
      }
      const [userId, userName] = pair;
      nameByUserId.set(userId, userName);
    }
  }

  if (nameByUserId.size === 0) {
    return sessions;
  }

  return sessions.map((session) => {
    if (session.userDisplayName || session.userId === null) {
      return session;
    }

    const resolvedName = nameByUserId.get(session.userId);
    if (!resolvedName) {
      return session;
    }

    return {
      ...session,
      userDisplayName: resolvedName,
    };
  });
}

function normalizeStatus(value: unknown, submitReason?: unknown, isLocked?: unknown): ModeratorSessionStatus {
  const locked = toBoolean(isLocked);
  if (locked) {
    return "LOCKED";
  }

  const reason = toStringOrNull(submitReason)?.toUpperCase();
  if (reason === "TIMEOUT") {
    return "TIMEOUT";
  }

  return toStringOrNull(value)?.toUpperCase() ?? "NOT_STARTED";
}

function extractUserDisplayName(objectValue: Record<string, unknown>) {
  const directName =
    toStringOrNull(objectValue.userDisplayName) ??
    toStringOrNull(objectValue.user_display_name) ??
    toStringOrNull(objectValue.userName) ??
    toStringOrNull(objectValue.user_name) ??
    toStringOrNull(objectValue.username) ??
    toStringOrNull(objectValue.fullName) ??
    toStringOrNull(objectValue.full_name) ??
    toStringOrNull(objectValue.displayName) ??
    toStringOrNull(objectValue.candidateName);

  if (directName) {
    return directName;
  }

  const nestedUser = toObject(objectValue.user ?? objectValue.account ?? objectValue.candidate);
  if (!nestedUser) {
    return null;
  }

  return (
    toStringOrNull(nestedUser.displayName) ??
    toStringOrNull(nestedUser.fullName) ??
    toStringOrNull(nestedUser.userName) ??
    toStringOrNull(nestedUser.username) ??
    null
  );
}

function normalizeSession(value: unknown, source: ModeratorExamSessionRecord["source"]): ModeratorExamSessionRecord | null {
  const unwrapped = unwrapPayload(value);
  const objectValue = toObject(unwrapped);
  if (!objectValue) {
    return null;
  }

  const id = toNumber(objectValue.id ?? objectValue.sessionId ?? objectValue.session_id);
  if (id === null) {
    return null;
  }

  const startTime = toIsoDateTimeOrNull(objectValue.startTime ?? objectValue.start_time);
  const submittedAt = toIsoDateTimeOrNull(objectValue.submittedAt ?? objectValue.submitted_at);

  return {
    id,
    userId: toNumber(objectValue.userId ?? objectValue.user_id),
    userDisplayName: extractUserDisplayName(objectValue),
    examId: toNumber(objectValue.examId ?? objectValue.exam_id),
    mode: toStringOrNull(objectValue.mode),
    status: normalizeStatus(objectValue.status, objectValue.submitReason ?? objectValue.submit_reason, objectValue.isLocked ?? objectValue.locked ?? objectValue.is_locked),
    practiceTopicTags: toStringOrNull(
      objectValue.practiceTopicTags ?? objectValue.practice_topic_tags ?? objectValue.topicTags
    ),
    startTime,
    submittedAt,
    timeLimitMinutes: toNumber(objectValue.timeLimitMinutes ?? objectValue.time_limit_minutes),
    isLocked: toBoolean(objectValue.isLocked ?? objectValue.locked ?? objectValue.is_locked),
    submitReason: toStringOrNull(objectValue.submitReason ?? objectValue.submit_reason),
    totalScore: toNumber(objectValue.totalScore ?? objectValue.total_score),
    durationSeconds: toNumber(objectValue.durationSeconds ?? objectValue.duration_seconds),
    source,
  };
}

function normalizeTopSession(value: unknown): ModeratorTopSessionItem | null {
  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const sessionId = toNumber(objectValue.sessionId);
  const totalScore = toNumber(objectValue.totalScore);
  if (sessionId === null || totalScore === null) {
    return null;
  }

  return {
    sessionId,
    totalScore,
    durationSeconds: toNumber(objectValue.durationSeconds),
  };
}

function normalizeExamTopSessions(value: unknown): ModeratorExamTopSessions | null {
  const objectValue = toObject(value);
  if (!objectValue) {
    return null;
  }

  const examId = toNumber(objectValue.examId);
  if (examId === null) {
    return null;
  }

  return {
    examId,
    sessions: extractArray(objectValue.sessions)
      .map(normalizeTopSession)
      .filter((item): item is ModeratorTopSessionItem => item !== null),
  };
}

export async function listModeratorTopSessionsByExam(): Promise<ModeratorExamTopSessions[]> {
  const response = await apiClient.get(`${EXAM_SESSION_STATISTICS_PATH}/top-10-by-exam`, buildAuthConfig());

  return extractArray(response.data)
    .map(normalizeExamTopSessions)
    .filter((item): item is ModeratorExamTopSessions => item !== null);
}

export async function listModeratorPerformedSessionIds(): Promise<ModeratorExamSessionIds> {
  const response = await apiClient.get(`${EXAM_SESSION_STATISTICS_PATH}/all-session-ids`, buildAuthConfig());
  const ids = extractArray(response.data)
    .map(toNumber)
    .filter((item): item is number => item !== null);

  return { sessionIds: ids };
}

export async function getModeratorSessionStatus(sessionId: number): Promise<ModeratorExamSessionRecord> {
  const response = await apiClient.get(`${EXAM_SESSIONS_PATH}/${sessionId}/status`, buildAuthConfig());
  const normalized = normalizeSession(response.data, "status-result");
  if (!normalized) {
    throw new Error("Unexpected exam session status response shape.");
  }

  return normalized;
}

export async function getModeratorSessionResult(sessionId: number): Promise<ModeratorExamSessionRecord> {
  const response = await apiClient.get(`${EXAM_SESSIONS_PATH}/${sessionId}/result`, buildAuthConfig());
  const normalized = normalizeSession(response.data, "status-result");
  if (!normalized) {
    throw new Error("Unexpected exam session result response shape.");
  }

  return normalized;
}

export async function submitModeratorSession(sessionId: number, submitReason = "MANUAL"): Promise<ModeratorExamSessionRecord> {
  const response = await apiClient.post(
    `${EXAM_SESSIONS_PATH}/${sessionId}/submit`,
    { submitReason },
    buildAuthConfig()
  );
  const normalized = normalizeSession(response.data, "status-result");
  if (!normalized) {
    throw new Error("Unexpected exam session submit response shape.");
  }

  return normalized;
}

async function listFutureExamSessions(examId: number): Promise<ModeratorExamSessionRecord[]> {
  const response = await apiClient.get(`/api/exams/${examId}/sessions`, buildAuthConfig());
  return extractArray(response.data)
    .map((item) => normalizeSession(item, "future-exam-sessions"))
    .filter((item): item is ModeratorExamSessionRecord => item !== null)
    .map((session) => ({
      ...session,
      examId: session.examId ?? examId,
    }));
}

export async function listModeratorExamSessions(examId: number): Promise<ModeratorExamSessionListResponse> {
  try {
    const sessions = await enrichSessionsWithUserNames(await listFutureExamSessions(examId));
    return {
      sessions,
      usedFallback: false,
      fallbackLookupCount: 0,
      inaccessibleSessionCount: 0,
    };
  } catch (error) {
    if (!isEndpointMissingError(error)) {
      throw error;
    }
    // Backend older versions may not expose GET /api/exams/{examId}/sessions.
  }

  const [topSessionsByExamResult, performedSessionIdsResult] = await Promise.allSettled([
    listModeratorTopSessionsByExam(),
    listModeratorPerformedSessionIds(),
  ]);
  if (topSessionsByExamResult.status !== "fulfilled") {
    throw topSessionsByExamResult.reason;
  }

  const topSessionsByExam = topSessionsByExamResult.value;
  const performedSessionIdsResultOk = performedSessionIdsResult.status === "fulfilled";
  const topSessions = topSessionsByExam.find((entry) => entry.examId === examId)?.sessions ?? [];
  const sessions: ModeratorExamSessionRecord[] = topSessions.map((topSession) => ({
    id: topSession.sessionId,
    userId: null,
    userDisplayName: null,
    examId,
    mode: "EXAM",
    status: "COMPLETED",
    practiceTopicTags: null,
    startTime: null,
    submittedAt: null,
    timeLimitMinutes: null,
    isLocked: null,
    submitReason: null,
    totalScore: topSession.totalScore,
    durationSeconds: topSession.durationSeconds,
    source: "statistics",
  }));

  return {
    sessions: await enrichSessionsWithUserNames(sessions),
    usedFallback: true,
    fallbackLookupCount: sessions.length,
    inaccessibleSessionCount: performedSessionIdsResultOk ? 0 : 1,
  };
}
