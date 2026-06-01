"""Tests for text-annotation rendering (text_render + compose + export payload)."""

import json

from PIL import Image

from services import pdf_service
from services.composer import compose_page
from services.text_render import render_text


def test_empty_text_renders_nothing():
    assert render_text("") is None
    assert render_text("   \n  ") is None


def test_renders_non_blank_image():
    img = render_text("Hello", px=40)
    assert img is not None
    assert img.mode == "RGBA"
    assert img.getbbox() is not None  # something was drawn


def test_bold_and_italic_differ_from_regular():
    reg = render_text("Sample", family="sans")
    bold = render_text("Sample", family="sans", bold=True)
    ital = render_text("Sample", family="sans", italic=True)
    assert reg.tobytes() != bold.tobytes()
    assert reg.tobytes() != ital.tobytes()


def test_handwriting_renders_cyrillic():
    # Caveat (variable) must have Cyrillic glyphs.
    img = render_text("Подпись", family="handwriting", px=48)
    assert img is not None and img.getbbox() is not None


def test_unknown_family_and_bad_color_fall_back():
    # Unknown family -> default; malformed color -> black; neither raises.
    img = render_text("Hi", family="does-not-exist", color="not-a-color")
    assert img is not None and img.getbbox() is not None


def test_compose_draws_text_onto_page():
    page = Image.new("RGB", (300, 150), (255, 255, 255))
    plain = compose_page(page.copy(), [], texts=[])
    withtext = compose_page(
        page.copy(),
        [],
        texts=[{"text": "Привет", "x": 20, "y": 20, "fontSize": 40, "family": "sans"}],
    )
    assert plain.tobytes() != withtext.tobytes()


def test_api_image_export_with_text(client, make_image):
    pages = [
        {
            "page_idx": 0,
            "stage_w": 120,
            "stage_h": 60,
            "signatures": [],
            "texts": [
                {
                    "text": "Hi",
                    "x": 10,
                    "y": 10,
                    "fontSize": 20,
                    "family": "sans",
                    "color": "#ff0000",
                }
            ],
        }
    ]
    res = client.post(
        "/api/export",
        files={"file": ("doc.png", make_image(), "image/png")},
        data={"pages": json.dumps(pages)},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"


def test_api_pdf_export_text_only(client, make_pdf):
    # A page with text but NO signatures must still be rasterised + rendered
    # (pdf_writer renders when signatures OR texts are present).
    pages = [
        {
            "page_idx": 0,
            "stage_w": 595,
            "stage_h": 842,
            "signatures": [],
            "texts": [
                {"text": "Привет", "x": 50, "y": 50, "fontSize": 40, "family": "sans"}
            ],
        }
    ]
    res = client.post(
        "/api/export",
        files={"file": ("doc.pdf", make_pdf(width=595, height=842), "application/pdf")},
        data={"pages": json.dumps(pages)},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_api_text_too_long_is_413(client, make_image):
    big = "x" * (pdf_service.MAX_TEXT_LEN + 1)
    pages = [
        {
            "page_idx": 0,
            "stage_w": 120,
            "stage_h": 60,
            "signatures": [],
            "texts": [{"text": big, "x": 1, "y": 1, "fontSize": 12}],
        }
    ]
    res = client.post(
        "/api/export",
        files={"file": ("doc.png", make_image(), "image/png")},
        data={"pages": json.dumps(pages)},
    )
    assert res.status_code == 413


def test_api_too_many_texts_is_422(client, make_image):
    texts = [
        {"text": "a", "x": 1, "y": 1, "fontSize": 12}
        for _ in range(pdf_service.MAX_TEXTS_PER_PAGE + 1)
    ]
    pages = [
        {"page_idx": 0, "stage_w": 120, "stage_h": 60, "signatures": [], "texts": texts}
    ]
    res = client.post(
        "/api/export",
        files={"file": ("doc.png", make_image(), "image/png")},
        data={"pages": json.dumps(pages)},
    )
    assert res.status_code == 422
