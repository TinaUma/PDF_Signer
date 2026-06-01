from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from errors import ApiError, DomainError
from services import pdf_service
from services.signature_service import (
    list_signatures,
    save_signature,
    delete_signature,
    get_signature_path,
    rename_signature,
)

router = APIRouter(prefix="/api/signatures", tags=["signatures"])


class RenameRequest(BaseModel):
    name: str


@router.get("")
def get_signatures():
    return list_signatures()


@router.post("")
async def upload_signature(
    file: UploadFile = File(...),
    remove_bg: bool = Query(default=True),
):
    data = await file.read()
    if len(data) > pdf_service.MAX_FILE_SIZE:
        raise ApiError("file_too_large", "File exceeds the size limit.", 413)
    try:
        result = save_signature(file.filename or "", data, remove_bg=remove_bg)
    except DomainError as e:
        raise ApiError(e.code, e.message)
    return result


@router.get("/{sig_id}/image")
def get_signature_image(sig_id: str):
    path = get_signature_path(sig_id)
    if not path:
        raise ApiError("signature_not_found", "Signature not found", 404)
    return FileResponse(path, media_type="image/png")


@router.patch("/{sig_id}")
def patch_signature(sig_id: str, body: RenameRequest):
    # rename_signature returns the canonical stored name (cleaned) or None when
    # the id is unknown/invalid. Echo the stored value so the client matches a
    # subsequent GET /api/signatures (no flicker from trim vs. clean differences).
    cleaned = rename_signature(sig_id, body.name)
    if cleaned is None:
        raise ApiError("signature_not_found", "Signature not found", 404)
    return {"id": sig_id, "name": cleaned}


@router.delete("/{sig_id}")
def remove_signature(sig_id: str):
    if not delete_signature(sig_id):
        raise ApiError("signature_not_found", "Signature not found", 404)
    return {"deleted": sig_id}
