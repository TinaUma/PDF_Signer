"""DoS guards on the export payload (limit-export-payload / H9).

The unauthenticated /api/export endpoint must reject oversized payloads by COUNT
before doing O(n·m) per-item validation, so a single crafted request can't pin
the CPU.
"""

import json


def _post(client, pdf, pages):
    return client.post(
        "/api/export",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"pages": pages},
    )


def test_too_many_pages_rejected(client, make_pdf):
    pages = json.dumps(
        [
            {"page_idx": i, "stage_w": 794, "stage_h": 1123, "signatures": []}
            for i in range(600)  # > MAX_PAGES (500)
        ]
    )
    r = _post(client, make_pdf(), pages)
    assert r.status_code == 422  # rejected by count, not 200 / 500


def test_too_many_signatures_per_page_rejected(client, make_pdf):
    sig = {"id": "00000000-0000-4000-8000-000000000000", "x": 1, "y": 1, "w": 1, "h": 1}
    pages = json.dumps(
        [{"page_idx": 0, "stage_w": 794, "stage_h": 1123, "signatures": [sig] * 200}]
    )
    r = _post(client, make_pdf(), pages)
    assert r.status_code == 422


def test_oversized_raw_pages_string_rejected(client, make_pdf):
    pages = (
        "[" + "0," * 350_000
    )  # ~684 KB: > MAX_PAGES_JSON_BYTES (512K), < Starlette 1M
    r = _post(client, make_pdf(), pages)
    assert r.status_code == 413  # our explicit pre-parse guard, never json.loads'd


def test_normal_payload_still_accepted(client, make_pdf):
    pages = json.dumps(
        [{"page_idx": 0, "stage_w": 794, "stage_h": 1123, "signatures": []}]
    )
    r = _post(client, make_pdf(width=595, height=842), pages)
    assert r.status_code == 200
