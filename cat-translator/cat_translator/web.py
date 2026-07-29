import os
import tempfile
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse

from .translate import predict

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

app = FastAPI(title="Cat Translator")


@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = WEB_DIR / "index.html"
    if not html_path.exists():
        return HTMLResponse("<h1>index.html not found</h1>", status_code=404)
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.post("/api/translate")
async def api_translate(file: UploadFile = File(...)):
    suffix = ".wav" if file.filename and file.filename.endswith(".wav") else ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result = predict(tmp_path)
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        os.unlink(tmp_path)


def serve(host: str = "0.0.0.0", port: int = 8000):
    print(f"🌐 Cat Translator Web UI: http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    serve()
