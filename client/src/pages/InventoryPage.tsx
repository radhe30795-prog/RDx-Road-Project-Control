import React, { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Boxes,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  FileCheck2,
  Truck,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";

export default function InventoryPage() {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState<"stock" | "grn" | "issues">("stock");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddMatOpen, setIsAddMatOpen] = useState(false);
  const [isAddGrnOpen, setIsAddGrnOpen] = useState(false);
  const [isAddIssueOpen, setIsAddIssueOpen] = useState(false);

  const { data: projects } = trpc.projects.list.useQuery();
  const activeProjectId = projects?.[0]?.id || 1;
  const { data: roads } = trpc.roads.list.useQuery();
  const { data: boqData } = trpc.boq.list.useQuery({ projectId: activeProjectId });

  // TRPC Queries
  const { data: inventoryList, isLoading: isInvLoading, refetch: refetchInv } = trpc.inventory.list.useQuery({
    projectId: activeProjectId,
  });
  const { data: grnList, isLoading: isGrnLoading, refetch: refetchGrn } = trpc.grn.list.useQuery({
    projectId: activeProjectId,
  });
  const { data: issuesList, isLoading: isIssuesLoading, refetch: refetchIssues } = trpc.materialIssues.list.useQuery();

  // Mutations
  const createMatMutation = trpc.inventory.create.useMutation();
  const createGrnMutation = trpc.grn.create.useMutation();
  const createIssueMutation = trpc.materialIssues.create.useMutation();

  // New Material Form
  const [matCode, setMatCode] = useState("");
  const [matName, setMatName] = useState("");
  const [matUnit, setMatUnit] = useState("MT");
  const [minStock, setMinStock] = useState("100.000");
  const [maxStock, setMaxStock] = useState("1000.000");
  const [openingStock, setOpeningStock] = useState("0.000");
  const [avgRate, setAvgRate] = useState("0.00");
  const [supplier, setSupplier] = useState("");
  const [storageLocation, setStorageLocation] = useState("Central Base Camp");

  // New GRN Form
  const [grnNo, setGrnNo] = useState("");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split("T")[0]);
  const [grnMaterialId, setGrnMaterialId] = useState<number>(1);
  const [grnSupplier, setGrnSupplier] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [grnReceivedQty, setGrnReceivedQty] = useState("");
  const [grnAcceptedQty, setGrnAcceptedQty] = useState("");
  const [grnRejectedQty, setGrnRejectedQty] = useState("0.000");
  const [grnRate, setGrnRate] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [grnRemarks, setGrnRemarks] = useState("");

  // New Direct Issue Form
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [issueRoadId, setIssueRoadId] = useState<number>(1);
  const [issueMaterialId, setIssueMaterialId] = useState<number>(1);
  const [issueBoqId, setIssueBoqId] = useState<number | undefined>(undefined);
  const [issueQty, setIssueQty] = useState("");
  const [issuePurpose, setIssuePurpose] = useState("Direct Site Paving / Laying");

  // Stock statistics
  const stats = useMemo(() => {
    if (!inventoryList?.length) return { totalItems: 0, lowStockCount: 0, totalValuation: 0 };
    let lowCount = 0;
    let valuation = 0;
    inventoryList.forEach((m) => {
      const bal = parseFloat(String(m.balanceQuantity || 0));
      const min = parseFloat(String(m.minStock || 0));
      const rate = parseFloat(String(m.averageRate || 0));
      if (bal <= min) lowCount++;
      valuation += bal * rate;
    });
    return {
      totalItems: inventoryList.length,
      lowStockCount: lowCount,
      totalValuation: valuation,
    };
  }, [inventoryList]);

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMatMutation.mutateAsync({
        materialCode: matCode.trim().toUpperCase(),
        projectId: activeProjectId,
        materialName: matName.trim(),
        unit: matUnit,
        minStock,
        maxStock,
        openingStock,
        averageRate: avgRate,
        supplier: supplier.trim() || undefined,
        storageLocation: storageLocation.trim() || undefined,
        approvalStatus: "Approved",
      });
      toast.success("Material added to inventory master");
      setIsAddMatOpen(false);
      setMatCode("");
      setMatName("");
      refetchInv();
    } catch (err: any) {
      toast.error(err.message || "Failed to create material");
    }
  };

  const handleCreateGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    const selMat = inventoryList?.find((m) => m.id === grnMaterialId);
    if (!selMat) {
      toast.error("Please select a material");
      return;
    }
    const autoGrn = grnNo.trim() || `GRN-${Date.now().toString().slice(-6)}`;
    const accepted = grnAcceptedQty || grnReceivedQty;
    const rateVal = grnRate || selMat.averageRate;

    try {
      await createGrnMutation.mutateAsync({
        grnNo: autoGrn,
        grnDate,
        projectId: activeProjectId,
        materialId: grnMaterialId,
        supplier: grnSupplier.trim() || selMat.supplier || "Site Vendor",
        challanNo: challanNo.trim() || undefined,
        receivedQuantity: grnReceivedQty,
        acceptedQuantity: accepted,
        rejectedQuantity: grnRejectedQty,
        unit: selMat.unit,
        rate: rateVal,
        invoiceReference: invoiceRef.trim() || undefined,
        remarks: grnRemarks.trim() || undefined,
      });

      toast.success(`GRN ${autoGrn} posted! Stock balance updated.`);
      setIsAddGrnOpen(false);
      setGrnNo("");
      setGrnReceivedQty("");
      setGrnAcceptedQty("");
      refetchGrn();
      refetchInv();
    } catch (err: any) {
      toast.error(err.message || "Failed to post GRN");
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const selMat = inventoryList?.find((m) => m.id === issueMaterialId);
    if (!selMat) return;

    const issueNo = `ISS-${Date.now().toString().slice(-6)}`;
    try {
      await createIssueMutation.mutateAsync({
        issueNo,
        issueDate,
        projectId: activeProjectId,
        roadId: issueRoadId,
        materialId: issueMaterialId,
        boqItemId: issueBoqId || undefined,
        quantity: issueQty,
        unit: selMat.unit,
        purpose: issuePurpose,
      });

      toast.success(`Material issue ${issueNo} recorded! Stock balance updated.`);
      setIsAddIssueOpen(false);
      setIssueQty("");
      refetchIssues();
      refetchInv();
    } catch (err: any) {
      toast.error(err.message || "Failed to record issue");
    }
  };

  const isAuthorized =
    role === "admin" ||
    role === "project_manager" ||
    role === "site_engineer" ||
    role === "qs_billing_engineer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Material Inventory & Stock Ledger
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time material balances, Goods Receipt Notes (GRN), and site consumption linked to DPR and BOQ.
          </p>
        </div>
        {isAuthorized && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddGrnOpen(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Record GRN Receipt</span>
            </button>
            <button
              onClick={() => setIsAddIssueOpen(true)}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Issue Material</span>
            </button>
            <button
              onClick={() => setIsAddMatOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>New Material</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Materials Tracked</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {stats.totalItems} Items
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Aggregates, bitumen, cement, fuel</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Stock Valuation on Site</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            ₹{(stats.totalValuation / 100000).toFixed(2)} Lakh
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block font-semibold">Active current inventory</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Low Stock Alerts</span>
          <span
            className={`text-xl sm:text-2xl font-extrabold font-mono mt-1 block ${
              stats.lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {stats.lowStockCount} Items
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Below reorder minimum</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">GRN Receipts Posted</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {grnList?.length || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{issuesList?.length || 0} issue entries logged</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab("stock")}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "stock"
              ? "border-amber-500 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Boxes className="w-4 h-4" /> Stock Ledger & Balances
        </button>
        <button
          onClick={() => setActiveTab("grn")}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "grn"
              ? "border-emerald-500 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> Goods Receipt Notes (GRN)
        </button>
        <button
          onClick={() => setActiveTab("issues")}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "issues"
              ? "border-blue-500 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-blue-600" /> Site Issues & DPR Consumption
        </button>
      </div>

      {/* TAB 1: STOCK LEDGER */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search material by code, name, supplier or yard location..."
              className="w-full px-3 py-1.5 text-xs bg-transparent focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Material Code & Name</th>
                    <th className="p-3 text-right">Opening</th>
                    <th className="p-3 text-right">Received</th>
                    <th className="p-3 text-right">Issued (DPR)</th>
                    <th className="p-3 text-right">Balance Stock</th>
                    <th className="p-3 text-right">Min / Max</th>
                    <th className="p-3 text-right">Avg Rate (₹)</th>
                    <th className="p-3">Yard Location</th>
                    <th className="p-3 text-center">Stock Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isInvLoading ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">Loading stock balances...</td>
                    </tr>
                  ) : (
                    inventoryList
                      ?.filter(
                        (m) =>
                          m.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (m.storageLocation || "").toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((mat) => {
                        const bal = parseFloat(String(mat.balanceQuantity || 0));
                        const min = parseFloat(String(mat.minStock || 0));
                        const max = parseFloat(String(mat.maxStock || 0));
                        const isLow = bal <= min;
                        const isHigh = max > 0 && bal >= max;

                        return (
                          <tr key={mat.id} className="hover:bg-slate-50 transition">
                            <td className="p-3">
                              <span className="font-mono font-bold text-slate-900 block">{mat.materialCode}</span>
                              <span className="text-slate-600 block text-[11px] font-semibold">{mat.materialName}</span>
                              <span className="text-[10px] text-slate-400 block">{mat.supplier || "Regular Source"}</span>
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                              {parseFloat(String(mat.openingStock)).toLocaleString()} {mat.unit}
                            </td>
                            <td className="p-3 text-right font-mono font-semibold text-emerald-600 whitespace-nowrap">
                              +{parseFloat(String(mat.receivedQuantity)).toLocaleString()} {mat.unit}
                            </td>
                            <td className="p-3 text-right font-mono font-semibold text-blue-600 whitespace-nowrap">
                              -{parseFloat(String(mat.issuedQuantity)).toLocaleString()} {mat.unit}
                            </td>
                            <td className="p-3 text-right font-mono font-extrabold whitespace-nowrap">
                              <span
                                className={`px-2 py-1 rounded-md ${
                                  isLow ? "bg-red-50 text-red-700 font-bold" : "bg-slate-100 text-slate-900"
                                }`}
                              >
                                {parseFloat(String(mat.balanceQuantity)).toLocaleString()} {mat.unit}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono text-[10px] text-slate-500 whitespace-nowrap">
                              Min: {parseFloat(String(mat.minStock)).toLocaleString()}
                              <br />
                              Max: {parseFloat(String(mat.maxStock)).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-700 whitespace-nowrap">
                              ₹{parseFloat(String(mat.averageRate)).toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {mat.storageLocation || "Central Yard"}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {isLow ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Low Stock
                                </span>
                              ) : isHigh ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  Max Reached
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Optimal
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GRN REGISTER */}
      {activeTab === "grn" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">GRN No. & Date</th>
                  <th className="p-3">Material</th>
                  <th className="p-3">Supplier / Vendor</th>
                  <th className="p-3">Challan / Invoice</th>
                  <th className="p-3 text-right">Received Qty</th>
                  <th className="p-3 text-right">Accepted Qty</th>
                  <th className="p-3 text-right">Rate</th>
                  <th className="p-3 text-right">Total (₹)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isGrnLoading ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">Loading GRN entries...</td>
                  </tr>
                ) : grnList?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">No GRN receipts recorded yet.</td>
                  </tr>
                ) : (
                  grnList?.map(({ grn, material }) => (
                    <tr key={grn.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 block">{grn.grnNo}</span>
                        <span className="text-[10px] text-slate-400 block">{grn.grnDate}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block">{material?.materialName}</span>
                        <span className="font-mono text-[10px] text-slate-400">{material?.materialCode}</span>
                      </td>
                      <td className="p-3 text-slate-700">{grn.supplier}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        Ch: {grn.challanNo || "—"}
                        {grn.invoiceReference && <span className="block text-[10px] text-slate-400">Inv: {grn.invoiceReference}</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-800">
                        {parseFloat(String(grn.receivedQuantity)).toLocaleString()} {grn.unit}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        {parseFloat(String(grn.acceptedQuantity)).toLocaleString()} {grn.unit}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">₹{parseFloat(String(grn.rate)).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">₹{parseFloat(String(grn.totalAmount)).toLocaleString()}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {grn.inspectionStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MATERIAL ISSUES (Direct + DPR) */}
      {activeTab === "issues" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Issue No. & Date</th>
                  <th className="p-3">Road Stretch</th>
                  <th className="p-3">Material Consumed</th>
                  <th className="p-3 text-right">Quantity Issued</th>
                  <th className="p-3">Linked BOQ Item</th>
                  <th className="p-3">Purpose & DPR Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isIssuesLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">Loading material issues...</td>
                  </tr>
                ) : issuesList?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">No material issues logged yet.</td>
                  </tr>
                ) : (
                  issuesList?.map(({ issue, material, road, boq }) => (
                    <tr key={issue.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 block">{issue.issueNo}</span>
                        <span className="text-[10px] text-slate-400 block">{issue.issueDate}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {road ? `${road.roadId} - ${road.roadName}` : "Central Yard"}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 block">{material?.materialName}</span>
                        <span className="font-mono text-[10px] text-slate-400">{material?.materialCode}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                        {parseFloat(String(issue.quantity)).toLocaleString()} {issue.unit}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {boq ? (
                          <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                            {boq.itemCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">General Site Issue</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 text-[11px]">
                        <span>{issue.purpose}</span>
                        {issue.dailyProgressId && (
                          <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                            Linked to DPR execution #{issue.dailyProgressId}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD MATERIAL MASTER */}
      {isAddMatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-500" /> New Material Master
              </h2>
              <button onClick={() => setIsAddMatOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateMaterial} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Material Code *</label>
                  <input
                    type="text"
                    required
                    value={matCode}
                    onChange={(e) => setMatCode(e.target.value)}
                    placeholder="e.g. MAT-AGG-10"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Unit *</label>
                  <input
                    type="text"
                    required
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    placeholder="MT / Cum / Bags / Litre"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Material Name & Specification *</label>
                <input
                  type="text"
                  required
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="e.g. Coarse Aggregate 10mm Graded"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Opening Stock</label>
                  <input
                    type="number"
                    step="0.001"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Min Reorder</label>
                  <input
                    type="number"
                    step="0.001"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Max Stock</label>
                  <input
                    type="number"
                    step="0.001"
                    value={maxStock}
                    onChange={(e) => setMaxStock(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Average Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={avgRate}
                    onChange={(e) => setAvgRate(e.target.value)}
                    placeholder="e.g. 780.00"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Yard / Godown</label>
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Supplier / Source</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Local Stone Crusher"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMatOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMatMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD GRN RECEIPT */}
      {isAddGrnOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" /> Record GRN Material Receipt
              </h2>
              <button onClick={() => setIsAddGrnOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateGrn} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">GRN No. (Optional)</label>
                  <input
                    type="text"
                    value={grnNo}
                    onChange={(e) => setGrnNo(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Receipt Date *</label>
                  <input
                    type="date"
                    required
                    value={grnDate}
                    onChange={(e) => setGrnDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Material Received *</label>
                <select
                  value={grnMaterialId}
                  onChange={(e) => setGrnMaterialId(parseInt(e.target.value))}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  {inventoryList?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.materialName} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={grnSupplier}
                    onChange={(e) => setGrnSupplier(e.target.value)}
                    placeholder="Supplier / refinery name"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Challan / Gate Pass</label>
                  <input
                    type="text"
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    placeholder="e.g. CH-9901"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Received Quantity *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={grnReceivedQty}
                    onChange={(e) => {
                      setGrnReceivedQty(e.target.value);
                      if (!grnAcceptedQty) setGrnAcceptedQty(e.target.value);
                    }}
                    placeholder="Quantity as per weighbridge"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Accepted Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    value={grnAcceptedQty}
                    onChange={(e) => setGrnAcceptedQty(e.target.value)}
                    placeholder="Accepted into stock"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Unit Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={grnRate}
                    onChange={(e) => setGrnRate(e.target.value)}
                    placeholder="Purchase rate per unit"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Invoice Reference</label>
                  <input
                    type="text"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    placeholder="e.g. INV-2026-12"
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Quality Inspection / Remarks</label>
                <input
                  type="text"
                  value={grnRemarks}
                  onChange={(e) => setGrnRemarks(e.target.value)}
                  placeholder="Sample approved, test batch reference"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddGrnOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGrnMutation.isPending}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  Post GRN to Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DIRECT MATERIAL ISSUE */}
      {isAddIssueOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-600" /> Issue Material to Road Site
              </h2>
              <button onClick={() => setIsAddIssueOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateIssue} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Target Road Stretch *</label>
                  <select
                    value={issueRoadId}
                    onChange={(e) => setIssueRoadId(parseInt(e.target.value))}
                    className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    {roads?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roadId} - {r.roadName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Material to Issue *</label>
                <select
                  value={issueMaterialId}
                  onChange={(e) => setIssueMaterialId(parseInt(e.target.value))}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  {inventoryList?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.materialName} (Available: {parseFloat(String(m.balanceQuantity)).toLocaleString()} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Linked BOQ Item (Optional)</label>
                <select
                  value={issueBoqId || ""}
                  onChange={(e) => setIssueBoqId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="">None / General Consumption</option>
                  {boqData?.map(({ boq }) => (
                    <option key={boq.id} value={boq.id}>
                      {boq.itemCode} - {boq.chapter}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Issue Quantity *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={issueQty}
                  onChange={(e) => setIssueQty(e.target.value)}
                  placeholder="Quantity to deduct from yard balance"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Purpose / Work Description *</label>
                <input
                  type="text"
                  required
                  value={issuePurpose}
                  onChange={(e) => setIssuePurpose(e.target.value)}
                  placeholder="e.g. Subgrade compaction RD 0+500 to 1+200"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddIssueOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createIssueMutation.isPending}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold shadow disabled:opacity-50"
                >
                  Issue & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
