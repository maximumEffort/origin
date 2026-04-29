"""Tests for the ErrorLog wiring + X-Request-ID middleware (issue #112)."""

from __future__ import annotations

from unittest.mock import MagicMock

from fastapi import APIRouter
from fastapi.testclient import TestClient


def _blowup_client(client: TestClient) -> TestClient:
    """Mount a /v1/__test_500 endpoint that always raises and disable
    re-raising of server exceptions so the registered handler fires."""
    router = APIRouter()

    @router.get("/__test_500")
    def boom() -> None:
        raise RuntimeError("kaboom — synthetic test failure")

    client.app.include_router(router, prefix="/v1")
    return TestClient(client.app, raise_server_exceptions=False)


def test_unhandled_exception_persists_to_error_log(
    client: TestClient, mock_prisma: MagicMock
) -> None:
    tc = _blowup_client(client)

    res = tc.get("/v1/__test_500", headers={"X-Request-ID": "test-req-abc"})
    assert res.status_code == 500
    assert res.json() == {"statusCode": 500, "message": "Internal server error"}
    assert res.headers.get("X-Request-ID") == "test-req-abc"

    mock_prisma.errorlog.create.assert_awaited_once()
    payload = mock_prisma.errorlog.create.await_args.kwargs["data"]
    assert payload["level"] == "ERROR"
    assert "RuntimeError" in payload["message"]
    assert "kaboom" in payload["message"]
    assert payload["endpoint"] == "/v1/__test_500"
    assert payload["method"] == "GET"
    assert payload["statusCode"] == 500
    assert payload["requestId"] == "test-req-abc"
    assert payload["stackTrace"]
    assert "kaboom" in payload["stackTrace"]


def test_request_id_generated_when_missing(client: TestClient) -> None:
    tc = _blowup_client(client)

    res = tc.get("/v1/__test_500")
    assert res.status_code == 500
    rid = res.headers.get("X-Request-ID")
    assert rid is not None and len(rid) >= 16


def test_handled_http_exception_does_not_log(client: TestClient, mock_prisma: MagicMock) -> None:
    """4xx HTTPExceptions are user errors, not server errors — keep logs clean."""
    res = client.get("/v1/this-route-does-not-exist")
    assert res.status_code == 404
    mock_prisma.errorlog.create.assert_not_awaited()
