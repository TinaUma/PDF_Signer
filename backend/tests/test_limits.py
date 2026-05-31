"""Resource-limit / anti-DoS tests (sec-resource-limits).

Covers file-size caps, PDF page-count and pixmap-area caps, and Pillow
decompression-bomb handling.
"""

import io
import json

from PIL import Image

from services import pdf_service


def _img_png(size=(50, 40)):
    buf = io.BytesIO()
    Image.new("RGB", size, (10, 10, 10)).save(buf, format="PNG")
    return buf.getvalue()


def _export_pdf(client, pdf):
    payload = json.dumps(
        [{"page_idx": 0, "stage_w": 794, "stage_h": 1123, "signatures": []}]
    )
    return client.post(
        "/api/export",
        files={"file": ("d.pdf", pdf, "application/pdf")},
        data={"pages": payload},
    )


def _upload_sig(client, data):
    return client.post(
        "/api/signatures",
        params={"remove_bg": "false"},
        files={"file": ("sig.png", data, "image/png")},
    )


def test_export_too_many_pages_rejected(client, make_pdf):
    pdf = make_pdf(width=595, height=842, pages=pdf_service.MAX_PAGES + 1)
    assert _export_pdf(client, pdf).status_code == 422


def test_export_huge_page_rejected(client, make_pdf):
    # 3000x3000 pt at 200 DPI ~ 8333^2 ~ 69 MP > MAX_PIXMAP_PIXELS (64 MP).
    pdf = make_pdf(width=3000, height=3000)
    assert _export_pdf(client, pdf).status_code == 422


def test_render_huge_page_rejected(client, make_pdf):
    pdf = make_pdf(width=3000, height=3000)
    r = client.post(
        "/api/document/render",
        files={"file": ("d.pdf", pdf, "application/pdf")},
    )
    assert r.status_code == 422


def test_render_too_many_pages_rejected(client, make_pdf):
    pdf = make_pdf(pages=pdf_service.MAX_PAGES + 1)
    r = client.post(
        "/api/document/render",
        files={"file": ("d.pdf", pdf, "application/pdf")},
    )
    assert r.status_code == 422


def test_signature_decompression_bomb_rejected(client, monkeypatch):
    monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", 100)
    assert _upload_sig(client, _img_png((50, 40))).status_code == 422


def test_export_oversize_file_rejected(client, make_pdf, monkeypatch):
    monkeypatch.setattr(pdf_service, "MAX_FILE_SIZE", 10)
    assert _export_pdf(client, make_pdf()).status_code == 413


def test_signature_oversize_file_rejected(client, monkeypatch):
    monkeypatch.setattr(pdf_service, "MAX_FILE_SIZE", 10)
    assert _upload_sig(client, _img_png((50, 40))).status_code == 413
