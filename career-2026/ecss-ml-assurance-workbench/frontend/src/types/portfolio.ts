// Week-3 portfolio types (mirror backend /api/portfolio responses).

export interface PortfolioSummary {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  lifecycle_status: string;
  assurance_status: string;
  deployment_decision: string;
  version: string;
  model_version: string;
  dataset_version: string;
  criticality: string;
  updated_at: string;
  requirements_total: number;
  requirements_verified: number;
  tests_defined: number;
  tests_passed: number;
  tests_failed: number;
  tests_blocked: number;
  tests_not_executed: number;
  tests_inconclusive: number;
  evidence_count: number;
  risk_count: number;
  open_limitations: number;
  fmea_count: number;
  package_completeness_pct: number;
  package_missing_manifest: string;
}

export interface TestItem {
  case: Record<string, unknown> & { test_id: string; title: string };
  result: (Record<string, unknown> & { verdict: string }) | null;
}

export interface PortfolioPackageInfo {
  id: string;
  project_id: string;
  package_version: number;
  package_schema_version: string;
  filename: string;
  size_bytes: number;
  document_count: number;
  evidence_count: number;
  snapshot_status: string;
  verification: Record<string, string>;
  generated_at: string;
}

export interface PortfolioDetail {
  project: Record<string, string> & { id: string; name: string };
  requirements: Array<Record<string, unknown>>;
  tests: TestItem[];
  evidence: Array<Record<string, unknown>>;
  risks: Array<Record<string, unknown>>;
  limitations: Array<Record<string, unknown>>;
  fmea: Array<Record<string, unknown>>;
  deployment_decision: PortfolioDecision | null;
  deployment_checklist: Array<{ check: string; satisfied: boolean; note: string | null }>;
  model_card: Record<string, unknown>;
  data_quality: Record<string, unknown>;
  odd: Record<string, unknown>;
  monitoring: Record<string, unknown>;
  coverage: { verdict_counts: Record<string, number> };
  traceability: Array<Record<string, unknown>>;
  completeness: {
    overall_indicator_pct: number;
    categories: Record<string, { state: string; note?: string }>;
  };
  packages: PortfolioPackageInfo[];
}

export interface PortfolioDecision {
  decision: string;
  decision_date?: string;
  decision_summary?: string;
  rationale?: string;
  blocking_findings: string[];
  accepted_risks: string[];
  required_mitigations: string[];
  operational_constraints?: string[];
  monitoring_requirements?: string[];
  rollback_strategy?: string;
  approver?: string;
  review_status?: string;
  project_version?: string;
  model_version?: string;
  dataset_version?: string;
}

export type Verdict = "PASS" | "FAIL" | "BLOCKED" | "NOT_EXECUTED" | "INCONCLUSIVE" | "NOT_APPLICABLE";
export const VERDICTS: Verdict[] = ["PASS", "FAIL", "BLOCKED", "NOT_EXECUTED", "INCONCLUSIVE", "NOT_APPLICABLE"];

export const DEPLOYMENT_TONE: Record<string, string> = {
  GO: "text-emerald-300 border-emerald-500/40",
  CONDITIONAL_GO: "text-amber-300 border-amber-500/40",
  REVIEW_REQUIRED: "text-amber-300 border-amber-500/40",
  DEFERRED: "text-sky-300 border-sky-500/40",
  NO_GO: "text-red-300 border-red-500/40",
};
