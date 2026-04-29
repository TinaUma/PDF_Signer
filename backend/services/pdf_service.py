import io
import base64
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image


SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"}
SUPPORTED_PDF_EXTS = {".pdf"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def render_document(filename: str, data: bytes) -> list[str]:
    """Return list of base64-encoded PNG pages."""
    ext = Path(filename).suffix.lower()

    if ext in SUPPORTED_PDF_EXTS:
        return _render_pdf(data)
    elif ext in SUPPORTED_IMAGE_EXTS:
        return _render_image(data)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _render_pdf(data: bytes) -> list[str]:
    doc = fitz.open(stream=data, filetype="pdf")
    pages = []
    for page in doc:
        pix = page.get_pixmap(dpi=150)
        png_bytes = pix.tobytes("png")
        pages.append(base64.b64encode(png_bytes).decode())
    doc.close()
    return pages


def _render_image(data: bytes) -> list[str]:
    img = Image.open(io.BytesIO(data))
    buf = io.BytesIO()
    img.convert("RGBA").save(buf, format="PNG")
    return [base64.b64encode(buf.getvalue()).decode()]
