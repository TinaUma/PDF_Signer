import hashlib
from pathlib import Path

from PIL import Image

from services.signature_service import is_valid_sig_id


def _jitter_params(sig_id: str, index: int, intensity: float, page: int = 0):
    """Deterministic per-instance jitter so repeated placements of the same
    signature (across pages or several on one page) are not pixel-identical.

    Returns (d_angle_deg, scale_mult, opacity_mult, dx_px, dy_px). intensity<=0
    yields a neutral transform. Seeded by (sig_id, page, index) → reproducible
    and distinct across pages and positions.
    """
    if intensity <= 0:
        return (0.0, 1.0, 1.0, 0, 0)
    intensity = min(intensity, 1.0)
    h = hashlib.sha256(f"{sig_id}:{page}:{index}".encode()).digest()

    def unit(i):  # map a byte to [-1, 1]
        return (h[i] / 255.0) * 2 - 1

    d_angle = unit(0) * 2.5 * intensity  # ±2.5°
    scale_mult = 1 + unit(1) * 0.04 * intensity  # ±4%
    opacity_mult = 1 - (h[2] / 255.0) * 0.10 * intensity  # 0..-10%
    dx = round(unit(3) * 3 * intensity)  # ±3 px
    dy = round(unit(4) * 3 * intensity)
    return (d_angle, scale_mult, opacity_mult, dx, dy)


def compose_page(
    page_img: Image.Image,
    signatures: list[dict],
    sig_dir: Path,
    jitter: float = 0.0,
    page_index: int = 0,
) -> Image.Image:
    """Overlay signatures onto a page image. Returns RGB image with white
    background. `jitter` (0..1) applies subtle per-instance variation;
    `page_index` makes that variation distinct across pages."""
    base = Image.new("RGB", page_img.size, (255, 255, 255))
    if page_img.mode == "RGBA":
        base.paste(page_img.convert("RGB"), mask=page_img.split()[3])
    else:
        base.paste(page_img.convert("RGB"))
    result = base.convert("RGBA")

    for index, sig in enumerate(signatures):
        # Defense-in-depth: never build a path from a non-UUID id.
        if not is_valid_sig_id(sig.get("id")):
            continue
        sig_path = sig_dir / f"{sig['id']}.png"
        if not sig_path.exists():
            continue

        d_angle, scale_mult, opacity_mult, dx, dy = _jitter_params(
            sig["id"], index, jitter, page_index
        )

        sig_img = Image.open(sig_path).convert("RGBA")

        w = max(1, round(int(sig["w"]) * scale_mult))
        h = max(1, round(int(sig["h"]) * scale_mult))
        sig_img = sig_img.resize((w, h), Image.LANCZOS)

        angle = sig.get("angle", 0) + d_angle
        if angle:
            sig_img = sig_img.rotate(-angle, expand=True, resample=Image.BICUBIC)

        opacity = max(0.0, min(1.0, sig.get("opacity", 1.0) * opacity_mult))
        if opacity < 1.0:
            r, g, b, a = sig_img.split()
            a = a.point(lambda p: int(p * opacity))
            sig_img = Image.merge("RGBA", (r, g, b, a))

        x = int(sig["x"]) + dx
        y = int(sig["y"]) + dy
        result.paste(sig_img, (x, y), sig_img)

    return result
