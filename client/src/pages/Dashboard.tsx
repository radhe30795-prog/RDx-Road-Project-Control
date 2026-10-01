import React, { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import { Link } from "wouter";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Compass,
  ListTodo,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Microscope,
  Boxes,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowUpRight,
  HardHat,
  ChevronRight,
  FileText,
  Layers,
  Sparkles,
  ExternalLink,
  CalendarRange,
  ZoomIn,
  ZoomOut,
  Target,
  Route as RouteIcon,
  Search,
} from "lucide-react";
import { useRole } from "../components/AppLayout";

const DAY_MS = 24 * 60 * 60 * 1000;

function safeDate(value: unknown, fallback: Date): Date {
  const parsed = value ? new Date(String(value)) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function progressColor(status: string, priority: string) {
  if (status === "Complete") return "bg-emerald-500";
  if (status === "Overdue") return "bg-rose-500";
  if (priority === "Critical") return "bg-orange-500";
  if (priority === "High") return "bg-amber-500";
  return "bg-blue-500";
}

export default function Dashboard() {
  const { role, roleLabel } = useRole();
  const { data: stats, isLoading, refetch } = trpc.dashboard.getStats.useQuery();
  const { data: projectList } = trpc.projects.list.useQuery();
  const project = projectList?.[0];
  const { data: activityRows, isLoading: activitiesLoading } = trpc.activities.list.useQuery();
  const [ganttRoadFilter, setGanttRoadFilter] = useState("all");
  const [ganttPhaseFilter, setGanttPhaseFilter] = useState("all");
  const [ganttZoom, setGanttZoom] = useState(1);
  const [roadSearch, setRoadSearch] = useState("");

  // 16 Mandatory KPIs requested in specification
  const kpis = [
    { label: "Total Projects", value: stats?.totalProjects || 1, icon: Layers, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Roads", value: stats?.totalRoads || 14, icon: Compass, color: "text-indigo-600", bg: "bg-indigo-50", link: "/roads" },
    { label: "Overall Progress", value: `${stats?.overallPhysicalProgress || "0.00"}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", highlight: true },
    { label: "Total Activities", value: stats?.totalActivities || 0, icon: ListTodo, color: "text-slate-700", bg: "bg-slate-100", link: "/activities" },

    { label: "Completed Activities", value: stats?.completedActivities || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "In Progress Activities", value: stats?.inProgressActivities || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Not Started Activities", value: stats?.notStartedActivities || 0, icon: ListTodo, color: "text-slate-500", bg: "bg-slate-50" },
    { label: "Overdue Activities", value: stats?.overdueActivities || 0, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", isAlert: (stats?.overdueActivities || 0) > 0 },

    { label: "Open Hindrances", value: stats?.openHindrances || 0, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", link: "/hindrances" },
    { label: "Overdue Hindrances", value: stats?.overdueHindrances || 0, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50", isAlert: (stats?.overdueHindrances || 0) > 0, link: "/hindrances" },
    { label: "Pending Bills", value: stats?.pendingBills || 0, icon: Receipt, color: "text-slate-600", bg: "bg-slate-100", link: "/billing" },
    { label: "Submitted Bills", value: stats?.submittedBills || 0, icon: Receipt, color: "text-blue-600", bg: "bg-blue-50", link: "/billing" },

    { label: "Passed Bills", value: stats?.passedBills || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", link: "/billing" },
    { label: "Payment Pending", value: stats?.paymentPending || 0, icon: Receipt, color: "text-amber-600", bg: "bg-amber-50", link: "/billing" },
    { label: "QA/QC Failed Tests", value: stats?.qaQcFailedTests || 0, icon: Microscope, color: "text-rose-600", bg: "bg-rose-50", isAlert: (stats?.qaQcFailedTests || 0) > 0, link: "/qa-qc" },
    { label: "Material Balance Items", value: stats?.totalMaterialStockCount || 0, icon: Boxes, color: "text-purple-600", bg: "bg-purple-50", link: "/materials" },
  ];

  const ganttRoads = stats?.roadList || [];
  const ganttPhases = useMemo(
    () => Array.from(new Set((activityRows || []).map(({ activity }) => activity.phase))).sort(),
    [activityRows]
  );

  const filteredRoads = useMemo(() => {
    const q = roadSearch.trim().toLowerCase();
    if (!q) return stats?.roadList || [];
    return (stats?.roadList || []).filter(
      (r) =>
        String(r.roadName || "").toLowerCase().includes(q) ||
        String(r.roadId || "").toLowerCase().includes(q)
    );
  }, [stats?.roadList, roadSearch]);

  const projectStart = safeDate(
    project?.agreementStartDate,
    new Date(Math.min(...(activityRows || []).map(({ activity }) => safeDate(activity.startDate, new Date()).getTime())))
  );
  const projectEnd = safeDate(
    project?.agreementEndDate,
    new Date(Math.max(...(activityRows || []).map(({ activity }) => safeDate(activity.endDate, new Date()).getTime())))
  );
  const timelineStart = projectStart.getTime() < projectEnd.getTime() ? projectStart : new Date(projectStart.getTime() - DAY_MS);
  const timelineEnd = projectEnd.getTime() > timelineStart.getTime() ? projectEnd : new Date(timelineStart.getTime() + 365 * DAY_MS);
  const timelineDays = Math.max(1, Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / DAY_MS));
  const today = new Date();

  const filteredGanttActivities = useMemo(() => {
    return (activityRows || [])
      .filter(({ activity }) => ganttRoadFilter === "all" || String(activity.roadId) === ganttRoadFilter)
      .filter(({ activity }) => ganttPhaseFilter === "all" || activity.phase === ganttPhaseFilter)
      .map(({ activity, road }) => {
        const start = safeDate(activity.startDate, timelineStart);
        const end = safeDate(activity.endDate, new Date(start.getTime() + DAY_MS));
        const left = clamp(((start.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100);
        const width = clamp(((Math.max(end.getTime(), start.getTime() + DAY_MS) - start.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100, 1, 100 - left);
        return {
          id: activity.id,
          name: activity.activityName,
          phase: activity.phase,
          status: activity.status,
          priority: activity.priority,
          progress: clamp(parseFloat(String(activity.percentageComplete || 0))),
          start,
          end,
          left,
          width,
          roadId: activity.roadId,
          roadName: road?.roadName || `Road #${activity.roadId}`,
        };
      });
  }, [activityRows, ganttRoadFilter, ganttPhaseFilter, timelineStart, timelineEnd]);

  const overallActual = useMemo(() => {
    const values = (activityRows || []).map(({ activity }) => parseFloat(String(activity.percentageComplete || 0)));
    if (!values.length) return parseFloat(String(stats?.overallPhysicalProgress || 0));
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [activityRows, stats?.overallPhysicalProgress]);

  const sCurveData = useMemo(() => {
    const points = 12;
    const duration = Math.max(DAY_MS, timelineEnd.getTime() - timelineStart.getTime());
    const todayProgress = clamp(((today.getTime() - timelineStart.getTime()) / duration) * 100);
    const plannedToday = clamp(todayProgress);
    return Array.from({ length: points }, (_, index) => {
      const date = new Date(timelineStart.getTime() + (duration * index) / (points - 1));
      const planned = clamp(((date.getTime() - timelineStart.getTime()) / duration) * 100);
      const actual = date.getTime() <= today.getTime()
        ? clamp(overallActual * (today.getTime() <= timelineStart.getTime() ? 1 : clamp((date.getTime() - timelineStart.getTime()) / Math.max(1, today.getTime() - timelineStart.getTime()), 0, 1)))
        : clamp(overallActual);
      return {
        label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        planned: Number(planned.toFixed(1)),
        actual: Number(actual.toFixed(1)),
      };
    });
  }, [timelineStart, timelineEnd, overallActual]);

  const plannedToday = clamp(((today.getTime() - timelineStart.getTime()) / Math.max(1, timelineEnd.getTime() - timelineStart.getTime())) * 100);
  const scheduleVariance = overallActual - plannedToday;

  // Keep this conditional after every hook so Dashboard never changes its hook order
  // between the loading render and the loaded render (React error #310).
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Construction Control Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Project hero */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/10 ring-1 ring-slate-800">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-300 ring-1 ring-inset ring-indigo-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Project Control Active
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {project?.projectId || "PRJ-NH-2026-01"}
                </span>
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
                {project?.projectName || "SH-42 & MDR Package 04 Road Improvement Project"}
              </h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300 max-w-3xl">
                Client: <strong className="font-semibold text-white">{project?.clientDepartment || "PWD Highway Authority"}</strong>
                <span className="mx-2 text-slate-600">|</span>
                Contractor: <strong className="font-semibold text-white">{project?.contractor || "RDx Infra Developers Pvt Ltd"}</strong>
                <span className="mx-2 text-slate-600">|</span>
                Scope: 14 Connecting Roads (Total ~190 Km)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/mobile-field"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                <HardHat className="h-4 w-4" />
                <span>Site Field View</span>
              </Link>
              <Link
                href="/daily-progress"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Log Daily Progress</span>
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/10 pt-5 lg:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Agreement Start</p>
              <p className="mt-1 text-sm font-semibold text-white tabular-nums">{project?.agreementStartDate || "2025-10-15"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Scheduled Completion</p>
              <p className="mt-1 text-sm font-semibold text-white tabular-nums">{project?.agreementEndDate || "2027-04-14"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Active Roads Monitored</p>
              <p className="mt-1 text-sm font-semibold text-white">14 Roads (All Active)</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Physical Progress</p>
              <p className="mt-1 text-sm font-extrabold text-amber-300 tabular-nums">{stats?.overallPhysicalProgress || "0.00"}% Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* 16 KPI cards */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">Live synced with site entries</p>
            <h2 className="mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
              Project Control KPI Scorecard{" "}
              <span className="text-sm font-semibold text-slate-400">(16 Core Trackers)</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            const card = (
              <div
                className={`group relative flex h-full flex-col justify-between rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_rgba(15,23,42,0.18)] ${
                  kpi.isAlert
                    ? "border-rose-200 bg-rose-50/50"
                    : kpi.highlight
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold leading-snug text-slate-500">{kpi.label}</span>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${kpi.bg} ${kpi.color} ring-1 ring-inset ring-black/5`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <span className={`text-2xl sm:text-[28px] font-extrabold tabular-nums tracking-tight leading-none ${kpi.isAlert ? "text-rose-700" : kpi.color}`}>
                    {kpi.value}
                  </span>
                  {kpi.link && (
                    <span className="mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-hover:bg-indigo-600 group-hover:text-white">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>
            );

            return kpi.link ? (
              <Link key={idx} href={kpi.link} className="block">
                {card}
              </Link>
            ) : (
              <div key={idx}>{card}</div>
            );
          })}
        </div>
      </section>

      {/* 14 roads breakdown */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">Network overview</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
              <Compass className="h-5 w-5 text-indigo-600" />
              14 Roads Progress Breakdown
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Live status, chainage (RD) lengths, and activity completion for each of the 14 project roads.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={roadSearch}
                onChange={(event) => setRoadSearch(event.target.value)}
                placeholder="Search road name or ID…"
                aria-label="Search roads"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 sm:w-56"
              />
            </div>
            <Link
              href="/roads"
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
            >
              <span>View All Road Details</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Showing {filteredRoads.length} of {(stats?.roadList || []).length} roads
        </p>

        {filteredRoads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-center text-sm text-slate-500">
            No roads match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredRoads.map((r) => {
              const p = parseFloat(String(r.progress || 0));
              return (
                <div
                  key={r.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_-12px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-block rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-white">
                        {r.roadId}
                      </span>
                      <h3 className="mt-1.5 truncate text-sm font-bold text-slate-900" title={r.roadName}>
                        {r.roadName}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-sm font-extrabold tabular-nums text-slate-800">
                      {r.progress}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Length: <strong className="font-semibold text-slate-700 tabular-nums">{r.roadLengthKm} Km</strong></span>
                    <span className="font-mono">RD: <strong className="font-semibold text-slate-700">{r.startRd} to {r.endRd}</strong></span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                        p >= 75 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : p >= 40 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-indigo-600 to-indigo-400"
                      }`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Gantt + S-Curve */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">Schedule control</p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
                <CalendarRange className="h-5 w-5 text-indigo-600" />
                Interactive Road-wise Gantt Timeline
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Planned activity windows against current field completion. Click filters to isolate a road or construction phase.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={ganttRoadFilter}
                onChange={(event) => setGanttRoadFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                aria-label="Filter Gantt by road"
              >
                <option value="all">All Roads ({ganttRoads.length})</option>
                {ganttRoads.map((road) => (
                  <option key={road.id} value={road.id}>{road.roadId} · {road.roadName}</option>
                ))}
              </select>
              <select
                value={ganttPhaseFilter}
                onChange={(event) => setGanttPhaseFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                aria-label="Filter Gantt by phase"
              >
                <option value="all">All Phases</option>
                {ganttPhases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
              </select>
              <div className="flex overflow-hidden rounded-xl border border-slate-200">
                <button
                  onClick={() => setGanttZoom((value) => Math.max(0.75, Number((value - 0.25).toFixed(2))))}
                  className="p-2 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Zoom out Gantt"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setGanttZoom((value) => Math.min(2, Number((value + 0.25).toFixed(2))))}
                  className="border-l border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Zoom in Gantt"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Planned / active</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Complete</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Overdue</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Today marker</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <div style={{ minWidth: `${720 * ganttZoom}px` }}>
              <div className="grid grid-cols-[210px_1fr] border-b border-slate-200 bg-slate-50/80">
                <div className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Road / Activity</div>
                <div className="relative h-10 border-l border-slate-200">
                  {[0, 25, 50, 75, 100].map((point) => {
                    const markerDate = new Date(timelineStart.getTime() + ((timelineEnd.getTime() - timelineStart.getTime()) * point) / 100);
                    return (
                      <div key={point} className="absolute top-0 bottom-0" style={{ left: `${point}%` }}>
                        <div className="h-full border-l border-dashed border-slate-200" />
                        <span className="absolute top-1.5 left-1 whitespace-nowrap font-mono text-[9px] text-slate-400">
                          {markerDate.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                  <div
                    className="absolute top-0 bottom-0 z-10 border-l-2 border-dashed border-slate-400"
                    style={{ left: `${clamp(((today.getTime() - timelineStart.getTime()) / Math.max(1, timelineEnd.getTime() - timelineStart.getTime())) * 100)}%` }}
                    title={`Today: ${today.toLocaleDateString("en-IN")}`}
                  />
                </div>
              </div>

              <div className="max-h-[430px] overflow-y-auto bg-white">
                {activitiesLoading ? (
                  <div className="py-10 text-center text-xs text-slate-400">Loading activity timeline...</div>
                ) : filteredGanttActivities.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">No activities match the selected filters.</div>
                ) : (
                  filteredGanttActivities.map((item) => (
                    <div key={item.id} className="grid min-h-[52px] grid-cols-[210px_1fr] border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/60">
                      <div className="min-w-0 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">RD {item.roadId}</span>
                          <span className="truncate text-[9px] font-medium text-slate-400">{item.phase}</span>
                        </div>
                        <p className="mt-1 truncate text-[11px] font-semibold text-slate-700" title={item.name}>{item.name}</p>
                      </div>
                      <div className="relative border-l border-slate-100 bg-[linear-gradient(to_right,transparent_24.8%,#f1f5f9_25%,transparent_25.2%,transparent_49.8%,#f1f5f9_50%,transparent_50.2%,transparent_74.8%,#f1f5f9_75%,transparent_75.2%)]">
                        <div className="absolute inset-y-0 z-10 border-l-2 border-dashed border-slate-300/70" style={{ left: `${clamp(((today.getTime() - timelineStart.getTime()) / Math.max(1, timelineEnd.getTime() - timelineStart.getTime())) * 100)}%` }} />
                        <div
                          className={`absolute top-3 h-7 rounded-lg shadow-sm ring-1 ring-inset ring-black/10 ${progressColor(item.status, item.priority)}`}
                          style={{ left: `${item.left}%`, width: `${item.width}%` }}
                          title={`${item.name}: ${item.progress}% complete | ${item.start.toLocaleDateString("en-IN")} – ${item.end.toLocaleDateString("en-IN")}`}
                        >
                          <div className="h-full rounded-lg bg-white/25" style={{ width: `${item.progress}%` }} />
                          <span className="absolute inset-0 flex items-center truncate px-2 text-[9px] font-bold text-white">
                            {item.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[10px] font-medium text-slate-400">
            <span className="tabular-nums">{filteredGanttActivities.length} activities shown</span>
            <span>Timeline: {timelineStart.toLocaleDateString("en-IN")} – {timelineEnd.toLocaleDateString("en-IN")}</span>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">Performance</p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
                <Target className="h-5 w-5 text-emerald-600" />
                Planned vs Actual S-Curve
              </h2>
              <p className="mt-1 text-xs text-slate-500">Cumulative schedule baseline compared with live field progress.</p>
            </div>
            <span className={`whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold tabular-nums ring-1 ring-inset ${scheduleVariance >= 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-rose-50 text-rose-700 ring-rose-600/20"}`}>
              {scheduleVariance >= 0 ? "+" : ""}{scheduleVariance.toFixed(1)}% vs plan
            </span>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-blue-700">Planned Today</span>
              <strong className="mt-0.5 block text-xl font-extrabold tabular-nums text-blue-900">{plannedToday.toFixed(1)}%</strong>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Actual Today</span>
              <strong className="mt-0.5 block text-xl font-extrabold tabular-nums text-emerald-900">{overallActual.toFixed(1)}%</strong>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Roads Tracked</span>
              <strong className="mt-0.5 block text-xl font-extrabold tabular-nums text-slate-900">{ganttRoads.length}</strong>
            </div>
          </div>

          <div className="h-[260px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sCurveData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: number) => [`${value}%`]} labelStyle={{ color: "#0f172a", fontSize: 11 }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="planned" name="Planned baseline" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="actual" name="Actual field progress" stroke="#059669" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex gap-2.5 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-[11px] leading-relaxed text-slate-600">
            <RouteIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            <span>{scheduleVariance >= 0 ? "Field progress is currently ahead of the schedule baseline. Keep the same execution rhythm and protect the float on critical activities." : "Field progress is trailing the schedule baseline. Review overdue activities, hindrances and resource deployment before the next site review."}</span>
          </div>
        </section>
      </div>

      {/* Phase progress + hindrance & billing feeds */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-black/5">
                <Layers className="h-4 w-4" />
              </span>
              Phase-wise Construction Progress
            </h2>
            <Link href="/activities" className="rounded-lg px-2 py-1 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50">
              Activities &gt;
            </Link>
          </div>

          <div className="space-y-4">
            {stats?.phaseProgress?.map((pp, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="font-semibold text-slate-700">{pp.phase}</span>
                  <span className="tabular-nums text-slate-500">
                    {pp.complete} / {pp.total} done ({pp.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-[width] duration-700 ease-out"
                    style={{ width: `${pp.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-black/5">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                Urgent Hindrance Bottlenecks
              </h2>
              <Link href="/hindrances" className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-50">
                Manage Hindrances &gt;
              </Link>
            </div>

            <div className="space-y-2.5">
              {stats?.recentHindrances && stats.recentHindrances.length > 0 ? (
                stats.recentHindrances.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-xs transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-800">{h.hindranceId}</span>
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                          {h.category}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">{h.rdLocation}</span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-slate-600">{h.description}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-block rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-extrabold tabular-nums text-rose-800 ring-1 ring-inset ring-rose-600/20">
                        {h.daysPending} Days Pending
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-400">Due: {h.dueDate || "N/A"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-6 text-center text-xs text-slate-500">No active hindrances reported.</div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-black/5">
                  <Receipt className="h-4 w-4" />
                </span>
                Recent RA Bills & Verification Pipeline
              </h2>
              <Link href="/billing" className="rounded-lg px-2 py-1 text-xs font-bold text-emerald-600 transition hover:bg-emerald-50">
                Billing & QS &gt;
              </Link>
            </div>

            <div className="space-y-2.5">
              {stats?.recentBills && stats.recentBills.length > 0 ? (
                stats.recentBills.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 p-3 text-xs transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-800">{b.billId}</span>
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 ring-1 ring-inset ring-blue-600/20">
                          {b.verificationStatus}
                        </span>
                      </div>
                      <span className="mt-1 block truncate text-[11px] text-slate-600">{b.billType}</span>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block font-extrabold tabular-nums text-slate-900">
                        ₹{(parseFloat(String(b.passedAmount || 0)) / 10000000).toFixed(2)} Cr
                      </span>
                      <span className={`text-[10px] font-bold ${b.paymentStatus === "Received" ? "text-emerald-600" : "text-amber-600"}`}>
                        Payment: {b.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-6 text-center text-xs text-slate-500">No bills generated yet.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
