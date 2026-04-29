from fastapi import APIRouter, UploadFile, File, HTTPException

from services.pdf_service import (
    render_document,
    MAX_FILE_SIZE,
    SUPPORTED_PDF_EXTS,
    SUPPORTED_IMAGE_EXTS,
)

router = APIRouter(prefix="/api/document", tags=["document"])

ALLOWED_EXTS = SUPPORTED_PDF_EXTS | SUPPORTED_IMAGE_EXTS


@router.post("/render")
async def render(file: UploadFile = File(...)):
    from pathlib import Path

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type: '{ext}'. Allowed: {sorted(ALLOWED_EXTS)}",
        )

    data = await file.read()

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 50 MB limit.")

    try:
        pages = render_document(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {"page_count": len(pages), "pages": pages}
