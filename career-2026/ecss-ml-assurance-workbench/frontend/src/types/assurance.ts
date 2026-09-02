// Assurance registry domain types (mirror of backend schemas).

export type AvailabilityState =
  | "Available"
  | "Not Available"
  | "Not Provided"
  | "Not Executed"
  | "Not Applicable"
  | "Pending Review"
  | "Evidence Missing"
  | "Decision Pending";

export type TestOutcome = "Passed" | "Failed" | "Not Executed" | "Not Applicable" | "Pending Review";

export interface RegistryProject {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  project_type: string;
  domain: string;
  repository_path: string;
  documentation_path: string;
  owner: string;
  reviewers: string[];
  version: string;
  lifecycle_status: string;
  assurance_status: string;
  model_status: string;
  deployment_status: string;
  criticality: string;
  source_type: string;
  artefact_availability: Record<string, string>;
  related_assets: Array<{ kind: string; path: string; note?: string }>;
  tags: string[];
  known_limitations: string[];
  open_actions: string[];
  updated_at: string;
}

export interface RegistrySummary {
  id: string;
  name: string;
  slug: string;
  assurance_status: string;
  model_status: string;
  deployment_status: string;
  lifecycle_status: string;
  criticality: string;
  artefact_available: number;
  artefact_total: number;
  requirements: number;
  tests_registered: number;
  tests_passed: number;
  tests_failed: number;
  tests_not_executed: number;
  risks: number;
  evidence: number;
  packages: number;
  last_updated: string;
}

export interface RegistryRequirement {
  requirement_id: string;
  category: string;
  title: string;
  description: string;
  rationale: string;
  source: string;
  verification_method: string;
  state: string;
  related_tests: string[];
  related_risks: string[];
  related_evidence: string[];
}

export interface RegistryTest {
  test_id: string;
  title: string;
  level: string;
  method: string;
  objective: string;
  dataset_version: string;
  outcome: TestOutcome;
  actual_result: string;
  related_requirements: string[];
  evidence_links: string[];
}

export interface RegistryEvidence {
  evidence_id: string;
  evidence_type: string;
  description: string;
  source_document: string;
  source_version: string;
  state: string;
  location: string;
  related_tests: string[];
  reviewer: string;
}

export interface RegistryRisk {
  risk_id: string;
  kind: string;
  title: string;
  description: string;
  severity: string;
  likelihood: string;
  detection_mechanism: string;
  mitigation: string;
  residual_risk: string;
  state: string;
  related_requirements: string[];
  related_tests: string[];
  evidence_links: string[];
}

export interface RegistryPackage {
  id: string;
  project_id: string;
  schema_version: string;
  filename: string;
  size_bytes: number;
  sections: string[];
  states_summary: Record<string, number>;
  generated_at: string;
}

export interface RegistryProjectDetail extends RegistryProject {
  notes: string;
  import_procedure: string;
  counts: {
    requirements: number;
    tests_registered: number;
    tests_passed: number;
    tests_failed: number;
    tests_not_executed: number;
    risks: number;
    evidence: number;
    packages: number;
    artefact_available: number;
    artefact_total: number;
  };
  requirements: RegistryRequirement[];
  tests: RegistryTest[];
  evidence: RegistryEvidence[];
  risks: RegistryRisk[];
  packages: RegistryPackage[];
}
