"""Tests for per-instance signature deformation (uniquify)."""

from PIL import Image

from services.composer import _jitter_params, compose_page

SIG = "00000000-0000-4000-8000-000000000000"


def _sig_and_page():
    sig = Image.new("RGBA", (60, 30), (0, 0, 0, 255))  # opaque black block
    page = Image.new("RGB", (200, 120), (255, 255, 255))
    return sig, page


def test_compose_deforms_vs_pristine():
    # Uniquify must visibly change the composited pixels vs no uniquify.
    sig, page = _sig_and_page()
    place = {"id": SIG, "x": 40, "y": 40, "w": 60, "h": 30}
    pristine = compose_page(
        page.copy(), [{**place, "jitter": 0}], sig_images={SIG: sig}
    )
    deformed = compose_page(
        page.copy(), [{**place, "jitter": 1.0}], sig_images={SIG: sig}
    )
    assert pristine.tobytes() != deformed.tobytes()


def test_compose_instances_differ_across_pages():
    # The same placement on different pages must deform differently.
    sig, page = _sig_and_page()
    place = {"id": SIG, "x": 40, "y": 40, "w": 60, "h": 30, "jitter": 1.0}
    a = compose_page(page.copy(), [place], sig_images={SIG: sig}, page_index=0)
    b = compose_page(page.copy(), [place], sig_images={SIG: sig}, page_index=1)
    assert a.tobytes() != b.tobytes()


def test_zero_intensity_is_neutral():
    assert _jitter_params(SIG, 0, 0) == (0.0, 1.0, 1.0, 0.0, 1.0, 0, 0)
    assert _jitter_params(SIG, 5, 0) == (0.0, 1.0, 1.0, 0.0, 1.0, 0, 0)


def test_deterministic():
    assert _jitter_params(SIG, 2, 0.7) == _jitter_params(SIG, 2, 0.7)


def test_different_instances_differ():
    # Two placements of the same signature must not get identical transforms.
    assert _jitter_params(SIG, 0, 0.7) != _jitter_params(SIG, 1, 0.7)


def test_same_index_different_page_differ():
    # Same signature at the same position on different pages must differ too.
    assert _jitter_params(SIG, 0, 0.7, page=0) != _jitter_params(SIG, 0, 0.7, page=1)


def test_bounds_scale_with_intensity():
    d_angle, scale_x, scale_y, skew_x, opacity_mult, dx, dy = _jitter_params(
        SIG, 0, 1.0
    )
    assert abs(d_angle) <= 5.0
    assert 0.90 <= scale_x <= 1.10
    assert 0.90 <= scale_y <= 1.10
    assert abs(skew_x) <= 0.18
    assert 0.92 <= opacity_mult <= 1.0
    assert abs(dx) <= 4 and abs(dy) <= 4


def test_axes_scale_independently():
    # Non-uniform scale (x != y) is what reshapes the signature; they are seeded
    # from different bytes so a given instance is not a uniform zoom.
    _, scale_x, scale_y, *_ = _jitter_params(SIG, 0, 1.0)
    assert scale_x != scale_y
