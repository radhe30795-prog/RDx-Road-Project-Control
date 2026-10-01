import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Edit3, FileSpreadsheet, MapPinned, RefreshCw, Save, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";
import { trpc } from "../lib/trpc";

type Tab = "project" | "roads" | "boq";
type Status = "Not Started" | "In Progress" | "Completed" | "On Hold";
type BoqStatus = "Active" | "Closed" | "Variation";

const statusOptions: Status[] = ["Not Started", "In Progress", "Completed", "On Hold"];
const boqStatusOptions: BoqStatus[] = ["Active", "Closed", "Variation"];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
      {hint && <span className="block text-[10px] leading-4 text-slate-400">{hint}</span>}
    </label>
  );
}

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100";
const selectClass = `${inputClass} font-semibold`;

export default function AdminEditPanelPage() {
  const { role } = useRole();
  const isAdmin = role === "admin";
  const [tab, setTab] = useState<Tab>("project");
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [selectedRoadId, setSelectedRoadId] = useState<number | undefined>();
  const [selectedBoqId, setSelectedBoqId] = useState<number | undefined>();
  const [roadSearch, setRoadSearch] = useState("");
  const [boqSearch, setBoqSearch] = useState("");
  const [boqRoadFilter, setBoqRoadFilter] = useState("all");
  const [savedAt, setSavedAt] = useState("");

  const { data: projects, isLoading: projectsLoading } = trpc.adminEdit.projects.useQuery(undefined, { enabled: isAdmin });
  const projectQueryInput = useMemo(() => selectedProjectId ? { projectId: selectedProjectId } : undefined, [selectedProjectId]);
  const roadQueryInput = useMemo(() => selectedProjectId ? { projectId: selectedProjectId } : undefined, [selectedProjectId]);
  const boqQueryInput = useMemo(() => ({
    projectId: selectedProjectId,
    roadId: boqRoadFilter === "all" ? undefined : Number(boqRoadFilter),
  }), [selectedProjectId, boqRoadFilter]);
  const { data: roads, isLoading: roadsLoading, refetch: refetchRoads } = trpc.adminEdit.roads.useQuery(roadQueryInput, { enabled: isAdmin && Boolean(selectedProjectId) });
  const { data: boqRows, isLoading: boqLoading, refetch: refetchBoq } = trpc.adminEdit.boq.useQuery(boqQueryInput, { enabled: isAdmin && Boolean(selectedProjectId) });

  const utils = trpc.useUtils();
  const projectMutation = trpc.adminEdit.updateProject.useMutation({
    onSuccess: async () => {
      await utils.adminEdit.projects.invalidate();
      setSavedAt(new Date().toLocaleTimeString());
      toast.success("Project details updated");
    },
    onError: (error) => toast.error(error.message || "Project update failed"),
  });
  const roadMutation = trpc.adminEdit.updateRoad.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchRoads(), utils.roads.list.invalidate()]);
      setSavedAt(new Date().toLocaleTimeString());
      toast.success("Road details updated");
    },
    onError: (error) => toast.error(error.message || "Road update failed"),
  });
  const boqMutation = trpc.adminEdit.updateBoq.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchBoq(), utils.boq.list.invalidate()]);
      setSavedAt(new Date().toLocaleTimeString());
      toast.success("BOQ item updated");
    },
    onError: (error) => toast.error(error.message || "BOQ update failed"),
  });

  useEffect(() => {
    if (!selectedProjectId && projects?.[0]) setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (roads?.length && !selectedRoadId) setSelectedRoadId(roads[0].id);
  }, [roads, selectedRoadId]);

  useEffect(() => {
    if (boqRows?.length && !selectedBoqId) setSelectedBoqId(boqRows[0].boq.id);
  }, [boqRows, selectedBoqId]);

  const selectedProject = projects?.find((project) => project.id === selectedProjectId);
  const selectedRoad = roads?.find((road) => road.id === selectedRoadId);
  const selectedBoq = boqRows?.find((row) => row.boq.id === selectedBoqId)?.boq;
  const selectedBoqRoad = boqRows?.find((row) => row.boq.id === selectedBoqId)?.road;

  const filteredRoads = useMemo(() => {
    const query = roadSearch.trim().toLowerCase();
    return (roads || []).filter((road) => !query || road.roadId.toLowerCase().includes(query) || road.roadName.toLowerCase().includes(query));
  }, [roads, roadSearch]);
  const filteredBoq = useMemo(() => {
    const query = boqSearch.trim().toLowerCase();
    return (boqRows || []).filter(({ boq, road }) => !query || boq.itemCode.toLowerCase().includes(query) || boq.chapter.toLowerCase().includes(query) || boq.description.toLowerCase().includes(query) || (road?.roadName || "").toLowerCase().includes(query));
  }, [boqRows, boqSearch]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="mt-4 text-xl font-black text-slate-900">Admin access required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Central Edit Panel केवल administrator के लिए उपलब्ध है। अपने admin account से login करें।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-5 sm:p-7 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300"><SlidersHorizontal className="h-3.5 w-3.5" /> Admin control</div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">Central Edit Panel</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Project master, road chainage और BOQ quantities/rates को एक जगह से edit करें। हर save server-side admin permission के बाद ही स्वीकार होगा।</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300"><div className="flex items-center gap-2 font-bold text-white"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Admin-only updates</div><div className="mt-1">{savedAt ? `Last saved at ${savedAt}` : "No changes saved in this session"}</div></div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><div className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /><span><strong>Important:</strong> BOQ quantity/rate बदलने पर contract amount और balance quantity automatically recalculate होंगे। Executed quantity को केवल verified measurement के अनुसार बदलें।</span></div></div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 p-2 gap-2">
          {([
            ["project", "Project Master", Building2Icon],
            ["roads", "Roads & Chainage", MapPinned],
            ["boq", "BOQ Lines", FileSpreadsheet],
          ] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition ${tab === id ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-white"}`}><Icon className="h-4 w-4" />{label}</button>
          ))}
          <button onClick={() => { refetchRoads(); refetchBoq(); }} className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-500 hover:bg-white"><RefreshCw className="h-4 w-4" />Refresh</button>
        </div>

        {tab === "project" && <ProjectEditor projects={projects || []} selectedProject={selectedProject} loading={projectsLoading} selectedProjectId={selectedProjectId} onSelect={(id: number) => setSelectedProjectId(Number(id))} onSave={(data: any) => projectMutation.mutate(data)} saving={projectMutation.isPending} />}
        {tab === "roads" && <RoadEditor roads={filteredRoads} selectedRoad={selectedRoad} search={roadSearch} onSearch={setRoadSearch} onSelect={(id: number) => setSelectedRoadId(id)} loading={roadsLoading} onSave={(data: any) => roadMutation.mutate(data)} saving={roadMutation.isPending} />}
        {tab === "boq" && <BoqEditor rows={filteredBoq} selectedBoq={selectedBoq} selectedRoad={selectedBoqRoad} roads={roads || []} search={boqSearch} onSearch={setBoqSearch} roadFilter={boqRoadFilter} onRoadFilter={setBoqRoadFilter} onSelect={(id: number) => setSelectedBoqId(id)} onSave={(data: any) => boqMutation.mutate(data)} loading={boqLoading} saving={boqMutation.isPending} />}
      </section>
    </div>
  );
}

function Building2Icon(props: React.ComponentProps<typeof MapPinned>) {
  return <MapPinned {...props} />;
}

function ProjectEditor({ projects, selectedProject, loading, selectedProjectId, onSelect, onSave, saving }: any) {
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (selectedProject) setForm({ ...selectedProject, package: selectedProject.package || "", remarks: selectedProject.remarks || "" }); }, [selectedProject]);
  if (loading) return <div className="p-8 text-sm text-slate-500">Loading projects...</div>;
  if (!form) return <div className="p-8 text-sm text-slate-500">No project found.</div>;
  const set = (key: string, value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  return <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
    <div className="border-b lg:border-b-0 lg:border-r border-slate-200 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Select project</p><div className="mt-3 space-y-2">{projects.map((project: any) => <button key={project.id} onClick={() => onSelect(project.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedProjectId === project.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}><span className="block text-xs font-black text-slate-900">{project.projectId}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{project.projectName}</span></button>)}</div></div>
    <div className="p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Project master details</h2><p className="mt-1 text-xs text-slate-500">Project ID <span className="font-mono font-bold">{form.projectId}</span> locked to preserve links.</p></div><Edit3 className="h-5 w-5 text-amber-500" /></div><div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Project name"><input className={inputClass} value={form.projectName} onChange={(e) => set("projectName", e.target.value)} /></Field><Field label="Package"><input className={inputClass} value={form.package} onChange={(e) => set("package", e.target.value)} /></Field><Field label="Client department"><input className={inputClass} value={form.clientDepartment} onChange={(e) => set("clientDepartment", e.target.value)} /></Field><Field label="Contractor"><input className={inputClass} value={form.contractor} onChange={(e) => set("contractor", e.target.value)} /></Field><Field label="Agreement start date" hint="Use YYYY-MM-DD"><input className={inputClass} value={form.agreementStartDate} onChange={(e) => set("agreementStartDate", e.target.value)} /></Field><Field label="Agreement end date" hint="Use YYYY-MM-DD"><input className={inputClass} value={form.agreementEndDate} onChange={(e) => set("agreementEndDate", e.target.value)} /></Field><Field label="Status"><select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value)}>{statusOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Overall progress (%)"><input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.overallProgress} onChange={(e) => set("overallProgress", e.target.value)} /></Field><div className="md:col-span-2"><Field label="Remarks"><textarea rows={3} className={inputClass} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field></div></div><div className="mt-6 flex justify-end"><button disabled={saving} onClick={() => onSave({ id: form.id, projectName: form.projectName, package: form.package || null, clientDepartment: form.clientDepartment, contractor: form.contractor, agreementStartDate: form.agreementStartDate, agreementEndDate: form.agreementEndDate, status: form.status, overallProgress: form.overallProgress, remarks: form.remarks || null })} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Project"}</button></div></div>
  </div>;
}

function RoadEditor({ roads, selectedRoad, search, onSearch, onSelect, loading, onSave, saving }: any) {
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (selectedRoad) setForm({ ...selectedRoad, remarks: selectedRoad.remarks || "" }); }, [selectedRoad]);
  const set = (key: string, value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  return <div className="grid grid-cols-1 xl:grid-cols-[330px_1fr]">
    <div className="border-b xl:border-b-0 xl:border-r border-slate-200 p-4"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${inputClass} pl-9`} placeholder="Search road..." value={search} onChange={(e) => onSearch(e.target.value)} /></div><div className="mt-3 space-y-2 max-h-[560px] overflow-auto">{loading ? <p className="p-3 text-xs text-slate-500">Loading roads...</p> : roads.map((road: any) => <button key={road.id} onClick={() => onSelect(road.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedRoad?.id === road.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-black text-slate-900">{road.roadId}</span><span className="text-[10px] font-bold text-slate-500">{road.progress}%</span></div><span className="mt-1 block text-xs leading-5 text-slate-500">{road.roadName}</span><span className="mt-1 block text-[10px] font-mono text-slate-400">{road.startRd} → {road.endRd}</span></button>)}</div></div>
    <div className="p-5 sm:p-7">{!form ? <p className="text-sm text-slate-500">Select a road to edit.</p> : <><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Road details</h2><p className="mt-1 text-xs text-slate-500">Road ID <span className="font-mono font-bold">{form.roadId}</span> locked to preserve BOQ links.</p></div><MapPinned className="h-5 w-5 text-amber-500" /></div><div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Road name"><input className={inputClass} value={form.roadName} onChange={(e) => set("roadName", e.target.value)} /></Field><Field label="Length (km)"><input type="number" step="0.001" min="0" className={inputClass} value={form.roadLengthKm} onChange={(e) => set("roadLengthKm", e.target.value)} /></Field><Field label="Start RD"><input className={inputClass} value={form.startRd} onChange={(e) => set("startRd", e.target.value)} /></Field><Field label="End RD"><input className={inputClass} value={form.endRd} onChange={(e) => set("endRd", e.target.value)} /></Field><Field label="Status"><select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value)}>{statusOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Physical progress (%)"><input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.progress} onChange={(e) => set("progress", e.target.value)} /></Field><div className="md:col-span-2"><Field label="Remarks"><textarea rows={4} className={inputClass} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field></div></div><div className="mt-6 flex justify-end"><button disabled={saving} onClick={() => onSave({ id: form.id, roadName: form.roadName, roadLengthKm: form.roadLengthKm, startRd: form.startRd, endRd: form.endRd, status: form.status, progress: form.progress, remarks: form.remarks || null })} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Road"}</button></div></>}</div>
  </div>;
}

function BoqEditor({ rows, selectedBoq, selectedRoad, roads, search, onSearch, roadFilter, onRoadFilter, onSelect, loading, onSave, saving }: any) {
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (selectedBoq) setForm({ ...selectedBoq, revisedQuantity: selectedBoq.revisedQuantity || "", remarks: selectedBoq.remarks || "" }); }, [selectedBoq]);
  const set = (key: string, value: string) => setForm((current: any) => ({ ...current, [key]: value }));
  return <div className="grid grid-cols-1 xl:grid-cols-[430px_1fr]">
    <div className="border-b xl:border-b-0 xl:border-r border-slate-200 p-4"><div className="space-y-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${inputClass} pl-9`} placeholder="Search item, chapter or road..." value={search} onChange={(e) => onSearch(e.target.value)} /></div><select className={selectClass} value={roadFilter} onChange={(e) => onRoadFilter(e.target.value)}><option value="all">All roads</option>{roads.map((road: any) => <option key={road.id} value={road.id}>{road.roadId} — {road.roadName}</option>)}</select></div><div className="mt-3 space-y-2 max-h-[560px] overflow-auto">{loading ? <p className="p-3 text-xs text-slate-500">Loading BOQ lines...</p> : rows.map(({ boq, road }: any) => <button key={boq.id} onClick={() => onSelect(boq.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedBoq?.id === boq.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] font-black text-slate-900">{boq.itemCode}</span><span className="text-[10px] font-bold text-slate-500">{boq.unit}</span></div><span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{boq.chapter} · {boq.description}</span><span className="mt-1 block text-[10px] font-semibold text-slate-400">{road?.roadId || "Project-wide"} · Qty {boq.contractQuantity} · Rate ₹{boq.rate}</span></button>)}</div></div>
    <div className="p-5 sm:p-7">{!form ? <p className="text-sm text-slate-500">Select a BOQ line to edit.</p> : <><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">BOQ line details</h2><p className="mt-1 text-xs text-slate-500">Item <span className="font-mono font-bold">{form.itemCode}</span> · {selectedRoad?.roadName || "Project-wide"}</p></div><FileSpreadsheet className="h-5 w-5 text-amber-500" /></div><div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Chapter / SOR"><input className={inputClass} value={form.chapter} onChange={(e) => set("chapter", e.target.value)} /></Field><Field label="Unit"><input className={inputClass} value={form.unit} onChange={(e) => set("unit", e.target.value)} /></Field><div className="md:col-span-2"><Field label="Description"><textarea rows={5} className={inputClass} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field></div><Field label="Contract quantity"><input type="number" step="0.001" min="0" className={inputClass} value={form.contractQuantity} onChange={(e) => set("contractQuantity", e.target.value)} /></Field><Field label="Revised quantity"><input type="number" step="0.001" min="0" className={inputClass} value={form.revisedQuantity} onChange={(e) => set("revisedQuantity", e.target.value)} /></Field><Field label="Executed quantity" hint="Use verified cumulative measurement"><input type="number" step="0.001" min="0" className={inputClass} value={form.executedQuantity} onChange={(e) => set("executedQuantity", e.target.value)} /></Field><Field label="Rate (₹)"><input type="number" step="0.01" min="0" className={inputClass} value={form.rate} onChange={(e) => set("rate", e.target.value)} /></Field><Field label="Status"><select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value)}>{boqStatusOptions.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Recalculated amount"><div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-black text-amber-900">₹{(Number(form.contractQuantity || 0) * Number(form.rate || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></Field><div className="md:col-span-2"><Field label="Remarks"><textarea rows={3} className={inputClass} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field></div></div><div className="mt-6 flex items-center justify-between gap-3"><span className="text-[11px] text-slate-400">Balance quantity will recalculate on save.</span><button disabled={saving} onClick={() => onSave({ id: form.id, chapter: form.chapter, description: form.description, unit: form.unit, contractQuantity: form.contractQuantity, revisedQuantity: form.revisedQuantity || null, executedQuantity: form.executedQuantity, rate: form.rate, status: form.status, remarks: form.remarks || null })} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save BOQ Line"}</button></div></>}</div>
  </div>;
}
