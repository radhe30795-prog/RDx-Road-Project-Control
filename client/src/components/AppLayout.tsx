import React, { useState, createContext, useContext } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Compass,
  ListTodo,
  TrendingUp,
  FileSpreadsheet,
  Briefcase,
  Truck,
  FileCheck2,
  Receipt,
  Ruler,
  Scale,
  AlertTriangle,
  Microscope,
  Boxes,
  FolderOpen,
  Smartphone,
  Bell,
  HardHat,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  RefreshCw,
  LayoutGrid,
  FileText,
  LogIn,
  LogOut,
  User,
  UsersRound,
  FileUp,
  SlidersHorizontal
} from "lucide-react";
import { trpc } from "../lib/trpc";
import { useAuth } from "../_core/hooks/useAuth";
import { startLogin } from "../const";
import { MobileInstallBanner } from "./MobileInstallBanner";
import { canAccessPage } from "@shared/roles";

// Role Context for dynamic switching and testing
export type UserRole = "user" | "admin" | "project_manager" | "qs_billing_engineer" | "site_engineer" | "qa_qc_engineer" | "hr_payroll_manager";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  roleLabel: string;
}

const RoleContext = createContext<RoleContextType>({
  role: "user",
  setRole: () => {},
  roleLabel: "Basic User",
});

export const useRole = () => useContext(RoleContext);

const ROLE_OPTIONS: { id: UserRole; label: string; badgeColor: string; description: string }[] = [
  { id: "user", label: "Basic User", badgeColor: "bg-slate-100 text-slate-800 border-slate-300", description: "Assigned project access" },
  { id: "admin", label: "Admin / GM", badgeColor: "bg-purple-100 text-purple-800 border-purple-300", description: "Full system control, approvals & reports" },
  { id: "project_manager", label: "Project Manager", badgeColor: "bg-blue-100 text-blue-800 border-blue-300", description: "Planning, roads tracking & hindrances resolution" },
  { id: "qs_billing_engineer", label: "QS / Billing Engg", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300", description: "Measurement, abstracts & RA bills workflow" },
  { id: "site_engineer", label: "Site Engineer", badgeColor: "bg-amber-100 text-amber-800 border-amber-300", description: "Daily site progress, manpower, equipment & activities" },
  { id: "qa_qc_engineer", label: "QA / QC Engineer", badgeColor: "bg-rose-100 text-rose-800 border-rose-300", description: "Field/Lab testing, tolerances & non-conformance action" },
  { id: "hr_payroll_manager", label: "HR / Payroll Manager", badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300", description: "Employee master, assignments & payroll inputs" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const role = (user?.role || "user") as UserRole;

  const { data: notifs, refetch: refetchNotifs } = trpc.notifications.list.useQuery({ unreadOnly: true });
  const { data: stats } = trpc.dashboard.getStats.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const headerProject = projects?.[0];
  const headerProjectLabel = headerProject
    ? `${headerProject.projectName} • ${headerProject.clientDepartment || ""}`.trim()
    : "RDx Road Project Control";

  const markRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => refetchNotifs(),
  });

  const activeRoleObj = ROLE_OPTIONS.find((r) => r.id === role) || ROLE_OPTIONS[0];

  const navItems = [
    { href: "/my-apps", label: "My Apps (Workspace)", icon: LayoutGrid, highlight: true },
    ...(role === "admin" ? [{ href: "/team", label: "Team & Roles", icon: UsersRound, badge: "Admin" }] : []),
    ...(role === "admin" ? [{ href: "/import", label: "Excel Import Center", icon: FileUp, badge: "Admin" }] : []),
    ...(role === "admin" ? [{ href: "/admin-edit", label: "Central Edit Panel", icon: SlidersHorizontal, badge: "Admin" }] : []),
    ...(["admin", "hr_payroll_manager"].includes(role) ? [{ href: "/hr", label: "HR & Payroll", icon: UsersRound, highlight: true }] : []),
    { href: "/", label: "Executive Dashboard", icon: LayoutDashboard, badge: stats?.overallPhysicalProgress ? `${stats.overallPhysicalProgress}%` : undefined },
    { href: "/roads", label: "14 Roads Tracker", icon: Compass, count: 14 },
    { href: "/structures", label: "पुल-पुलिया & Protection Register", icon: Boxes, highlight: true },
    { href: "/activities", label: "Activities & Phases", icon: ListTodo, count: stats?.totalActivities },
    { href: "/boq", label: "BOQ Master & Quantities", icon: FileSpreadsheet, highlight: true },
    { href: "/emb", label: "e-MB Measurement Book", icon: Ruler, highlight: true },
    { href: "/daily-progress", label: "Daily Site Progress (DPR)", icon: TrendingUp },
    { href: "/inventory", label: "Material Inventory & GRN", icon: Boxes, highlight: true },
    { href: "/material-variance", label: "Material Variance Audit", icon: Scale },
    { href: "/subcontractors", label: "Subcontractors & Work Orders", icon: Briefcase, highlight: true },
    { href: "/machinery", label: "Plant & Machinery Logbook", icon: Truck },
    { href: "/signoffs", label: "Digital Sign-off & Approvals", icon: FileCheck2 },
    { href: "/reports", label: "Reports & PDF Export", icon: FileText, highlight: true },
    { href: "/billing", label: "Billing & QS Control", icon: Receipt, badge: stats?.submittedBills ? `${stats.submittedBills} Sub` : undefined, badgeColor: "bg-emerald-500" },
    { href: "/hindrances", label: "Hindrance Register", icon: AlertTriangle, count: stats?.openHindrances, alertCount: stats?.overdueHindrances },
    { href: "/qa-qc", label: "QA / QC Testing", icon: Microscope, alertCount: stats?.qaQcFailedTests },
    { href: "/materials", label: "Materials & Balance", icon: Boxes },
    { href: "/documents", label: "Document Repository", icon: FolderOpen },
    { href: "/mobile-field", label: "📱 Mobile Field Companion", icon: Smartphone, highlight: true },
  ];

  // RBAC: show only the modules this role may open
  const visibleNavItems = navItems.filter((item) => canAccessPage(role, item.href));

  return (
    <RoleContext.Provider value={{ role, setRole: () => {}, roleLabel: activeRoleObj.label }}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <MobileInstallBanner />
        {/* Top Announcement & Project Bar */}
        <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md hover:bg-slate-800 text-slate-300"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-inner">
                  RD
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base sm:text-lg tracking-tight text-white">RDx Road Project Control</span>
                    <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                      14 Roads Suite
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-sm">
                    {headerProjectLabel}
                  </p>
                </div>
              </Link>
            </div>

              {/* Right actions: Role switcher, Notifications, Mobile Field CTA */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Logged in User Identity / Login Button */}
                {isAuthenticated ? (
                  <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-400 leading-tight">Logged in as</span>
                      <span className="text-xs font-bold text-white leading-tight truncate max-w-[100px] sm:max-w-[140px]">
                        {user?.name || user?.email?.split("@")[0] || "User"}
                      </span>
                    </div>
                    <button
                      onClick={() => logout()}
                      title="Sign Out"
                      className="text-slate-400 hover:text-white transition ml-1 p-0.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startLogin()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}

                {/* Role selector dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <HardHat className="w-4 h-4 text-amber-400 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider hidden sm:block">Active Role</span>
                  <span className="text-xs font-medium text-slate-200">{activeRoleObj.label}</span>
                </div>
              </div>

              {/* Mobile Quick Entry button */}
              <Link
                href="/mobile-field"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md shadow transition"
              >
                <Smartphone className="w-4 h-4" />
                <span>Field Companion</span>
              </Link>

              {/* Notifications Button */}
              <div className="relative">
                <button
                  onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 relative"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {notifs && notifs.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {notifs.length}
                    </span>
                  )}
                </button>

                {/* Notifications Drawer */}
                {notifDrawerOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 text-slate-800 z-50 p-3">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-600" />
                        <span className="font-semibold text-sm">Automated Alerts & Events</span>
                      </div>
                      <span className="text-xs text-slate-500">{notifs?.length || 0} unread</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {notifs && notifs.length > 0 ? (
                        notifs.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-md border text-xs flex flex-col gap-1 ${
                              n.severity === "critical"
                                ? "bg-rose-50 border-rose-200 text-rose-900"
                                : n.severity === "warning"
                                ? "bg-amber-50 border-amber-200 text-amber-900"
                                : n.severity === "success"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : "bg-blue-50 border-blue-200 text-blue-900"
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span>{n.title}</span>
                              <button
                                onClick={() => markRead.mutate({ id: n.id })}
                                className="text-[10px] text-slate-500 hover:underline"
                              >
                                Dismiss
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-700">{n.message}</p>
                            <span className="text-[10px] text-slate-400 self-end">Target: {n.targetRole || "All"}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-500">No active alerts pending.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Body with Sidebar + Content */}
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          {/* Desktop Sidebar */}
          <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between shrink-0 p-3">
            <div className="space-y-1">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Core Control Modules
              </div>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : item.highlight
                        ? "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : item.highlight ? "text-amber-600" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.alertCount ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                          {item.alertCount}
                        </span>
                      ) : null}
                      {item.badge ? (
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${item.badgeColor || "bg-slate-200 text-slate-800"}`}>
                          {item.badge}
                        </span>
                      ) : null}
                      {item.count !== undefined && !item.alertCount && !item.badge ? (
                        <span className={`text-xs ${isActive ? "text-slate-400" : "text-slate-400"}`}>
                          {item.count}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Bottom Status Box */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span>Active Package</span>
                <span className="font-semibold text-slate-800">PKG-04</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Contractor</span>
                <span className="font-medium text-slate-700 truncate max-w-[110px]">RDx Infra Ltd</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats?.overallPhysicalProgress || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Physical Progress</span>
                <span className="font-bold text-slate-800">{stats?.overallPhysicalProgress || "0.00"}%</span>
              </div>
            </div>
          </aside>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 md:hidden flex" onClick={() => setMobileMenuOpen(false)}>
              <div className="w-72 bg-white h-full p-4 flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-3 border-b">
                    <span className="font-bold text-slate-900">RDx Project Control</span>
                    <button onClick={() => setMobileMenuOpen(false)}>
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  <div className="space-y-1 pt-2">
                    {visibleNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                            isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-slate-950">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t pt-3 text-xs text-slate-500 text-center">
                  Road Construction Control Suite • 14 Roads
                </div>
              </div>
            </div>
          )}

          {/* Main Page Area */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </RoleContext.Provider>
  );
}
