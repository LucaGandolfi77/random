import { Navigate, Route, Routes } from "react-router-dom";
import { ProjectLayout } from "./layouts/ProjectLayout";
import { SiteLayout } from "./layouts/SiteLayout";
import { ProjectsPage } from "./pages/ProjectsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ProjectInfoPage } from "./pages/ProjectInfoPage";
import { DatasetPage } from "./pages/DatasetPage";
import { DataReadinessPage } from "./pages/DataReadinessPage";
import { FindingsPage } from "./pages/FindingsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { AssuranceRegistryPage } from "./pages/AssuranceRegistryPage";
import { AssuranceProjectPage } from "./pages/AssuranceProjectPage";
import { PortfolioProjectsPage } from "./pages/PortfolioProjectsPage";
import { PortfolioProjectPage } from "./pages/PortfolioProjectPage";
import { AssuranceAnalysisPage } from "./pages/AssuranceAnalysisPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import {
  ContactPage, CvPage, ExpertisePage, FlagshipPage, HomePage, ProjectCaseStudyPage, PublicationPage,
  PublicationsIndexPage, SiteProjectsPage, WorkbenchPage,
} from "./pages/site/site-pages";

function SiteRoute({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Week-4 public site */}
      <Route path="/" element={<SiteRoute><HomePage /></SiteRoute>} />
      <Route path="/expertise" element={<SiteRoute><ExpertisePage /></SiteRoute>} />
      <Route path="/site-projects" element={<SiteRoute><SiteProjectsPage /></SiteRoute>} />
      <Route path="/site-projects/:slug" element={<SiteRoute><ProjectCaseStudyPage /></SiteRoute>} />
      <Route path="/flagship" element={<SiteRoute><FlagshipPage /></SiteRoute>} />
      <Route path="/publications" element={<SiteRoute><PublicationsIndexPage /></SiteRoute>} />
      <Route path="/publications/:slug" element={<SiteRoute><PublicationPage /></SiteRoute>} />
      <Route path="/cv" element={<SiteRoute><CvPage /></SiteRoute>} />
      <Route path="/workbench" element={<SiteRoute><WorkbenchPage /></SiteRoute>} />
      <Route path="/contact" element={<SiteRoute><ContactPage /></SiteRoute>} />

      {/* Workbench applications (kept compatible) */}
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:projectId" element={<ProjectLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="project" element={<ProjectInfoPage />} />
        <Route path="dataset" element={<DatasetPage />} />
        <Route path="data-readiness" element={<DataReadinessPage />} />
        <Route path="findings" element={<FindingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="coming-soon/:feature" element={<ComingSoonPage />} />
      </Route>
      <Route path="/portfolio" element={<PortfolioProjectsPage />} />
      <Route path="/portfolio/:projectId" element={<PortfolioProjectPage />} />
      <Route path="/portfolio/:projectId/assurance" element={<AssuranceAnalysisPage />} />
      <Route path="/assurance" element={<AssuranceRegistryPage />} />
      <Route path="/assurance/:projectId" element={<AssuranceProjectPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
