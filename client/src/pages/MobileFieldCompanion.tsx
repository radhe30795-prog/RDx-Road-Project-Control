import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Smartphone,
  HardHat,
  Compass,
  TrendingUp,
  AlertTriangle,
  Microscope,
  Boxes,
  Camera,
  MapPin,
  CheckCircle2,
  Clock,
  Plus,
  CloudSun,
  ShieldAlert,
  ArrowRight,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { useRole } from "../components/AppLayout";
import { enqueueOfflineDprDraft, loadOfflineDprDrafts, loadTodayDprArchive, type DprArchiveEntry, type DprPhotoAttachment } from "../lib/offlineDpr";
import {
  readCachedActivities,
  readCachedRoads,
  writeCachedActivities,
  writeCachedRoads,
  markFieldCacheUpdated,
} from "../lib/offlineFieldCache";
import { toast } from "sonner";

function readMobilePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please select an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.readAsDataURL(file);
  });
}

export default function MobileFieldCompanion() {
  const { role, setRole } = useRole();
  const [activeTab, setActiveTab] = useState<"roads" | "dpr" | "hindrance" | "qa">("roads");
  const [selectedRoadId, setSelectedRoadId] = useState<number>(1);
  const [deviceFrame, setDeviceFrame] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [todayArchive, setTodayArchive] = useState<DprArchiveEntry[]>([]);
  const [cachedRoads, setCachedRoads] = useState<any[]>([]);
  const [cachedActivities, setCachedActivities] = useState<any[]>([]);

  React.useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
      setOfflineCount(loadOfflineDprDrafts().length);
      setTodayArchive(loadTodayDprArchive());
    };
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // Quick form states for field engineer
  const [quickQty, setQuickQty] = useState("250");
  const [quickPct, setQuickPct] = useState("70");
  const [quickManpower, setQuickManpower] = useState("1 Supervisor, 10 Labors");
  const [quickDprSuccess, setQuickDprSuccess] = useState(false);
  const [quickPhoto, setQuickPhoto] = useState<DprPhotoAttachment | undefined>();
  const [quickPhotoCaption, setQuickPhotoCaption] = useState("");

  const [hndRd, setHndRd] = useState("Ch 6+200");
  const [hndDesc, setHndDesc] = useState("");
  const [hndCat, setHndCat] = useState<any>("Utility");
  const [hndSuccess, setHndSuccess] = useState(false);

  const { data: roads } = trpc.roads.list.useQuery();
  const { data: activities, refetch: refetchActs } = trpc.activities.list.useQuery({ roadId: selectedRoadId });
  const { data: hindrances, refetch: refetchHnds } = trpc.hindrances.list.useQuery({ roadId: selectedRoadId });

  const availableRoads = roads ?? cachedRoads;
  const availableActivities = activities ?? cachedActivities;

  React.useEffect(() => {
    if (roads) {
      setCachedRoads(roads);
      writeCachedRoads(roads);
      markFieldCacheUpdated("roads");
    } else {
      setCachedRoads(readCachedRoads<any[]>() || []);
    }
  }, [roads]);

  React.useEffect(() => {
    if (activities) {
      setCachedActivities(activities);
      writeCachedActivities(selectedRoadId, activities);
      markFieldCacheUpdated(`activities:${selectedRoadId}`);
    } else {
      setCachedActivities(readCachedActivities<any[]>(selectedRoadId) || []);
    }
  }, [activities, selectedRoadId]);

  const selectedRoad = availableRoads.find((r) => r.id === selectedRoadId) || availableRoads[0];

  const mobileRoadSubtotals = Array.from(new Set(todayArchive.map((item) => item.payload.roadId))).map((roadId) => {
    const entries = todayArchive.filter((item) => item.payload.roadId === roadId);
    const actualByUnit = entries.reduce<Record<string, number>>((totals, item) => {
      const unit = item.payload.unit || "Unit";
      totals[unit] = (totals[unit] || 0) + Number(item.payload.actualQuantity || 0);
      return totals;
    }, {});
    return {
      roadId,
      roadName: entries[0]?.roadName || `Road #${roadId}`,
      entries,
      actualByUnit,
      averageProgress: entries.reduce((sum, item) => sum + Number(item.payload.percentageComplete || 0), 0) / entries.length,
    };
  });

  const createDpr = trpc.dailyProgress.create.useMutation({
    onSuccess: () => {
      setQuickDprSuccess(true);
      setTodayArchive(loadTodayDprArchive());
      refetchActs();
      setTimeout(() => setQuickDprSuccess(false), 3000);
    },
  });

  const createHindrance = trpc.hindrances.create.useMutation({
    onSuccess: () => {
      setHndSuccess(true);
      refetchHnds();
      setHndDesc("");
      setTimeout(() => setHndSuccess(false), 3000);
    },
  });

  const uploadDprPhoto = trpc.dailyProgress.uploadPhoto.useMutation();

  const handleQuickDprSubmit = async () => {
    const actSelect = document.getElementById("mobileActSelect") as HTMLSelectElement;
    const actId = actSelect?.value ? parseInt(actSelect.value) : (availableActivities[0]?.activity?.id || 1);
    const selectedAct = availableActivities.find(a => a.activity.id === actId)?.activity;
    const payload = {
      clientDraftId: `m_dpr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString().split("T")[0],
      projectId: 1,
      roadId: selectedRoadId,
      activityId: actId,
      sectionType: "Highway Works" as const,
      plannedQuantity: "300.00",
      actualQuantity: quickQty || "250.00",
      unit: "Cum",
      percentageComplete: quickPct || "70.00",
      manpower: quickManpower,
      machinery: "Site Plant Deployed",
      weather: "Clear / Sunny",
      remarks: "Submitted via Mobile Field Companion",
    };

    try {
      if (!isOnline) {
        enqueueOfflineDprDraft({
          roadName: selectedRoad?.roadName,
          activityName: selectedAct?.activityName,
          payload,
          photoAttachments: quickPhoto ? [quickPhoto] : [],
        });
        setOfflineCount(loadOfflineDprDrafts().length);
        setTodayArchive(loadTodayDprArchive());
        setQuickDprSuccess(true);
        setQuickPhoto(undefined);
        toast.success("Saved to offline drafts queue", { description: "DPR and site photo will sync automatically when back online." });
        setTimeout(() => setQuickDprSuccess(false), 3000);
        return;
      }

      await createDpr.mutateAsync(payload);
      if (quickPhoto) {
        await uploadDprPhoto.mutateAsync({
          clientDraftId: payload.clientDraftId,
          fileName: quickPhoto.fileName,
          fileBase64: quickPhoto.fileBase64,
          sectionType: payload.sectionType,
          caption: quickPhoto.caption,
          chainage: quickPhoto.chainage,
        });
      }
      setQuickPhoto(undefined);
      toast.success("DPR and site photo submitted");
    } catch (err) {
      enqueueOfflineDprDraft({
        roadName: selectedRoad?.roadName,
        activityName: selectedAct?.activityName,
        payload,
        photoAttachments: quickPhoto ? [quickPhoto] : [],
      });
      setOfflineCount(loadOfflineDprDrafts().length);
      setTodayArchive(loadTodayDprArchive());
      toast.warning("Network issue: DPR and photo saved offline", { description: err instanceof Error ? err.message : "Will retry automatically." });
    }
  };

  const content = (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans select-none">
      {/* Mobile Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
            RD
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-white block">RDx Field Companion</span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className={`font-semibold flex items-center gap-1 ${isOnline ? "text-emerald-400" : "text-amber-400"}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3 animate-pulse" />}
                {isOnline ? "Online Sync Active" : "Offline Mode (Site Storage)"}
              </span>
              {offlineCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[9px]">
                  {offlineCount} queued
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300">
            {selectedRoad?.roadId || "RD-01"}
          </span>
        </div>
      </div>

      {/* 14 Roads Quick Selector Carousel */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>Active Road Stretch (14 Roads)</span>
          <span className="text-amber-400 font-mono">{selectedRoad?.progress}% Complete</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {availableRoads.map((r) => {
            const isSelected = r.id === selectedRoadId;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRoadId(r.id)}
                className={`px-3 py-2 rounded-lg shrink-0 text-left transition flex flex-col border ${
                  isSelected
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono">{r.roadId}</span>
                  <span className="text-[10px] opacity-80">{r.progress}%</span>
                </div>
                <span className="text-[11px] truncate max-w-[110px] mt-0.5 opacity-90">{r.roadName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Road Status Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-white block text-sm">{selectedRoad?.roadName}</span>
          <span className="text-slate-400 text-[11px]">
            {selectedRoad?.roadLengthKm} Km • Chainage: {selectedRoad?.startRd} to {selectedRoad?.endRd}
          </span>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-amber-400 font-mono">{selectedRoad?.progress}%</span>
          <span className="block text-[10px] text-slate-400">Physical Done</span>
        </div>
      </div>

      {todayArchive.length > 0 && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-black text-amber-400">Today&apos;s DPR Preview</span>
            <span className="text-[10px] text-emerald-400 font-bold">{todayArchive.length} entries saved</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800 rounded-lg p-2">
              <span className="block text-sm font-black text-white">{new Set(todayArchive.map((item) => item.payload.roadId)).size}</span>
              <span className="text-[9px] text-slate-400">Roads</span>
            </div>
            <div className="bg-slate-800 rounded-lg p-2">
              <span className="block text-sm font-black text-amber-400">{todayArchive.reduce((sum, item) => sum + Number(item.payload.actualQuantity || 0), 0).toFixed(0)}</span>
              <span className="text-[9px] text-slate-400">Qty done</span>
            </div>
            <div className="bg-slate-800 rounded-lg p-2">
              <span className="block text-sm font-black text-emerald-400">{(todayArchive.reduce((sum, item) => sum + Number(item.payload.percentageComplete || 0), 0) / todayArchive.length).toFixed(0)}%</span>
              <span className="text-[9px] text-slate-400">Avg progress</span>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-black text-slate-400">Road-wise subtotals</span>
              <span className="text-[9px] text-slate-500">Actual • avg progress</span>
            </div>
            {mobileRoadSubtotals.map((road) => (
              <div key={road.roadId} className="flex items-center justify-between gap-2 bg-slate-800 rounded-lg px-2.5 py-2 text-[10px]">
                <div className="min-w-0">
                  <span className="font-bold text-white block truncate">{road.roadName}</span>
                  <span className="text-slate-500">{road.entries.length} DPR {road.entries.length === 1 ? "entry" : "entries"}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {Object.entries(road.actualByUnit).map(([unit, quantity]) => (
                    <span key={unit} className="text-emerald-300 font-bold">{quantity.toFixed(1)} {unit}</span>
                  ))}
                  <span className="text-amber-400 font-black">{road.averageProgress.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Local preview remains available after sync for end-of-day field review.</p>
        </div>
      )}

      {/* Navigation Pills */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-slate-900 border-b border-slate-800 text-xs text-center font-bold">
        <button
          onClick={() => setActiveTab("roads")}
          className={`py-2 rounded-lg transition ${
            activeTab === "roads" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          Activities
        </button>
        <button
          onClick={() => setActiveTab("dpr")}
          className={`py-2 rounded-lg transition ${
            activeTab === "dpr" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          Quick DPR
        </button>
        <button
          onClick={() => setActiveTab("hindrance")}
          className={`py-2 rounded-lg transition ${
            activeTab === "hindrance" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          Report Hindrance
        </button>
      </div>

      {/* Tab 1: Activities for Selected Road */}
      {activeTab === "roads" && (
        <div className="p-3 space-y-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Activities on {selectedRoad?.roadId}</span>
            <span>{availableActivities.length || 0} tasks</span>
          </div>

          <div className="space-y-2.5">
            {availableActivities.length > 0 ? (
              availableActivities.map(({ activity: a }) => {
                const pct = parseFloat(String(a.percentageComplete || 0));
                return (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {a.phase}
                        </span>
                        <h4 className="font-bold text-xs text-white mt-1">{a.activityName}</h4>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-400 shrink-0">
                        {a.percentageComplete}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 100 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-blue-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Status: <strong className="text-slate-200">{a.status}</strong></span>
                      <span>Target: {a.endDate}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-900 rounded-xl">
                No activities logged on this stretch. Use desktop suite to scaffold initial tasks.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Quick DPR Entry */}
      {activeTab === "dpr" && (
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white">Rapid Site DPR Submission</h3>
            <p className="text-xs text-slate-400">One-tap entry for active highway crew</p>
          </div>

          {quickDprSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>DPR Submitted! Activity progress updated automatically.</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Select Activity</label>
              <select
                id="mobileActSelect"
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
              >
                {availableActivities.map(({ activity: a }) => (
                  <option key={a.id} value={a.id}>
                    {a.taskId} - {a.activityName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Executed Qty (Cum/MT)</label>
                <input
                  type="number"
                  value={quickQty}
                  onChange={(e) => setQuickQty(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Total % Complete</label>
                <input
                  type="number"
                  value={quickPct}
                  onChange={(e) => setQuickPct(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-amber-400 font-mono font-black text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Crew & Labors on Site</label>
              <input
                type="text"
                value={quickManpower}
                onChange={(e) => setQuickManpower(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Weather & Site Condition</label>
              <div className="grid grid-cols-2 gap-2">
                <span className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-center text-slate-300 font-medium">
                  ☀️ Sunny / Dry
                </span>
                <span className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-center text-slate-300 font-medium">
                  🚜 Rollers Deployed
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-amber-300 font-bold flex items-center gap-1.5"><Camera className="w-4 h-4" /> Site Photo — Any Work</label>
                  <p className="text-[10px] text-slate-400 mt-0.5">Highway, concrete, material or machine work की फोटो</p>
                </div>
                {quickPhoto && <span className="text-[10px] text-emerald-300 font-bold">1 attached</span>}
              </div>
              <input
                type="text"
                value={quickPhotoCaption}
                onChange={(e) => setQuickPhotoCaption(e.target.value)}
                placeholder="Caption e.g. WMM compaction at Ch 2+500"
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="mobile-dpr-photo"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const fileBase64 = await readMobilePhoto(file);
                    setQuickPhoto({ fileName: file.name, fileBase64, caption: quickPhotoCaption || "Mobile DPR site photo", chainage: "" });
                    toast.success("Photo attached to Quick DPR");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not attach photo");
                  }
                  e.currentTarget.value = "";
                }}
              />
              <div className="flex items-center gap-2">
                <label htmlFor="mobile-dpr-photo" className="flex-1 py-2 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                  <Camera className="w-4 h-4" /> Take / Add Photo
                </label>
                {quickPhoto && (
                  <button type="button" onClick={() => setQuickPhoto(undefined)} className="px-3 py-2 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold">Remove</button>
                )}
              </div>
              {quickPhoto && <img src={quickPhoto.fileBase64} alt="Quick DPR site evidence" className="w-full h-32 object-cover rounded-lg border border-slate-700" />}
            </div>

            <button
              onClick={handleQuickDprSubmit}
              disabled={createDpr.isPending || uploadDprPhoto.isPending}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 mt-4"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Submit Daily Progress</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Report Hindrance */}
      {activeTab === "hindrance" && (
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white">Log Site Obstruction / Hindrance</h3>
            <p className="text-xs text-slate-400">Instantly alerts Project Manager and PWD</p>
          </div>

          {hndSuccess && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Hindrance Logged! Days counter active and alert broadcasted.</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-medium mb-1">RD Location</label>
                <input
                  type="text"
                  value={hndRd}
                  onChange={(e) => setHndRd(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Category</label>
                <select
                  value={hndCat}
                  onChange={(e) => setHndCat(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold"
                >
                  <option value="Electric Pole">Electric Pole</option>
                  <option value="Land Issue">Land Issue</option>
                  <option value="Utility">Utility Pipeline</option>
                  <option value="Forest/Tree">Forest / Tree</option>
                  <option value="Local Obstruction">Local Obstruction</option>
                  <option value="Department Decision">Department Decision</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Description of Bottleneck</label>
              <textarea
                rows={3}
                value={hndDesc}
                onChange={(e) => setHndDesc(e.target.value)}
                placeholder="e.g. 4 electric poles in carriage alignment preventing subgrade rolling..."
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <button
              disabled={!hndDesc}
              onClick={() => {
                createHindrance.mutate({
                  projectId: 1,
                  roadId: selectedRoadId,
                  rdLocation: hndRd,
                  category: hndCat,
                  description: hndDesc,
                  dateRaised: new Date().toISOString().split("T")[0],
                  affectedActivity: "Subgrade Laying",
                  responsiblePersonDepartment: "DISCOM / CALA",
                  status: "Open",
                });
              }}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Broadcast Hindrance Alert</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 flex items-center justify-between text-xs text-slate-400">
        <span>Site App • 14 Roads Suite</span>
        <span className="font-bold text-slate-300">RDx Project Control</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top Toggle for Presentation: Phone Frame vs Full View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-500" />
            <span>Dedicated Mobile Field Companion View</span>
          </h2>
          <p className="text-xs text-slate-500">
            Tailored specifically for site engineers, road foremen and QC inspectors with large touch controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeviceFrame(!deviceFrame)}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
          >
            {deviceFrame ? "Expand to Full Page" : "View in Phone Frame"}
          </button>
        </div>
      </div>

      {deviceFrame ? (
        <div className="flex justify-center py-4 bg-slate-100 rounded-2xl p-4 border border-slate-300 shadow-inner">
          <div className="w-[375px] h-[780px] bg-slate-950 rounded-[44px] shadow-2xl border-[10px] border-slate-800 overflow-hidden flex flex-col relative">
            {/* Phone Speaker Notch */}
            <div className="w-28 h-4 bg-slate-800 mx-auto rounded-b-xl z-40 shrink-0" />
            <div className="flex-1 overflow-y-auto">
              {content}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden shadow-lg border border-slate-800">
          {content}
        </div>
      )}
    </div>
  );
}
