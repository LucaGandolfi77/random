from fastapi import FastAPI, Header, HTTPException, Query

from shared.schemas import OperationState, ProvisionRequest, new_operation_id
from shared.store import enqueue_task, get_operation, init_store, save_operation, upsert_service_instance

app = FastAPI(title='Edge Broker', version='0.1.0')


@app.on_event('startup')
def startup() -> None:
    init_store()


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'broker'}


@app.put('/v2/service_instances/{instance_id}')
def provision_instance(
    instance_id: str,
    payload: ProvisionRequest,
    x_broker_api_version: str = Header(default='2.16'),
    accepts_incomplete: bool = Query(default=True),
) -> dict[str, str]:
    if not accepts_incomplete:
        raise HTTPException(status_code=422, detail='This broker requires asynchronous provisioning')

    operation_id = new_operation_id()
    operation = OperationState(
        instance_id=instance_id,
        operation_id=operation_id,
        action='provision',
        status='in_progress',
        service_id=payload.service_id,
        plan_id=payload.plan_id,
        parameters=payload.parameters,
        description='Provisioning request accepted',
    )
    save_operation(operation)
    upsert_service_instance(
        instance_id=instance_id,
        desired_state='provisioned',
        current_state='pending',
        service_id=payload.service_id,
        plan_id=payload.plan_id,
        parameters=payload.parameters,
        context={},
    )
    enqueue_task(instance_id, operation_id, 'provision', payload.model_dump())
    return {'operation': operation_id, 'dashboard_url': f'/instances/{instance_id}'}


@app.patch('/v2/service_instances/{instance_id}')
def update_instance(instance_id: str, payload: ProvisionRequest) -> dict[str, str]:
    operation_id = new_operation_id()
    operation = OperationState(
        instance_id=instance_id,
        operation_id=operation_id,
        action='update',
        status='in_progress',
        service_id=payload.service_id,
        plan_id=payload.plan_id,
        parameters=payload.parameters,
        description='Update request accepted',
    )
    save_operation(operation)
    enqueue_task(instance_id, operation_id, 'update', payload.model_dump())
    return {'operation': operation_id}


@app.delete('/v2/service_instances/{instance_id}')
def deprovision_instance(
    instance_id: str,
    service_id: str,
    plan_id: str,
    accepts_incomplete: bool = Query(default=True),
) -> dict[str, str]:
    if not accepts_incomplete:
        raise HTTPException(status_code=422, detail='This broker requires asynchronous deprovisioning')

    operation_id = new_operation_id()
    operation = OperationState(
        instance_id=instance_id,
        operation_id=operation_id,
        action='deprovision',
        status='in_progress',
        service_id=service_id,
        plan_id=plan_id,
        parameters={},
        description='Deprovision request accepted',
    )
    save_operation(operation)
    enqueue_task(instance_id, operation_id, 'deprovision', {'service_id': service_id, 'plan_id': plan_id})
    return {'operation': operation_id}


@app.get('/v2/service_instances/{instance_id}/last_operation')
def last_operation(instance_id: str, operation: str) -> dict[str, str]:
    state = get_operation(instance_id, operation)
    if not state:
        raise HTTPException(status_code=404, detail='Operation not found')

    osb_state = {
        'in_progress': 'in progress',
        'succeeded': 'succeeded',
        'failed': 'failed',
    }[state.status]
    return {'state': osb_state, 'description': state.description or state.status}
