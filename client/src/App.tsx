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

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/my-apps" component={MyAppsPage} />
        <Route path="/team" component={TeamAdminPage} />
        <Route path="/import" component={ImportCenterPage} />
        <Route path="/admin-edit" component={AdminEditPanelPage} />
        <Route path="/hr" component={HrPayrollPage} />
        <Route path="/" component={Dashboard} />
        <Route path="/roads" component={RoadsPage} />
        <Route path="/structures" component={RoadStructuresPage} />
        <Route path="/activities" component={ActivitiesPage} />
        <Route path="/boq" component={BoqPage} />
        <Route path="/emb" component={EmbPage} />
        <Route path="/daily-progress" component={DailyProgressPage} />
        <Route path="/inventory" component={InventoryPage} />
        <Route path="/material-variance" component={MaterialVariancePage} />
        <Route path="/subcontractors" component={SubcontractorPage} />
        <Route path="/machinery" component={MachineryPage} />
        <Route path="/signoffs" component={SignoffPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/billing" component={BillingPage} />
        <Route path="/hindrances" component={HindrancePage} />
        <Route path="/qa-qc" component={QaQcPage} />
        <Route path="/materials" component={MaterialsPage} />
        <Route path="/documents" component={DocumentsPage} />
        <Route path="/mobile-field" component={MobileFieldCompanion} />
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
