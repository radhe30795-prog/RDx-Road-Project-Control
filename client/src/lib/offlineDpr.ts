export interface DprPhotoAttachment {
  fileName: string;
  fileBase64: string;
  caption?: string;
  chainage?: string;
}

export interface OfflineDprDraft {
  id: string; // client uuid
  createdAt: number;
  roadName?: string;
  activityName?: string;
  payload: {
    clientDraftId: string;
    date: string;
    projectId: number;
    roadId: number;
    activityId: number;
    sectionType?: "Highway Works" | "Concrete Works" | "Material" | "Machine";
    chainageFrom?: string;
    chainageTo?: string;
    boqItemId?: number;
    materialId?: number;
    materialConsumedQuantity?: string;
    billableQuantity?: string;
    billingStatus?: "Pending" | "Ready for Bill" | "Included in Bill";
    plannedQuantity: string;
    actualQuantity: string;
    unit: string;
    percentageComplete: string;
    manpower?: string;
    machinery?: string;
    weather: string;
    hindrance?: string;
    remarks?: string;
    sitePhotos?: string;
  };
  photoAttachments?: DprPhotoAttachment[];
  syncStatus: "pending" | "syncing" | "failed";
  lastError?: string;
}

export type DprDraftPayload = OfflineDprDraft["payload"];

export interface DprArchiveEntry {
  id: string;
  createdAt: number;
  roadName?: string;
  activityName?: string;
  payload: DprDraftPayload;
  syncStatus: "pending" | "synced" | "failed";
}

const STORAGE_KEY = "rdx_offline_dpr_queue_v1";
const DAILY_ARCHIVE_KEY = "rdx_daily_dpr_archive_v1";

export function loadOfflineDprDrafts(): OfflineDprDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineDprDrafts(drafts: OfflineDprDraft[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error("[Offline Queue] Failed to save", e);
  }
}

export function loadDprArchive(): DprArchiveEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DAILY_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function archiveDprDraft(draft: {
  id?: string;
  createdAt?: number;
  roadName?: string;
  activityName?: string;
  payload: DprDraftPayload;
  syncStatus?: DprArchiveEntry["syncStatus"];
}): void {
  if (typeof window === "undefined") return;
  const archive = loadDprArchive();
  const entry: DprArchiveEntry = {
    id: draft.id || draft.payload.clientDraftId,
    createdAt: draft.createdAt || Date.now(),
    roadName: draft.roadName,
    activityName: draft.activityName,
    payload: draft.payload,
    syncStatus: draft.syncStatus || "pending",
  };
  const existingIndex = archive.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) {
    archive[existingIndex] = { ...archive[existingIndex], ...entry };
  } else {
    archive.unshift(entry);
  }

  // Keep a rolling 31-day archive while limiting device storage growth.
  const cutoff = Date.now() - 31 * 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem(
      DAILY_ARCHIVE_KEY,
      JSON.stringify(archive.filter((item) => item.createdAt >= cutoff).slice(0, 500))
    );
  } catch (error) {
    console.warn("[DPR Archive] Failed to save local daily archive", error);
  }
}

export function markArchivedDprSynced(clientDraftId: string): void {
  if (typeof window === "undefined") return;
  const archive = loadDprArchive();
  try {
    localStorage.setItem(
      DAILY_ARCHIVE_KEY,
      JSON.stringify(archive.map((item) => item.id === clientDraftId ? { ...item, syncStatus: "synced" } : item))
    );
  } catch {
    // Best effort only.
  }
}

export function loadTodayDprArchive(date = new Date().toISOString().split("T")[0]): DprArchiveEntry[] {
  return loadDprArchive().filter((item) => item.payload.date === date);
}

export function enqueueOfflineDprDraft(draft: Omit<OfflineDprDraft, "id" | "createdAt" | "syncStatus">): OfflineDprDraft {
  const all = loadOfflineDprDrafts();
  const newDraft: OfflineDprDraft = {
    ...draft,
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    syncStatus: "pending",
  };
  saveOfflineDprDrafts([newDraft, ...all]);
  archiveDprDraft({
    id: newDraft.payload.clientDraftId,
    createdAt: newDraft.createdAt,
    roadName: newDraft.roadName,
    activityName: newDraft.activityName,
    payload: newDraft.payload,
    syncStatus: "pending",
  });
  return newDraft;
}

export function removeOfflineDprDraft(id: string): void {
  const all = loadOfflineDprDrafts();
  saveOfflineDprDrafts(all.filter((item) => item.id !== id));
}

export function updateOfflineDprDraftStatus(id: string, status: OfflineDprDraft["syncStatus"], lastError?: string): void {
  const all = loadOfflineDprDrafts();
  saveOfflineDprDrafts(
    all.map((item) => (item.id === id ? { ...item, syncStatus: status, lastError } : item))
  );
  if (status === "failed") {
    const draft = all.find((item) => item.id === id);
    if (draft) archiveDprDraft({
      id: draft.id,
      createdAt: draft.createdAt,
      roadName: draft.roadName,
      activityName: draft.activityName,
      payload: draft.payload,
      syncStatus: "failed",
    });
  }
}
