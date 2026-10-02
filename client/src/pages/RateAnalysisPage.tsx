import React, { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import {
  Calculator,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowLeft,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";

const CATEGORIES = ["Material", "Labour", "Machinery"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLES: Record<Category, string> = {
  Material: "bg-amber-50 border-amber-200 text-amber-900",
  Labour: "bg-blue-50 border-blue-200 text-blue-900",
  Machinery: "bg-purple-50 border-purple-200 text-purple-900",
};

const CATEGORY_HEADER: Record<Category, string> = {
  Material: "bg-amber-100 text-amber-900",
  Labour: "bg-blue-100 text-blue-900",
  Machinery: "bg-purple-100 text-purple-900",
};

function fmt(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n || "0") : n;
  return isNaN(v) ? "0.00" : v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RateAnalysisPage() {
  const { role } = useRole();
  const canEdit = role === "admin" || role === "project_manager" || role === "qs_billing_engineer";

  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (selectedId) {
    return <AnalysisDetail analysisId={selectedId} onBack={() => setSelectedId(null)} canEdit={canEdit} />;
  }

  return (
    <AnalysisList
      projectId={activeProjectId}
      search={search}
      setSearch={setSearch}
      canEdit={canEdit}
      isCreateOpen={isCreateOpen}
      setIsCreateOpen={setIsCreateOpen}
      onSelect={setSelectedId}
    />
  );
}

/* ============================== LIST VIEW ============================== */

function AnalysisList({
  projectId, search, setSearch, canEdit, isCreateOpen, setIsCreateOpen, onSelect,
}: {
  projectId?: number;
  search: string;
  setSearch: (v: string) => void;
  canEdit: boolean;
  isCreateOpen: boolean;
  setIsCreateOpen: (v: boolean) => void;
  onSelect: (id: number) => void;
}) {
  const { data: analyses, isLoading, refetch } = trpc.rateAnalysis.list.useQuery(
    projectId ? { projectId } : undefined
  );

  const deleteMutation = trpc.rateAnalysis.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Rate analysis deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const seedMutation = trpc.rateAnalysis.seedTemplates.useMutation({
    onSuccess: (r: any) => { refetch(); toast.success(r.message || "Templates seeded"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!analyses) return [];
    const q = search.toLowerCase();
    return (analyses as any[]).filter(
      (a) =>
        !q ||
        String(a.analysisNo || "").toLowerCase().includes(q) ||
        String(a.description || "").toLowerCase().includes(q) ||
        String(a.sorRef || "").toLowerCase().includes(q)
    );
  }, [analyses, search]);

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-6 h-6 text-emerald-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Rate Analysis (QS)</h1>
            <p className="text-[11px] text-slate-500">SOR-based rate build-up per unit of work</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => projectId && seedMutation.mutate({ projectId })}
              disabled={!projectId || seedMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200"
              title="Create 3 empty SOR templates (GSB, WMM, PCC 1:4:8)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {seedMutation.isPending ? "Seeding..." : "Load SOR Templates"}
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
            >
              <Plus className="w-4 h-4" /> New Analysis
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by analysis no, description, SOR ref..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-700">
            Rate Analyses ({filtered.length} found)
          </span>
        </div>
        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
          <table className="w-full text-left text-xs text-slate-600 min-w-[1000px]">
            <thead className="bg-slate-900 text-white font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">Analysis No</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">SOR Ref</th>
                <th className="py-3 px-4 text-right">Rate / Unit (₹)</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No rate analyses yet.
                    {canEdit && " Click “Load SOR Templates” or “New Analysis” to start."}
                  </td>
                </tr>
              ) : (
                filtered.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{a.analysisNo}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="block truncate" title={a.description}>{a.description || "—"}</span>
                      {a.leadKm && parseFloat(a.leadKm) > 0 && (
                        <span className="text-[10px] text-slate-400">Lead: {a.leadKm} km</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{a.unit}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{a.sorRef || "—"}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      ₹{fmt(a.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">{a.componentCount}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelect(a.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold"
                        >
                          {canEdit ? <><Pencil className="w-3 h-3" /> Open</> : "View"}
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete ${a.analysisNo}? All components will also be deleted.`)) {
                                deleteMutation.mutate({ id: a.id });
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateOpen && (
        <CreateAnalysisModal
          projectId={projectId}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(id: number) => { setIsCreateOpen(false); refetch(); onSelect(id); }}
        />
      )}
    </div>
  );
}

/* ============================== CREATE MODAL ============================== */

function CreateAnalysisModal({ projectId, onClose, onCreated }: {
  projectId?: number;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [analysisNo, setAnalysisNo] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("Cum");
  const [sorRef, setSorRef] = useState("");
  const [leadKm, setLeadKm] = useState("0.00");
  const [remarks, setRemarks] = useState("");

  const createMutation = trpc.rateAnalysis.create.useMutation({
    onSuccess: (row: any) => {
      toast.success("Rate analysis created");
      onCreated(row?.id);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) { toast.error("No project found"); return; }
    createMutation.mutate({
      projectId,
      analysisNo: analysisNo.trim(),
      description: description.trim() || undefined,
      unit,
      sorRef: sorRef.trim() || undefined,
      leadKm,
      remarks: remarks.trim() || undefined,
      status: "Draft",
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" /> New Rate Analysis
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 text-xs">Analysis No *</label>
              <input required value={analysisNo} onChange={(e) => setAnalysisNo(e.target.value)}
                placeholder="e.g. RA-GSB-001"
                className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono" />
            </div>
            <div>
              <label className="font-bold text-slate-700 text-xs">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-white">
                {["Cum", "Sqm", "Rmt", "Nos", "Kg", "MT", "Litre", "Hour", "Day"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-700 text-xs">Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Granular Sub-Base as per MORTH 401"
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 text-xs">SOR Ref</label>
              <input value={sorRef} onChange={(e) => setSorRef(e.target.value)}
                placeholder="e.g. MORTH 401"
                className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono" />
            </div>
            <div>
              <label className="font-bold text-slate-700 text-xs">Lead (km)</label>
              <input type="number" step="0.01" min="0" value={leadKm} onChange={(e) => setLeadKm(e.target.value)}
                className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono" />
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-700 text-xs">Remarks</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold text-sm">Cancel</button>
            <button type="submit" disabled={createMutation.isPending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow">
              {createMutation.isPending ? "Creating..." : "Create & Add Items"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================== DETAIL VIEW ============================== */

function AnalysisDetail({ analysisId, onBack, canEdit }: {
  analysisId: number;
  onBack: () => void;
  canEdit: boolean;
}) {
  const { data, isLoading, refetch } = trpc.rateAnalysis.get.useQuery({ id: analysisId });
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [compCategory, setCompCategory] = useState<Category>("Material");
  const [editingComp, setEditingComp] = useState<any | null>(null);

  const updateMutation = trpc.rateAnalysis.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Header updated"); },
    onError: (e) => toast.error(e.message),
  });
  const delCompMutation = trpc.rateAnalysis.deleteComponent.useMutation({
    onSuccess: () => { refetch(); toast.success("Item deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const analysis: any = (data as any)?.analysis;
  const components: any[] = (data as any)?.components || [];

  // Header edit state (synced when data loads)
  const [hAnalysisNo, setHAnalysisNo] = useState("");
  const [hDescription, setHDescription] = useState("");
  const [hUnit, setHUnit] = useState("Cum");
  const [hSorRef, setHSorRef] = useState("");
  const [hLeadKm, setHLeadKm] = useState("0.00");
  const [hOverhead, setHOverhead] = useState("0.00");
  const [hProfit, setHProfit] = useState("0.00");
  const [hStatus, setHStatus] = useState("Draft");
  const [hRemarks, setHRemarks] = useState("");
  const [headerLoaded, setHeaderLoaded] = useState(false);

  React.useEffect(() => {
    if (analysis && !headerLoaded) {
      setHAnalysisNo(analysis.analysisNo || "");
      setHDescription(analysis.description || "");
      setHUnit(analysis.unit || "Cum");
      setHSorRef(analysis.sorRef || "");
      setHLeadKm(String(analysis.leadKm || "0.00"));
      setHOverhead(String(analysis.overheadPct || "0.00"));
      setHProfit(String(analysis.profitPct || "0.00"));
      setHStatus(analysis.status || "Draft");
      setHRemarks(analysis.remarks || "");
      setHeaderLoaded(true);
    }
  }, [analysis, headerLoaded]);

  // Reset header sync when switching analyses
  React.useEffect(() => { setHeaderLoaded(false); }, [analysisId]);

  const byCategory = useMemo(() => {
    const m: Record<Category, any[]> = { Material: [], Labour: [], Machinery: [] };
    for (const c of components) {
      if (m[c.category as Category]) m[c.category as Category].push(c);
    }
    return m;
  }, [components]);

  const subtotals = useMemo(() => {
    const s: Record<Category, number> = { Material: 0, Labour: 0, Machinery: 0 };
    for (const cat of CATEGORIES) {
      s[cat] = byCategory[cat].reduce((t, c) => t + parseFloat(String(c.amount || "0")), 0);
    }
    return s;
  }, [byCategory]);

  const total = subtotals.Material + subtotals.Labour + subtotals.Machinery;
  const ohPct = parseFloat(hOverhead || "0");
  const pPct = parseFloat(hProfit || "0");
  const ohAmt = total * (ohPct / 100);
  const profitAmt = (total + ohAmt) * (pPct / 100);
  const grandTotal = total + ohAmt + profitAmt;

  function saveHeader() {
    updateMutation.mutate({
      id: analysisId,
      analysisNo: hAnalysisNo.trim(),
      description: hDescription,
      unit: hUnit,
      sorRef: hSorRef,
      leadKm: hLeadKm,
      overheadPct: hOverhead,
      profitPct: hProfit,
      status: hStatus as any,
      remarks: hRemarks,
    });
  }

  function openAddComponent(cat: Category) {
    setCompCategory(cat);
    setEditingComp(null);
    setIsCompModalOpen(true);
  }

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading rate analysis...</div>;
  }
  if (!analysis) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Rate analysis not found.</p>
        <button onClick={onBack} className="mt-3 px-4 py-2 bg-slate-100 rounded-lg text-sm font-bold">Back</button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4" /> Back to List
        </button>
        {/* Rate per unit — prominent */}
        <div className="flex items-center gap-3 bg-emerald-600 text-white rounded-xl px-5 py-3 shadow-lg">
          <Calculator className="w-6 h-6" />
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-80">Rate per {analysis.unit}</div>
            <div className="text-2xl font-black font-mono">₹{fmt(grandTotal)}</div>
          </div>
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Analysis Header</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label className="text-[11px] font-bold text-slate-500">Analysis No *</label>
            <input disabled={!canEdit} value={hAnalysisNo} onChange={(e) => setHAnalysisNo(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono disabled:bg-slate-50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500">Unit</label>
            <select disabled={!canEdit} value={hUnit} onChange={(e) => setHUnit(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-white disabled:bg-slate-50">
              {["Cum", "Sqm", "Rmt", "Nos", "Kg", "MT", "Litre", "Hour", "Day"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500">SOR Ref</label>
            <input disabled={!canEdit} value={hSorRef} onChange={(e) => setHSorRef(e.target.value)}
              placeholder="e.g. MORTH 401"
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono disabled:bg-slate-50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500">Lead (km)</label>
            <input disabled={!canEdit} type="number" step="0.01" min="0" value={hLeadKm} onChange={(e) => setHLeadKm(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg font-mono disabled:bg-slate-50" />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-bold text-slate-500">Description</label>
            <input disabled={!canEdit} value={hDescription} onChange={(e) => setHDescription(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg disabled:bg-slate-50" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500">Status</label>
            <select disabled={!canEdit} value={hStatus} onChange={(e) => setHStatus(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-white disabled:bg-slate-50">
              <option value="Draft">Draft</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500">Remarks</label>
            <input disabled={!canEdit} value={hRemarks} onChange={(e) => setHRemarks(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg disabled:bg-slate-50" />
          </div>
        </div>
        {canEdit && (
          <div className="mt-3 flex justify-end">
            <button onClick={saveHeader} disabled={updateMutation.isPending}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold">
              {updateMutation.isPending ? "Saving..." : "Save Header"}
            </button>
          </div>
        )}
      </div>

      {/* Category sections */}
      {CATEGORIES.map((cat) => (
        <div key={cat} className={`rounded-xl border shadow-sm overflow-hidden ${CATEGORY_STYLES[cat]}`}>
          <div className={`flex items-center justify-between px-4 py-2.5 ${CATEGORY_HEADER[cat]}`}>
            <span className="text-xs font-black uppercase tracking-wider">
              {cat} — Subtotal: ₹{fmt(subtotals[cat])}
            </span>
            {canEdit && (
              <button onClick={() => openAddComponent(cat)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white text-[11px] font-bold shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Add {cat} Item
              </button>
            )}
          </div>
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="py-2 px-4 w-8">#</th>
                  <th className="py-2 px-4">Description</th>
                  <th className="py-2 px-4">Unit</th>
                  <th className="py-2 px-4 text-right">Coefficient<br /><span className="normal-case font-normal">(qty / {analysis.unit})</span></th>
                  <th className="py-2 px-4 text-right">Rate (₹)</th>
                  <th className="py-2 px-4 text-right">Amount (₹)</th>
                  {canEdit && <th className="py-2 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byCategory[cat].length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="py-4 text-center text-slate-400 italic">
                      No {cat.toLowerCase()} items yet — {canEdit ? "click “Add\" to fill from SOR." : "nothing added."}
                    </td>
                  </tr>
                ) : (
                  byCategory[cat].map((c: any, i: number) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-4 text-slate-400">{i + 1}</td>
                      <td className="py-2 px-4 font-semibold text-slate-800">{c.description}</td>
                      <td className="py-2 px-4">{c.unit}</td>
                      <td className="py-2 px-4 text-right font-mono">{c.coefficient}</td>
                      <td className="py-2 px-4 text-right font-mono">₹{fmt(c.rate)}</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">₹{fmt(c.amount)}</td>
                      {canEdit && (
                        <td className="py-2 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => { setCompCategory(cat); setEditingComp(c); setIsCompModalOpen(true); }}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                              title="Edit item">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete “${c.description}”?`)) delCompMutation.mutate({ id: c.id });
                              }}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                              title="Delete item">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Footer — totals */}
      <div className="bg-slate-900 text-white rounded-xl shadow-lg p-4">
        <h2 className="text-sm font-bold mb-3 text-slate-200">Rate Build-up Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-sm">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex justify-between text-slate-300">
                <span>{cat}</span>
                <span className="font-mono">₹{fmt(subtotals[cat])}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-700 pt-1.5 font-bold text-white">
              <span>Basic Cost (A)</span>
              <span className="font-mono">₹{fmt(total)}</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <label className="text-slate-300">
                Overhead <input
                  disabled={!canEdit} type="number" step="0.01" min="0" max="100"
                  value={hOverhead} onChange={(e) => setHOverhead(e.target.value)}
                  className="w-16 mx-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 font-mono text-white text-center disabled:opacity-60"
                /> %
              </label>
              <span className="font-mono text-slate-300">₹{fmt(ohAmt)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-slate-300">
                Contractor's Profit <input
                  disabled={!canEdit} type="number" step="0.01" min="0" max="100"
                  value={hProfit} onChange={(e) => setHProfit(e.target.value)}
                  className="w-16 mx-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 font-mono text-white text-center disabled:opacity-60"
                /> %
              </label>
              <span className="font-mono text-slate-300">₹{fmt(profitAmt)}</span>
            </div>
            {canEdit && (
              <div className="flex justify-end">
                <button onClick={saveHeader} disabled={updateMutation.isPending}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[11px] font-bold">
                  Save % Changes
                </button>
              </div>
            )}
            <div className="flex justify-between border-t border-emerald-500/40 pt-2">
              <span className="font-black text-emerald-300 uppercase tracking-wider text-xs">
                Grand Total — Rate per {analysis.unit}
              </span>
              <span className="font-mono font-black text-xl text-emerald-300">₹{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {isCompModalOpen && (
        <ComponentModal
          analysisId={analysisId}
          category={compCategory}
          existing={editingComp}
          sortOrder={byCategory[compCategory].length}
          onClose={() => { setIsCompModalOpen(false); setEditingComp(null); }}
          onSaved={() => { setIsCompModalOpen(false); setEditingComp(null); refetch(); }}
        />
      )}
    </div>
  );
}

/* ============================== COMPONENT MODAL ============================== */

function ComponentModal({ analysisId, category, existing, sortOrder, onClose, onSaved }: {
  analysisId: number;
  category: Category;
  existing: any | null;
  sortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState(existing?.description || "");
  const [unit, setUnit] = useState(existing?.unit || "Cum");
  const [coefficient, setCoefficient] = useState(String(existing?.coefficient ?? "0"));
  const [rate, setRate] = useState(String(existing?.rate ?? "0"));

  const addMutation = trpc.rateAnalysis.addComponent.useMutation({
    onSuccess: () => { toast.success("Item added"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.rateAnalysis.updateComponent.useMutation({
    onSuccess: () => { toast.success("Item updated"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  const previewAmt = (parseFloat(coefficient || "0") * parseFloat(rate || "0"));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (existing) {
      updateMutation.mutate({
        id: existing.id,
        description: description.trim(),
        unit,
        coefficient,
        rate,
      });
    } else {
      addMutation.mutate({
        analysisId,
        category,
        description: description.trim(),
        unit,
        coefficient,
        rate,
        sortOrder,
      });
    }
  }

  const pending = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            {existing ? "Edit" : "Add"} {category} Item
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="font-bold text-slate-700 text-xs">Description *</label>
            <input required value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={category === "Material" ? "e.g. 53mm graded aggregate" : category === "Labour" ? "e.g. Mazdoor" : "e.g. Vibratory roller 8-10T"}
              className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 text-xs">Unit</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)}
                placeholder="Cum"
                className="mt-1 w-full p-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="font-bold text-slate-700 text-xs">Coefficient</label>
              <input type="number" step="0.0001" min="0" value={coefficient} onChange={(e) => setCoefficient(e.target.value)}
                className="mt-1 w-full p-2 border border-emerald-200 bg-emerald-50 rounded-lg font-mono" />
            </div>
            <div>
              <label className="font-bold text-slate-700 text-xs">Rate (₹)</label>
              <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)}
                className="mt-1 w-full p-2 border border-emerald-200 bg-emerald-50 rounded-lg font-mono" />
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center">
            <span className="text-xs text-slate-500">Amount = coeff × rate</span>
            <span className="font-mono font-bold text-slate-900">₹{fmt(previewAmt)}</span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold text-sm">Cancel</button>
            <button type="submit" disabled={pending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow">
              {pending ? "Saving..." : existing ? "Update" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
