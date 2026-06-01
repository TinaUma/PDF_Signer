"""Security tests for signature-id validation (sec-uuid-validation).

sig['id'] comes from the client and is used to build a filesystem path. Only
canonical UUIDs are accepted, closing the path-traversal vector.
"""

import json


def _pdf_payload(sig_id):
    return json.dumps(
        [
            {
                "page_idx": 0,
                "stage_w": 794,
                "stage_h": 1123,
                "signatures": [{"id": sig_id, "x": 10, "y": 10, "w": 50, "h": 40}],
            }
        ]
    )


def test_pdf_export_rejects_traversal_sig_id(client, make_pdf):
    r = client.post(
        "/api/export",
        files={"file": ("doc.pdf", make_pdf(), "application/pdf")},
        data={"pages": _pdf_payload("../../etc/passwd")},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "invalid_signature_id"


def test_pdf_export_rejects_non_uuid_sig_id(client, make_pdf):
    r = client.post(
        "/api/export",
        files={"file": ("doc.pdf", make_pdf(), "application/pdf")},
        data={"pages": _pdf_payload("not-a-uuid")},
    )
    assert r.status_code == 422


def test_get_signature_image_invalid_id_404(client):
    r = client.get("/api/signatures/not-a-uuid/image")
    assert r.status_code == 404


def test_delete_signature_invalid_id_404(client):
    # A non-uuid id is rejected by delete_signature before any filesystem touch.
    r = client.delete("/api/signatures/not-a-uuid")
    assert r.status_code == 404


_VALID_UUID = "00000000-0000-4000-8000-000000000000"


def test_pdf_export_rejects_mismatched_stage_aspect(client, make_pdf):
    # A4 page but a stage whose aspect ratio differs -> would distort (sx != sy).
    payload = json.dumps(
        [
            {
                "page_idx": 0,
                "stage_w": 794,
                "stage_h": 400,
                "signatures": [{"id": _VALID_UUID, "x": 1, "y": 1, "w": 10, "h": 10}],
            }
        ]
    )
    r = client.post(
        "/api/export",
        files={"file": ("doc.pdf", make_pdf(width=595, height=842), "application/pdf")},
        data={"pages": payload},
    )
    assert r.status_code == 422


def test_delete_pages_scalar_returns_422(client, make_pdf):
    for bad in ("5", "true", "null"):
        r = client.post(
            "/api/export",
            files={"file": ("doc.pdf", make_pdf(), "application/pdf")},
            data={"pages": json.dumps([]), "delete_pages": bad},
        )
        assert r.status_code == 422, bad
        assert r.json()["detail"]["code"] == "invalid_pages_payload"


def test_negative_page_idx_returns_422(client, make_pdf):
    payload = json.dumps(
        [
            {
                "page_idx": -1,
                "stage_w": 794,
                "stage_h": 1123,
                "signatures": [{"id": _VALID_UUID, "x": 1, "y": 1, "w": 5, "h": 5}],
            }
        ]
    )
    r = client.post(
        "/api/export",
        files={"file": ("doc.pdf", make_pdf(), "application/pdf")},
        data={"pages": payload},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "invalid_pages_payload"


def test_pages_not_list_returns_422(client, make_pdf):
    r = client.post(
        "/api/export",
        files={"file": ("doc.pdf", make_pdf(), "application/pdf")},
        data={"pages": json.dumps({"page_idx": 0})},  # dict, not a list
    )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "invalid_pages_payload"


def test_signature_missing_coords_returns_422(client, make_pdf):
    payload = json.dumps(
        [
            {
                "page_idx": 0,
                "stage_w": 794,
                "stage_h": 1123,
                "signatures": [{"id": _VALID_UUID, "x": 1, "y": 1}],
            }
        ]  # no w/h
    )
    r = client.post(
        "/api/export",
        files={"file": ("doc.pdf", make_pdf(), "application/pdf")},
        data={"pages": payload},
    )
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "invalid_pages_payload"


def test_corrupt_pdf_returns_422(client):
    payload = json.dumps(
        [{"page_idx": 0, "stage_w": 794, "stage_h": 1123, "signatures": []}]
    )
    r = client.post(
        "/api/export",
        files={"file": ("doc.pdf", b"this is definitely not a pdf", "application/pdf")},
        data={"pages": payload},
    )
    assert r.status_code == 422
