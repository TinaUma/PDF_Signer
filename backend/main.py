from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.document import router as document_router
from api.export import router as export_router
from api.signatures import router as signatures_router

app = FastAPI(title="PDF Signer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(document_router)
app.include_router(signatures_router)
app.include_router(export_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "pdf-signer-api"}
