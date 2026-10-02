import React, { useMemo, useState } from "react";
import {
  ShieldCheck,
  UsersRound,
  Mail,
  CalendarClock,
  Save,
  UserCog,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";

const ROLE_OPTIONS = [
  { value: "user", label: "Basic User", short: "Basic", color: "slate" },
  { value: "admin", label: "Administrator", short: "Admin", color: "purple" },
  { value: "project_manager", label: "Project Manager", short: "PM", color: "blue" },
  { value: "qs_billing_engineer", label: "QS / Billing Engineer", short: "QS / Billing", color: "emerald" },
  { value: "site_engineer", label: "Site Engineer", short: "Site", color: "amber" },
  { value: "qa_qc_engineer", label: "QA / QC Engineer", short: "QA / QC", color: "rose" },
  { value: "hr_payroll_manager", label: "HR / Payroll Manager", short: "HR / Payroll", color: "cyan" },
  { value: "site_coordinator", label: "Site Coordinator", short: "Site Coord.", color: "violet" },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]["value"];

const roleMeta = (role: string) => ROLE_OPTIONS.find((item) => item.value === role) || ROLE_OPTIONS[0];

const roleBadge: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function TeamAdminPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | RoleValue>("all");
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: users, isLoading, error, refetch } = trpc.userManagement.list.useQuery();
  const setRole = trpc.userManagement.setRole.useMutation({
    onSuccess: (_result, variables) => {
      setSavingUserId(null);
      toast.success("Role updated", {
        description: `The account is now assigned as ${roleMeta(variables.role).label}.`,
      });
      utils.userManagement.list.invalidate();
    },
    onError: (mutationError) => {
      setSavingUserId(null);
      toast.error("Role could not be updated", { description: mutationError.message });
    },
  });

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users?.length || 0 };
    for (const role of ROLE_OPTIONS) counts[role.value] = 0;
    for (const member of users || []) counts[member.role] = (counts[member.role] || 0) + 1;
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users || []).filter((member) => {
      const matchesSearch = !query || [member.name, member.email, member.loginMethod]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  if (user?.role !== "admin") {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <div className="max-w-md text-center p-8 rounded-2xl bg-white border border-rose-200 shadow-sm">
          <ShieldCheck className="w-10 h-10 text-rose-500 mx-auto" />
          <h1 className="mt-3 font-bold text-slate-900">Admin access required</h1>
          <p className="mt-2 text-xs text-slate-500">Only the ERP owner or assigned administrator can manage team roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Team & Role Administration</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Manage every person who has logged in with Google and assign their exact ERP role from one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh users
          </button>
          <span className="px-2.5 py-2 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200">
            Owner controlled
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="All users" value={roleCounts.all} tone="slate" />
        <SummaryCard label="Administrators" value={roleCounts.admin || 0} tone="purple" />
        <SummaryCard label="Project / Site" value={(roleCounts.project_manager || 0) + (roleCounts.site_engineer || 0)} tone="blue" />
        <SummaryCard label="QS / QA" value={(roleCounts.qs_billing_engineer || 0) + (roleCounts.qa_qc_engineer || 0)} tone="emerald" />
      </div>

      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-900 flex items-start gap-3">
        <UserCog className="w-5 h-5 shrink-0 text-blue-600" />
        <div>
          <strong>How it works:</strong> Every verified Gmail/Google Workspace user appears here after their first login. Choose a role and it is saved on the server immediately. Users cannot change their own role. The backend also prevents accidentally removing the last administrator.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Registered ERP Users</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{filteredUsers.length} of {users?.length || 0} accounts shown</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Server-side role protection active
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, Gmail address or provider..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div className="relative md:w-64">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as "all" | RoleValue)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                <option value="all">All roles ({roleCounts.all})</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>{role.label} ({roleCounts[role.value] || 0})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading registered users...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">You do not have permission to view team users.</div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-auto boq-table-scroll" style={{ maxHeight: "60vh" }}>
            {filteredUsers.map((member) => {
              const meta = roleMeta(member.role);
              const isSaving = savingUserId === member.id && setRole.isPending;
              const isCurrentUser = member.id === user.id;
              return (
                <div key={member.id} className="px-4 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center shrink-0">
                      {(member.name || member.email || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900 truncate">{member.name || "Unnamed user"}</h3>
                        {isCurrentUser && <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold">You</span>}
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${roleBadge[meta.color]}`}>{meta.short}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{member.email || "No email"}</span>
                        <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />Last login: {new Date(member.lastSignedIn).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 xl:justify-end">
                    <select
                      aria-label={`Assign role for ${member.name || member.email || "user"}`}
                      value={member.role as RoleValue}
                      onChange={(event) => {
                        const nextRole = event.target.value as RoleValue;
                        setSavingUserId(member.id);
                        setRole.mutate({ id: member.id, role: nextRole });
                      }}
                      className="p-2.5 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-800 min-w-[230px]"
                      disabled={setRole.isPending}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                    <span className={`px-2 py-2 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1.5 min-w-[104px] ${isSaving ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                      {isSaving ? <><RefreshCw className="w-3 h-3 animate-spin" />Saving...</> : <><Save className="w-3 h-3" />Saved</>}
                    </span>
                  </div>
                </div>
              );
            })}

            {!filteredUsers.length && (
              <div className="p-10 text-center text-xs text-slate-500">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                No users match the current search or role filter.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "slate" | "purple" | "blue" | "emerald" }) {
  const styles = {
    slate: "bg-slate-50 border-slate-200 text-slate-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[tone]}`}>
      <p className="text-[11px] font-semibold opacity-70">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}
