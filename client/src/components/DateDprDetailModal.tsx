import React from "react";
import { trpc } from "../lib/trpc";
import {
  Calendar,
  X,
  FileCheck,
  TrendingUp,
  Boxes,
  Cpu,
  Layers,
  Receipt,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Fuel,
  Hammer,
  Camera
} from "lucide-react";

interface DateDprModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  roadId?: number;
}

function parseDprPhotos(value?: string | null): Array<{ url: string; caption?: string; sectionType?: string; chainage?: string; uploadedAt?: string }> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy demo rows may contain a single URL.
  }
  return [{ url: value }];
}

export default function DateDprDetailModal({ isOpen, onClose, date, roadId }: DateDprModalProps) {
  const { data, isLoading } = trpc.dailyProgress.byDate.useQuery(
    { date, roadId },
    { enabled: isOpen && !!date }
  );

  if (!isOpen) return null;

  const entries = data?.entries || [];
  const measurements = data?.measurements || [];
  const bills = data?.matchingBills || [];
  const summary = data?.summary || { totalEntries: 0, actualQuantityTotal: 0, billableQuantityTotal: 0, bySection: {} };

  const highwayEntries = entries.filter((e) => !e.dp.sectionType || e.dp.sectionType === "Highway Works");
  const concreteEntries = entries.filter((e) => e.dp.sectionType === "Concrete Works");
  const materialEntries = entries.filter((e) => e.dp.sectionType === "Material");
  const machineEntries = entries.filter((e) => e.dp.sectionType === "Machine");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5 my-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                DPR & Bill Verification Audit
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-300 font-mono text-xs font-bold">
                {date}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Administrative inspection for Highway, Concrete, Material and Machine sections with corresponding billable quantities.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-xl">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Total DPR Entries</span>
            <span className="text-xl sm:text-2xl font-black text-white">{summary.totalEntries}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Actual Executed</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {summary.actualQuantityTotal.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Billable Quantity</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">
              {summary.billableQuantityTotal.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Matching Bills</span>
            <span className="text-xl sm:text-2xl font-black text-blue-300">{bills.length} Bills</span>
          </div>
        </div>

        {/* Section 1: Highway Works */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> 1. Highway Works (BT, Earthwork, GSB, WMM)
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              {highwayEntries.length} Items
            </span>
          </div>

          {highwayEntries.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No highway entries logged on this date.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
              {highwayEntries.map(({ dp, road, activity, boq }) => (
                <div key={dp.id} className="p-3.5 space-y-2 hover:bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-slate-900">
                      {road?.roadId} • {road?.roadName} {dp.chainageFrom && `(Ch: ${dp.chainageFrom} to ${dp.chainageTo || "End"})`}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">{activity?.activityName}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2 rounded">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Planned Qty</span>
                      <span className="font-semibold">{dp.plannedQuantity} {dp.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Actual Done</span>
                      <span className="font-bold text-emerald-700">{dp.actualQuantity} {dp.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Billable Quantity</span>
                      <span className="font-bold text-amber-700">{dp.billableQuantity || dp.actualQuantity} {dp.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Billing Status</span>
                      <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded inline-block ${
                        dp.billingStatus === "Included in Bill" ? "bg-emerald-100 text-emerald-800" :
                        dp.billingStatus === "Ready for Bill" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
                      }`}>
                        {dp.billingStatus || "Pending"}
                      </span>
                    </div>
                  </div>

                  {boq && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Linked BOQ: <strong className="font-mono">{boq.itemCode}</strong> - {boq.chapter} (Rate: ₹{boq.rate}/{boq.unit})</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Concrete Works */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-blue-600" /> 2. Concrete Works (CC Road, Culverts, Drains, PCC/RCC)
            </h3>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
              {concreteEntries.length} Items
            </span>
          </div>

          {concreteEntries.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No concrete works recorded on this date.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
              {concreteEntries.map(({ dp, road, activity, boq }) => (
                <div key={dp.id} className="p-3.5 space-y-2 hover:bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{road?.roadId} • {road?.roadName}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                      Concrete Pour
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{activity?.activityName} • Chainage {dp.chainageFrom || "0+000"} to {dp.chainageTo || "1+000"}</p>
                  <div className="grid grid-cols-3 gap-2 bg-blue-50/50 p-2 rounded text-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Pour Volume</span>
                      <span className="font-bold">{dp.actualQuantity} {dp.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Billable Volume</span>
                      <span className="font-bold text-amber-700">{dp.billableQuantity || dp.actualQuantity} {dp.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Progress</span>
                      <span className="font-bold text-emerald-700">{dp.percentageComplete}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Material Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" /> 3. Material Section (Consumption & Stock Issues)
            </h3>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
              {materialEntries.length} Items
            </span>
          </div>

          {materialEntries.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No separate material entries on this date.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
              {materialEntries.map(({ dp, material }) => (
                <div key={dp.id} className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{material?.materialName || "Material Stock Issue"}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Code: {material?.materialCode || "N/A"}{dp.materialChallanNo ? ` • Challan: ${dp.materialChallanNo}` : ""}</span>
                    </div>
                    <div className="text-right text-[11px]">
                      {parseFloat(String(dp.materialReceivedQuantity || 0)) > 0 && (
                        <span className="font-bold text-emerald-700 block">+{dp.materialReceivedQuantity} {dp.unit} received</span>
                      )}
                      {parseFloat(String(dp.materialConsumedQuantity || 0)) > 0 && (
                        <span className="font-bold text-blue-700 block">{dp.materialConsumedQuantity} {dp.unit} consumed</span>
                      )}
                      {parseFloat(String(dp.materialWastageQuantity || 0)) > 0 && (
                        <span className="font-bold text-rose-600 block">{dp.materialWastageQuantity} {dp.unit} wastage</span>
                      )}
                    </div>
                  </div>
                  {dp.materialOpeningBalance != null && (
                    <p className="text-[10px] text-slate-500">
                      Opening {dp.materialOpeningBalance} → Closing {(parseFloat(String(dp.materialOpeningBalance)) + parseFloat(String(dp.materialReceivedQuantity || 0)) - parseFloat(String(dp.materialConsumedQuantity || 0)) - parseFloat(String(dp.materialWastageQuantity || 0))).toFixed(3)} {dp.unit}
                      {dp.materialSupplier ? ` • ${dp.materialSupplier}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Machine Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-600" /> 4. Machine Section (Plant, Machinery & Equipment)
            </h3>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
              {machineEntries.length} Items
            </span>
          </div>

          {machineEntries.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No separate machinery records on this date.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
              {machineEntries.map(({ dp, road, asset }) => (
                <div key={dp.id} className="p-3.5 space-y-1">
                  <div className="flex justify-between items-center">
                    <strong className="text-slate-900">{asset ? `${asset.assetNo} — ${asset.assetType}` : (dp.machinery || "Plant & Machinery")}</strong>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${dp.machineStatus === "Working" ? "bg-emerald-100 text-emerald-800" : dp.machineStatus === "Idle" ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-800"}`}>
                      {dp.machineStatus || "Working"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {dp.machineWorkingHours ? <>Working <strong className="font-mono">{dp.machineWorkingHours}h</strong></> : null}
                    {dp.fuelConsumed ? <> • Diesel <strong className="font-mono">{dp.fuelConsumed} Ltr</strong></> : null}
                    {dp.hourMeterClosing ? <> • Meter <strong className="font-mono">{dp.hourMeterOpening || "—"} → {dp.hourMeterClosing}</strong></> : null}
                  </p>
                  <p className="text-[11px] text-slate-500">Road: {road?.roadName}{dp.machineLocation ? ` • At: ${dp.machineLocation}` : ""}{dp.machineOperator ? ` • Op: ${dp.machineOperator}` : ""} • Remarks: {dp.remarks || "No remarks"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4A: Photo Evidence for every work type */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-600" /> Site Photo Evidence — All DPR Work Sections
            </h3>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold">
              {entries.reduce((total, entry) => total + parseDprPhotos(entry.dp.sitePhotos).length, 0)} Photos
            </span>
          </div>

          {entries.every((entry) => parseDprPhotos(entry.dp.sitePhotos).length === 0) ? (
            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">No site photos attached to DPR entries on this date.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {entries.flatMap(({ dp, road, activity }) => parseDprPhotos(dp.sitePhotos).map((photo, index) => (
                <a
                  key={`${dp.id}-${photo.url}-${index}`}
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex gap-3 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm transition"
                >
                  <img src={photo.url} alt={photo.caption || "DPR site photo"} className="w-24 h-16 object-cover rounded-lg border border-slate-200 shrink-0" />
                  <span className="min-w-0 text-[11px]">
                    <strong className="block text-slate-900 truncate">{photo.caption || "DPR Site Photo"}</strong>
                    <span className="block text-amber-800 font-bold mt-0.5">{dp.sectionType || "Highway Works"}</span>
                    <span className="block text-slate-500 truncate">{road?.roadId} • {activity?.activityName || "Activity"}</span>
                    <span className="block text-slate-400 font-mono">RD {photo.chainage || dp.chainageFrom || "—"}</span>
                  </span>
                </a>
              ))) }
            </div>
          )}
        </div>

        {/* Section 5: Connected Measurement Book & Billing Quantities */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" /> Verified e-MB Measurements on {date}
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">{measurements.length} Measurements Recorded</span>
          </div>

          {measurements.length === 0 ? (
            <p className="text-xs text-slate-500">No official e-MB measurements booked for this specific date.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {measurements.map(({ mb, boq, road }) => (
                <div key={mb.id} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-slate-900 block">{mb.mbNo} • {road?.roadName}</span>
                    <span className="text-slate-600 text-[11px]">
                      BOQ: {boq?.itemCode} ({mb.locationFrom} to {mb.locationTo}) — L:{mb.length}m × W:{mb.width}m × D:{mb.depth}m
                    </span>
                  </div>
                  <div className="text-right sm:shrink-0">
                    <span className="font-black text-emerald-700 block text-sm">
                      {mb.calculatedQuantity} {mb.unit} (₹{parseFloat(String(mb.amount)).toLocaleString()})
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{mb.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {bills.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Associated Running Account (RA) Bills:</span>
              <div className="flex flex-wrap gap-2">
                {bills.map(({ bill, road }) => (
                  <span key={bill.id} className="px-2.5 py-1 rounded bg-white border border-slate-300 text-xs font-semibold text-slate-800">
                    {bill.billId} ({road?.roadId}) — ₹{parseFloat(String(bill.netPayable || bill.passedAmount || 0)).toLocaleString()} [{bill.verificationStatus}]
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
