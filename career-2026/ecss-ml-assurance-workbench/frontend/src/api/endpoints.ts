import type {
  AnalysisConfig,
  AuditEvent,
  Dataset,
  DatasetPreview,
  Finding,
  FindingsPage,
  Health,
  Project,
  ReportInfo,
  RunSummary,
  ScoreResult,
} from "../types";
import type { RegistryPackage, RegistryProject, RegistryProjectDetail, RegistrySummary } from "../types/assurance";
import type { PortfolioDetail, PortfolioPackageInfo, PortfolioSummary } from "../types/portfolio";
import { api, API_BASE } from "./client";

export type FindingQuery = {
  status?: string;
  severity?: string;
  category?: string;
  column?: string;
  q?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
};

function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const endpoints = {
  health: () => api.get<Health>("/health"),

  // Projects
  listProjects: () => api.get<Project[]>("/projects"),
  getProject: (id: string) => api.get<Project>(`/projects/${id}`),
  createProject: (payload: Partial<Project>) => api.post<Project>("/projects", payload),
  updateProject: (id: string, payload: Partial<Project>) => api.patch<Project>(`/projects/${id}`, payload),
  deleteProject: (id: string) => api.delete<void>(`/projects/${id}`),

  // Dataset
  getDataset: (projectId: string) => api.get<Dataset>(`/projects/${projectId}/dataset`),
  getPreview: (projectId: string, limit = 100) => api.get<DatasetPreview>(`/projects/${projectId}/dataset/preview?limit=${limit}`),
  uploadDataset: (projectId: string, file: File) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return api.post<Dataset>(`/projects/${projectId}/datasets`, form, true);
  },
  deleteDataset: (projectId: string) => api.delete<void>(`/projects/${projectId}/dataset`),

  // Config
  getConfig: (projectId: string) => api.get<AnalysisConfig>(`/projects/${projectId}/config`),
  updateConfig: (projectId: string, payload: Partial<AnalysisConfig>) =>
    api.put<AnalysisConfig>(`/projects/${projectId}/config`, payload),

  // Analysis
  runAnalysis: (projectId: string) => api.post<RunSummary>(`/projects/${projectId}/analysis`),
  latestRun: (projectId: string) => api.get<RunSummary>(`/projects/${projectId}/analysis/latest`),
  getRun: (runId: string) => api.get<RunSummary>(`/analysis/${runId}`),
  getFindings: (runId: string, query: FindingQuery = {}) =>
    api.get<FindingsPage>(`/analysis/${runId}/findings${toQueryString(query as Record<string, string | number | undefined>)}`),
  getScore: (runId: string) => api.get<ScoreResult>(`/analysis/${runId}/score`),
  exportFindingsCsvUrl: (runId: string, filters?: { status?: string; severity?: string; category?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.severity) params.set("severity", filters.severity);
    if (filters?.category) params.set("category", filters.category);
    const qs = params.toString();
    return `${API_BASE}/analysis/${runId}/findings/export${qs ? `?${qs}` : ""}`;
  },

  // Reports
  listReports: (projectId: string) => api.get<ReportInfo[]>(`/projects/${projectId}/reports`),
  generateReport: (runId: string) => api.post<ReportInfo>(`/analysis/${runId}/report`),
  getReportContent: (reportId: string) => api.get<Record<string, unknown>>(`/reports/${reportId}`),
  downloadReportUrl: (reportId: string) => `${API_BASE}/reports/${reportId}/download`,

  // Audit
  projectAudit: (projectId: string) => api.get<AuditEvent[]>(`/projects/${projectId}/audit`),

  // Assurance registry
  assuranceProjects: () => api.get<RegistryProject[]>("/assurance/projects"),
  assuranceSummary: () => api.get<RegistrySummary[]>("/assurance/projects/summary"),
  assuranceProject: (id: string) => api.get<RegistryProjectDetail>(`/assurance/projects/${id}`),
  assurancePackages: (projectId: string) => api.get<RegistryPackage[]>(`/assurance/projects/${projectId}/evidence-packages`),
  generateEvidencePackage: (projectId: string) => api.post<RegistryPackage>(`/assurance/projects/${projectId}/evidence-packages`),
  evidencePackageDownloadUrl: (packageId: string) => `${API_BASE}/assurance/evidence-packages/${packageId}/download`,

  // Week-3 portfolio
  portfolioProjects: () => api.get<PortfolioSummary[]>("/portfolio/projects/summary"),
  portfolioProject: (id: string) => api.get<PortfolioDetail>(`/portfolio/projects/${id}`),
  portfolioPackages: (projectId: string) => api.get<PortfolioPackageInfo[]>(`/portfolio/projects/${projectId}/evidence-packages`),
  generatePortfolioPackage: (projectId: string) => api.post<PortfolioPackageInfo>(`/portfolio/projects/${projectId}/evidence-packages`),
  verifyPortfolioPackage: (packageId: string) => api.post<{ package_id: string; status: string; detail: string }>(`/portfolio/evidence-packages/${packageId}/verify`),
  portfolioPackageDownloadUrl: (packageId: string) => `${API_BASE}/portfolio/evidence-packages/${packageId}/download`,
};

export { api };
export type { Finding };
