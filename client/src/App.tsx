import React from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2, LogIn, ShieldCheck, UserRound } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppLayout } from "./components/AppLayout";
import { useAuth } from "./_core/hooks/useAuth";
import { startLogin } from "./const";
import { canAccessPage, ROLE_LABELS } from "@shared/roles";

// Feature Pages
import Dashboard from "./pages/Dashboard";
import RoadsPage from "./pages/RoadsPage";
import RoadStructuresPage from "./pages/RoadStructuresPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import BoqPage from "./pages/BoqPage";
import EmbPage from "./pages/EmbPage";
import DailyProgressPage from "./pages/DailyProgressPage";
import InventoryPage from "./pages/InventoryPage";
import MaterialVariancePage from "./pages/MaterialVariancePage";
import SubcontractorPage from "./pages/SubcontractorPage";
import MachineryPage from "./pages/MachineryPage";
import SignoffPage from "./pages/SignoffPage";
import ReportsPage from "./pages/ReportsPage";
import BillingPage from "./pages/BillingPage";
import RateAnalysisPage from "./pages/RateAnalysisPage";
import ProjectionPage from "./pages/ProjectionPage";
import HindrancePage from "./pages/HindrancePage";
import QaQcPage from "./pages/QaQcPage";
import MaterialsPage from "./pages/MaterialsPage";
import DocumentsPage from "./pages/DocumentsPage";
import MobileFieldCompanion from "./pages/MobileFieldCompanion";
import MyAppsPage from "./pages/MyAppsPage";
import TeamAdminPage from "./pages/TeamAdminPage";
import ImportCenterPage from "./pages/ImportCenterPage";
import AdminEditPanelPage from "./pages/AdminEditPanelPage";
import HrPayrollPage from "./pages/HrPayrollPage";
import NotFound from "./pages/NotFound";

function AccessDenied({ path }: { path: string }) {
  const { user } = useAuth();
  const role = (user?.role || "user") as keyof typeof ROLE_LABELS;
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-xl font-black text-rose-950">Access Denied</h2>
        <p className="mt-2 text-sm text-rose-900/80 leading-6">
          Aapke role <b>({ROLE_LABELS[role] || role})</b> ko <b>{path}</b> module kholne ki permission nahi hai.
          <br />Role change ke liye apne Admin se sampark karein.
        </p>
        <a href="/" className="mt-5 inline-block rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-bold hover:bg-slate-700">
          Dashboard par wapas jayein
        </a>
      </div>
    </div>
  );
}

function GuardedRoute({ path, component: Component }: { path: string; component: React.ComponentType<any> }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const role = user?.role || "user";
  if (!canAccessPage(role, path)) {
    return (
      <Route path={path}>
        <AccessDenied path={path} />
      </Route>
    );
  }
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <GuardedRoute path="/my-apps" component={MyAppsPage} />
        <GuardedRoute path="/team" component={TeamAdminPage} />
        <GuardedRoute path="/import" component={ImportCenterPage} />
        <GuardedRoute path="/admin-edit" component={AdminEditPanelPage} />
        <GuardedRoute path="/hr" component={HrPayrollPage} />
        <GuardedRoute path="/" component={Dashboard} />
        <GuardedRoute path="/roads" component={RoadsPage} />
        <GuardedRoute path="/structures" component={RoadStructuresPage} />
        <GuardedRoute path="/activities" component={ActivitiesPage} />
        <GuardedRoute path="/boq" component={BoqPage} />
        <GuardedRoute path="/emb" component={EmbPage} />
        <GuardedRoute path="/daily-progress" component={DailyProgressPage} />
        <GuardedRoute path="/inventory" component={InventoryPage} />
        <GuardedRoute path="/material-variance" component={MaterialVariancePage} />
        <GuardedRoute path="/subcontractors" component={SubcontractorPage} />
        <GuardedRoute path="/machinery" component={MachineryPage} />
        <GuardedRoute path="/signoffs" component={SignoffPage} />
        <GuardedRoute path="/reports" component={ReportsPage} />
        <GuardedRoute path="/billing" component={BillingPage} />
        <GuardedRoute path="/rate-analysis" component={RateAnalysisPage} />
        <GuardedRoute path="/projection" component={ProjectionPage} />
        <GuardedRoute path="/hindrances" component={HindrancePage} />
        <GuardedRoute path="/qa-qc" component={QaQcPage} />
        <GuardedRoute path="/materials" component={MaterialsPage} />
        <GuardedRoute path="/documents" component={DocumentsPage} />
        <GuardedRoute path="/mobile-field" component={MobileFieldCompanion} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function LoginScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#f59e0b,transparent_28%),radial-gradient(circle_at_80%_70%,#0f766e,transparent_30%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl p-7 sm:p-9 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg">
          RD
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure ERP Workspace</span>
        </div>
        <h1 className="mt-3 text-2xl font-black text-white">RDx Road Project Control</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Login with your Gmail or Google Workspace account. Your admin will assign the role and permissions for this project.
        </p>

        <button
          onClick={() => startLogin()}
          className="mt-7 w-full rounded-xl bg-white hover:bg-slate-100 text-slate-900 px-4 py-3.5 font-bold text-sm flex items-center justify-center gap-3 transition active:scale-[0.98]"
        >
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">G</span>
          <span>Continue with Google</span>
          <LogIn className="w-4 h-4 text-slate-500" />
        </button>

        <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-center gap-2">
          <UserRound className="w-3.5 h-3.5" />
          <span>Role-based access • Activity audit • Project data isolation</span>
        </div>
      </div>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-sm text-slate-400">Checking secure ERP session...</span>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  return <Router />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthGate />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
