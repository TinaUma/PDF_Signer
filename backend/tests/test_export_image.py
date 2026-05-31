"""Tests for image export format preservation + error handling
(fix-image-export-format).

Image export used to always emit JPEG and crashed (500) on a corrupt upload.
It now preserves the source format and returns 422 for unreadable images.
"""

import io
import json

from PIL import Image


def _img_bytes(fmt, color=(120, 130, 140), size=(50, 40)):
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def _export(client, filename, data, sigs=None, stage=(50, 40)):
    payload = json.dumps(
        [
            {
                "page_idx": 0,
                "stage_w": stage[0],
                "stage_h": stage[1],
                "signatures": sigs or [],
            }
        ]
    )
    return client.post(
        "/api/export",
        files={"file": (filename, data, "application/octet-stream")},
        data={"pages": payload},
    )


def test_corrupt_image_returns_422(client):
    r = _export(client, "bad.png", b"definitely-not-an-image")
    assert r.status_code == 422


def test_png_source_exports_png(client):
    r = _export(client, "doc.png", _img_bytes("PNG"))
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_jpeg_source_exports_jpeg(client):
    r = _export(client, "doc.jpg", _img_bytes("JPEG"))
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"
    assert r.content[:2] == b"\xff\xd8"


def test_webp_source_exports_webp(client):
    r = _export(client, "doc.webp", _img_bytes("WEBP"))
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/webp"
