"""Shared pytest fixtures for the PDF Signer backend.

DATA_DIR side effects are redirected to a per-test tmp directory so tests never
touch the real ./data volume. Both get_signatures_dir() and pdf_writer.save_output
resolve the path via constants.get_data_dir() at call time, so setting the
DATA_DIR env var alone is enough.
"""

import fitz
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(autouse=True)
def _tmp_data_dir(tmp_path, monkeypatch):
    # get_data_dir() (and thus get_signatures_dir / save_output) reads DATA_DIR
    # at call time, so the env var alone redirects all data writes to tmp.
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def make_pdf():
    """Factory: build an in-memory PDF with given page size (in points)."""

    def _make(width=595, height=842, pages=1):
        doc = fitz.open()
        for _ in range(pages):
            doc.new_page(width=width, height=height)
        data = doc.tobytes()
        doc.close()
        return data

    return _make


@pytest.fixture
def make_image():
    """Factory: build an in-memory PNG with a dark ink mark on white paper, so
    background removal finds ink and the upload succeeds."""
    import io

    from PIL import Image, ImageDraw

    def _make(width=120, height=60):
        img = Image.new("RGB", (width, height), (255, 255, 255))
        ImageDraw.Draw(img).rectangle(
            [width // 3, height // 3, 2 * width // 3, 2 * height // 3],
            fill=(10, 10, 10),
        )
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    return _make
