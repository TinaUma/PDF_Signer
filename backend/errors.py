"""Stable, machine-readable API errors.

The API is locale-agnostic: it returns an error ``code`` plus an English
fallback ``message``. The frontend maps the code to a localized string. This
keeps all user-facing localization on the client (see i18n decision).

- ``DomainError`` — raised by the service layer (framework-agnostic). Endpoints
  translate it into an ``ApiError``.
- ``ApiError`` — an ``HTTPException`` whose ``detail`` is ``{code, message}``.
"""

from fastapi import HTTPException


class DomainError(Exception):
    """Service-layer error carrying a stable code + English message."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class ApiError(HTTPException):
    """HTTPException with a structured ``{code, message}`` detail."""

    def __init__(self, code: str, message: str, status_code: int = 422):
        super().__init__(
            status_code=status_code, detail={"code": code, "message": message}
        )
