from fastapi import FastAPI, Request
import uvicorn

app = FastAPI(title='Mock Upstream')


@app.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok', 'service': 'mock-upstream'}


@app.api_route('/{path:path}', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
async def echo(path: str, request: Request) -> dict:
    body = await request.body()
    return {
        'path': '/' + path,
        'method': request.method,
        'headers': dict(request.headers),
        'body': body.decode('utf-8', errors='replace'),
    }


if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=9000)
