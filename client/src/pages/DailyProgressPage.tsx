import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";
import {
  TrendingUp,
  Plus,
  CloudSun,
  Users,
  Truck,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle2,
  Trash2,
  Send,
  FileDown,
  Calendar,
  Receipt,
  Boxes,
  Cpu,
  Layers,
  Search,
  Eye,
  Filter,
  Camera,
  ImagePlus,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";
import DateDprDetailModal from "../components/DateDprDetailModal";
import {
  loadOfflineDprDrafts,
  enqueueOfflineDprDraft,
  removeOfflineDprDraft,
  updateOfflineDprDraftStatus,
  archiveDprDraft,
  loadTodayDprArchive,
  markArchivedDprSynced,
  type DprArchiveEntry,
  type OfflineDprDraft,
  type DprPhotoAttachment,
} from "../lib/offlineDpr";
import {
  readCachedActivities,
  readCachedRoads,
  writeCachedActivities,
  writeCachedRoads,
  markFieldCacheUpdated,
} from "../lib/offlineFieldCache";

const WEATHER_OPTIONS = [
  "Clear / Sunny",
  "Partly Cloudy",
  "Overcast",
  "Light Rain / Drizzle",
  "Heavy Rain (Work Stoppage)",
  "Extreme Fog / Poor Visibility",
];
const COMMON_UNITS = ["Cum", "Sqm", "MT", "Rmt", "Km", "Nos", "LS"];
const SECTION_TABS = [
  { id: "Highway Works", label: "1. Highway Works (BT/Earthwork)", icon: TrendingUp },
  { id: "Concrete Works", label: "2. Concrete Works (CC/Structures)", icon: Boxes },
  { id: "Material", label: "3. Material Section", icon: Layers },
  { id: "Machine", label: "4. Machine Section", icon: Cpu },
] as const;

const SECTION_GUIDANCE: Record<string, { title: string; hint: string }> = {
  "Highway Works": { title: "Highway Works Photo & Quantity", hint: "BT, Earthwork, GSB, WMM, shoulder and road furniture की फोटो लगाएँ।" },
  "Concrete Works": { title: "Concrete / Structure Photo & Quantity", hint: "CC road, culvert, drain, PCC/RCC, reinforcement और shuttering की फोटो लगाएँ।" },
  Material: { title: "Material Section Photo & Quantity", hint: "Stock receipt, stacking, challan, laying या consumption की फोटो लगाएँ।" },
  Machine: { title: "Machine Section Photo & Quantity", hint: "Deployed plant, hour-meter, fuel और work location की फोटो लगाएँ।" },
};

function parseSitePhotos(value?: string | null): Array<{ url: string; caption?: string; sectionType?: string; chainage?: string; uploadedAt?: string }> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy demo rows may contain a single URL string.
  }
  return [{ url: value }];
}

async function compressDprPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not process photo"));
    img.src = raw;
  });

  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

type RoadSubtotal = {
  roadId: number;
  roadName: string;
  entries: number;
  hindrances: number;
  synced: number;
  actualByUnit: Record<string, number>;
  averageProgress: number;
};

function buildRoadSubtotals(entries: DprArchiveEntry[]): RoadSubtotal[] {
  const groups = entries.reduce<Record<string, RoadSubtotal & { progressTotal: number }>>((acc, item) => {
    const roadKey = String(item.payload.roadId);
    const group = acc[roadKey] || {
      roadId: item.payload.roadId,
      roadName: item.roadName || `Road #${item.payload.roadId}`,
      entries: 0,
      hindrances: 0,
      synced: 0,
      actualByUnit: {},
      averageProgress: 0,
      progressTotal: 0,
    };

    group.entries += 1;
    group.progressTotal += Number(item.payload.percentageComplete || 0);
    group.hindrances += item.payload.hindrance?.trim() ? 1 : 0;
    group.synced += item.syncStatus === "synced" ? 1 : 0;
    const unit = item.payload.unit || "Unit";
    group.actualByUnit[unit] = (group.actualByUnit[unit] || 0) + Number(item.payload.actualQuantity || 0);
    acc[roadKey] = group;
    return acc;
  }, {});

  return Object.values(groups)
    .map(({ progressTotal, ...group }) => ({
      ...group,
      averageProgress: group.entries ? progressTotal / group.entries : 0,
    }))
    .sort((a, b) => a.roadId - b.roadId);
}

export default function DailyProgressPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All Roads");
  const [selectedSectionType, setSelectedSectionType] = useState<string>("All Sections");
  const [filterDate, setFilterDate] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineDprDraft[]>([]);
  const [todayArchive, setTodayArchive] = useState(loadTodayDprArchive());
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [cachedRoads, setCachedRoads] = useState<any[]>([]);
  const [cachedActivities, setCachedActivities] = useState<any[]>([]);

  // Date Audit Modal state
  const [auditDate, setAuditDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Form states
  const [activeSectionTab, setActiveSectionTab] = useState<"Highway Works" | "Concrete Works" | "Material" | "Machine">("Highway Works");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [roadId, setRoadId] = useState<number>(1);
  const [activityId, setActivityId] = useState<number>(1);
  const [chainageFrom, setChainageFrom] = useState("");
  const [chainageTo, setChainageTo] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [actualQuantity, setActualQuantity] = useState("");
  const [billableQuantity, setBillableQuantity] = useState("");
  const [billingStatus, setBillingStatus] = useState<"Pending" | "Ready for Bill" | "Included in Bill">("Pending");
  const [unit, setUnit] = useState("Cum");
  const [percentageComplete, setPercentageComplete] = useState("");
  const [boqItemId, setBoqItemId] = useState<number | undefined>(undefined);
  const [materialId, setMaterialId] = useState<number | undefined>(undefined);
  const [materialConsumedQuantity, setMaterialConsumedQuantity] = useState("");
  const [manpower, setManpower] = useState("");
  const [machinery, setMachinery] = useState("");
  const [weather, setWeather] = useState("Clear / Sunny");
  const [hindrance, setHindrance] = useState("");
  const [remarks, setRemarks] = useState("");
  const [dprPhotos, setDprPhotos] = useState<DprPhotoAttachment[]>([]);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoChainage, setPhotoChainage] = useState("");
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const dprPhotoInputRef = useRef<HTMLInputElement>(null);

  const { data: dprList, isLoading, refetch } = trpc.dailyProgress.list.useQuery({
    roadId: selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined,
    date: filterDate || undefined,
    sectionType: selectedSectionType !== "All Sections" ? (selectedSectionType as any) : undefined,
  });

  const { data: roads } = trpc.roads.list.useQuery();
  const { data: activities } = trpc.activities.list.useQuery({ roadId });
  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;
  const { data: boqData } = trpc.boq.list.useQuery({ roadId });
  const { data: inventoryData } = trpc.inventory.list.useQuery();
  const availableRoads = roads ?? cachedRoads;
  const availableActivities = activities ?? cachedActivities;
  const usingRoadCache = !roads && cachedRoads.length > 0;
  const usingActivityCache = !activities && cachedActivities.length > 0;
  const roadSubtotals = buildRoadSubtotals(todayArchive);

  useEffect(() => {
    if (roads) {
      setCachedRoads(roads);
      writeCachedRoads(roads);
      markFieldCacheUpdated("roads");
    } else {
      setCachedRoads(readCachedRoads<any[]>() || []);
    }
  }, [roads]);

  useEffect(() => {
    if (activities) {
      setCachedActivities(activities);
      writeCachedActivities(roadId, activities);
      markFieldCacheUpdated(`activities:${roadId}`);
    } else {
      setCachedActivities(readCachedActivities<any[]>(roadId) || []);
    }
  }, [activities, roadId]);

  const createDprMutation = trpc.dailyProgress.create.useMutation();
  const uploadDprPhotoMutation = trpc.dailyProgress.uploadPhoto.useMutation();

  const sectionGuidance = SECTION_GUIDANCE[activeSectionTab];

  const resetDprForm = () => {
    setActiveSectionTab("Highway Works");
    setDate(new Date().toISOString().split("T")[0]);
    setChainageFrom("");
    setChainageTo("");
    setPlannedQuantity("");
    setActualQuantity("");
    setBillableQuantity("");
    setBillingStatus("Pending");
    setUnit("Cum");
    setPercentageComplete("");
    setBoqItemId(undefined);
    setMaterialId(undefined);
    setMaterialConsumedQuantity("");
    setManpower("");
    setMachinery("");
    setWeather("Clear / Sunny");
    setHindrance("");
    setRemarks("");
    setDprPhotos([]);
    setPhotoCaption("");
    setPhotoChainage("");
  };

  const reloadOfflineQueue = useCallback(() => {
    setOfflineDrafts(loadOfflineDprDrafts());
    setTodayArchive(loadTodayDprArchive());
  }, []);

  useEffect(() => {
    reloadOfflineQueue();

    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Internet connection restored", { description: "You can sync your offline DPR drafts now." });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline", { description: "New DPR entries will be saved to your device and queued for sync." });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [reloadOfflineQueue]);

  const handleDprPhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (dprPhotos.length >= 5) {
      toast.error("Maximum 5 photos can be attached to one DPR entry.");
      return;
    }

    setIsPreparingPhoto(true);
    try {
      const fileBase64 = await compressDprPhoto(file);
      setDprPhotos((current) => [
        ...current,
        {
          fileName: file.name,
          fileBase64,
          caption: photoCaption.trim() || `${activeSectionTab} site photo`,
          chainage: photoChainage.trim() || chainageFrom,
        },
      ]);
      setPhotoCaption("");
      setPhotoChainage("");
      toast.success("Photo added to this DPR entry");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare photo");
    } finally {
      setIsPreparingPhoto(false);
      if (dprPhotoInputRef.current) dprPhotoInputRef.current.value = "";
    }
  };

  const uploadDprPhotos = async (clientDraftId: string, sectionType: typeof activeSectionTab, photos: DprPhotoAttachment[]) => {
    for (const photo of photos) {
      await uploadDprPhotoMutation.mutateAsync({
        clientDraftId,
        fileName: photo.fileName,
        fileBase64: photo.fileBase64,
        sectionType,
        caption: photo.caption,
        chainage: photo.chainage,
      });
    }
  };

  // Sync a single draft to the server
  const syncDraft = async (draft: OfflineDprDraft) => {
    updateOfflineDprDraftStatus(draft.id, "syncing");
    reloadOfflineQueue();

    try {
      await createDprMutation.mutateAsync(draft.payload);
      if (draft.photoAttachments?.length && draft.payload.sectionType) {
        await uploadDprPhotos(draft.payload.clientDraftId, draft.payload.sectionType, draft.photoAttachments);
      }
      markArchivedDprSynced(draft.payload.clientDraftId);
      removeOfflineDprDraft(draft.id);
      reloadOfflineQueue();
      refetch();
      toast.success("DPR synced to server", {
        description: `${draft.roadName || "Road"} - ${draft.payload.date} synced.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      updateOfflineDprDraftStatus(draft.id, "failed", message);
      reloadOfflineQueue();
      toast.error("Could not sync DPR", { description: message });
    }
  };

  // Sync all queued drafts
  const syncAllDrafts = async () => {
    const queue = loadOfflineDprDrafts();
    if (!queue.length) return;
    setIsSyncingAll(true);
    let successCount = 0;

    for (const draft of queue) {
      try {
        await createDprMutation.mutateAsync(draft.payload);
        if (draft.photoAttachments?.length && draft.payload.sectionType) {
          await uploadDprPhotos(draft.payload.clientDraftId, draft.payload.sectionType, draft.photoAttachments);
        }
        markArchivedDprSynced(draft.payload.clientDraftId);
        removeOfflineDprDraft(draft.id);
        successCount++;
      } catch (err) {
        console.error("[Sync Queue] Draft failed", draft.id, err);
      }
    }

    reloadOfflineQueue();
    refetch();
    setIsSyncingAll(false);
    toast.success(`Sync complete: ${successCount} DPR entries posted.`);
  };

  // When coming back online, auto-sync if queue has pending drafts
  useEffect(() => {
    if (isOnline && offlineDrafts.length > 0 && !isSyncingAll) {
      void syncAllDrafts();
    }
  }, [isOnline]);

  const handleSubmitDpr = async () => {
    const selectedRoad = availableRoads.find((r) => r.id === roadId);
    const selectedAct = availableActivities.find((a) => a.activity.id === activityId)?.activity;
    const roadName = selectedRoad?.roadName || `Road #${roadId}`;
    const activityName = selectedAct?.activityName || `Activity #${activityId}`;

    const payload = {
      clientDraftId: `dpr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      date,
      projectId: activeProjectId,
      roadId,
      activityId,
      sectionType: activeSectionTab,
      chainageFrom: chainageFrom || undefined,
      chainageTo: chainageTo || undefined,
      boqItemId: boqItemId || undefined,
      materialId: materialId || undefined,
      materialConsumedQuantity: materialConsumedQuantity ? materialConsumedQuantity : undefined,
      plannedQuantity,
      actualQuantity,
      billableQuantity: billableQuantity || actualQuantity,
      billingStatus,
      unit,
      percentageComplete,
      manpower,
      machinery,
      weather,
      hindrance,
      remarks,
    };

    if (!isOnline) {
      enqueueOfflineDprDraft({
        roadName: selectedRoad?.roadName || `Road #${roadId}`,
        activityName: selectedAct?.activityName || `Activity #${activityId}`,
        payload,
        photoAttachments: dprPhotos,
      });
      reloadOfflineQueue();
      setIsAddOpen(false);
      setDprPhotos([]);
      toast.success("Saved offline on this device", {
        description: "DPR is stored locally and will sync when internet returns.",
      });
      return;
    }

    archiveDprDraft({ roadName, activityName, payload, syncStatus: "pending" });
    try {
      await createDprMutation.mutateAsync(payload);
      if (dprPhotos.length) {
        await uploadDprPhotos(payload.clientDraftId, payload.sectionType, dprPhotos);
      }
      markArchivedDprSynced(payload.clientDraftId);
      refetch();
      reloadOfflineQueue();
      setIsAddOpen(false);
      setDprPhotos([]);
      toast.success("DPR logged and synced to server!");
    } catch (error) {
      enqueueOfflineDprDraft({
        roadName,
        activityName,
        payload,
        photoAttachments: dprPhotos,
      });
      reloadOfflineQueue();
      setIsAddOpen(false);
      setDprPhotos([]);
      toast.warning("Server unreachable: saved to offline queue", {
        description: "We preserved your draft on this device so no field data is lost.",
      });
    }
  };

  const openAuditForDate = (targetDate: string) => {
    setAuditDate(targetDate);
    setIsAuditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Network Status & Offline Queue Banner */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${isOnline ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-300 text-amber-950"}`}>
        <div className="flex items-center gap-2.5">
          {isOnline ? (
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-amber-600 text-white shrink-0 animate-pulse">
              <WifiOff className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>{isOnline ? "Online Mode: Connected to ERP Server" : "Offline Mode: Remote Site / No Signal"}</span>
              <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-black ${isOnline ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"}`}>
                {isOnline ? "Live" : "Device Queue"}
              </span>
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isOnline
                ? "DPR logs submit directly and auto-recalculate road progress."
                : "Engineers can continue logging DPRs without internet. Drafts are safely cached in browser memory."}
            </p>
          </div>
        </div>

        {offlineDrafts.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-amber-950 bg-amber-200 px-2.5 py-1 rounded-lg text-xs">
              {offlineDrafts.length} offline {offlineDrafts.length === 1 ? "draft" : "drafts"} pending
            </span>
            {isOnline && (
              <button
                onClick={syncAllDrafts}
                disabled={isSyncingAll}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? "animate-spin" : ""}`} />
                <span>Sync Now</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Offline Pending Drafts Card Deck */}
      {offlineDrafts.length > 0 && (
        <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Pending Offline DPR Drafts Queue
            </h3>
            <span className="text-[11px] text-amber-800">
              Auto-syncs when online • No data lost on page refresh
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {offlineDrafts.map((draft) => (
              <div key={draft.id} className="bg-white rounded-lg border border-amber-200 p-3.5 space-y-2 text-xs shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-slate-900 text-amber-400 rounded">
                    {draft.payload.date}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Created {new Date(draft.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <div>
                  <p className="font-bold text-slate-900">{draft.roadName}</p>
                  <p className="text-slate-600 text-[11px] truncate">{draft.activityName}</p>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-2 rounded text-[11px]">
                  <span>Executed: <strong>{draft.payload.actualQuantity} {draft.payload.unit}</strong></span>
                  <span className="font-bold text-emerald-700">{draft.payload.percentageComplete}% Done</span>
                </div>

                {draft.lastError && (
                  <p className="text-[10px] text-rose-600 truncate">Last error: {draft.lastError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => removeOfflineDprDraft(draft.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600"
                    title="Discard draft"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => syncDraft(draft)}
                    disabled={draft.syncStatus === "syncing" || !isOnline}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-bold text-[11px] flex items-center gap-1 shadow disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>{draft.syncStatus === "syncing" ? "Syncing..." : "Sync"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Daily Site Progress (DPR) Control
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              4-Section Architecture
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Separate sections for Highway Works (BT), Concrete Works (CC), Materials and Machinery with date-wise billing audit.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openAuditForDate(filterDate || new Date().toISOString().split("T")[0])}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Calendar className="w-4 h-4 text-slate-950" />
            <span>Audit Date & Bill Qty</span>
          </button>
          <Link
            href="/reports?type=dpr"
            className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <FileDown className="w-4 h-4 text-amber-600" />
            <span>Export PDF</span>
          </Link>
          <button
            onClick={() => {
              resetDprForm();
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>New Sectioned DPR</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar with Date & Section Filter */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Road:</span>
            <select
              value={selectedRoadId}
              onChange={(e) => setSelectedRoadId(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="All Roads">All 14 Roads</option>
              {availableRoads.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roadId} - {r.roadName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Section:</span>
            <select
              value={selectedSectionType}
              onChange={(e) => setSelectedSectionType(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="All Sections">All 4 Sections</option>
              <option value="Highway Works">Highway Works (BT/Earthwork)</option>
              <option value="Concrete Works">Concrete Works (CC/Structures)</option>
              <option value="Material">Material Consumption</option>
              <option value="Machine">Machine & Equipment</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Date:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 self-end lg:self-auto">
          <span>Showing {dprList?.length || 0} entries</span>
          {filterDate && (
            <button
              onClick={() => openAuditForDate(filterDate)}
              className="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded font-bold text-[11px] flex items-center gap-1"
            >
              <Eye className="w-3 h-3 text-amber-600" />
              <span>Inspect {filterDate}</span>
            </button>
          )}
        </div>
      </div>

      {/* DPR Feed / Cards */}
      <div className="space-y-4">
        {dprList?.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No DPR entries match the selected filters. Change road, section or clear the date filter.
          </div>
        )}

        {dprList?.map(({ dp, road, activity, boq, material }) => {
          const photos = parseSitePhotos(dp.sitePhotos);
          const sectionBadgeColor =
            dp.sectionType === "Concrete Works" ? "bg-blue-100 text-blue-900 border-blue-200" :
            dp.sectionType === "Material" ? "bg-purple-100 text-purple-900 border-purple-200" :
            dp.sectionType === "Machine" ? "bg-amber-100 text-amber-900 border-amber-200" :
            "bg-emerald-100 text-emerald-900 border-emerald-200";

          return (
            <div
              key={dp.id}
              className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition space-y-3"
            >
              {/* Top Bar of DPR Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => openAuditForDate(dp.date)}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold flex items-center gap-1 transition"
                    title="Click to inspect all DPRs & bills for this date"
                  >
                    <span>{dp.date}</span>
                    <Eye className="w-3 h-3 text-amber-400" />
                  </button>

                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${sectionBadgeColor}`}>
                    {dp.sectionType || "Highway Works"}
                  </span>

                  <span className="font-semibold text-slate-900 text-sm">
                    {road?.roadId} • {road?.roadName}
                  </span>

                  {dp.chainageFrom && (
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Ch: {dp.chainageFrom} to {dp.chainageTo || "End"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-slate-600">
                    <CloudSun className="w-4 h-4 text-amber-500" />
                    <span>{dp.weather}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                    Activity: {dp.percentageComplete}% Done
                  </span>
                </div>
              </div>

              {/* Core Quantities and Work Info */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50/70 p-3 rounded-lg text-xs">
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[11px]">Construction Activity</span>
                  <span className="font-bold text-slate-800 line-clamp-1">{activity?.activityName || "Activity"}</span>
                  <span className="text-[10px] text-slate-500">{activity?.phase}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Planned Quantity</span>
                  <span className="font-bold text-slate-800">{dp.plannedQuantity} {dp.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Actual Executed</span>
                  <span className="font-black text-emerald-600">{dp.actualQuantity} {dp.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Billable Quantity</span>
                  <span className="font-black text-amber-700">{dp.billableQuantity || dp.actualQuantity} {dp.unit}</span>
                  <span className={`text-[9px] font-bold uppercase block ${
                    dp.billingStatus === "Included in Bill" ? "text-emerald-700" :
                    dp.billingStatus === "Ready for Bill" ? "text-blue-700" : "text-slate-500"
                  }`}>
                    {dp.billingStatus || "Pending"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Efficiency</span>
                  <span className="font-bold text-slate-800">
                    {((parseFloat(String(dp.actualQuantity)) / (parseFloat(String(dp.plannedQuantity)) || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* ERP Linkage Badges */}
              {(boq || material || dp.boqItemId || dp.materialId) && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                  {boq && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold font-mono flex items-center gap-1">
                      <Receipt className="w-3 h-3 text-amber-700" />
                      <span>BOQ #{boq.itemCode}: {boq.chapter} (Bal: {parseFloat(String(boq.balanceQuantity)).toLocaleString()} {boq.unit})</span>
                    </span>
                  )}
                  {material && dp.materialConsumedQuantity && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold flex items-center gap-1">
                      <Layers className="w-3 h-3 text-blue-700" />
                      <span>{material.materialName}: Consumed {dp.materialConsumedQuantity} {dp.unit} (Stock: {parseFloat(String(material.balanceQuantity)).toLocaleString()})</span>
                    </span>
                  )}
                </div>
              )}

              {photos.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-600" /> Site Evidence Photos ({photos.length})
                    </span>
                    <span className="text-[10px] text-amber-800">{dp.sectionType || "Highway Works"}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {photos.map((photo, index) => (
                      <a key={`${photo.url}-${index}`} href={photo.url} target="_blank" rel="noreferrer" className="shrink-0 group">
                        <img src={photo.url} alt={photo.caption || "DPR site photo"} className="w-24 h-16 object-cover rounded-md border border-amber-200 group-hover:ring-2 group-hover:ring-amber-500" />
                        <span className="block max-w-24 truncate text-[9px] text-amber-900 mt-0.5" title={photo.caption}>{photo.caption || "Open photo"}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Manpower & Machinery details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-start gap-2 bg-white p-2.5 rounded border border-slate-100">
                  <Users className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700 block text-[11px]">Site Manpower:</strong>
                    <span>{dp.manpower || "Not reported"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-white p-2.5 rounded border border-slate-100">
                  <Truck className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700 block text-[11px]">Machinery & Equipment:</strong>
                    <span>{dp.machinery || "Not reported"}</span>
                  </div>
                </div>
              </div>

              {/* Hindrance & Remarks */}
              {(dp.hindrance || dp.remarks) && (
                <div className="text-xs space-y-1 pt-1 text-slate-600">
                  {dp.hindrance && (
                    <p className="flex items-center gap-1.5 text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span><strong>Hindrance Noted:</strong> {dp.hindrance}</span>
                    </p>
                  )}
                  {dp.remarks && (
                    <p className="text-slate-500 text-[11px] italic">
                      Remarks: {dp.remarks}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Date DPR Audit Modal */}
      <DateDprDetailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        date={auditDate}
        roadId={selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined}
      />

      {/* Modal: Add New Daily Progress (Online or Offline) with 4 Sections */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto my-6">
            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Daily Progress (DPR)</h3>
                <p className="text-xs text-slate-500">
                  Select the appropriate section for Highway (BT), Concrete (CC), Material or Machine work.
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOnline ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            {/* Section Selection Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {SECTION_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSectionTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSectionTab(tab.id as any)}
                    className={`py-2 px-2 text-xs font-bold rounded-lg flex flex-col items-center gap-1 transition ${
                      isActive
                        ? "bg-slate-900 text-amber-300 shadow"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* COMMON PHOTO PANEL — available for Highway, Concrete, Material and Machine */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>{sectionGuidance.title}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[9px] uppercase">All Work Types</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 mt-1">{sectionGuidance.hint}</p>
                </div>
                <span className="text-[10px] font-bold text-amber-800">{dprPhotos.length}/5 photos attached</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Photo caption / work stage"
                  className="p-2 border border-amber-200 rounded-lg bg-white text-xs"
                />
                <input
                  type="text"
                  value={photoChainage}
                  onChange={(e) => setPhotoChainage(e.target.value)}
                  placeholder="Photo RD / Chainage"
                  className="p-2 border border-amber-200 rounded-lg bg-white text-xs font-mono"
                />
                <input
                  ref={dprPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleDprPhotoSelected}
                  disabled={isPreparingPhoto || dprPhotos.length >= 5}
                  className="hidden"
                  id="dpr-photo-input"
                />
                <label
                  htmlFor="dpr-photo-input"
                  className={`px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-800 transition ${
                    isPreparingPhoto || dprPhotos.length >= 5 ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <ImagePlus className="w-4 h-4 text-amber-400" />
                  <span>{isPreparingPhoto ? "Preparing..." : "Take / Add Photo"}</span>
                </label>
              </div>

              {dprPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {dprPhotos.map((photo, index) => (
                    <div key={`${photo.fileName}-${index}`} className="relative rounded-lg overflow-hidden border border-amber-200 bg-white">
                      <img src={photo.fileBase64} alt={photo.caption || "DPR site photo"} className="w-full aspect-video object-cover" />
                      <button
                        type="button"
                        onClick={() => setDprPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="block px-1.5 py-1 text-[9px] font-semibold text-slate-700 truncate" title={photo.caption}>
                        {photo.caption || "Site photo"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Execution Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Weather Condition</label>
                  <select
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    {WEATHER_OPTIONS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target Road</label>
                  <select
                    value={roadId}
                    onChange={(e) => setRoadId(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                  >
                    {availableRoads.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roadId} - {r.roadName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Activity Being Executed</label>
                  <select
                    value={activityId}
                    onChange={(e) => setActivityId(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                  >
                    {availableActivities.map(({ activity: a }) => (
                      <option key={a.id} value={a.id}>
                        {a.taskId} - {a.activityName} ({a.phase})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chainage for BT / CC road split */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Chainage (RD From)</label>
                  <input
                    type="text"
                    value={chainageFrom}
                    onChange={(e) => setChainageFrom(e.target.value)}
                    placeholder="e.g. 0+000 or 3+500"
                    className="w-full p-1.5 border rounded font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">End Chainage (RD To)</label>
                  <input
                    type="text"
                    value={chainageTo}
                    onChange={(e) => setChainageTo(e.target.value)}
                    placeholder="e.g. 3+500 or 4+500"
                    className="w-full p-1.5 border rounded font-mono text-xs bg-white"
                  />
                </div>
              </div>

              {/* Quantities & Billing Quantity */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Planned Qty</label>
                  <input
                    type="number"
                    step="0.1"
                    value={plannedQuantity}
                    onChange={(e) => setPlannedQuantity(e.target.value)}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Actual Qty Done</label>
                  <input
                    type="number"
                    step="0.1"
                    value={actualQuantity}
                    onChange={(e) => {
                      setActualQuantity(e.target.value);
                      if (!billableQuantity) setBillableQuantity(e.target.value);
                    }}
                    className="w-full p-2 border rounded font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Billable Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    value={billableQuantity}
                    onChange={(e) => setBillableQuantity(e.target.value)}
                    className="w-full p-2 border rounded font-mono font-bold text-amber-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2 border rounded font-bold"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Billing Verification Status</label>
                  <select
                    value={billingStatus}
                    onChange={(e) => setBillingStatus(e.target.value as any)}
                    className="w-full p-2 border rounded font-semibold"
                  >
                    <option value="Ready for Bill">Ready for Bill (Approved for RA Bill)</option>
                    <option value="Pending">Pending Measurement Verification</option>
                    <option value="Included in Bill">Included in Current RA Bill</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Overall Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={percentageComplete}
                    onChange={(e) => setPercentageComplete(e.target.value)}
                    className="w-full p-2 border rounded font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* BOQ & Material Section Linkage */}
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 space-y-2">
                <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block">
                  ERP Contract BOQ & Material Stock Auto-Deduction
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Link Contract BOQ Item</label>
                    <select
                      value={boqItemId || ""}
                      onChange={(e) => setBoqItemId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full p-2 border rounded text-xs bg-white"
                    >
                      <option value="">None / Direct Activity Execution</option>
                      {boqData?.map(({ boq }) => (
                        <option key={boq.id} value={boq.id}>
                          {boq.itemCode} - {boq.chapter} (Bal: {parseFloat(String(boq.balanceQuantity)).toLocaleString()} {boq.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Deduct Material Consumption</label>
                    <select
                      value={materialId || ""}
                      onChange={(e) => setMaterialId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full p-2 border rounded text-xs bg-white"
                    >
                      <option value="">None / No Material Issued</option>
                      {inventoryData?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.materialCode} - {m.materialName} (Stock: {parseFloat(String(m.balanceQuantity)).toLocaleString()} {m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {materialId && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">Quantity Consumed on Site</label>
                    <input
                      type="number"
                      step="0.001"
                      value={materialConsumedQuantity}
                      onChange={(e) => setMaterialConsumedQuantity(e.target.value)}
                      placeholder="e.g. 24.500"
                      className="w-full p-2 border rounded text-xs bg-white font-mono font-bold text-blue-700"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Manpower Deployed</label>
                <input
                  type="text"
                  value={manpower}
                  onChange={(e) => setManpower(e.target.value)}
                  placeholder="Supervisors, operators, masons, laborers..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Machinery & Plant Deployed</label>
                <input
                  type="text"
                  value={machinery}
                  onChange={(e) => setMachinery(e.target.value)}
                  placeholder="Graders, rollers, pavers, tippers, water tankers..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Site Hindrances Encountered (if any)</label>
                <input
                  type="text"
                  value={hindrance}
                  onChange={(e) => setHindrance(e.target.value)}
                  placeholder="Utility crossing, traffic diversion delay, rain stoppage..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Site Remarks / Level Notes</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-1.5 border rounded text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={!actualQuantity || !percentageComplete || createDprMutation.isPending}
                onClick={handleSubmitDpr}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
              >
                {createDprMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{isOnline ? "Submit DPR (Auto-Sync)" : "Save Offline Draft"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
