import React, { useState, useMemo, useRef } from "react";
import { trpc } from "../lib/trpc";
import {
  Boxes,
  Compass,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Waves,
  Building,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  ExternalLink,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";

const STRUCTURE_CATEGORIES = [
  "All Types",
  "Slab Culvert",
  "HPC",
  "Box Culvert",
  "Minor Bridge",
  "Causeway",
  "Retaining Wall",
  "Toe Wall",
  "Drain",
] as const;

export interface StructurePhoto {
  id: string;
  url: string;
  caption?: string;
  chainage?: string;
  uploadedAt: string;
}

export default function RoadStructuresPage() {
  const { role } = useRole();
  const [selectedRoadId, setSelectedRoadId] = useState<string>("All Roads");
  const [selectedType, setSelectedType] = useState<string>("All Types");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Statuses");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<any | null>(null);
  const [editBillableQty, setEditBillableQty] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editRemarks, setEditRemarks] = useState("");

  // Photo viewer / gallery modal states
  const [activeStructureForPhotos, setActiveStructureForPhotos] = useState<any | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Photo upload states
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadChainage, setUploadChainage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formRoadId, setFormRoadId] = useState<number>(1);
  const [formStructureNo, setFormStructureNo] = useState("");
  const [formType, setFormType] = useState<any>("Slab Culvert");
  const [formChainageFrom, setFormChainageFrom] = useState("0+500");
  const [formChainageTo, setFormChainageTo] = useState("0+510");
  const [formLocation, setFormLocation] = useState("");
  const [formCount, setFormCount] = useState("1.00");
  const [formLength, setFormLength] = useState("8.00");
  const [formWidth, setFormWidth] = useState("3.50");
  const [formHeight, setFormHeight] = useState("2.20");
  const [formQuantity, setFormQuantity] = useState("1.000");
  const [formUnit, setFormUnit] = useState("Nos");
  const [formStatus, setFormStatus] = useState<any>("In Progress");
  const [formRemarks, setFormRemarks] = useState("");

  const { data: roads } = trpc.roads.list.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;

  const { data: summaryData, refetch: refetchSummary } = trpc.structures.summary.useQuery();
  const { data: structuresList, isLoading, refetch: refetchList } = trpc.structures.list.useQuery({
    roadId: selectedRoadId !== "All Roads" ? parseInt(selectedRoadId) : undefined,
    structureType: selectedType !== "All Types" ? (selectedType as any) : undefined,
    status: selectedStatus !== "All Statuses" ? (selectedStatus as any) : undefined,
  });

  const createStructureMutation = trpc.structures.create.useMutation({
    onSuccess: () => {
      refetchList();
      refetchSummary();
      setIsAddOpen(false);
      toast.success("Structure added to Road Register!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add structure");
    },
  });

  const updateStructureMutation = trpc.structures.update.useMutation({
    onSuccess: () => {
      refetchList();
      refetchSummary();
      toast.success("Structure status updated");
    },
  });

  function openEditStructure(s: any) {
    setEditingStructure(s);
    setEditBillableQty(String(s.billableQuantity || "0"));
    setEditStatus(s.status || "Not Started");
    setEditRemarks(s.remarks || "");
  }

  function handleUpdateStructure(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingStructure) return;
    const qty = parseFloat(editBillableQty || "0");
    const total = parseFloat(String(editingStructure.quantity || "0"));
    // Auto-set status based on quantity
    let autoStatus = editStatus;
    if (qty >= total && total > 0) autoStatus = "Completed";
    else if (qty > 0) autoStatus = "In Progress";
    else autoStatus = "Not Started";
    updateStructureMutation.mutate({
      id: editingStructure.id,
      billableQuantity: editBillableQty,
      status: autoStatus as any,
      remarks: editRemarks,
    });
    setEditingStructure(null);
  }

  const uploadPhotoMutation = trpc.structures.uploadPhoto.useMutation({
    onSuccess: (data) => {
      setIsUploading(false);
      refetchList();
      toast.success("Site photo attached successfully!");
      if (activeStructureForPhotos) {
        // update local active structure photos array
        const currentPhotos = parsePhotos(activeStructureForPhotos.structure.photos);
        currentPhotos.unshift(data.photo);
        setActiveStructureForPhotos({
          ...activeStructureForPhotos,
          structure: {
            ...activeStructureForPhotos.structure,
            photos: JSON.stringify(currentPhotos),
          },
        });
      }
      setUploadCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => {
      setIsUploading(false);
      toast.error(err.message || "Photo upload failed");
    },
  });

  const parsePhotos = (photosStr?: string | null): StructurePhoto[] => {
    if (!photosStr) return [];
    try {
      const parsed = JSON.parse(photosStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStructureForPhotos) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG)");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadPhotoMutation.mutate({
        structureId: activeStructureForPhotos.structure.id,
        fileName: file.name,
        fileBase64: base64,
        caption: uploadCaption.trim() || `${activeStructureForPhotos.structure.structureType} at RD ${activeStructureForPhotos.structure.chainageFrom}`,
        chainage: uploadChainage.trim() || activeStructureForPhotos.structure.chainageFrom,
      });
    };
    reader.readAsDataURL(file);
  };

  const filteredStructures = useMemo(() => {
    if (!structuresList) return [];
    if (!search.trim()) return structuresList;
    const q = search.toLowerCase();
    return structuresList.filter(({ structure: s, road }) =>
      s.structureNo.toLowerCase().includes(q) ||
      s.structureType.toLowerCase().includes(q) ||
      (s.locationDescription && s.locationDescription.toLowerCase().includes(q)) ||
      (road && road.roadName.toLowerCase().includes(q))
    );
  }, [structuresList, search]);

  const totalCulverts = (summaryData?.byType["Slab Culvert"] || 0) +
    (summaryData?.byType["HPC"] || 0) +
    (summaryData?.byType["Box Culvert"] || 0) +
    (summaryData?.byType["Minor Bridge"] || 0) +
    (summaryData?.byType["Causeway"] || 0);

  const totalRetainingWallMeters = summaryData?.roadWise?.reduce((acc, r) => acc + (r.counts.retainingWall || 0), 0) || 0;
  const totalToeWallMeters = summaryData?.roadWise?.reduce((acc, r) => acc + (r.counts.toeWall || 0), 0) || 0;
  const totalDrainMeters = summaryData?.roadWise?.reduce((acc, r) => acc + (r.counts.drain || 0), 0) || 0;

  const totalPhotosCount = useMemo(() => {
    if (!structuresList) return 0;
    return structuresList.reduce((acc, { structure: s }) => acc + parsePhotos(s.photos).length, 0);
  }, [structuresList]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStructureMutation.mutate({
      structureNo: formStructureNo.trim() || `STR-${Date.now().toString().slice(-6)}`,
      projectId: activeProjectId,
      roadId: formRoadId,
      structureType: formType,
      chainageFrom: formChainageFrom,
      chainageTo: formChainageTo || undefined,
      locationDescription: formLocation || undefined,
      count: formCount || "1.00",
      length: formLength || undefined,
      width: formWidth || undefined,
      height: formHeight || undefined,
      quantity: formQuantity || "1.000",
      unit: formUnit,
      status: formStatus,
      billableQuantity: formQuantity || "0.000",
      remarks: formRemarks || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Road Structures, CD Works & Protection Register
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
              14 Roads Master Inventory
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track Pul-Puliya (Slab Culvert, HPC, Box Culvert), Protection Works (Retaining Wall, Toe Wall), Roadside Drains & <strong>Site Geo-Tagged Photos</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormStructureNo(`STR-${Date.now().toString().slice(-5)}`);
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Structure / CD Work</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Total Pul-Puliya (CD Works)</span>
          <span className="text-2xl font-black text-slate-900">{totalCulverts} Units</span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Slab: {summaryData?.byType["Slab Culvert"] || 0} • HPC: {summaryData?.byType["HPC"] || 0} • Box: {summaryData?.byType["Box Culvert"] || 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Retaining Wall (Protection)</span>
          <span className="text-2xl font-black text-emerald-600">{totalRetainingWallMeters.toLocaleString()} Rmt</span>
          <span className="text-[11px] text-emerald-700 mt-1 block font-semibold">High embankment & pond protection</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Toe Wall (Slope Protection)</span>
          <span className="text-2xl font-black text-blue-600">{totalToeWallMeters.toLocaleString()} Rmt</span>
          <span className="text-[11px] text-blue-700 mt-1 block font-semibold">Cutting & fill slope stabilizing</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Roadside Drains (Pucca/Covered)</span>
          <span className="text-2xl font-black text-purple-600">{totalDrainMeters.toLocaleString()} Rmt</span>
          <span className="text-[11px] text-purple-700 mt-1 block font-semibold">Habitation & market drainage</span>
        </div>

        <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-300 shadow-sm">
          <span className="text-xs font-semibold text-amber-900 flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-amber-600" /> Structure Site Photos
          </span>
          <span className="text-2xl font-black text-amber-700">{totalPhotosCount} Attached</span>
          <span className="text-[11px] text-amber-800 mt-1 block font-medium">Pre/during/post construction gallery</span>
        </div>
      </div>

      {/* Road-wise Summary Table (At a Glance: Kis road me kitna hai) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-500" /> Road-wise Structures & Protection Summary (14 Roads)
            </h2>
            <p className="text-[11px] text-slate-500">Quick breakdown of Pul-puliya, Protection walls and Drains across each road stretch.</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Click any road below to filter individual ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Road ID & Name</th>
                <th className="py-2.5 px-3">Length</th>
                <th className="py-2.5 px-3 text-center bg-slate-800">Slab Culvert</th>
                <th className="py-2.5 px-3 text-center bg-slate-800">HPC Pipe</th>
                <th className="py-2.5 px-3 text-center bg-slate-800">Box/Minor Br</th>
                <th className="py-2.5 px-3 text-center bg-emerald-950 text-emerald-300">Retaining Wall</th>
                <th className="py-2.5 px-3 text-center bg-blue-950 text-blue-300">Toe Wall</th>
                <th className="py-2.5 px-3 text-center bg-purple-950 text-purple-300">Pucca Drain</th>
                <th className="py-2.5 px-3 text-center">Status (Done / Total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {summaryData?.roadWise?.map((rw) => (
                <tr
                  key={rw.roadId}
                  onClick={() => setSelectedRoadId(String(rw.roadId))}
                  className={`cursor-pointer hover:bg-amber-50/60 transition ${
                    selectedRoadId === String(rw.roadId) ? "bg-amber-100/70 font-bold" : ""
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-xs font-bold text-slate-900 block">{rw.roadCode}</span>
                    <span className="text-[11px] text-slate-600">{rw.roadName}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{rw.roadLengthKm} Km</td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                    {rw.counts.slabCulvert > 0 ? `${rw.counts.slabCulvert} Nos` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                    {rw.counts.hpc > 0 ? `${rw.counts.hpc} Nos` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                    {rw.counts.boxCulvert + rw.counts.minorBridge > 0 ? `${rw.counts.boxCulvert + rw.counts.minorBridge} Nos` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/40">
                    {rw.counts.retainingWall > 0 ? `${rw.counts.retainingWall.toLocaleString()} Rmt` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-blue-700 bg-blue-50/40">
                    {rw.counts.toeWall > 0 ? `${rw.counts.toeWall.toLocaleString()} Rmt` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-purple-700 bg-purple-50/40">
                    {rw.counts.drain > 0 ? `${rw.counts.drain.toLocaleString()} Rmt` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                      {rw.counts.completed} / {rw.counts.totalItems} Complete
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700">Filter Road:</span>
            <select
              value={selectedRoadId}
              onChange={(e) => setSelectedRoadId(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="All Roads">All 14 Roads</option>
              {roads?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roadId} - {r.roadName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
            >
              {STRUCTURE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by ID, chainage, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Detailed Structures Ledger Table with Photo Column */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700">
            Individual Structure Records ({filteredStructures.length} found)
          </span>
          <span className="text-[11px] text-slate-500">Click Photo button to view or attach site photos</span>
        </div>

        <div className="overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
          <table className="w-full text-left text-xs text-slate-600 min-w-[1100px]">
            <thead className="bg-slate-900 text-white font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">Structure No & Road</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Chainage (RD)</th>
                <th className="py-3 px-4">Location / Description</th>
                <th className="py-3 px-4">Dimensions (L × W × H)</th>
                <th className="py-3 px-4">Scope Qty</th>
                <th className="py-3 px-4">Billable Qty</th>
                <th className="py-3 px-4 text-center">Site Photos</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStructures.map(({ structure: s, road }) => {
                const photos = parsePhotos(s.photos);
                const badgeColor =
                  s.structureType === "Slab Culvert" ? "bg-amber-100 text-amber-900 border-amber-300" :
                  s.structureType === "HPC" ? "bg-blue-100 text-blue-900 border-blue-300" :
                  s.structureType === "Retaining Wall" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                  s.structureType === "Toe Wall" ? "bg-cyan-100 text-cyan-900 border-cyan-300" :
                  s.structureType === "Drain" ? "bg-purple-100 text-purple-900 border-purple-300" :
                  "bg-slate-100 text-slate-800 border-slate-300";

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 block mb-0.5">
                        {s.structureNo}
                      </span>
                      <span className="font-sans font-semibold text-slate-800 text-[11px] block">
                        {road?.roadId} • {road?.roadName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {s.structureType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {s.chainageFrom} {s.chainageTo ? `to ${s.chainageTo}` : ""}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="text-slate-900 font-semibold block">{s.locationDescription || "—"}</span>
                      {s.remarks && <span className="text-[10px] text-slate-400 block truncate">{s.remarks}</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {s.length && s.width && s.height
                        ? `${s.length}m × ${s.width}m × ${s.height}m`
                        : s.length
                        ? `L: ${s.length}m`
                        : "As per drawing"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 text-xs">
                      {parseFloat(String(s.quantity)).toLocaleString()} {s.unit}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-amber-700 text-xs">
                      {parseFloat(String(s.billableQuantity)).toLocaleString()} {s.unit}
                    </td>
                    {/* PHOTO SECTION CELL */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setActiveStructureForPhotos({ structure: s, road });
                          setUploadChainage(s.chainageFrom);
                          setIsPhotoModalOpen(true);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          photos.length > 0
                            ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                        <span>{photos.length} Photo{photos.length === 1 ? "" : "s"}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                        s.status === "In Progress" ? "bg-blue-100 text-blue-800" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditStructure(s)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold transition"
                          title="Edit completion quantity"
                        >
                          ✏️ Edit
                        </button>
                        <select
                          value={s.status}
                          onChange={(e) => {
                            updateStructureMutation.mutate({
                              id: s.id,
                              status: e.target.value as any,
                              billableQuantity: e.target.value === "Completed" ? String(s.quantity) : s.billableQuantity,
                            });
                          }}
                          className="p-1 border border-slate-200 rounded text-[10px] font-bold bg-white text-slate-700"
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="On Hold">On Hold</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: STRUCTURE PHOTO GALLERY & UPLOAD SECTION */}
      {isPhotoModalOpen && activeStructureForPhotos && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-500" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Site Photos: {activeStructureForPhotos.structure.structureNo}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeStructureForPhotos.structure.structureType} • {activeStructureForPhotos.road?.roadName} (RD {activeStructureForPhotos.structure.chainageFrom})
                </p>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Upload Area */}
            <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-amber-600" />
                  Attach New Site Photo (Culvert / Wall / Drain)
                </span>
                <span className="text-[11px] text-slate-500">Supports JPG, PNG (Camera or File)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Photo Caption / Work Stage</label>
                  <input
                    type="text"
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    placeholder="e.g. Deck slab reinforcement inspection"
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chainage / Spot RD</label>
                  <input
                    type="text"
                    value={uploadChainage}
                    onChange={(e) => setUploadChainage(e.target.value)}
                    placeholder="e.g. 1+250"
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="structure-photo-upload"
                />
                <label
                  htmlFor="structure-photo-upload"
                  className={`px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition ${
                    isUploading ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <Camera className="w-4 h-4 text-slate-950" />
                  <span>{isUploading ? "Uploading Photo..." : "Take Photo or Upload"}</span>
                </label>
                {isUploading && (
                  <span className="text-xs text-amber-800 font-medium animate-pulse">
                    Saving to project storage...
                  </span>
                )}
              </div>
            </div>

            {/* Photo Gallery Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Attached Photo Gallery ({parsePhotos(activeStructureForPhotos.structure.photos).length})
              </span>

              {parsePhotos(activeStructureForPhotos.structure.photos).length === 0 ? (
                <div className="text-center py-8 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold">No site photos attached for this structure yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click "Take Photo or Upload" above to attach excavation, foundation or casting photos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
                  {parsePhotos(activeStructureForPhotos.structure.photos).map((p) => (
                    <div
                      key={p.id}
                      className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div
                        onClick={() => setPreviewImageModal(p.url)}
                        className="aspect-video bg-slate-100 overflow-hidden cursor-pointer relative"
                      >
                        <img
                          src={p.url}
                          alt={p.caption || "Structure Photo"}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      </div>
                      <div className="p-2 space-y-0.5 text-left">
                        <span className="text-[11px] font-bold text-slate-900 block truncate" title={p.caption}>
                          {p.caption || "Site Snapshot"}
                        </span>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>RD {p.chainage || "—"}</span>
                          <span>{p.uploadedAt ? new Date(p.uploadedAt).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE PREVIEW LIGHTBOX */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-700">
            <img
              src={previewImageModal}
              alt="Fullscreen Inspection"
              className="w-full h-full object-contain max-h-[85vh]"
            />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-full text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Structure */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-500" /> Add Structure / CD / Protection Work
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Structure ID / Code *</label>
                  <input
                    type="text"
                    required
                    value={formStructureNo}
                    onChange={(e) => setFormStructureNo(e.target.value)}
                    placeholder="e.g. RD01-SC-02"
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Target Road Stretch *</label>
                  <select
                    value={formRoadId}
                    onChange={(e) => setFormRoadId(parseInt(e.target.value))}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  >
                    {roads?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roadId} - {r.roadName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Structure Category *</label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const t = e.target.value;
                      setFormType(t);
                      if (t === "Retaining Wall" || t === "Toe Wall" || t === "Drain") {
                        setFormUnit("Rmt");
                      } else {
                        setFormUnit("Nos");
                      }
                    }}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  >
                    <option value="Slab Culvert">Slab Culvert (पुलिया)</option>
                    <option value="HPC">HPC Pipe Culvert (ह्यूम पाइप)</option>
                    <option value="Box Culvert">Box Culvert (बॉक्स पुलिया)</option>
                    <option value="Minor Bridge">Minor Bridge (छोटा पुल)</option>
                    <option value="Causeway">Causeway (रपटा)</option>
                    <option value="Retaining Wall">Retaining Wall (रिटेनिंग वॉल)</option>
                    <option value="Toe Wall">Toe Wall (टो वॉल)</option>
                    <option value="Drain">Roadside Drain (नाली)</option>
                    <option value="Other">Other CD Work</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Execution Status *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700">Chainage Start (RD From) *</label>
                  <input
                    type="text"
                    required
                    value={formChainageFrom}
                    onChange={(e) => setFormChainageFrom(e.target.value)}
                    placeholder="e.g. 1+250"
                    className="mt-1 w-full p-1.5 border border-slate-200 rounded bg-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Chainage End (RD To)</label>
                  <input
                    type="text"
                    value={formChainageTo}
                    onChange={(e) => setFormChainageTo(e.target.value)}
                    placeholder="e.g. 1+260 or 1+600"
                    className="mt-1 w-full p-1.5 border border-slate-200 rounded bg-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Location Details / Landmark</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Village Crossing, Pond Side RHS, Stream discharge"
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Length (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formLength}
                    onChange={(e) => setFormLength(e.target.value)}
                    placeholder="10.0"
                    className="mt-1 w-full p-1.5 border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Width / Span (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formWidth}
                    onChange={(e) => setFormWidth(e.target.value)}
                    placeholder="3.5"
                    className="mt-1 w-full p-1.5 border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Height / Depth (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value)}
                    placeholder="2.0"
                    className="mt-1 w-full p-1.5 border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Scope Quantity *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Unit *</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="Nos or Rmt"
                    className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Remarks / Structural Notes</label>
                <textarea
                  rows={2}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Design drawing reference, foundation depth, weep holes..."
                  className="mt-1 w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStructureMutation.isPending}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  {createStructureMutation.isPending ? "Adding..." : "Save to Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Structure Completion Modal */}
      {editingStructure && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                ✏️ Edit Completion
              </h2>
              <button onClick={() => setEditingStructure(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>
            <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
              <strong>{editingStructure.structureNo}</strong> • {editingStructure.structureType}
              <br />
              <span className="text-slate-600">Total Scope: <strong className="font-mono">{editingStructure.quantity} {editingStructure.unit}</strong></span>
            </div>
            <form onSubmit={handleUpdateStructure} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Completed Quantity *</label>
                <input
                  type="number" step="0.001" required
                  value={editBillableQty}
                  onChange={(e) => setEditBillableQty(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-emerald-200 rounded-lg bg-emerald-50 font-mono font-bold text-emerald-700"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Kitna complete hua hai — yahi se update karo.
                  {parseFloat(editBillableQty || "0") > 0 && parseFloat(String(editingStructure.quantity || "0")) > 0 && (
                    <span className="font-bold text-emerald-600">
                      {" "}({((parseFloat(editBillableQty) / parseFloat(String(editingStructure.quantity))) * 100).toFixed(1)}% complete)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="font-bold text-slate-700">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Quantity se auto-set hoga (100% = Completed)</p>
              </div>
              <div>
                <label className="font-bold text-slate-700">Remarks</label>
                <textarea
                  rows={2} value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Optional notes..."
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button" onClick={() => setEditingStructure(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
