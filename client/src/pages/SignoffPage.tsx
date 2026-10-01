import React, { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  XCircle,
  Signature,
  FileSpreadsheet,
  Receipt,
  Microscope,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../components/AppLayout";

export default function SignoffPage() {
  const { role } = useRole();
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  // Request form
  const [entityType, setEntityType] = useState("e-MB Record");
  const [entityId, setEntityId] = useState("MB-2026-001");
  const [stage, setStage] = useState("Joint Inspection & Measurement Verification");
  const [assignedRole, setAssignedRole] = useState("qs_billing_engineer");
  const [comments, setComments] = useState("Please verify chainage dimensions and approve for RA billing.");

  const { data: signoffs, isLoading, refetch } = trpc.signoffs.list.useQuery();
  const requestMutation = trpc.signoffs.request.useMutation();
  const completeMutation = trpc.signoffs.complete.useMutation();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestMutation.mutateAsync({
        entityType,
        entityId: entityId.trim(),
        stage,
        requestedBy: role,
        assignedRole,
        comments: comments.trim() || undefined,
      });
      toast.success(`Digital sign-off requested for ${entityType} ${entityId}!`);
      setIsRequestOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit sign-off request");
    }
  };

  const handleAction = async (id: number, status: "Approved" | "Rejected") => {
    const remark = prompt(`Enter ${status.toLowerCase()} remarks / certificate note:`, `Digitally authenticated by ${role}`);
    if (remark !== null) {
      try {
        await completeMutation.mutateAsync({
          id,
          signedBy: role,
          status,
          comments: remark,
        });
        toast.success(`Sign-off record ${status.toLowerCase()}! Notification dispatched.`);
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Action failed");
      }
    }
  };

  // KPI stats
  const stats = useMemo(() => {
    if (!signoffs?.length) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: signoffs.length,
      pending: signoffs.filter((s) => s.status === "Pending").length,
      approved: signoffs.filter((s) => s.status === "Approved").length,
      rejected: signoffs.filter((s) => s.status === "Rejected").length,
    };
  }, [signoffs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Digital Sign-off & Joint Verification
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
              Audit Trail & Role Signatures
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Formal multi-role sign-off workflow for e-MB records, RA bills, QA test certificates and subcontractor payouts.
          </p>
        </div>

        <button
          onClick={() => setIsRequestOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Request New Sign-off</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Sign-off Requests</span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
            {stats.total} Certifications
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Audit trail recorded</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Pending Verification</span>
          <span
            className={`text-xl sm:text-2xl font-extrabold font-mono mt-1 block ${
              stats.pending > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {stats.pending}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Requires your review</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Approved & Signed</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono mt-1 block">
            {stats.approved}
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-semibold">Passed to next stage</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Rejected / Corrections</span>
          <span className="text-xl sm:text-2xl font-extrabold text-rose-600 font-mono mt-1 block">
            {stats.rejected}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Returned for review</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex-1 relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sign-offs by entity, ID or stage..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Sign-offs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Entity Type & ID</th>
                <th className="p-3">Certification Stage</th>
                <th className="p-3">Requested By</th>
                <th className="p-3">Assigned Approver</th>
                <th className="p-3">Status</th>
                <th className="p-3">Signed At & By</th>
                <th className="p-3">Verification Notes</th>
                <th className="p-3 text-right">Digital Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">Loading sign-off workflow...</td>
                </tr>
              ) : signoffs?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No sign-offs requested yet. Click &quot;Request New Sign-off&quot; above.
                  </td>
                </tr>
              ) : (
                signoffs
                  ?.filter((s) => (selectedStatus === "All" ? true : s.status === selectedStatus))
                  ?.filter(
                    (s) =>
                      s.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (s.comments || "").toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 block">{s.entityId}</span>
                        <span className="text-[10px] text-slate-500 font-sans block">{s.entityType}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {s.stage}
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">
                        {s.requestedBy}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono">
                          {s.assignedRole}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : s.status === "Pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-[11px]">
                        {s.signedBy ? (
                          <>
                            <span className="font-bold text-slate-800 block">{s.signedBy}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {s.signedAt ? new Date(s.signedAt).toLocaleDateString() : ""}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Awaiting sign-off</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 text-[11px] max-w-[200px]">
                        <span className="block truncate">{s.comments || "—"}</span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {s.status === "Pending" && (role === "admin" || role === s.assignedRole || role === "project_manager") ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAction(s.id, "Approved")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] flex items-center gap-1 shadow"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sign & Pass</span>
                            </button>
                            <button
                              onClick={() => handleAction(s.id, "Rejected")}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-semibold text-[10px]"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Request Sign-off */}
      {isRequestOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-500" /> Initiate Digital Sign-off
              </h2>
              <button onClick={() => setIsRequestOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleRequest} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Entity Type *</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  <option value="e-MB Measurement Record">e-MB Measurement Record</option>
                  <option value="Running Account (RA) Bill">Running Account (RA) Bill</option>
                  <option value="QA / QC Test Report">QA / QC Test Report</option>
                  <option value="Material Consumption Variance">Material Consumption Variance</option>
                  <option value="Subcontractor Payment Certificate">Subcontractor Payment Certificate</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Entity Reference ID *</label>
                <input
                  type="text"
                  required
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="e.g. MB-2026-001 or RA-05"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Approval Stage / Milestone *</label>
                <input
                  type="text"
                  required
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Assigned Approver Role *</label>
                <select
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                >
                  <option value="qs_billing_engineer">QS / Billing Engineer</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="qa_qc_engineer">QA / QC Engineer</option>
                  <option value="admin">Admin / General Manager</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Instructions / Notes</label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
                >
                  Send for Sign-off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
