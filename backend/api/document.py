from pathlib import Path

from fastapi import APIRouter, UploadFile, File

from errors import ApiError, DomainError
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
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise ApiError(
            "unsupported_file_type",
            f"Unsupported file type: '{ext}'. Allowed: {sorted(ALLOWED_EXTS)}",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise ApiError("file_too_large", "File exceeds the size limit.", 413)

    try:
        pages = render_document(file.filename or "", data)
    except DomainError as e:
        raise ApiError(e.code, e.message)

    return {"page_count": len(pages), "pages": pages}
