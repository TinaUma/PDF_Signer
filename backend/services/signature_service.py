import io
import os
import uuid
from pathlib import Path

from PIL import Image
from rembg import remove


DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
SIGNATURES_DIR = DATA_DIR / "signatures"

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"}


def get_signatures_dir() -> Path:
    SIGNATURES_DIR.mkdir(parents=True, exist_ok=True)
    return SIGNATURES_DIR


def list_signatures() -> list[dict]:
    d = get_signatures_dir()
    result = []
    for f in sorted(d.glob("*.png")):
        result.append({"id": f.stem, "filename": f.name, "size": f.stat().st_size})
    return result


def save_signature(filename: str, data: bytes, remove_bg: bool = True) -> dict:
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTS:
        raise ValueError(f"Unsupported format: {ext}")

    img_data = remove(data) if remove_bg else data

    img = Image.open(io.BytesIO(img_data)).convert("RGBA")

    sig_id = str(uuid.uuid4())
    out_path = get_signatures_dir() / f"{sig_id}.png"
    img.save(out_path, format="PNG")

    return {"id": sig_id, "filename": out_path.name, "size": out_path.stat().st_size}


def delete_signature(sig_id: str) -> bool:
    path = get_signatures_dir() / f"{sig_id}.png"
    if not path.exists():
        return False
    path.unlink()
    return True


def get_signature_path(sig_id: str) -> Path | None:
    path = get_signatures_dir() / f"{sig_id}.png"
    return path if path.exists() else None
