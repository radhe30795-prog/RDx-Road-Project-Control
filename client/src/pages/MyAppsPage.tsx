import React, { useState } from "react";
import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "../lib/trpc";
import { startLogin } from "../const";
import {
  Sparkles,
  Plus,
  Compass,
  LayoutGrid,
  ShieldCheck,
  ExternalLink,
  Trash2,
  Lock,
  UserCheck,
  Layers,
  ArrowRight,
  FolderDot
} from "lucide-react";
import { Link } from "wouter";

const ACCENT_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  amber: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30", glow: "hover:border-amber-500/60" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30", glow: "hover:border-blue-500/60" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", glow: "hover:border-emerald-500/60" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/30", glow: "hover:border-purple-500/60" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/30", glow: "hover:border-rose-500/60" },
};

export default function MyAppsPage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [route, setRoute] = useState("/mobile-field");
  const [accent, setAccent] = useState("amber");

  const utils = trpc.useUtils();
  const { data: apps, isLoading: appsLoading } = trpc.apps.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createApp = trpc.apps.create.useMutation({
    onSuccess: () => {
      utils.apps.mine.invalidate();
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      setRoute("/mobile-field");
    },
  });

  const deleteApp = trpc.apps.delete.useMutation({
    onSuccess: () => {
      utils.apps.mine.invalidate();
    },
  });

  const displayName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              My Apps & Workspace Launcher
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sign-in verification system that identifies who is logged in and displays only apps owned by that user account.
          </p>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Register New App</span>
            </button>
            <button
              onClick={() => logout()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => startLogin()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow flex items-center gap-2 transition"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Login to View My Apps</span>
          </button>
        )}
      </div>

      {/* Auth Status Banner */}
      {loading ? (
        <div className="p-6 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 text-sm">
          Checking your authentication status...
        </div>
      ) : isAuthenticated ? (
        <div className="p-4 sm:p-5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-base shadow">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-800">
                  Active Logged-In User
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  {user?.role || "Authorized"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Welcome, {displayName}!
              </h2>
              <p className="text-xs text-slate-600">
                Email: {user?.email || "Manus Workspace User"} • Showing only apps linked to your account.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 sm:text-right">
            <span className="font-semibold text-slate-700 block">Personal Apps Registered</span>
            <span className="text-xl font-black text-emerald-700">{apps?.length || 0}</span>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-amber-200 bg-amber-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-7 h-7 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                You are currently viewing as a guest
              </h3>
              <p className="text-xs text-slate-600">
                Please login with your Manus account to see your personal registered apps and access control.
              </p>
            </div>
          </div>
          <button
            onClick={() => startLogin()}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow whitespace-nowrap"
          >
            Authenticate with Manus
          </button>
        </div>
      )}

      {/* Apps Grid */}
      {isAuthenticated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <FolderDot className="w-4 h-4 text-amber-500" />
              <span>Apps Created by {displayName}</span>
            </h3>
            <span className="text-xs text-slate-500">
              Only visible to you ({user?.openId ? `${user.openId.slice(0, 8)}...` : ""})
            </span>
          </div>

          {appsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
              Loading your apps...
            </div>
          ) : apps && apps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((app) => {
                const style = ACCENT_STYLES[app.accent] || ACCENT_STYLES.amber;
                const isInternal = app.route.startsWith("/");
                return (
                  <div
                    key={app.id}
                    className={`p-4 bg-white rounded-xl border ${style.border} ${style.glow} shadow-sm transition flex flex-col justify-between space-y-3 relative`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${style.bg} ${style.text}`}>
                          Personal Workspace
                        </span>

                        {apps.length > 1 && (
                          <button
                            title="Remove app"
                            onClick={() => deleteApp.mutate({ id: app.id })}
                            className="text-slate-400 hover:text-rose-600 transition p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                        {app.name}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {app.description || "Custom application created inside your personal workspace."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      {isInternal ? (
                        <Link
                          href={app.route}
                          className="font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1.5"
                        >
                          <span>Launch App</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <a
                          href={app.route}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1.5"
                        >
                          <span>Launch External</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">
                        {app.route}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              No apps registered under your account yet. Use the "Register New App" button to add your customized road apps or modules.
            </div>
          )}
        </div>
      )}

      {/* Modal: Register New App */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-base font-bold text-slate-900">Register New App for {displayName}</h3>
              <p className="text-xs text-slate-500">
                This app will be linked strictly to your account openId.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">App Name</label>
                <input
                  type="text"
                  placeholder="e.g. Quality Lab Mobile Portal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border rounded font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Route or URL</label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full p-2 border rounded font-mono"
                >
                  <option value="/mobile-field">/mobile-field (Mobile Field Companion)</option>
                  <option value="/roads">/roads (14 Roads Tracker)</option>
                  <option value="/daily-progress">/daily-progress (DPR Logs)</option>
                  <option value="/billing">/billing (Billing & QS Control)</option>
                  <option value="/hindrances">/hindrances (Hindrance Register)</option>
                  <option value="/qa-qc">/qa-qc (QA / QC Testing)</option>
                  <option value="/materials">/materials (Materials & Balance)</option>
                  <option value="/documents">/documents (Document Repository)</option>
                  <option value="/">/ (Executive Dashboard)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary of this app's purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Color Theme Accent</label>
                <div className="flex gap-2">
                  {["amber", "blue", "emerald", "purple", "rose"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccent(c)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] capitalize font-semibold transition ${
                        accent === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-1.5 border rounded text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={!name || createApp.isPending}
                onClick={() => {
                  createApp.mutate({
                    name,
                    description,
                    route,
                    accent,
                  });
                }}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                {createApp.isPending ? "Creating..." : "Save App to Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
