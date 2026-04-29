import io
import json
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from PIL import Image

from services.pdf_writer import export_pdf, save_output
from services.composer import compose_page
from services.signature_service import get_signatures_dir

router = APIRouter(prefix="/api/export", tags=["export"])


def _validate_signatures(sigs: list[dict], page_w: float, page_h: float):
    for s in sigs:
        if (
            s["x"] < 0
            or s["y"] < 0
            or s["x"] + s["w"] > page_w
            or s["y"] + s["h"] > page_h
        ):
            raise HTTPException(
                status_code=422,
                detail=f"Signature coordinates out of page bounds: x={s['x']}, y={s['y']}, w={s['w']}, h={s['h']}",
            )


@router.post("")
async def export_document(
    file: UploadFile = File(...),
    pages: str = Form(...),
):
    pages_payload = json.loads(pages)
    data = await file.read()
    ext = Path(file.filename or "").suffix.lower()

    if ext == ".pdf":
        try:
            import fitz

            doc = fitz.open(stream=data, filetype="pdf")
            for p in pages_payload:
                idx = p["page_idx"]
                if idx >= len(doc):
                    raise HTTPException(
                        status_code=422, detail=f"Page index {idx} out of range"
                    )
                page = doc[idx]
                _validate_signatures(
                    p["signatures"], page.rect.width * 2, page.rect.height * 2
                )
            doc.close()
        except HTTPException:
            raise

        result_bytes = export_pdf(data, pages_payload)
        save_output(result_bytes, "pdf")
        return Response(
            content=result_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=signed.pdf"},
        )

    elif ext in {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"}:
        img = Image.open(io.BytesIO(data))
        sigs = pages_payload[0]["signatures"] if pages_payload else []
        _validate_signatures(sigs, img.width, img.height)
        composed = compose_page(img, sigs, get_signatures_dir())
        buf = io.BytesIO()
        composed.convert("RGB").save(buf, format="JPEG")
        result_bytes = buf.getvalue()
        save_output(result_bytes, "jpg")
        return Response(
            content=result_bytes,
            media_type="image/jpeg",
            headers={"Content-Disposition": "attachment; filename=signed.jpg"},
        )

    else:
        raise HTTPException(status_code=422, detail=f"Unsupported file type: {ext}")
