from pathlib import Path

from PIL import Image


def compose_page(
    page_img: Image.Image, signatures: list[dict], sig_dir: Path
) -> Image.Image:
    """Overlay signatures onto a page image. Returns new RGBA image."""
    result = page_img.convert("RGBA")

    for sig in signatures:
        sig_path = sig_dir / f"{sig['id']}.png"
        if not sig_path.exists():
            continue

        sig_img = Image.open(sig_path).convert("RGBA")

        w, h = int(sig["w"]), int(sig["h"])
        sig_img = sig_img.resize((w, h), Image.LANCZOS)

        angle = sig.get("angle", 0)
        if angle:
            sig_img = sig_img.rotate(-angle, expand=True, resample=Image.BICUBIC)

        opacity = sig.get("opacity", 1.0)
        if opacity < 1.0:
            r, g, b, a = sig_img.split()
            a = a.point(lambda p: int(p * opacity))
            sig_img = Image.merge("RGBA", (r, g, b, a))

        x, y = int(sig["x"]), int(sig["y"])
        result.paste(sig_img, (x, y), sig_img)

    return result
