"""Signature display-name rename (PATCH /api/signatures/{id})."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def _upload(client, make_image):
    files = {"file": ("Ivan Signature.png", make_image(), "image/png")}
    r = client.post("/api/signatures?remove_bg=false", files=files)
    assert r.status_code == 200
    return r.json()


def test_upload_sets_default_name_from_filename(client, make_image):
    body = _upload(client, make_image)
    # Default display name is the uploaded file's base name.
    assert body["name"] == "Ivan Signature"


def test_rename_persists_across_listing(client, make_image):
    sig_id = _upload(client, make_image)["id"]
    r = client.patch(f"/api/signatures/{sig_id}", json={"name": "  My Name  "})
    assert r.status_code == 200
    listed = {s["id"]: s for s in client.get("/api/signatures").json()}
    assert listed[sig_id]["name"] == "My Name"  # trimmed


def test_rename_unknown_id_is_404_not_500(client):
    import uuid

    r = client.patch(f"/api/signatures/{uuid.uuid4()}", json={"name": "x"})
    assert r.status_code == 404


def test_rename_invalid_id_is_404(client):
    r = client.patch("/api/signatures/not-a-uuid", json={"name": "x"})
    assert r.status_code == 404


def test_delete_clears_name_metadata(client, make_image):
    sig_id = _upload(client, make_image)["id"]
    assert client.delete(f"/api/signatures/{sig_id}").status_code == 200
    # Re-listing must not carry a stale name for the deleted id.
    assert all(s["id"] != sig_id for s in client.get("/api/signatures").json())
