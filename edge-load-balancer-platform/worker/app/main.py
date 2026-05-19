import json
import time
from pathlib import Path

from shared.settings import settings
from shared.store import (
    ack_task,
    dequeue_visible_tasks,
    get_operation,
    get_service_instance,
    init_store,
    update_operation_status,
    upsert_service_instance,
)


def simulate_cloudfront_distribution(instance_id: str) -> str:
    return f'distro-{instance_id[:8]}'


def simulate_dns_record(instance_id: str) -> str:
    return f'{instance_id}.edge.example.internal'


def write_dynamic_context(instance_id: str, payload: dict) -> dict:
    context_dir = settings.context_dir()
    tenant_id = payload.get('parameters', {}).get('tenant_id', 'default')
    instance_context = {
        'version': f'local-{int(time.time())}',
        'environment': 'dev',
        'rate_limit_domain': f'{tenant_id}-edge',
        'hosts': [
            {
                'name': instance_id,
                'fqdn': payload.get('parameters', {}).get('hostname', f'{instance_id}.edge.local'),
                'routes': [
                    {
                        'prefix': '/',
                        'cluster_name': payload.get('parameters', {}).get('upstream_cluster', 'local_service'),
                        'timeout_ms': payload.get('parameters', {}).get('timeout_ms', 3000),
                    }
                ],
            }
        ],
        'clusters': [
            {
                'name': payload.get('parameters', {}).get('upstream_cluster', 'local_service'),
                'connect_timeout_ms': 1000,
                'type': 'STRICT_DNS',
                'lb_policy': 'ROUND_ROBIN',
                'endpoints': [
                    {
                        'address': payload.get('parameters', {}).get('upstream_host', '127.0.0.1'),
                        'port': payload.get('parameters', {}).get('upstream_port', 9000),
                    }
                ],
            },
            {
                'name': 'authn_sidecar',
                'connect_timeout_ms': 250,
                'type': 'STATIC',
                'lb_policy': 'ROUND_ROBIN',
                'endpoints': [{'address': '127.0.0.1', 'port': 7001}],
            },
        ],
        'listeners': [{'name': 'edge_https', 'address': '0.0.0.0', 'port': 8443}],
    }
    (context_dir / f'{tenant_id}.json').write_text(json.dumps(instance_context, indent=2), encoding='utf-8')
    return instance_context


def process_task(task: dict) -> None:
    instance_id = task['instance_id']
    operation_id = task['operation_id']
    action = task['action']
    payload = task['payload']

    operation = get_operation(instance_id, operation_id)
    if not operation:
        ack_task(task['id'])
        return

    if action == 'deprovision':
        upsert_service_instance(
            instance_id=instance_id,
            desired_state='deleted',
            current_state='deleted',
            service_id=operation.service_id,
            plan_id=operation.plan_id,
            parameters={},
            context={},
        )
        update_operation_status(instance_id, operation_id, 'succeeded', 'Service instance deprovisioned', {})
        ack_task(task['id'])
        return

    context = write_dynamic_context(instance_id, payload)
    refs = {
        'route53_record': simulate_dns_record(instance_id),
        'cloudfront_distribution': simulate_cloudfront_distribution(instance_id),
        'context_bucket_key': f"{payload.get('parameters', {}).get('tenant_id', 'default')}.json",
    }

    current = get_service_instance(instance_id)
    upsert_service_instance(
        instance_id=instance_id,
        desired_state='provisioned',
        current_state='active',
        service_id=operation.service_id,
        plan_id=operation.plan_id,
        parameters=(current or {}).get('parameters', payload.get('parameters', {})),
        context={**context, **refs},
    )
    update_operation_status(instance_id, operation_id, 'succeeded', f'{action.title()} completed', refs)
    ack_task(task['id'])


def main() -> None:
    init_store()
    print('worker: polling local provisioning queue')
    while True:
        tasks = dequeue_visible_tasks(limit=5)
        if not tasks:
            time.sleep(settings.poll_interval_seconds)
            continue
        for task in tasks:
            process_task(task)


if __name__ == '__main__':
    main()
