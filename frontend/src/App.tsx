import { useEffect } from "react";
import { useLanguage, syncDocumentLanguage, localizeKnownError } from "./i18n";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { SessionProvider, useSession, type Role } from "./auth/session";
import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorState } from "./components/ErrorState";
import { ToastProvider } from "./components/Toast";
import { LoginPage } from "./pages/LoginPage";
import { NotReady } from "./pages/NotReady";
import { OverviewPage } from "./pages/OverviewPage";
import { WorkflowGuidePage } from "./pages/WorkflowGuidePage";
import { AnalysisWorkbenchPage } from "./pages/AnalysisWorkbenchPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { CampaignWorkspacePage } from "./pages/CampaignWorkspacePage";
import { DeviceLayoutsPage } from "./pages/DeviceLayoutsPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { LayerPresetsPage } from "./pages/LayerPresetsPage";
import { BaselinesPage } from "./pages/BaselinesPage";
import { UsersPage } from "./pages/UsersPage";
import { ExperimentsPage } from "./pages/ExperimentsPage";
import { ExperimentDetailPage } from "./pages/ExperimentDetailPage";
import { ExperimentBuilderPage } from "./pages/ExperimentBuilderPage";
import { UploadResultPage } from "./pages/UploadResultPage";
import { ResultDetailPage } from "./pages/ResultDetailPage";
import { ResultsPage } from "./pages/ResultsPage";
import { FabricationBatchesPage } from "./pages/FabricationBatchesPage";
import { BatchDetailPage } from "./pages/BatchDetailPage";

function RequireAuth() {
  const { t } = useLanguage();
  const { status, error, refresh } = useSession();
  const location = useLocation();
  if (status === "loading") {
    return (
      <div className="app-loading" role="status">
        {t("common.loading")}
      </div>
    );
  }
  if (status === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    );
  }
  if (status === "error") {
    return (
      <div className="app-loading">
        <ErrorState
          title={t("auth.sessionTitle")}
          message={error ? localizeKnownError(error) : t("auth.sessionTimeout")}
          action={
            <button
              type="button"
              className="button button--secondary"
              onClick={() => void refresh()}
            >
              {t("common.retry")}
            </button>
          }
        />
      </div>
    );
  }
  return <Outlet />;
}

const ROLE_RANK: Record<Role, number> = {
  student: 1,
  instructor: 2,
  administrator: 3,
};

function RequireRole({ minimum }: { minimum: Role }) {
  const { t } = useLanguage();
  const { user } = useSession();
  if (!user || ROLE_RANK[user.role] < ROLE_RANK[minimum]) {
    return (
      <ErrorState
        title={t("auth.deniedTitle")}
        message={t("auth.denied")}
      />
    );
  }
  return <Outlet />;
}

export default function App() {
  const { language, t } = useLanguage();
  useEffect(syncDocumentLanguage, [language]);
  return (
    <BrowserRouter basename="/app">
      <SessionProvider>
        <ToastProvider>
          <ErrorBoundary>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<OverviewPage />} />
                <Route path="workflow" element={<WorkflowGuidePage />} />
                <Route
                  path="experiments"
                  element={<ExperimentsPage />}
                />
                <Route
                  path="experiments/new"
                  element={<ExperimentBuilderPage />}
                />
                <Route
                  path="experiments/:experimentId"
                  element={<ExperimentDetailPage />}
                />
                <Route
                  path="experiments/:experimentId/upload"
                  element={<UploadResultPage />}
                />
                <Route
                  path="results"
                  element={<ResultsPage />}
                />
                <Route
                  path="analysis"
                  element={<AnalysisWorkbenchPage />}
                />
                <Route
                  path="results/:resultId"
                  element={<ResultDetailPage />}
                />
                <Route
                  path="experiments/:experimentId/batches/:batchId"
                  element={<BatchDetailPage />}
                />
                <Route
                  path="fabrication-batches"
                  element={<FabricationBatchesPage />}
                />
                <Route
                  path="materials"
                  element={<MaterialsPage />}
                />
                <Route
                  path="layer-presets"
                  element={<LayerPresetsPage />}
                />
                <Route
                  path="baselines"
                  element={<BaselinesPage />}
                />
                <Route
                  path="device-layouts"
                  element={<DeviceLayoutsPage />}
                />
                <Route
                  path="campaigns"
                  element={<CampaignsPage />}
                />
                <Route
                  path="campaigns/:code"
                  element={<CampaignWorkspacePage />}
                />
                <Route element={<RequireRole minimum="administrator" />}>
                  <Route path="users" element={<UsersPage />} />
                </Route>
                <Route path="*" element={<NotReady section={t("route.thisPage")} />} />
              </Route>
            </Route>
          </Routes>
          </ErrorBoundary>
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
