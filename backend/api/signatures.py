from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse

from services import pdf_service
from services.signature_service import (
    list_signatures,
    save_signature,
    delete_signature,
    get_signature_path,
)

router = APIRouter(prefix="/api/signatures", tags=["signatures"])


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
        raise HTTPException(status_code=413, detail="File exceeds the size limit.")
    try:
        result = save_signature(file.filename or "", data, remove_bg=remove_bg)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return result


@router.get("/{sig_id}/image")
def get_signature_image(sig_id: str):
    path = get_signature_path(sig_id)
    if not path:
        raise HTTPException(status_code=404, detail="Signature not found")
    return FileResponse(path, media_type="image/png")


@router.delete("/{sig_id}")
def remove_signature(sig_id: str):
    if not delete_signature(sig_id):
        raise HTTPException(status_code=404, detail="Signature not found")
    return {"deleted": sig_id}
