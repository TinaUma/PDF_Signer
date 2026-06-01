"""Signing history: persist each export so the user can re-download the result
or reopen the original WITH its signature layout for further editing.

Layout — one directory per entry under get_data_dir()/history/<entry_id>:
    original.<ext>   the exact bytes the user uploaded
    result.<ext>     the signed output that was returned
    meta.json        {id, filename, ext, created_at, page_count, pages, delete_pages}

`pages` is the same stage-space payload sent to /api/export, so reopening an
entry restores every placed signature (position, size, rotation, opacity,
jitter). Entries are kept until the user deletes them (no auto-pruning).
"""

import json
import re
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from constants import get_data_dir

# Entry ids are server-generated uuid4 hex; validate before building any path so
# a client id can never traverse out of the history directory.
_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def is_valid_entry_id(entry_id) -> bool:
    return isinstance(entry_id, str) and bool(_ID_RE.match(entry_id))


def get_history_dir() -> Path:
    d = get_data_dir() / "history"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _entry_dir(entry_id: str) -> Path:
    return get_history_dir() / entry_id


def save_entry(
    original: bytes,
    result: bytes,
    *,
    filename: str,
    ext: str,
    pages_payload: list,
    delete_pages: list,
) -> dict:
    """Persist one signing event. Returns the entry's metadata dict.

    The caller treats this as best-effort: the signed bytes are already with the
    user, so a failure here is logged and swallowed upstream rather than blocking
    the download.
    """
    entry_id = uuid.uuid4().hex
    ext = ext.lstrip(".").lower() or "bin"
    d = _entry_dir(entry_id)
    d.mkdir(parents=True, exist_ok=True)

    (d / f"original.{ext}").write_bytes(original)
    (d / f"result.{ext}").write_bytes(result)

    page_count = len({p.get("page_idx") for p in pages_payload if isinstance(p, dict)})
    meta = {
        "id": entry_id,
        "filename": filename or f"document.{ext}",
        "ext": ext,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "page_count": page_count,
        "pages": pages_payload,
        "delete_pages": delete_pages,
    }
    (d / "meta.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return meta


def _read_meta(entry_id: str) -> dict | None:
    path = _entry_dir(entry_id) / "meta.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, OSError):
        return None


def list_entries() -> list[dict]:
    """All entries, newest first. Heavy fields (the pages payload) are omitted
    from the summary to keep the listing small."""
    out = []
    for d in get_history_dir().iterdir():
        if not d.is_dir() or not is_valid_entry_id(d.name):
            continue
        meta = _read_meta(d.name)
        if not meta:
            continue
        out.append(
            {
                "id": meta.get("id", d.name),
                "filename": meta.get("filename", ""),
                "ext": meta.get("ext", ""),
                "created_at": meta.get("created_at", ""),
                "page_count": meta.get("page_count", 0),
            }
        )
    out.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return out


def get_entry(entry_id: str) -> dict | None:
    """Full metadata for one entry, including the `pages` layout for re-editing."""
    if not is_valid_entry_id(entry_id):
        return None
    return _read_meta(entry_id)


def _file_path(entry_id: str, kind: str) -> Path | None:
    """Path to an entry's 'original' or 'result' file (suffix from meta)."""
    if not is_valid_entry_id(entry_id):
        return None
    meta = _read_meta(entry_id)
    if not meta:
        return None
    ext = meta.get("ext", "bin")
    path = _entry_dir(entry_id) / f"{kind}.{ext}"
    return path if path.exists() else None


def get_original_path(entry_id: str) -> Path | None:
    return _file_path(entry_id, "original")


def get_result_path(entry_id: str) -> Path | None:
    return _file_path(entry_id, "result")


def delete_entry(entry_id: str) -> bool:
    if not is_valid_entry_id(entry_id):
        return False
    d = _entry_dir(entry_id)
    if not d.is_dir():
        return False
    shutil.rmtree(d, ignore_errors=True)
    return True
