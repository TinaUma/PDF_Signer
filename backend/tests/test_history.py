"""Signing history: an export persists original + result + layout; entries are
listable, reopenable (full meta with `pages`), downloadable, and deletable
(single + many). A history-save failure must not block the export download.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def _upload(client, make_image):
    files = {"file": ("sig.png", make_image(), "image/png")}
    r = client.post("/api/signatures?remove_bg=false", files=files)
    assert r.status_code == 200
    return r.json()["id"]


def _export_pdf(client, make_pdf, sig_id, jitter=0.0):
    pages = [
        {
            "page_idx": 0,
            "stage_w": 595,
            "stage_h": 842,
            "signatures": [
                {
                    "id": sig_id,
                    "x": 10,
                    "y": 10,
                    "w": 100,
                    "h": 50,
                    "angle": 0,
                    "opacity": 1.0,
                    "jitter": jitter,
                },
            ],
        }
    ]
    files = {"file": ("doc.pdf", make_pdf(), "application/pdf")}
    data = {"pages": json.dumps(pages), "delete_pages": "[]"}
    r = client.post("/api/export", files=files, data=data)
    assert r.status_code == 200
    return pages


def test_export_creates_history_entry(client, make_pdf, make_image):
    sig_id = _upload(client, make_image)
    _export_pdf(client, make_pdf, sig_id)
    entries = client.get("/api/history").json()
    assert len(entries) == 1
    assert entries[0]["filename"] == "doc.pdf"
    assert entries[0]["page_count"] == 1
    assert entries[0]["ext"] == "pdf"


def test_history_entry_carries_layout_for_reedit(client, make_pdf, make_image):
    sig_id = _upload(client, make_image)
    _export_pdf(client, make_pdf, sig_id, jitter=0.5)
    eid = client.get("/api/history").json()[0]["id"]
    meta = client.get(f"/api/history/{eid}").json()
    assert meta["pages"][0]["signatures"][0]["id"] == sig_id
    assert meta["pages"][0]["signatures"][0]["jitter"] == 0.5


def test_history_original_and_result_download(client, make_pdf, make_image):
    sig_id = _upload(client, make_image)
    _export_pdf(client, make_pdf, sig_id)
    eid = client.get("/api/history").json()[0]["id"]
    assert client.get(f"/api/history/{eid}/original").status_code == 200
    res = client.get(f"/api/history/{eid}/result")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_history_single_delete(client, make_pdf, make_image):
    sig_id = _upload(client, make_image)
    _export_pdf(client, make_pdf, sig_id)
    eid = client.get("/api/history").json()[0]["id"]
    assert client.delete(f"/api/history/{eid}").status_code == 200
    assert client.get("/api/history").json() == []


def test_history_get_unknown_is_404(client):
    assert client.get("/api/history/" + "0" * 32).status_code == 404
    assert client.delete("/api/history/not-a-valid-id").status_code == 404


def test_export_succeeds_even_if_history_save_fails(
    client, make_pdf, make_image, monkeypatch
):
    """A history-save error must be swallowed — the signed PDF is still returned."""
    from api import export

    def boom(*a, **k):
        raise OSError("disk full")

    monkeypatch.setattr(export, "save_entry", boom)
    sig_id = _upload(client, make_image)
    pages = [
        {
            "page_idx": 0,
            "stage_w": 595,
            "stage_h": 842,
            "signatures": [
                {
                    "id": sig_id,
                    "x": 10,
                    "y": 10,
                    "w": 100,
                    "h": 50,
                    "angle": 0,
                    "opacity": 1.0,
                }
            ],
        }
    ]
    files = {"file": ("doc.pdf", make_pdf(), "application/pdf")}
    data = {"pages": json.dumps(pages), "delete_pages": "[]"}
    r = client.post("/api/export", files=files, data=data)
    assert r.status_code == 200
