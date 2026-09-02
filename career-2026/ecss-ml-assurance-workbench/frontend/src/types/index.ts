// Shared domain types mirroring the backend Pydantic schemas.

export type FindingStatus = "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE" | "NOT_EVALUATED";
export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RunStatus = "pending" | "running" | "completed" | "failed";
export type OperatingContext = "onboard" | "ground";

export const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
export const FINDING_STATUSES: FindingStatus[] = ["PASS", "WARNING", "FAIL", "NOT_APPLICABLE", "NOT_EVALUATED"];
export const STATUS_LABEL: Record<string, string> = {
  "Draft": "Draft",
  "Data Uploaded": "Data Uploaded",
  "Analysis Completed": "Analysis Completed",
  "Review Required": "Review Required",
  "Ready for Next Stage": "Ready for Next Stage",
};

export interface Health {
  status: "ok" | "degraded";
  version: string;
  environment: string;
  database: "ok" | "error";
  timestamp: string;
}

export interface RunSummary {
  id: string;
  project_id: string;
  dataset_id: string;
  status: RunStatus;
  error_message?: string;
  started_at: string;
  completed_at?: string | null;
  config_snapshot: Record<string, unknown>;
  overall_score?: number | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  application_type: string;
  target_platform: string;
  operating_context: string;
  criticality_level: string;
  ml_function: string;
  notes: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  has_dataset: boolean;
  latest_run: RunSummary | null;
}

export interface ColumnInfo {
  name: string;
  index: number;
  inferred_type: string;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  non_null_count: number;
}

export interface Dataset {
  id: string;
  project_id: string;
  original_filename: string;
  sha256: string;
  size_bytes: number;
  row_count: number;
  column_count: number;
  columns: ColumnInfo[];
  uploaded_at: string;
}

export interface DatasetPreview {
  dataset_id: string;
  columns: ColumnInfo[];
  rows: Array<Array<string | number | boolean | null>>;
  truncated: boolean;
  limit: number;
  dtypes_summary: Record<string, number>;
}

export interface AnalysisConfig {
  project_id: string;
  target_column: string | null;
  timestamp_column: string | null;
  id_column: string | null;
  missing_threshold_pct: number;
  iqr_multiplier: number;
  quasi_constant_threshold_pct: number;
  rare_category_threshold_pct: number;
  dominant_category_threshold_pct: number;
  high_cardinality_ratio: number;
  duplicate_rows_threshold_pct: number;
  imbalance_ratio_warn: number;
}

export interface Finding {
  id: string;
  check_id: string;
  category: string;
  title: string;
  description: string;
  status: FindingStatus;
  severity: Severity;
  observed_value: string;
  threshold: string;
  columns: string[];
  evidence: Record<string, unknown>;
  risk: string;
  recommendation: string;
  analyzer_version: string;
  created_at: string;
}

export interface FindingsPage {
  items: Finding[];
  total: number;
  limit: number;
  offset: number;
  applied_filters: Record<string, string>;
}

export interface ScoreCategory {
  name: string;
  weight: number;
  score: number | null;
  evaluated: boolean;
  pass_count: number;
  warning_count: number;
  fail_count: number;
  not_applicable_count: number;
}

export interface ScoreResult {
  overall_score: number | null;
  coverage_pct: number;
  categories: ScoreCategory[];
  pass_count: number;
  warning_count: number;
  fail_count: number;
  not_applicable_count: number;
  not_evaluated_count: number;
  method: string;
}

export interface ReportInfo {
  id: string;
  project_id: string;
  run_id: string;
  schema_version: string;
  filename: string;
  size_bytes: number;
  generated_at: string;
}

export interface AuditEvent {
  id: string;
  event_type: string;
  project_id: string;
  dataset_id: string | null;
  run_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}
