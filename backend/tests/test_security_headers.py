"""CORS restriction + malformed-payload handling (sec-deploy-hardening)."""

import json


def test_cors_allows_known_origin(client):
    r = client.get("/health", headers={"Origin": "http://localhost:8080"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:8080"


def test_cors_blocks_unknown_origin(client):
    r = client.get("/health", headers={"Origin": "http://evil.example.com"})
    # Disallowed origin gets no ACAO header echoing it back.
    assert r.headers.get("access-control-allow-origin") != "http://evil.example.com"


def test_export_invalid_json_payload_returns_422(client, make_pdf):
    r = client.post(
        "/api/export",
        files={"file": ("d.pdf", make_pdf(), "application/pdf")},
        data={"pages": "this is not json"},
    )
    assert r.status_code == 422


def test_export_valid_json_still_works(client, make_pdf):
    payload = json.dumps(
        [{"page_idx": 0, "stage_w": 794, "stage_h": 1123, "signatures": []}]
    )
    r = client.post(
        "/api/export",
        files={"file": ("d.pdf", make_pdf(), "application/pdf")},
        data={"pages": payload},
    )
    assert r.status_code == 200


def test_api_responses_carry_no_store_and_nosniff(client, make_pdf):
    payload = json.dumps(
        [{"page_idx": 0, "stage_w": 794, "stage_h": 1123, "signatures": []}]
    )
    r = client.post(
        "/api/export",
        files={"file": ("d.pdf", make_pdf(), "application/pdf")},
        data={"pages": payload},
    )
    assert "no-store" in r.headers.get("cache-control", "")
    assert r.headers.get("x-content-type-options") == "nosniff"


def test_non_api_path_not_forced_no_store(client):
    # /health is outside /api/* — the hardening middleware must not touch it.
    r = client.get("/health")
    assert "no-store" not in r.headers.get("cache-control", "")
