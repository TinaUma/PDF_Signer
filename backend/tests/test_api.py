"""API integration tests for /api/document/render and /api/signatures CRUD."""

import io

from PIL import Image, ImageDraw


def _sig_png():
    img = Image.new("RGB", (120, 60), (255, 255, 255))
    ImageDraw.Draw(img).rectangle([40, 20, 90, 40], fill=(10, 10, 10))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_render_pdf_returns_pages(client, make_pdf):
    r = client.post(
        "/api/document/render",
        files={"file": ("d.pdf", make_pdf(pages=2), "application/pdf")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["page_count"] == 2
    assert len(body["pages"]) == 2


def test_render_image_returns_one_page(client):
    r = client.post(
        "/api/document/render",
        files={"file": ("d.png", _sig_png(), "image/png")},
    )
    assert r.status_code == 200
    assert r.json()["page_count"] == 1


def test_render_unsupported_ext_rejected(client):
    r = client.post(
        "/api/document/render",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "unsupported_file_type"


def test_signatures_crud(client):
    up = client.post(
        "/api/signatures",
        params={"remove_bg": "false"},
        files={"file": ("sig.png", _sig_png(), "image/png")},
    )
    assert up.status_code == 200
    sig_id = up.json()["id"]

    listed = client.get("/api/signatures")
    assert listed.status_code == 200
    assert any(s["id"] == sig_id for s in listed.json())

    assert client.get(f"/api/signatures/{sig_id}/image").status_code == 200
    assert client.delete(f"/api/signatures/{sig_id}").status_code == 200
    assert client.get(f"/api/signatures/{sig_id}/image").status_code == 404


def test_get_missing_signature_404(client):
    # Valid UUID shape, but not stored.
    r = client.get("/api/signatures/11111111-1111-4111-8111-111111111111/image")
    assert r.status_code == 404
