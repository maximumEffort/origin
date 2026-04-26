"""Tests for JWT issuance and verification (origin_backend.auth.jwt)."""

from __future__ import annotations

import pytest

from origin_backend.auth.jwt import (
    issue_access_token,
    issue_pair,
    issue_refresh_token,
    verify_access_token,
    verify_refresh_token,
)


def test_issue_and_verify_access_token():
    token = issue_access_token(sub="user-1", role="customer")
    payload = verify_access_token(token)
    assert payload["sub"] == "user-1"
    assert payload["role"] == "customer"
    assert payload["type"] == "access"


def test_issue_and_verify_refresh_token():
    token = issue_refresh_token(sub="user-2", role="customer")
    payload = verify_refresh_token(token)
    assert payload["sub"] == "user-2"
    assert payload["type"] == "refresh"


def test_access_token_rejected_as_refresh():
    """Cross-type usage is forbidden (access token can't be used to refresh)."""
    access = issue_access_token(sub="user-3", role="customer")
    with pytest.raises(ValueError, match="not a refresh token"):
        verify_refresh_token(access)


def test_refresh_token_rejected_as_access():
    refresh = issue_refresh_token(sub="user-4", role="customer")
    with pytest.raises(ValueError, match="not an access token"):
        verify_access_token(refresh)


def test_issue_pair_returns_two_distinct_tokens():
    access, refresh = issue_pair(sub="user-5", role="customer")
    assert access != refresh
    assert verify_access_token(access)["sub"] == "user-5"
    assert verify_refresh_token(refresh)["sub"] == "user-5"


def test_tampered_token_rejected():
    token = issue_access_token(sub="user-6", role="customer")
    # Replace the signature with clearly-bogus bytes (more reliable than 1-char flip)
    parts = token.split(".")
    tampered = parts[0] + "." + parts[1] + ".AAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    with pytest.raises(ValueError):
        verify_access_token(tampered)
