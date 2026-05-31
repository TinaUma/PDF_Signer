"""Tests for per-instance signature jitter (feat-signature-jitter)."""

from services.composer import _jitter_params

SIG = "00000000-0000-4000-8000-000000000000"


def test_zero_intensity_is_neutral():
    assert _jitter_params(SIG, 0, 0) == (0.0, 1.0, 1.0, 0, 0)
    assert _jitter_params(SIG, 5, 0) == (0.0, 1.0, 1.0, 0, 0)


def test_deterministic():
    assert _jitter_params(SIG, 2, 0.7) == _jitter_params(SIG, 2, 0.7)


def test_different_instances_differ():
    # Two placements of the same signature must not get identical transforms.
    assert _jitter_params(SIG, 0, 0.7) != _jitter_params(SIG, 1, 0.7)


def test_same_index_different_page_differ():
    # Same signature at the same position on different pages must differ too.
    assert _jitter_params(SIG, 0, 0.7, page=0) != _jitter_params(SIG, 0, 0.7, page=1)


def test_bounds_scale_with_intensity():
    d_angle, scale_mult, opacity_mult, dx, dy = _jitter_params(SIG, 0, 1.0)
    assert abs(d_angle) <= 2.5
    assert 0.96 <= scale_mult <= 1.04
    assert 0.90 <= opacity_mult <= 1.0
    assert abs(dx) <= 3 and abs(dy) <= 3
