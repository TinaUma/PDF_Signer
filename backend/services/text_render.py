"""Render styled text annotations for the exporter.

Fonts are bundled under backend/fonts/ so the feature works fully offline in both
the Docker image and the PyInstaller sidecar. Three families:
  - "sans"  — DejaVu Sans  (regular / bold / italic / bold-italic)
  - "serif" — DejaVu Serif (regular / bold / italic / bold-italic)
  - "handwriting" — Caveat, a variable font pinned to weight 400/700 (no italic)

The frontend loads the same families via @font-face so the canvas preview
matches the exported result.
"""

import os
import sys

from PIL import Image, ImageColor, ImageDraw, ImageFont

# Static (4-style) families keyed by family -> style -> filename. The handwriting
# family is a single variable font; weight is set at load time.
_STATIC_FONTS = {
    "sans": {
        "regular": "DejaVuSans.ttf",
        "bold": "DejaVuSans-Bold.ttf",
        "italic": "DejaVuSans-Oblique.ttf",
        "bolditalic": "DejaVuSans-BoldOblique.ttf",
    },
    "serif": {
        "regular": "DejaVuSerif.ttf",
        "bold": "DejaVuSerif-Bold.ttf",
        "italic": "DejaVuSerif-Italic.ttf",
        "bolditalic": "DejaVuSerif-BoldItalic.ttf",
    },
}
_VARIABLE_FONTS = {"handwriting": "Caveat-VF.ttf"}

FONT_FAMILIES = (*_STATIC_FONTS.keys(), *_VARIABLE_FONTS.keys())
DEFAULT_FAMILY = "sans"

# Spacing between wrapped lines, as a fraction of the font size.
_LINE_SPACING_RATIO = 0.25
# Small transparent margin so anti-aliased edges / italic overhang aren't clipped.
_PAD = 4


def _fonts_dir() -> str:
    """Bundled fonts dir — works from source and from a PyInstaller bundle
    (the .spec adds backend/fonts as data, landing under sys._MEIPASS/fonts)."""
    base = getattr(sys, "_MEIPASS", None)
    if base:
        bundled = os.path.join(base, "fonts")
        if os.path.isdir(bundled):
            return bundled
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fonts"
    )


def get_font(family: str, bold: bool, italic: bool, px: int) -> ImageFont.FreeTypeFont:
    """Load the bundled font for a family + style at `px`. Unknown family falls
    back to the default; a missing style file falls back to the family's regular.
    The handwriting family is a variable font: bold -> weight 700, and it has no
    italic (the flag is ignored)."""
    px = max(1, int(px))
    d = _fonts_dir()

    if family in _VARIABLE_FONTS:
        font = ImageFont.truetype(os.path.join(d, _VARIABLE_FONTS[family]), px)
        try:
            font.set_variation_by_axes([700 if bold else 400])
        except Exception:
            pass  # not all builds expose variations; default instance is fine
        return font

    styles = _STATIC_FONTS.get(family, _STATIC_FONTS[DEFAULT_FAMILY])
    key = ("bold" if bold else "") + ("italic" if italic else "") or "regular"
    fname = styles.get(key) or styles["regular"]
    return ImageFont.truetype(os.path.join(d, fname), px)


def _parse_color(color: str) -> tuple[int, int, int]:
    try:
        return ImageColor.getrgb(color)[:3]
    except (ValueError, AttributeError):
        return (0, 0, 0)  # malformed -> black, never raise


def render_text(
    text: str,
    *,
    family: str = DEFAULT_FAMILY,
    bold: bool = False,
    italic: bool = False,
    px: int = 32,
    color: str = "#000000",
    align: str = "left",
    opacity: float = 1.0,
) -> Image.Image | None:
    """Render `text` (possibly multi-line) to a tightly-cropped RGBA image, or
    None for empty/whitespace text (nothing to draw)."""
    if not text or not text.strip():
        return None
    if align not in ("left", "center", "right"):
        align = "left"

    font = get_font(family, bold, italic, px)
    spacing = round(px * _LINE_SPACING_RATIO)

    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bbox = probe.multiline_textbbox(
        (0, 0), text, font=font, align=align, spacing=spacing
    )
    w = max(1, bbox[2] - bbox[0]) + _PAD * 2
    h = max(1, bbox[3] - bbox[1]) + _PAD * 2

    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    alpha = max(0, min(255, round(opacity * 255)))
    fill = (*_parse_color(color), alpha)
    draw.multiline_text(
        (_PAD - bbox[0], _PAD - bbox[1]),
        text,
        font=font,
        fill=fill,
        align=align,
        spacing=spacing,
    )
    return img
