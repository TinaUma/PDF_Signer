"""End-to-end HTTP test: upload a real signature, export it onto a PDF page,
then render the returned PDF and assert the signature's ink landed where it was
placed. This latches the whole stage->page coordinate chain (H3/H5/H6): if port
resolution, the top-left rotation pivot, or the scale math regress, the ink
moves and this test goes red.
"""

import io
import json

import fitz
from PIL import Image


def _black_sig_png(w=60, h=40):
    """Solid black rectangle — with remove_bg=false it stays a fully opaque
    ink block, so its pixels are predictable after compositing."""
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (0, 0, 0)).save(buf, format="PNG")
    return buf.getvalue()


def test_upload_then_export_places_ink_at_expected_pixel(client, make_pdf):
    # A4-ish page; stage dims share the page aspect ratio so sx == sy.
    page_w, page_h = 595, 842
    stage_w, stage_h = 595, 842

    up = client.post(
        "/api/signatures",
        params={"remove_bg": "false"},
        files={"file": ("sig.png", _black_sig_png(), "image/png")},
    )
    assert up.status_code == 200
    sig_id = up.json()["id"]

    # Place the signature at a known stage-space box, well inside the page.
    sx, sy, sw, sh = 200, 300, 80, 50
    pages = [
        {
            "page_idx": 0,
            "stage_w": stage_w,
            "stage_h": stage_h,
            "signatures": [
                {
                    "id": sig_id,
                    "x": sx,
                    "y": sy,
                    "w": sw,
                    "h": sh,
                    "angle": 0,
                    "opacity": 1.0,
                },
            ],
        }
    ]

    exp = client.post(
        "/api/export",
        files={
            "file": (
                "doc.pdf",
                make_pdf(width=page_w, height=page_h),
                "application/pdf",
            )
        },
        data={"pages": json.dumps(pages), "delete_pages": "[]"},
    )
    assert exp.status_code == 200, exp.text
    assert exp.headers["content-type"] == "application/pdf"

    # Render the signed PDF and inspect the pixel at the signature's centre.
    out = fitz.open(stream=exp.content, filetype="pdf")
    try:
        pix = out[0].get_pixmap()
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    finally:
        out.close()

    # Centre of the placed box as a fraction of the page → pixel in the render.
    cx = round((sx + sw / 2) / stage_w * img.width)
    cy = round((sy + sh / 2) / stage_h * img.height)
    r, g, b = img.getpixel((cx, cy))
    assert r < 80 and g < 80 and b < 80, f"expected ink at ({cx},{cy}), got {(r, g, b)}"

    # A far corner must stay white — proves we didn't just paint the whole page.
    cr, cg, cb = img.getpixel((round(img.width * 0.02), round(img.height * 0.02)))
    assert cr > 200 and cg > 200 and cb > 200, f"corner not white: {(cr, cg, cb)}"
