export const COMPOSER_FLASH_NOTICE_KEY = "moderator-composer-flash-notice";
export const COMPOSER_AI_IMPORT_DRAFT_KEY = "moderator-composer-ai-import-draft";

const MODERATOR_AI_IMPORT_PENDING_JOBS_KEY = "moderator-ai-import-pending-jobs";

export type PendingModeratorAiImportJob = {
  jobId: number;
  title: string;
  createdAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readPendingModeratorAiImportJobs(): PendingModeratorAiImportJob[] {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(MODERATOR_AI_IMPORT_PENDING_JOBS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Record<string, unknown>;
        const jobId = typeof record.jobId === "number" ? record.jobId : Number(record.jobId);
        const title = typeof record.title === "string" ? record.title.trim() : "";
        const createdAt = typeof record.createdAt === "string" ? record.createdAt : "";
        if (!Number.isFinite(jobId) || jobId <= 0) {
          return null;
        }
        return {
          jobId,
          title: title || `AI import #${jobId}`,
          createdAt,
        } satisfies PendingModeratorAiImportJob;
      })
      .filter((item): item is PendingModeratorAiImportJob => item !== null);
  } catch {
    return [];
  }
}

function writePendingModeratorAiImportJobs(items: PendingModeratorAiImportJob[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(MODERATOR_AI_IMPORT_PENDING_JOBS_KEY, JSON.stringify(items));
}

export function upsertPendingModeratorAiImportJob(item: PendingModeratorAiImportJob) {
  const currentItems = readPendingModeratorAiImportJobs();
  const filteredItems = currentItems.filter((currentItem) => currentItem.jobId !== item.jobId);
  filteredItems.unshift(item);
  writePendingModeratorAiImportJobs(filteredItems);
}

export function removePendingModeratorAiImportJob(jobId: number) {
  const currentItems = readPendingModeratorAiImportJobs();
  writePendingModeratorAiImportJobs(currentItems.filter((item) => item.jobId !== jobId));
}
