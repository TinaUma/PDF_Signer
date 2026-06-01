"""Unit tests for constants.get_data_dir — the three resolution branches.

The autouse _tmp_data_dir fixture sets DATA_DIR, so the frozen/./data branches
must explicitly clear it (monkeypatch.delenv) to exercise the fallbacks.
"""

import sys
from pathlib import Path

import constants


def test_data_dir_prefers_env(monkeypatch, tmp_path):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    assert constants.get_data_dir() == Path(str(tmp_path))


def test_data_dir_frozen_falls_back_next_to_executable(monkeypatch, tmp_path):
    # No DATA_DIR + PyInstaller bundle → data dir sits next to the .exe.
    monkeypatch.delenv("DATA_DIR", raising=False)
    fake_exe = tmp_path / "api_server.exe"
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "executable", str(fake_exe))
    assert constants.get_data_dir() == fake_exe.resolve().parent / "data"


def test_data_dir_dev_default_is_relative_data(monkeypatch):
    # No DATA_DIR + not frozen → dev-server default ./data.
    monkeypatch.delenv("DATA_DIR", raising=False)
    monkeypatch.setattr(sys, "frozen", False, raising=False)
    assert constants.get_data_dir() == Path("./data")


def test_cors_extra_origins_unset_is_empty(monkeypatch):
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    assert constants.cors_extra_origins() == []


def test_cors_extra_origins_parses_trims_and_keeps_order(monkeypatch):
    monkeypatch.setenv(
        "CORS_ALLOWED_ORIGINS",
        " https://demo.example.com , https://a.test ",
    )
    assert constants.cors_extra_origins() == [
        "https://demo.example.com",
        "https://a.test",
    ]


def test_cors_extra_origins_drops_empty_entries(monkeypatch):
    # Malformed/empty value must not yield empty-string origins or crash.
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", ",,  ,")
    assert constants.cors_extra_origins() == []
