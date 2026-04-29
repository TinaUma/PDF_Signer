import io
import os
from datetime import datetime
from pathlib import Path

import fitz
from PIL import Image

from services.composer import compose_page
from services.signature_service import get_signatures_dir


def export_pdf(pdf_data: bytes, pages_payload: list[dict]) -> bytes:
    """Burn signatures into PDF pages, return new PDF bytes."""
    src = fitz.open(stream=pdf_data, filetype="pdf")
    out = fitz.open()
    sig_dir = get_signatures_dir()

    page_map = {p["page_idx"]: p["signatures"] for p in pages_payload}

    for i, page in enumerate(src):
        if i in page_map and page_map[i]:
            pix = page.get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            composed = compose_page(img, page_map[i], sig_dir)

            buf = io.BytesIO()
            composed.convert("RGB").save(buf, format="PNG")
            buf.seek(0)

            new_page = out.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(new_page.rect, stream=buf.read())
        else:
            out.insert_pdf(src, from_page=i, to_page=i)

    result = out.tobytes(deflate=True)
    out.close()
    src.close()
    return result


def save_output(data: bytes, ext: str = "pdf") -> Path:
    data_dir = Path(os.environ.get("DATA_DIR", "./data")) / "output"
    data_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = data_dir / f"signed_{ts}.{ext}"
    path.write_bytes(data)
    return path
