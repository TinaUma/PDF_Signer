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

# Map source extension -> (PIL format, response media type, output extension).
# Lets image export preserve the source format instead of always emitting JPEG.
IMAGE_OUTPUT = {
    ".jpg": ("JPEG", "image/jpeg", ".jpg"),
    ".jpeg": ("JPEG", "image/jpeg", ".jpeg"),
    ".png": ("PNG", "image/png", ".png"),
    ".tiff": ("TIFF", "image/tiff", ".tiff"),
    ".tif": ("TIFF", "image/tiff", ".tif"),
    ".webp": ("WEBP", "image/webp", ".webp"),
}


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
                # Signatures arrive in the frontend stage coordinate space
                # (stage_w x stage_h, default 794x1123). pdf_writer scales from
                # that same space, so bounds must be checked against it — NOT
                # against page.rect (a different unit) which produced both false
                # rejections (small pages) and false passes (large pages).
                stage_w = p.get("stage_w", 794)
                stage_h = p.get("stage_h", 1123)
                _validate_signatures(p["signatures"], stage_w, stage_h)
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

    elif ext in IMAGE_OUTPUT:
        try:
            img = Image.open(io.BytesIO(data))
            img.load()  # force decode so corrupt/truncated data fails here
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=422,
                detail="Не удалось открыть изображение: файл повреждён или формат не поддерживается.",
            )
        page_info = pages_payload[0] if pages_payload else {}
        sigs = page_info.get("signatures", [])
        stage_w = page_info.get("stage_w", 0)
        stage_h = page_info.get("stage_h", 0)
        if not stage_w or not stage_h:
            raise HTTPException(
                status_code=422, detail="stage_w and stage_h are required"
            )
        sx = img.width / stage_w
        sy = img.height / stage_h
        scaled_sigs = [
            {
                **s,
                "x": s["x"] * sx,
                "y": s["y"] * sy,
                "w": s["w"] * sx,
                "h": s["h"] * sy,
            }
            for s in sigs
        ]
        _validate_signatures(scaled_sigs, img.width, img.height)
        composed = compose_page(img, scaled_sigs, get_signatures_dir())
        fmt, media_type, out_ext = IMAGE_OUTPUT[ext]
        buf = io.BytesIO()
        composed.convert("RGB").save(buf, format=fmt)
        result_bytes = buf.getvalue()
        save_output(result_bytes, out_ext.lstrip("."))
        return Response(
            content=result_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename=signed{out_ext}"},
        )

    else:
        raise HTTPException(status_code=422, detail=f"Unsupported file type: {ext}")
