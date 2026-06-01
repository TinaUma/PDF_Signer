"""save_output must never block the user's download (resilient-export-save / H4).

The signed bytes are already in hand before the server-side copy is written, so a
disk-full / read-only / permission error on save_output must be swallowed and the
document still returned — not turned into a 500 that loses the result.
"""

import json


def _pages(sigs):
    return json.dumps(
        [{"page_idx": 0, "stage_w": 794, "stage_h": 1123, "signatures": sigs}]
    )


def test_export_pdf_returned_even_if_save_output_fails(client, make_pdf, monkeypatch):
    import api.export as export

    def boom(*_a, **_k):
        raise PermissionError("read-only install dir / disk full")

    monkeypatch.setattr(export, "save_output", boom)

    pdf = make_pdf(width=595, height=842)
    r = client.post(
        "/api/export",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"pages": _pages([])},
    )

    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content  # the signed document is returned, not lost
