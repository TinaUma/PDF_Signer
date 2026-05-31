from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.document import router as document_router
from api.export import router as export_router
from api.signatures import router as signatures_router

app = FastAPI(title="PDF Signer API", version="1.1.0")

# The browser deployment talks to the API same-origin through the nginx proxy,
# so CORS is only needed for the dev server and the Tauri webview. Restrict to
# those known origins instead of "*" (the API is unauthenticated).
ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "tauri://localhost",
    "http://tauri.localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


app.include_router(document_router)
app.include_router(signatures_router)
app.include_router(export_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "pdf-signer-api"}


if __name__ == "__main__":
    # Entry point for the bundled sidecar (PyInstaller) so the .exe starts a
    # server instead of importing `app` and exiting.
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
