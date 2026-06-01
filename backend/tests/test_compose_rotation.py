"""Rotated signatures must pivot on their top-left corner (fix-signature-rotation / H3).

Konva rotates a layer about its top-left corner at (x, y) (offsetX/Y are 0 in
CanvasEditor). PIL's plain rotate pivots on the image centre, which shifted
rotated signatures ~14-22px off from where the user placed them. After the fix
the pivot corner stays exactly at (x, y).
"""

from PIL import Image

import services.composer as composer

SIG_ID = "00000000-0000-4000-8000-000000000000"


def _inked(px, cx, cy, radius=2):
    """True if any pixel within `radius` of (cx, cy) is clearly non-white."""
    return any(
        sum(px[cx + i, cy + j]) < 600  # white == 765; ink/gray sums lower
        for i in range(-radius, radius + 1)
        for j in range(-radius, radius + 1)
    )


def test_rotated_signature_pivots_on_top_left_corner(tmp_path):
    sig_dir = tmp_path / "sigs"
    sig_dir.mkdir()
    Image.new("RGBA", (80, 40), (0, 0, 0, 255)).save(sig_dir / f"{SIG_ID}.png")

    page = Image.new("RGB", (800, 600), (255, 255, 255))
    x, y = 300, 200
    out = composer.compose_page(
        page,
        [{"id": SIG_ID, "x": x, "y": y, "w": 80, "h": 40, "angle": 45}],
        sig_dir,
        jitter=0,
    ).convert("RGB")
    px = out.load()

    # The Konva pivot (top-left corner) must carry ink AT (x, y). With the old
    # centre-pivot rotate, (x, y) fell in the transparent bbox corner → white.
    assert _inked(px, x, y), "no ink at the pivot corner — rotation pivot is wrong"


def test_unrotated_signature_fills_its_rect(tmp_path):
    # angle=0 path must be unaffected by the fix.
    sig_dir = tmp_path / "sigs"
    sig_dir.mkdir()
    Image.new("RGBA", (80, 40), (0, 0, 0, 255)).save(sig_dir / f"{SIG_ID}.png")

    page = Image.new("RGB", (800, 600), (255, 255, 255))
    x, y = 300, 200
    out = composer.compose_page(
        page,
        [{"id": SIG_ID, "x": x, "y": y, "w": 80, "h": 40, "angle": 0}],
        sig_dir,
        jitter=0,
    ).convert("RGB")
    px = out.load()

    assert _inked(px, x + 1, y + 1)  # top-left inside the rect
    assert _inked(px, x + 78, y + 38)  # bottom-right inside the rect
    assert sum(px[x + 90, y + 20]) > 700  # just past the rect is still white
