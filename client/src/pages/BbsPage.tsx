import React, { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { useActiveProject } from "../components/ProjectContext";
import {
  Plus, Search, Pencil, Trash2, ArrowLeft, X, Printer, Lock, Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";

const SHAPES = ["Straight", "L-bend", "U-bend", "Stirrup", "Crank"] as const;
const DIAS = [8, 10, 12, 16, 20, 25, 32];

/** Shape hook/bend allowance multiplier (× dia). 1 hook = 9d (IS 2502), 135° bend = 3d, crank = 0.42d. */
const SHAPE_D: Record<string, number> = {
  Straight: 0,
  "L-bend": 18,
  "U-bend": 27,
  Stirrup: 24,
  Crank: 18.84,
};

function fmt(n: number | string, dec = 2): string {
  const v = typeof n === "string" ? parseFloat(n || "0") : n;
  return isNaN(v) ? (0).toFixed(dec) : v.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function BbsPage() {
  const { role } = useRole();
  const canEdit = role === "admin" || role === "project_manager" || role === "qs_billing_engineer";
  const { projectId: activeProjectId } = useActiveProject();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId) {
    return <ScheduleDetail scheduleId={selectedId} onBack={() => setSelectedId(null)} canEdit={canEdit} />;
  }
  return <ScheduleList projectId={activeProjectId} canEdit={canEdit} onSelect={setSelectedId} />;
}

/* ============================== LIST VIEW ============================== */

function ScheduleList({ projectId, canEdit, onSelect }: {
  projectId?: number; canEdit: boolean; onSelect: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: schedules, isLoading, refetch } = trpc.bbs.listSchedules.useQuery(
    projectId ? { projectId } : undefined
  );
  const createMutation = trpc.bbs.createSchedule.useMutation();
  const deleteMutation = trpc.bbs.deleteSchedule.useMutation();

  const [title, setTitle] = useState("");

  const filtered = useMemo(() => {
    if (!schedules) return [];
    const q = search.toLowerCase();
    return schedules.filter((s: any) => !q || s.title.toLowerCase().includes(q));
  }, [schedules, search]);

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!projectId) { toast.error("No active project"); return; }
    try {
      const res: any = await createMutation.mutateAsync({ projectId, title: title.trim() });
      toast.success("BBS schedule created");
      setTitle(""); setIsCreateOpen(false); refetch();
      if (res?.id) onSelect(res.id);
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this BBS schedule and all its bars?")) return;
    try { await deleteMutation.mutateAsync({ id }); toast.success("Deleted"); refetch(); }
    catch (e: any) { toast.error(e.message || "Failed"); }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">BBS — Bar Bending Schedule</h1>
          <p className="text-sm text-slate-500">Reinforcement steel quantity calculation (D²/162 formula)</p>
        </div>
        {canEdit && (
          <button onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
            <Plus size={16} /> New Schedule
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search schedules..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" />
      </div>

      {isLoading ? <p className="text-sm text-slate-500">Loading...</p> : (
        <div className="grid gap-3">
          {filtered.map((s: any) => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm">
              <button onClick={() => onSelect(s.id)} className="text-left flex-1">
                <div className="font-semibold text-slate-900">{s.title}</div>
                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{s.status}</span>
                  <span>ID #{s.id}</span>
                </div>
              </button>
              {canEdit && (
                <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No BBS schedules yet.</p>}
        </div>
      )}

      {isCreateOpen && (
        <Modal onClose={() => setIsCreateOpen(false)} title="New BBS Schedule">
          <label className="text-xs font-medium text-slate-600">Title (e.g. Slab Culvert CH 2220 — Deck Slab)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="Schedule title" autoFocus />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button onClick={handleCreate} disabled={createMutation.isPending}
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== DETAIL VIEW ============================== */

function ScheduleDetail({ scheduleId, onBack, canEdit }: {
  scheduleId: number; onBack: () => void; canEdit: boolean;
}) {
  const { data: bars, isLoading, refetch } = trpc.bbs.listBars.useQuery({ scheduleId });
  const { data: summary } = trpc.bbs.summary.useQuery({ scheduleId });
  const { data: schedules } = trpc.bbs.listSchedules.useQuery(undefined);
  const schedule = schedules?.find((s: any) => s.id === scheduleId);

  const [isBarOpen, setIsBarOpen] = useState(false);
  const [editingBar, setEditingBar] = useState<any | null>(null);
  const [printMode, setPrintMode] = useState(false);

  const updateStatus = trpc.bbs.updateSchedule.useMutation();
  const deleteBar = trpc.bbs.deleteBar.useMutation();

  const handleDeleteBar = async (id: number) => {
    if (!confirm("Delete this bar?")) return;
    try { await deleteBar.mutateAsync({ id }); toast.success("Bar deleted"); refetch(); }
    catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const toggleStatus = async () => {
    try {
      await updateStatus.mutateAsync({ id: scheduleId, status: schedule?.status === "Approved" ? "Draft" : "Approved" });
      toast.success("Status updated");
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const isLocked = schedule?.status === "Approved";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-4 print:hidden">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">{schedule?.title || `Schedule #${scheduleId}`}</h1>
          <p className="text-xs text-slate-500">Hook allowance: 9d per hook (IS 2502) · Weight = D²/162 × length</p>
        </div>
        {canEdit && (
          <button onClick={toggleStatus}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${isLocked ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />} {schedule?.status || "Draft"}
          </button>
        )}
        <button onClick={() => { setPrintMode(true); setTimeout(() => window.print(), 100); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm">
          <Printer size={14} /> Print
        </button>
        {canEdit && !isLocked && (
          <button onClick={() => { setEditingBar(null); setIsBarOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium">
            <Plus size={14} /> Add Bar
          </button>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs text-slate-500">Total Steel</div>
            <div className="text-xl font-bold text-amber-700">{fmt(summary.totalWeightKg)} kg</div>
            <div className="text-xs text-slate-500">{fmt(summary.totalWeightMT, 3)} MT</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs text-slate-500">Total Length</div>
            <div className="text-xl font-bold text-slate-800">{fmt(summary.totalLength, 1)} m</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs text-slate-500">Total Bars (nos)</div>
            <div className="text-xl font-bold text-slate-800">{summary.totalBars}</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs text-slate-500">Dia Types</div>
            <div className="text-xl font-bold text-slate-800">{summary.byDia.length}</div>
          </div>
        </div>
      )}

      {/* Dia-wise breakup */}
      {summary && summary.byDia.length > 0 && (
        <div className="bg-white border rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Dia-wise Breakup</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white text-left">
                  <th className="px-3 py-2 rounded-l-lg">Dia (mm)</th>
                  <th className="px-3 py-2">Bars (nos)</th>
                  <th className="px-3 py-2">Total Length (m)</th>
                  <th className="px-3 py-2 rounded-r-lg">Weight (kg)</th>
                </tr>
              </thead>
              <tbody>
                {summary.byDia.map((d: any) => (
                  <tr key={d.dia} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold">⌀{d.dia}</td>
                    <td className="px-3 py-2">{d.bars}</td>
                    <td className="px-3 py-2">{fmt(d.totalLength, 1)}</td>
                    <td className="px-3 py-2 font-medium">{fmt(d.weightKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bars table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="sticky top-0">
              <tr className="bg-slate-800 text-white text-left">
                <th className="px-3 py-2">Mark</th>
                <th className="px-3 py-2">Description / Location</th>
                <th className="px-3 py-2">Dia</th>
                <th className="px-3 py-2">Nos</th>
                <th className="px-3 py-2">Length (m)</th>
                <th className="px-3 py-2">Shape</th>
                <th className="px-3 py-2">Hook Allow. (mm)</th>
                <th className="px-3 py-2">Total Len (m)</th>
                <th className="px-3 py-2">Weight (kg)</th>
                {canEdit && !isLocked && <th className="px-3 py-2 print:hidden">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">Loading...</td></tr> :
                (bars || []).map((b: any) => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-amber-700">{b.barMark}</td>
                    <td className="px-3 py-2">{b.description}</td>
                    <td className="px-3 py-2">⌀{b.dia}</td>
                    <td className="px-3 py-2">{b.nos}</td>
                    <td className="px-3 py-2">{fmt(b.lengthEach, 3)}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-full text-xs">{b.shape}</span></td>
                    <td className="px-3 py-2 text-slate-500">{fmt(b.hookAllowance, 1)}</td>
                    <td className="px-3 py-2 font-medium">{fmt(b.totalLength, 2)}</td>
                    <td className="px-3 py-2 font-semibold">{fmt(b.weightKg)}</td>
                    {canEdit && !isLocked && (
                      <td className="px-3 py-2 print:hidden">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingBar(b); setIsBarOpen(true); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteBar(b.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              {(!bars || bars.length === 0) && !isLoading && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No bars yet. Click "Add Bar" to start.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isBarOpen && (
        <BarForm
          scheduleId={scheduleId}
          bar={editingBar}
          onClose={() => { setIsBarOpen(false); setEditingBar(null); refetch(); }}
        />
      )}
    </div>
  );
}

/* ============================== BAR FORM ============================== */

function BarForm({ scheduleId, bar, onClose }: {
  scheduleId: number; bar: any | null; onClose: () => void;
}) {
  const [barMark, setBarMark] = useState(bar?.barMark || "");
  const [description, setDescription] = useState(bar?.description || "");
  const [dia, setDia] = useState<number>(parseFloat(bar?.dia) || 12);
  const [nos, setNos] = useState<number>(Number(bar?.nos) || 0);
  const [lengthEach, setLengthEach] = useState<number>(parseFloat(bar?.lengthEach) || 0);
  const [shape, setShape] = useState<string>(bar?.shape || "Straight");

  const addMutation = trpc.bbs.addBar.useMutation();
  const updateMutation = trpc.bbs.updateBar.useMutation();

  // Live preview
  const preview = useMemo(() => {
    const d = Math.max(0, dia || 0);
    const n = Math.max(0, Math.floor(nos || 0));
    const hookMm = d * (SHAPE_D[shape] ?? 0);
    const totalLen = n * (Math.max(0, lengthEach || 0) + hookMm / 1000);
    const wt = (d * d / 162) * totalLen;
    return { hookMm, totalLen, wt };
  }, [dia, nos, lengthEach, shape]);

  const handleSave = async () => {
    if (!barMark.trim() || !description.trim()) { toast.error("Mark and description required"); return; }
    try {
      if (bar) {
        await updateMutation.mutateAsync({ id: bar.id, barMark: barMark.trim(), description: description.trim(), dia, nos, lengthEach, shape: shape as any });
        toast.success("Bar updated");
      } else {
        await addMutation.mutateAsync({ scheduleId, barMark: barMark.trim(), description: description.trim(), dia, nos, lengthEach, shape: shape as any });
        toast.success("Bar added");
      }
      onClose();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const pending = addMutation.isPending || updateMutation.isPending;

  return (
    <Modal onClose={onClose} title={bar ? "Edit Bar" : "Add Bar"}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Bar Mark</label>
          <input value={barMark} onChange={(e) => setBarMark(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="B1" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Dia (mm)</label>
          <select value={dia} onChange={(e) => setDia(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
            {DIAS.map((d) => <option key={d} value={d}>⌀{d}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600">Description / Location</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Slab bottom main bars" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Nos</label>
          <input type="number" min={0} value={nos} onChange={(e) => setNos(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Length each (m)</label>
          <input type="number" min={0} step="0.001" value={lengthEach} onChange={(e) => setLengthEach(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600">Shape</label>
          <select value={shape} onChange={(e) => setShape(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
            {SHAPES.map((s) => <option key={s} value={s}>{s} ({SHAPE_D[s]}d)</option>)}
          </select>
        </div>
      </div>

      {/* Live preview */}
      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
        <div className="font-semibold text-amber-900 mb-1">Live Calculation</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><span className="text-slate-500">Hook allow.:</span><br /><b>{fmt(preview.hookMm, 1)} mm</b></div>
          <div><span className="text-slate-500">Total length:</span><br /><b>{fmt(preview.totalLen, 2)} m</b></div>
          <div><span className="text-slate-500">Weight:</span><br /><b className="text-amber-700">{fmt(preview.wt)} kg</b></div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
        <button onClick={handleSave} disabled={pending}
          className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
          {pending ? "Saving..." : bar ? "Update" : "Add"}
        </button>
      </div>
    </Modal>
  );
}

/* ============================== MODAL ============================== */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
