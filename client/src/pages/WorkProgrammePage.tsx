import React, { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { useActiveProject } from "../components/ProjectContext";
import { CalendarClock, Download, Printer } from "lucide-react";
import { downloadWorkProgrammeExcel, buildMonths, WpPhase } from "../lib/workProgrammeExcel";

/** Phase order + display names for the PIU work programme */
const PHASE_ROWS: Array<{ phase: string; label: string }> = [
  { phase: "Pre-Construction", label: "Setting Out" },
  { phase: "Earthwork", label: "Earth Work/Subgrade" },
  { phase: "GSB", label: "GSB" },
  { phase: "WMM", label: "WMM" },
  { phase: "Bituminous Work", label: "BT" },
  { phase: "CC Pavement", label: "CC Pavement" },
  { phase: "Structures / CD Works", label: "CD WORK" },
  { phase: "Drain & Protection", label: "Drain & Protection" },
  { phase: "Shoulder", label: "Shoulder" },
  { phase: "Road Furniture", label: "Road Furnitures" },
  { phase: "Completion", label: "Completion" },
];

const parseD = (d: string) => new Date(d + "T00:00:00");

export default function WorkProgrammePage() {
  const { projectId: activeProjectId, activeProject } = useActiveProject();
  const [roadId, setRoadId] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { start: string; end: string }>>({});

  const { data: roads } = trpc.roads.list.useQuery({ projectId: activeProjectId });
  const { data: activities } = trpc.activities.list.useQuery(
    { projectId: activeProjectId as number },
    { enabled: !!activeProjectId }
  );

  const road = useMemo(
    () => (roads || []).find((r: any) => String(r.id) === roadId || r.roadId === roadId),
    [roads, roadId]
  );

  const roadActivities = useMemo(() => {
    if (!road || !activities) return [];
    const rid = (road as any).id;
    return (activities as any[]).filter((a: any) => {
      const act = a.activity || a;
      return act.roadId === rid;
    }).map((a: any) => a.activity || a);
  }, [road, activities]);

  const phases: WpPhase[] = useMemo(() => {
    const out: WpPhase[] = [];
    let sno = 1;
    for (const pr of PHASE_ROWS) {
      const acts = roadActivities.filter((a) => a.phase === pr.phase && a.startDate && a.endDate);
      if (acts.length === 0) continue;
      const starts = acts.map((a) => parseD(a.startDate).getTime());
      const ends = acts.map((a) => parseD(a.endDate).getTime());
      const minS = new Date(Math.min(...starts));
      const maxE = new Date(Math.max(...ends));
      const avg = acts.reduce((s, a) => s + parseFloat(String(a.percentageComplete || 0)), 0) / acts.length;
      const remark = avg >= 100 ? "COMPLETED" : avg > 0 ? "IN PROGRESS" : "";
      const ov = overrides[pr.phase];
      out.push({
        sno: sno++,
        name: pr.label,
        startDate: ov?.start || minS.toISOString().slice(0, 10),
        endDate: ov?.end || maxE.toISOString().slice(0, 10),
        avgPct: Math.round(avg),
        remark,
      });
    }
    return out;
  }, [roadActivities, overrides]);

  const setOverride = (phase: string, key: "start" | "end", val: string) => {
    const base = phases.find((p) => PHASE_ROWS.find((pr) => pr.label === p.name)?.phase === phase);
    setOverrides((o) => ({
      ...o,
      [phase]: {
        start: key === "start" ? val : o[phase]?.start || base?.startDate || "",
        end: key === "end" ? val : o[phase]?.end || base?.endDate || "",
      },
    }));
  };

  const months = useMemo(() => {
    if (!activeProject) return [];
    return buildMonths(
      (activeProject as any).agreementStartDate,
      (activeProject as any).agreementEndDate
    );
  }, [activeProject]);

  const fmtD = (iso: string) => {
    const d = parseD(iso);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const handleDownload = () => {
    if (!road || !activeProject) return;
    const r = road as any;
    const p = activeProject as any;
    downloadWorkProgrammeExcel(
      {
        roadName: r.roadName,
        roadId: r.roadId,
        lengthKm: String(r.roadLengthKm),
        agreementNo: p.projectId,
        stipulatedCompletion: fmtD(p.agreementEndDate),
        district: "Surguja",
        contractor: `M/s ${p.contractor}`,
      },
      phases,
      p.agreementStartDate,
      p.agreementEndDate
    );
  };

  const overlaps = (ps: string, pe: string, ms: Date, me: Date) => {
    const s = parseD(ps).getTime(), e = parseD(pe).getTime();
    return s <= me.getTime() && ms.getTime() <= e;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Work Programme
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            PIU format — per-road month-wise programme. Download Excel for submission.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={roadId}
            onChange={(e) => setRoadId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
          >
            <option value="">— Road select karein —</option>
            {(roads || []).map((r: any) => (
              <option key={r.id} value={String(r.id)}>
                {r.roadId} — {r.roadName}
              </option>
            ))}
          </select>
          <button
            onClick={() => setEditMode((v) => !v)}
            disabled={!road}
            className={`px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40 ${editMode ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
          >
            ✏️ {editMode ? "Done Editing" : "Edit Plan"}
          </button>
          {Object.keys(overrides).length > 0 && (
            <button
              onClick={() => setOverrides({})}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 underline"
              title="Wapas activity dates par lao"
            >
              Reset dates
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={!road || phases.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Excel Download
          </button>
          <button
            onClick={() => window.print()}
            disabled={!road}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 disabled:opacity-40"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {!road ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          Upar se road select karo — uska Work Programme yahan dikhega.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: "70vh" }}>
            <table className="w-full text-xs text-slate-700 border-collapse" style={{ minWidth: 1100 }}>
              <tbody>
                <tr>
                  <td colSpan={3 + months.length} className="text-center font-bold text-base py-3 border-b">
                    Work Programme
                  </td>
                </tr>
                {[
                  ["Name of Road", (road as any).roadName],
                  ["Total Length of the Road", `${(road as any).roadLengthKm} k.m.`],
                  ["Agreement No.", (activeProject as any)?.projectId],
                  ["Stipulated Date of Completion", fmtD((activeProject as any)?.agreementEndDate)],
                  ["Distt.", "Surguja"],
                  ["Name of Contractor", `M/s ${(activeProject as any)?.contractor}`],
                ].map(([l, v], i) => (
                  <tr key={i}>
                    <td className="py-1.5 px-4 font-bold w-56">{l}</td>
                    <td className="py-1.5 px-2 w-8">:-</td>
                    <td colSpan={1 + months.length} className="py-1.5 px-2">{v}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100">
                  <td className="py-2 px-4 font-bold border text-center">S.No.</td>
                  <td className="py-2 px-4 font-bold border text-center">Particular of Item</td>
                  <td colSpan={months.length} className="py-2 px-4 font-bold border text-center">
                    Progress of Work
                  </td>
                  <td className="py-2 px-4 font-bold border text-center">remark</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border" />
                  <td className="border" />
                  {months.map((m, i) => (
                    <td key={i} className="border px-1 py-1.5 text-center font-semibold text-[10px] leading-tight">
                      {m.label}
                    </td>
                  ))}
                  <td className="border" />
                </tr>
                {phases.map((p) => {
                  const phaseKey = PHASE_ROWS.find((pr) => pr.label === p.name)?.phase || "";
                  return (
                  <React.Fragment key={p.sno}>
                    <tr>
                      <td className="border text-center py-2 font-semibold">{p.sno}</td>
                      <td className="border px-3 py-2 font-semibold">
                        {p.name}
                        {editMode && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] font-normal">
                            <input
                              type="date"
                              value={p.startDate}
                              onChange={(e) => setOverride(phaseKey, "start", e.target.value)}
                              className="border border-amber-400 rounded px-1 py-0.5 text-[10px]"
                            />
                            <span>→</span>
                            <input
                              type="date"
                              value={p.endDate}
                              onChange={(e) => setOverride(phaseKey, "end", e.target.value)}
                              className="border border-amber-400 rounded px-1 py-0.5 text-[10px]"
                            />
                          </div>
                        )}
                      </td>
                      {months.map((m, i) => (
                        <td
                          key={i}
                          className={`border ${overlaps(p.startDate, p.endDate, m.start, m.end) ? "bg-yellow-300" : ""}`}
                        />
                      ))}
                      <td className="border px-3 py-2 font-semibold text-[11px]">{p.remark}</td>
                    </tr>
                    <tr><td colSpan={3 + months.length} className="py-1" /></tr>
                  </React.Fragment>
                  );
                })}
                <tr>
                  <td colSpan={3 + months.length} className="text-right font-bold py-4 pr-8">
                    FOR {`M/S ${(activeProject as any)?.contractor?.toUpperCase()}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
