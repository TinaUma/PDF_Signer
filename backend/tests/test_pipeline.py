"""Unit tests for the compose/background-removal pipeline (test-backend-pipeline)."""

import pytest
from PIL import Image, ImageDraw

from errors import DomainError
from services.composer import compose_page
from services.signature_service import _remove_bg_adaptive, get_signatures_dir

SIG = "00000000-0000-4000-8000-000000000000"


def _write_sig(color=(0, 0, 0, 255), size=(40, 20)):
    get_signatures_dir().mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", size, color).save(get_signatures_dir() / f"{SIG}.png")


def _page():
    return Image.new("RGB", (200, 300), (255, 255, 255))


def test_compose_overlays_signature():
    _write_sig()
    sigs = [{"id": SIG, "x": 50, "y": 60, "w": 40, "h": 20, "angle": 0, "opacity": 1.0}]
    out = compose_page(_page(), sigs, get_signatures_dir()).convert("RGB")
    assert out.size == (200, 300)
    assert out.getpixel((60, 65)) == (0, 0, 0)  # ink pasted inside the rect
    assert out.getpixel((0, 0)) == (255, 255, 255)  # background stays white


def test_compose_skips_missing_file():
    sigs = [{"id": SIG, "x": 10, "y": 10, "w": 20, "h": 20}]  # no file written
    out = compose_page(_page(), sigs, get_signatures_dir()).convert("RGB")
    assert out.getpixel((15, 15)) == (255, 255, 255)


def test_compose_jitter_changes_output():
    _write_sig()
    sigs = [{"id": SIG, "x": 50, "y": 60, "w": 40, "h": 20}]
    plain = compose_page(_page(), sigs, get_signatures_dir(), jitter=0).tobytes()
    jittered = compose_page(_page(), sigs, get_signatures_dir(), jitter=0.9).tobytes()
    assert plain != jittered


def test_remove_bg_crops_and_keeps_ink():
    img = Image.new("RGB", (100, 60), (255, 255, 255))
    ImageDraw.Draw(img).rectangle([40, 20, 60, 30], fill=(10, 10, 10))
    out = _remove_bg_adaptive(img)
    assert out.width < 100 and out.height < 60  # cropped to ink
    assert out.getchannel("A").getextrema()[1] == 255  # opaque ink kept


def test_remove_bg_blank_raises():
    blank = Image.new("RGB", (80, 50), (255, 255, 255))
    with pytest.raises(DomainError):
        _remove_bg_adaptive(blank)
