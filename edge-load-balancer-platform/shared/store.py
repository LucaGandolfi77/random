import json
import sqlite3
from pathlib import Path
from typing import Any

from shared.schemas import OperationState, utc_now_iso
from shared.settings import settings


SCHEMA = '''
CREATE TABLE IF NOT EXISTS operations (
    instance_id TEXT NOT NULL,
    operation_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    service_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    parameters_json TEXT NOT NULL,
    description TEXT NOT NULL,
    resource_refs_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (instance_id, operation_id)
);
CREATE TABLE IF NOT EXISTS service_instances (
    instance_id TEXT PRIMARY KEY,
    desired_state TEXT NOT NULL,
    current_state TEXT NOT NULL,
    service_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    parameters_json TEXT NOT NULL,
    context_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS provisioning_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id TEXT NOT NULL,
    operation_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    visible_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
'''


def _connect() -> sqlite3.Connection:
    db_path = Path(settings.db_path())
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


def init_store() -> None:
    with _connect() as conn:
        conn.executescript(SCHEMA)
        conn.commit()


def save_operation(operation: OperationState) -> None:
    with _connect() as conn:
        conn.execute(
            '''
            INSERT OR REPLACE INTO operations (
                instance_id, operation_id, action, status, service_id, plan_id,
                parameters_json, description, resource_refs_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                operation.instance_id,
                operation.operation_id,
                operation.action,
                operation.status,
                operation.service_id,
                operation.plan_id,
                json.dumps(operation.parameters),
                operation.description,
                json.dumps(operation.resource_refs),
                operation.created_at,
                operation.updated_at,
            ),
        )
        conn.commit()


def get_operation(instance_id: str, operation_id: str) -> OperationState | None:
    with _connect() as conn:
        row = conn.execute(
            'SELECT * FROM operations WHERE instance_id = ? AND operation_id = ?',
            (instance_id, operation_id),
        ).fetchone()
    if not row:
        return None
    return OperationState(
        instance_id=row['instance_id'],
        operation_id=row['operation_id'],
        action=row['action'],
        status=row['status'],
        service_id=row['service_id'],
        plan_id=row['plan_id'],
        parameters=json.loads(row['parameters_json']),
        description=row['description'],
        resource_refs=json.loads(row['resource_refs_json']),
        created_at=row['created_at'],
        updated_at=row['updated_at'],
    )


def update_operation_status(instance_id: str, operation_id: str, status: str, description: str = '', resource_refs: dict[str, Any] | None = None) -> None:
    operation = get_operation(instance_id, operation_id)
    if not operation:
        raise KeyError(f'Operation not found: {instance_id}/{operation_id}')
    operation.status = status
    operation.description = description
    operation.updated_at = utc_now_iso()
    if resource_refs is not None:
        operation.resource_refs = resource_refs
    save_operation(operation)


def upsert_service_instance(instance_id: str, desired_state: str, current_state: str, service_id: str, plan_id: str, parameters: dict[str, Any], context: dict[str, Any]) -> None:
    with _connect() as conn:
        conn.execute(
            '''
            INSERT OR REPLACE INTO service_instances (
                instance_id, desired_state, current_state, service_id, plan_id,
                parameters_json, context_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                instance_id,
                desired_state,
                current_state,
                service_id,
                plan_id,
                json.dumps(parameters),
                json.dumps(context),
                utc_now_iso(),
            ),
        )
        conn.commit()


def get_service_instance(instance_id: str) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute('SELECT * FROM service_instances WHERE instance_id = ?', (instance_id,)).fetchone()
    if not row:
        return None
    return {
        'instance_id': row['instance_id'],
        'desired_state': row['desired_state'],
        'current_state': row['current_state'],
        'service_id': row['service_id'],
        'plan_id': row['plan_id'],
        'parameters': json.loads(row['parameters_json']),
        'context': json.loads(row['context_json']),
        'updated_at': row['updated_at'],
    }


def list_service_instances() -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute('SELECT * FROM service_instances ORDER BY instance_id').fetchall()
    return [
        {
            'instance_id': row['instance_id'],
            'desired_state': row['desired_state'],
            'current_state': row['current_state'],
            'service_id': row['service_id'],
            'plan_id': row['plan_id'],
            'parameters': json.loads(row['parameters_json']),
            'context': json.loads(row['context_json']),
            'updated_at': row['updated_at'],
        }
        for row in rows
    ]


def enqueue_task(instance_id: str, operation_id: str, action: str, payload: dict[str, Any]) -> None:
    with _connect() as conn:
        conn.execute(
            '''
            INSERT INTO provisioning_queue (instance_id, operation_id, action, payload_json, visible_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (instance_id, operation_id, action, json.dumps(payload), utc_now_iso(), utc_now_iso()),
        )
        conn.commit()


def dequeue_visible_tasks(limit: int = 5) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            '''
            SELECT * FROM provisioning_queue
            ORDER BY id ASC
            LIMIT ?
            ''',
            (limit,),
        ).fetchall()
    return [
        {
            'id': row['id'],
            'instance_id': row['instance_id'],
            'operation_id': row['operation_id'],
            'action': row['action'],
            'payload': json.loads(row['payload_json']),
            'attempts': row['attempts'],
        }
        for row in rows
    ]


def ack_task(queue_id: int) -> None:
    with _connect() as conn:
        conn.execute('DELETE FROM provisioning_queue WHERE id = ?', (queue_id,))
        conn.commit()
