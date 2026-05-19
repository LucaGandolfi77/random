import json
from pathlib import Path
from typing import Any

import yaml
from fastapi import FastAPI, Request
from jinja2 import Environment, FileSystemLoader

from shared.schemas import DiscoveryEnvelope
from shared.settings import settings
from shared.store import get_service_instance, init_store, list_service_instances

app = FastAPI(title='Sovereign', version='0.1.0')

template_env = Environment(
    loader=FileSystemLoader(Path(__file__).resolve().parent / 'templates'),
    autoescape=False,
    trim_blocks=True,
    lstrip_blocks=True,
)


@app.on_event('startup')
def startup() -> None:
    init_store()
    settings.context_dir()


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'sovereign'}


@app.post('/xds/discovery')
async def discovery(request: Request) -> DiscoveryEnvelope:
    body = await request.json()
    node = body.get('node', {})
    metadata = node.get('metadata', {})
    tenant_id = metadata.get('tenant_id', 'default')
    instance_id = metadata.get('instance_id', 'sample-edge')
    type_url = body.get('type_url', 'type.googleapis.com/envoy.config.route.v3.RouteConfiguration')

    context = load_context(tenant_id=tenant_id, instance_id=instance_id)
    resources = render_envoy_resources(type_url=type_url, context=context)
    version = context['version']
    return DiscoveryEnvelope(version_info=version, nonce=version, type_url=type_url, resources=resources)


@app.get('/contexts')
def contexts() -> list[dict[str, Any]]:
    return list_service_instances()


def load_context(tenant_id: str, instance_id: str) -> dict[str, Any]:
    db_instance = get_service_instance(instance_id)
    s3_context = load_dynamic_s3_context(tenant_id)
    merged_context = {
        'version': s3_context.get('version', 'local-dev-1'),
        'tenant': {
            'id': tenant_id,
            'rate_limit_domain': s3_context.get('rate_limit_domain', f'{tenant_id}-edge'),
            'environment': s3_context.get('environment', 'dev'),
        },
        'instance': db_instance or {
            'instance_id': instance_id,
            'service_id': 'edge-lb',
            'plan_id': 'starter',
            'context': {},
            'parameters': {},
        },
        'hosts': s3_context.get('hosts', [
            {
                'name': 'default-api',
                'fqdn': f'{tenant_id}.local.edge.test',
                'routes': [
                    {'prefix': '/', 'cluster_name': 'local_service', 'timeout_ms': 3000}
                ],
            }
        ]),
        'clusters': s3_context.get('clusters', [
            {
                'name': 'local_service',
                'connect_timeout_ms': 1000,
                'type': 'STRICT_DNS',
                'lb_policy': 'ROUND_ROBIN',
                'endpoints': [{'address': '127.0.0.1', 'port': 9000}],
            },
            {
                'name': 'authn_sidecar',
                'connect_timeout_ms': 250,
                'type': 'STATIC',
                'lb_policy': 'ROUND_ROBIN',
                'endpoints': [{'address': '127.0.0.1', 'port': 7001}],
            },
        ]),
        'listeners': s3_context.get('listeners', [
            {'name': 'edge_https', 'address': '0.0.0.0', 'port': 8443}
        ]),
    }
    return merged_context


def load_dynamic_s3_context(tenant_id: str) -> dict[str, Any]:
    candidate = settings.context_dir() / f'{tenant_id}.json'
    if not candidate.exists():
        return {}
    return json.loads(candidate.read_text(encoding='utf-8'))


def render_envoy_resources(type_url: str, context: dict[str, Any]) -> list[dict[str, Any]]:
    template_name = {
        'type.googleapis.com/envoy.config.cluster.v3.Cluster': 'clusters.yaml.j2',
        'type.googleapis.com/envoy.config.route.v3.RouteConfiguration': 'routes.yaml.j2',
        'type.googleapis.com/envoy.config.listener.v3.Listener': 'listeners.yaml.j2',
    }.get(type_url, 'routes.yaml.j2')

    template = template_env.get_template(template_name)
    rendered = template.render(**context)
    data = yaml.safe_load(rendered)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and 'resources' in data:
        return data['resources']
    return [data]
