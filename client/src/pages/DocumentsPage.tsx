import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { useActiveProject } from "../components/ProjectContext";
import {
  FolderOpen,
  Plus,
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  ExternalLink,
  FileCheck,
  Tag
} from "lucide-react";
import { useRole } from "../components/AppLayout";

const DOCUMENT_CATEGORIES = [
  "All Categories",
  "Agreement",
  "BOQ",
  "Drawings",
  "DPR",
  "Survey",
  "QA/QC",
  "Measurement",
  "RA Bills",
  "Hindrance",
  "Correspondence",
  "Site Photos",
  "Completion"
] as const;

export default function DocumentsPage() {
  const { role } = useRole();
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [roadId, setRoadId] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState<any>("Drawings");
  const [title, setTitle] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [fileUrl, setFileUrl] = useState("/manus-storage/Standard_Cross_Section_RDX.pdf");
  const [fileSize, setFileSize] = useState("4.2 MB");
  const [uploadedBy, setUploadedBy] = useState("Er. Design Division");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("Approved Good For Construction (GFC).");

  const { projectId: activeProjectId } = useActiveProject();

  const { data: documents, isLoading, refetch } = trpc.documents.list.useQuery({
    projectId: activeProjectId,
    category: selectedCategory !== "All Categories" ? selectedCategory : undefined,
  });

  const { data: roads } = trpc.roads.list.useQuery({ projectId: activeProjectId });

  const createDoc = trpc.documents.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setTitle("");
    setDocumentNumber("");
    setRemarks("");
  };

  const filtered = (documents || []).filter(({ doc: d }) => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.documentNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Project Document & Drawing Repository
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-200 text-slate-800">
              12 Construction Categories
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized archive for contract agreements, BOQ, GFC drawings, survey data, RA bills, and completion records.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, number or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          <span className="text-xs text-slate-500 self-end sm:self-auto">
            Showing {filtered.length} of {documents?.length || 0} documents
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 text-[11px] pb-1">
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg shrink-0 font-medium transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white font-bold shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid / Cards */}
      <div className="overflow-auto boq-table-scroll pr-1" style={{ maxHeight: "65vh" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ doc: d, road }) => (
          <div
            key={d.id}
            className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                  {d.category}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{d.fileSize || "PDF"}</span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 line-clamp-2">
                {d.title}
              </h3>

              <div className="text-xs text-slate-500 space-y-1">
                {d.documentNumber && (
                  <p className="font-mono text-[11px] text-slate-700">
                    Doc No: <strong>{d.documentNumber}</strong>
                  </p>
                )}
                {road && (
                  <p className="text-[11px] text-slate-600">
                    Applicable to: <strong>{road.roadId} ({road.roadName})</strong>
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  Uploaded: {d.date} • {d.uploadedBy || "Project Authority"}
                </p>
              </div>

              {d.remarks && (
                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded">
                  {d.remarks}
                </p>
              )}
            </div>

            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>View / Download File</span>
              </a>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Modal: Upload / Register Document */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="border-b pb-2">
              <h3 className="text-base font-bold text-slate-900">Upload Project Document</h3>
              <p className="text-xs text-slate-500">
                Register engineering drawings, agreements, DPRs, bills and QA test archives.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Document Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border rounded font-semibold text-slate-800"
                  >
                    {DOCUMENT_CATEGORIES.slice(1).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target Road (optional)</label>
                  <select
                    value={roadId || ""}
                    onChange={(e) => setRoadId(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">All / Package-Level</option>
                    {roads?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roadId} - {r.roadName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Plan & Profile GFC Drawing Sheet 04"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Document Reference Number</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="e.g. DWG-GFC-RD04-REV1"
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Uploaded By</label>
                  <input
                    type="text"
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Document Storage URL</label>
                  <input
                    type="text"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="w-full p-2 border rounded font-mono text-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">File Size / Format</label>
                  <input
                    type="text"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    placeholder="e.g. 8.5 MB PDF"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Remarks & Approval Notes</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Approved by Independent Engineer, revision date..."
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
                disabled={!title || !fileUrl}
                onClick={() => {
                  createDoc.mutate({
                    projectId: activeProjectId as number,
                    roadId,
                    category,
                    title,
                    documentNumber,
                    fileUrl,
                    fileSize,
                    uploadedBy,
                    date,
                    remarks,
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                Save Document Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
