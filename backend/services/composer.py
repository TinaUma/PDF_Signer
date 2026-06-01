import hashlib
import math
from pathlib import Path

from PIL import Image

from services.signature_service import is_valid_sig_id
from services.text_render import DEFAULT_FAMILY, render_text


def _jitter_params(sig_id: str, index: int, intensity: float, page: int = 0):
    """Deterministic per-instance DEFORMATION so repeated placements of the same
    signature look hand-redrawn (different slant, proportions, lean), not just
    nudged. A person never signs identically twice; this fakes that variance.

    Returns (d_angle_deg, scale_x, scale_y, skew_x, opacity_mult, dx_px, dy_px).
    `skew_x` is a horizontal shear FACTOR (matches Konva's skewX, ≈tan of the
    slant). intensity<=0 yields a neutral transform. Seeded by (sig_id, page,
    index) → reproducible and distinct across pages and positions. The frontend
    mirrors this in lib/jitter.js for a WYSIWYG canvas preview — keep both in
    sync.
    """
    if intensity <= 0:
        return (0.0, 1.0, 1.0, 0.0, 1.0, 0, 0)
    intensity = min(intensity, 1.0)
    h = hashlib.sha256(f"{sig_id}:{page}:{index}".encode()).digest()

    def unit(i):  # map a byte to [-1, 1]
        return (h[i] / 255.0) * 2 - 1

    d_angle = unit(0) * 5.0 * intensity  # ±5°
    scale_x = 1 + unit(1) * 0.10 * intensity  # ±10% (independent axes -> reshape)
    scale_y = 1 + unit(5) * 0.10 * intensity  # ±10%
    skew_x = unit(2) * 0.18 * intensity  # ±0.18 ≈ ±10° slant
    opacity_mult = 1 - (h[6] / 255.0) * 0.08 * intensity  # 0..-8% (pen pressure)
    dx = round(unit(3) * 4 * intensity)  # ±4 px
    dy = round(unit(4) * 4 * intensity)
    return (d_angle, scale_x, scale_y, skew_x, opacity_mult, dx, dy)


def _paste_transformed(result, img, x, y, angle_deg, skew_x):
    """Paste `img` onto `result` under the affine Konva applies to a placed node:
    world = translate(x,y) · rotate(angle) · skew(skewX) · local, with the node
    origin (top-left) at (x, y). One Image.transform with the exact same matrix
    keeps the server output pixel-aligned with the canvas preview (any non-uniform
    scale is already baked into img's size by the caller, so scale=1 here)."""
    w, h = img.size
    theta = math.radians(angle_deg)
    cos, sin = math.cos(theta), math.sin(theta)
    # L = R · K, with K = [[1, skew_x], [0, 1]] (Konva skewX, skewY=0).
    l00, l01 = cos, cos * skew_x - sin
    l10, l11 = sin, sin * skew_x + cos

    det = l00 * l11 - l01 * l10
    if abs(det) < 1e-9:  # degenerate transform — fall back to a plain paste
        result.paste(img, (round(x), round(y)), img)
        return

    corners = ((0, 0), (w, 0), (0, h), (w, h))
    xs = [l00 * u + l01 * v for u, v in corners]
    ys = [l10 * u + l11 * v for u, v in corners]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    out_w = max(1, math.ceil(max_x - min_x))
    out_h = max(1, math.ceil(max_y - min_y))

    # Inverse linear map (PIL AFFINE maps output px -> input px).
    i00, i01 = l11 / det, -l01 / det
    i10, i11 = -l10 / det, l00 / det
    c = i00 * min_x + i01 * min_y
    f = i10 * min_x + i11 * min_y
    transformed = img.transform(
        (out_w, out_h), Image.AFFINE, (i00, i01, c, i10, i11, f), resample=Image.BICUBIC
    )
    result.paste(transformed, (round(x + min_x), round(y + min_y)), transformed)


def _resolve_sig_image(
    sig_id: str,
    sig_dir: Path | None,
    sig_images: dict[str, Image.Image] | None,
) -> Image.Image | None:
    """Source signature image for a placement, or None to skip it.

    Demo mode passes `sig_images` (id -> already-decoded PIL image, sent inline
    with the export request, since the server stores nothing); otherwise the
    image is read from sig_dir/{id}.png on disk. A missing id in either source
    returns None so the placement is skipped — exactly as the original disk path
    did for a missing file.
    """
    if sig_images is not None:
        return sig_images.get(sig_id)
    if sig_dir is not None:
        path = sig_dir / f"{sig_id}.png"
        if path.exists():
            return Image.open(path)
    return None


def compose_page(
    page_img: Image.Image,
    signatures: list[dict],
    sig_dir: Path | None = None,
    jitter: float = 0.0,
    page_index: int = 0,
    sig_images: dict[str, Image.Image] | None = None,
    texts: list[dict] | None = None,
) -> Image.Image:
    """Overlay signatures onto a page image. Returns RGB image with white
    background. Uniquification is per signature: each sig may carry its own
    `jitter` (0..1); the `jitter` argument is only the fallback for signatures
    that don't specify one. `page_index` makes the variation distinct across
    pages.

    Signature pixels come from `sig_dir` (disk, normal mode) or, when
    `sig_images` is provided, from that {id: Image} map (demo mode, sent inline
    with the request)."""
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
        src_img = _resolve_sig_image(sig["id"], sig_dir, sig_images)
        if src_img is None:
            continue

        # Per-instance uniquification: prefer the signature's own jitter, falling
        # back to the page-level value. Coerce defensively — a non-numeric value
        # from the payload must not raise (it would become an HTTP 500).
        try:
            intensity = float(sig.get("jitter", jitter))
        except (TypeError, ValueError):
            intensity = 0.0
        d_angle, scale_x, scale_y, skew_x, opacity_mult, dx, dy = _jitter_params(
            sig["id"], index, intensity, page_index
        )

        sig_img = src_img.convert("RGBA")

        # Bake the (non-uniform) scale into the bitmap size; skew + rotation are
        # then applied by _paste_transformed with scale=1, matching Konva, which
        # also folds the deformation scale into the rendered width/height.
        w = max(1, round(int(sig["w"]) * scale_x))
        h = max(1, round(int(sig["h"]) * scale_y))
        sig_img = sig_img.resize((w, h), Image.LANCZOS)

        opacity = max(0.0, min(1.0, sig.get("opacity", 1.0) * opacity_mult))
        if opacity < 1.0:
            r, g, b, a = sig_img.split()
            a = a.point(lambda p: int(p * opacity))
            sig_img = Image.merge("RGBA", (r, g, b, a))

        x = int(sig["x"]) + dx
        y = int(sig["y"]) + dy
        angle = sig.get("angle", 0) + d_angle

        if angle or skew_x:
            _paste_transformed(result, sig_img, x, y, angle, skew_x)
        else:
            result.paste(sig_img, (x, y), sig_img)

    _render_texts(result, texts)
    return result


def _render_texts(result: Image.Image, texts: list[dict] | None) -> None:
    """Draw text annotations onto the page. Each item's geometry (x, y, fontSize)
    is already scaled to page-image space by the caller, mirroring signatures.
    A malformed item is skipped (never raises) so one bad entry can't 500."""
    for t in texts or []:
        try:
            img = render_text(
                t.get("text", ""),
                family=t.get("family", DEFAULT_FAMILY),
                bold=bool(t.get("bold", False)),
                italic=bool(t.get("italic", False)),
                px=int(t.get("fontSize", 32)),
                color=t.get("color", "#000000"),
                align=t.get("align", "left"),
                opacity=float(t.get("opacity", 1.0)),
            )
        except (TypeError, ValueError):
            continue
        if img is None:  # empty/whitespace text
            continue
        x, y = int(t.get("x", 0)), int(t.get("y", 0))
        angle = t.get("angle", 0) or 0
        if angle:
            _paste_transformed(result, img, x, y, angle, 0.0)
        else:
            result.paste(img, (x, y), img)
