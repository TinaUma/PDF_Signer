"""Regression tests for PDF export coordinate validation (fix-coord-validation).

The previous code validated signature coordinates against `page.rect * 2`, a unit
unrelated to the frontend stage space the coordinates are actually expressed in.
That produced false rejections on small pages and false passes on large pages.
Validation now uses the payload's stage_w/stage_h (default 794x1123).
"""

import json


def _pages(sigs, stage_w=794, stage_h=1123, page_idx=0):
    return json.dumps(
        [
            {
                "page_idx": page_idx,
                "stage_w": stage_w,
                "stage_h": stage_h,
                "signatures": sigs,
            }
        ]
    )


def _post(client, pdf, pages):
    return client.post(
        "/api/export",
        files={"file": ("doc.pdf", pdf, "application/pdf")},
        data={"pages": pages},
    )


def test_signature_within_stage_on_small_page_not_rejected(client, make_pdf):
    # A 200x300pt page: old bounds were page.rect.width*2 = 400, so a signature
    # at x=700 (valid in the 794-wide stage) was wrongly rejected. Stage keeps the
    # page aspect ratio (794x1191 == 200x300), so the aspect guard passes and the
    # coordinate check (against stage_w=794) accepts x+w=780. Must pass now.
    pdf = make_pdf(width=200, height=300)
    sigs = [
        {
            "id": "00000000-0000-4000-8000-000000000000",
            "x": 700,
            "y": 900,
            "w": 80,
            "h": 40,
        }
    ]
    r = _post(client, pdf, _pages(sigs, stage_w=794, stage_h=1191))
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


def test_signature_outside_stage_rejected(client, make_pdf):
    pdf = make_pdf(width=595, height=842)
    sigs = [
        {
            "id": "00000000-0000-4000-8000-000000000000",
            "x": 750,
            "y": 10,
            "w": 100,
            "h": 40,
        }
    ]  # 850 > 794
    r = _post(client, pdf, _pages(sigs))
    assert r.status_code == 422


def test_negative_coordinate_rejected(client, make_pdf):
    pdf = make_pdf()
    sigs = [
        {
            "id": "00000000-0000-4000-8000-000000000000",
            "x": -5,
            "y": 10,
            "w": 50,
            "h": 40,
        }
    ]
    r = _post(client, pdf, _pages(sigs))
    assert r.status_code == 422


def test_page_index_out_of_range_rejected(client, make_pdf):
    pdf = make_pdf(pages=1)
    sigs = [
        {
            "id": "00000000-0000-4000-8000-000000000000",
            "x": 10,
            "y": 10,
            "w": 50,
            "h": 40,
        }
    ]
    r = _post(client, pdf, _pages(sigs, page_idx=5))
    assert r.status_code == 422
