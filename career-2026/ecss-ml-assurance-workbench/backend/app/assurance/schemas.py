"""Assurance registry — Pydantic read schemas (typed API responses)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.assurance.models import AssurancePackage, AssuranceProject


class RegistryProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    short_description: str
    project_type: str
    domain: str
    repository_path: str
    documentation_path: str
    owner: str
    reviewers: list
    version: str
    lifecycle_status: str
    assurance_status: str
    model_status: str
    deployment_status: str
    criticality: str
    source_type: str
    artefact_availability: dict
    related_assets: list
    tags: list
    known_limitations: list
    open_actions: list
    updated_at: datetime


class RegistryPackageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    schema_version: str
    filename: str
    size_bytes: int
    sections: list
    states_summary: dict
    generated_at: datetime


class RegistrySummaryRead(BaseModel):
    """One row of the comparison view: stable id + top-level states + counts."""

    id: str
    name: str
    slug: str
    assurance_status: str
    model_status: str
    deployment_status: str
    lifecycle_status: str
    criticality: str
    artefact_available: int
    artefact_total: int
    requirements: int
    tests_registered: int
    tests_passed: int
    tests_failed: int
    tests_not_executed: int
    risks: int
    evidence: int
    packages: int
    last_updated: datetime


def to_summary(project: AssuranceProject, counts: dict) -> RegistrySummaryRead:
    return RegistrySummaryRead(
        id=project.id,
        name=project.name,
        slug=project.slug,
        assurance_status=project.assurance_status,
        model_status=project.model_status,
        deployment_status=project.deployment_status,
        lifecycle_status=project.lifecycle_status,
        criticality=project.criticality,
        artefact_available=counts["artefact_available"],
        artefact_total=counts["artefact_total"],
        requirements=counts["requirements"],
        tests_registered=counts["tests_registered"],
        tests_passed=counts["tests_passed"],
        tests_failed=counts["tests_failed"],
        tests_not_executed=counts["tests_not_executed"],
        risks=counts["risks"],
        evidence=counts["evidence"],
        packages=counts["packages"],
        last_updated=project.updated_at,
    )


def to_package(package: AssurancePackage) -> RegistryPackageRead:
    return RegistryPackageRead.model_validate(package)
