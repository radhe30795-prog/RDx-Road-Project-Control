import React, { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { useActiveProject } from "../components/ProjectContext";
import { Target, CalendarClock, Gauge, Info } from "lucide-react";

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

function monthDiff(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_MONTH;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Math.round(months));
  return d;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function defaultMonth(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ProjectionPage() {
  const { projectId: activeProjectId, activeProject } = useActiveProject();
  const { data: roads } = trpc.roads.list.useQuery({ projectId: activeProjectId });

  const [selectedRoadId, setSelectedRoadId] = useState<string>("all");
  const [forecastMonth, setForecastMonth] = useState<string>(() => defaultMonth(3));
  const [targetPct, setTargetPct] = useState<string>("80");
  const [targetMonth, setTargetMonth] = useState<string>(() => defaultMonth(3));

  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const s = activeProject?.agreementStartDate || "2026-03-30";
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date("2026-03-30") : d;
  }, [activeProject]);

  const elapsedMonths = useMemo(
    () => Math.max(0.1, monthDiff(startDate, today)),
    [startDate, today]
  );

  const currentProgress = useMemo(() => {
    if (!roads || roads.length === 0) return 0;
    if (selectedRoadId === "all") {
      const sum = roads.reduce((a, r) => a + parseFloat(String((r as any).progress || 0)), 0);
      return sum / roads.length;
    }
    const r = roads.find((x: any) => String(x.id) === selectedRoadId);
    return parseFloat(String((r as any)?.progress || 0));
  }, [roads, selectedRoadId]);

  const currentRate = useMemo(
    () => (elapsedMonths > 0 ? currentProgress / elapsedMonths : 0),
    [currentProgress, elapsedMonths]
  );

  // ---- Forecast mode ----
  const forecast = useMemo(() => {
    const fDate = new Date(forecastMonth + "-01");
    if (isNaN(fDate.getTime())) return null;
    const monthsAhead = monthDiff(today, fDate);
    const projected = Math.min(100, Math.max(0, currentProgress + currentRate * monthsAhead));
    return { fDate, monthsAhead, projected };
  }, [forecastMonth, today, currentProgress, currentRate]);

  const dateOf100 = useMemo(() => {
    if (currentRate <= 0 || currentProgress >= 100) return null;
    return addMonths(today, (100 - currentProgress) / currentRate);
  }, [today, currentProgress, currentRate]);

  // ---- Target mode ----
  const target = useMemo(() => {
    const tPct = parseFloat(targetPct);
    const tDate = new Date(targetMonth + "-01");
    if (isNaN(tPct) || isNaN(tDate.getTime())) return null;
    const monthsAhead = monthDiff(today, tDate);
    if (monthsAhead <= 0)
      return { tPct, tDate, monthsAhead, requiredRate: 0, gap: 0, verdict: "", verdictGood: false, error: "Target month must be in the future" as string | null };
    const requiredRate = (tPct - currentProgress) / monthsAhead;
    const gap = requiredRate - currentRate;
    let verdict: string;
    let verdictGood: boolean;
    if (tPct <= currentProgress) {
      verdict = "Target already achieved hai! 🎉";
      verdictGood = true;
    } else if (requiredRate <= 0) {
      verdict = "Target current progress se kam hai — kuch karne ki zaroorat nahi.";
      verdictGood = true;
    } else if (requiredRate <= currentRate) {
      verdict = `On track ✓ — target will be met at the current rate (${currentRate.toFixed(2)}%/month).`;
      verdictGood = true;
    } else if (currentRate <= 0) {
      verdict = `No progress yet — work needs to start. Target requires ${requiredRate.toFixed(2)}%/month.`;
      verdictGood = false;
    } else {
      const mult = requiredRate / currentRate;
      verdict = `Need ${gap.toFixed(2)}%/month faster — ${mult.toFixed(1)}x current speed. Means more manpower/machinery or overtime.`;
      verdictGood = false;
    }
    return { tPct, tDate, monthsAhead, requiredRate, gap, verdict, verdictGood, error: null as string | null };
  }, [targetPct, targetMonth, today, currentProgress, currentRate]);

  const selectedLabel =
    selectedRoadId === "all"
      ? "Saari Roads (average)"
      : (() => {
          const r: any = roads?.find((x: any) => String(x.id) === selectedRoadId);
          return r ? `${r.roadId} • ${r.roadName}` : "";
        })();

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-600" />
              Progress Projection
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Forecast at current speed • Required speed for target
            </p>
          </div>
          <select
            value={selectedRoadId}
            onChange={(e) => setSelectedRoadId(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 min-w-[220px]"
          >
            <option value="all">All Roads (project average)</option>
            {(roads || []).map((r: any) => (
              <option key={r.id} value={String(r.id)}>
                {r.roadId} • {r.roadName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Current Progress</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{currentProgress.toFixed(2)}%</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{selectedLabel}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Elapsed Time</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{elapsedMonths.toFixed(1)} <span className="text-sm font-semibold text-slate-500">mahine</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5">Start: {fmtDate(startDate)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5" /> Current Speed
          </p>
          <p className="text-2xl font-bold text-violet-700 mt-1">{currentRate.toFixed(2)}<span className="text-sm font-semibold text-slate-500">%/month</span></p>
          <p className="text-[10px] text-slate-400 mt-0.5">Abhi jis rate se kaam ho raha hai</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" /> 100% By
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {dateOf100 ? fmtDate(dateOf100) : currentProgress >= 100 ? "Ho gaya! 🎉" : "—"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Current speed par</p>
        </div>
      </div>

      {/* Forecast mode */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <h2 className="text-sm font-bold text-slate-800">🔮 Forecast — Progress by month</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">Mahina chuno:</label>
          <input
            type="month"
            value={forecastMonth}
            onChange={(e) => setForecastMonth(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50"
          />
          {forecast && (
            <span className="text-xs text-slate-500">
              ({forecast.monthsAhead.toFixed(1)} mahine baad)
            </span>
          )}
        </div>
        {forecast && (
          <>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-violet-700">{forecast.projected.toFixed(1)}%</p>
              <p className="text-xs text-slate-500 pb-1.5">
                {fmtDate(forecast.fDate)} tak projected progress
              </p>
            </div>
            {/* Visual bar */}
            <div className="relative h-6 bg-slate-100 rounded-full overflow-visible">
              <div
                className="absolute left-0 top-0 h-full bg-violet-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, currentProgress)}%` }}
              />
              <div
                className="absolute top-0 h-full bg-violet-300/60 rounded-full border-r-2 border-dashed border-violet-700"
                style={{ left: `${Math.min(100, currentProgress)}%`, width: `${Math.max(0, Math.min(100, forecast.projected) - Math.min(100, currentProgress))}%` }}
              />
              <span
                className="absolute -top-5 -translate-x-1/2 text-[10px] font-bold text-slate-600 whitespace-nowrap"
                style={{ left: `${Math.min(100, currentProgress)}%` }}
              >
                Abhi {currentProgress.toFixed(0)}%
              </span>
              <span
                className="absolute -bottom-5 -translate-x-1/2 text-[10px] font-bold text-violet-700 whitespace-nowrap"
                style={{ left: `${Math.min(100, forecast.projected)}%` }}
              >
                ▲ {forecast.projected.toFixed(0)}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 pt-3">
              Gehara hissa = abhi ka progress • Halka hissa = projected growth
            </p>
          </>
        )}
      </div>

      {/* Target mode */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <h2 className="text-sm font-bold text-slate-800">🎯 Target — What will it take?</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Target %:</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={targetPct}
              onChange={(e) => setTargetPct(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-xs font-bold w-20 bg-slate-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">By when:</label>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50"
            />
          </div>
        </div>
        {target && !target.error && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Chahiye Speed</p>
              <p className="text-xl font-bold text-slate-900">{target.requiredRate.toFixed(2)}<span className="text-xs font-semibold text-slate-500">%/month</span></p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Gap vs Abhi</p>
              <p className={`text-xl font-bold ${target.gap > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {target.gap > 0 ? `+${target.gap.toFixed(2)}` : target.gap.toFixed(2)}
                <span className="text-xs font-semibold text-slate-500">%/month</span>
              </p>
            </div>
            <div className={`rounded-lg p-3 border col-span-2 md:col-span-1 ${target.verdictGood ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Verdict</p>
              <p className="text-xs font-semibold text-slate-800 mt-1">{target.verdict}</p>
            </div>
          </div>
        )}
        {target?.error && (
          <p className="text-xs font-semibold text-red-600">{target.error}</p>
        )}
      </div>

      {/* Assumption note */}
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500">
          <strong>Assumption:</strong> Projection linear hai — maana gaya ki kaam same speed se chalta rahega.
          Monsoon, material shortage, ya manpower badalne par actual alag ho sakta hai. Ye planning ke liye rough estimate hai, guarantee nahi.
        </p>
      </div>
    </div>
  );
}
