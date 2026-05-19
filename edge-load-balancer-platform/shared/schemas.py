from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field


ProvisionAction = Literal['provision', 'update', 'deprovision']
OperationStatus = Literal['in_progress', 'succeeded', 'failed']


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_operation_id() -> str:
    return str(uuid4())


class ProvisionRequest(BaseModel):
    service_id: str
    plan_id: str
    organization_guid: str | None = None
    space_guid: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)


class OperationState(BaseModel):
    instance_id: str
    operation_id: str
    action: ProvisionAction
    status: OperationStatus
    service_id: str
    plan_id: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    description: str = ''
    resource_refs: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


class QueueTask(BaseModel):
    instance_id: str
    operation_id: str
    action: ProvisionAction
    payload: dict[str, Any] = Field(default_factory=dict)


class EnvoyNodeMetadata(BaseModel):
    tenant_id: str = 'default'
    environment: str = 'dev'
    region: str = 'eu-west-1'
    node_class: str = 'edge'


class DiscoveryEnvelope(BaseModel):
    version_info: str
    nonce: str
    type_url: str
    resources: list[dict[str, Any]]
