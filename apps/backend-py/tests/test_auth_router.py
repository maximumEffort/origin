"""
Tests for the auth router endpoints.

These run against a mocked Prisma + mocked Twilio so they're fast (no
network, no DB). The intent is to validate request validation, error
shapes, and happy paths.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient


# ── /auth/otp/send ───────────────────────────────────────────────

def test_send_otp_rejects_non_uae_phone(client: TestClient):
    r = client.post("/v1/auth/otp/send", json={"phone": "+1234567890"})
    assert r.status_code == 400
    assert "Validation failed" in r.json()["message"]


def test_send_otp_rejects_missing_phone(client: TestClient):
    r = client.post("/v1/auth/otp/send", json={})
    assert r.status_code == 400


def test_send_otp_dev_mode_creates_record(client: TestClient, mock_prisma: MagicMock):
    """In dev (Twilio unset), service writes a hashed OTP to the DB."""
    r = client.post("/v1/auth/otp/send", json={"phone": "+971501234567"})
    assert r.status_code == 200
    body = r.json()
    assert body["message"] == "OTP sent successfully"
    assert body["expires_in"] == 300

    # Service should have created a fresh OtpCode after wiping any prior ones
    mock_prisma.otpcode.delete_many.assert_awaited_once()
    mock_prisma.otpcode.create.assert_awaited_once()
    create_args = mock_prisma.otpcode.create.await_args
    assert create_args.kwargs["data"]["phone"] == "+971501234567"
    assert "otpHash" in create_args.kwargs["data"]


# ── /auth/otp/verify ─────────────────────────────────────────────

def test_verify_otp_dev_mode_happy_path(client: TestClient, mock_prisma: MagicMock):
    """Dev: OTP record found, hash matches → returns tokens + customer."""
    # Set up: OtpCode hash that matches "123456"
    import hashlib
    record = MagicMock()
    record.id = "otp-1"
    record.otpHash = hashlib.sha256(b"123456").hexdigest()
    mock_prisma.otpcode.find_first.return_value = record

    # Customer doesn't exist yet — service should create one
    mock_prisma.customer.find_unique.return_value = None
    new_customer = MagicMock()
    new_customer.id = "cust-1"
    new_customer.phone = "+971501234567"
    new_customer.fullName = ""
    new_customer.kycStatus = None
    new_customer.preferredLanguage = None
    mock_prisma.customer.create.return_value = new_customer

    r = client.post("/v1/auth/otp/verify", json={"phone": "+971501234567", "otp": "123456"})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["customer"]["id"] == "cust-1"
    assert body["customer"]["phone"] == "+971501234567"
    mock_prisma.otpcode.delete.assert_awaited_once()


def test_verify_otp_no_record_returns_401(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.otpcode.find_first.return_value = None
    r = client.post("/v1/auth/otp/verify", json={"phone": "+971501234567", "otp": "999999"})
    assert r.status_code == 401
    assert "No OTP found" in r.json()["message"]


def test_verify_otp_wrong_code_returns_401(client: TestClient, mock_prisma: MagicMock):
    import hashlib
    record = MagicMock()
    record.otpHash = hashlib.sha256(b"123456").hexdigest()
    mock_prisma.otpcode.find_first.return_value = record

    r = client.post("/v1/auth/otp/verify", json={"phone": "+971501234567", "otp": "000000"})
    assert r.status_code == 401
    assert "Invalid OTP" in r.json()["message"]


# ── /auth/refresh ────────────────────────────────────────────────

def test_refresh_with_valid_token_returns_new_pair(client: TestClient):
    from origin_backend.auth.jwt import issue_refresh_token

    refresh = issue_refresh_token(sub="user-1", role="customer")
    r = client.post("/v1/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in body
    # New tokens should be different from the input
    assert body["refresh_token"] != refresh


def test_refresh_with_invalid_token_returns_401(client: TestClient):
    r = client.post("/v1/auth/refresh", json={"refresh_token": "garbage"})
    assert r.status_code == 401


def test_refresh_with_access_token_rejected(client: TestClient):
    """Access tokens can't be used as refresh tokens."""
    from origin_backend.auth.jwt import issue_access_token

    access = issue_access_token(sub="user-2", role="customer")
    r = client.post("/v1/auth/refresh", json={"refresh_token": access})
    assert r.status_code == 401


# ── /auth/admin/login ────────────────────────────────────────────

def test_admin_login_missing_user_returns_401(client: TestClient, mock_prisma: MagicMock):
    """Should fail constant-time even when user doesn't exist (timing-safe)."""
    mock_prisma.adminuser.find_unique.return_value = None
    r = client.post(
        "/v1/auth/admin/login",
        json={"email": "noone@origin-auto.ae", "password": "anything-12345"},
    )
    assert r.status_code == 401


def test_admin_login_wrong_password_returns_401(client: TestClient, mock_prisma: MagicMock):
    from passlib.hash import bcrypt

    admin = MagicMock()
    admin.id = "admin-1"
    admin.email = "admin@origin-auto.ae"
    admin.fullName = "Admin"
    admin.password = bcrypt.hash("correct-password-99")
    admin.isActive = True
    role = MagicMock()
    role.value = "SUPER_ADMIN"
    admin.role = role
    mock_prisma.adminuser.find_unique.return_value = admin

    r = client.post(
        "/v1/auth/admin/login",
        json={"email": "admin@origin-auto.ae", "password": "wrong-password-00"},
    )
    assert r.status_code == 401


def test_admin_login_happy_path(client: TestClient, mock_prisma: MagicMock):
    from passlib.hash import bcrypt

    admin = MagicMock()
    admin.id = "admin-1"
    admin.email = "admin@origin-auto.ae"
    admin.fullName = "Admin"
    admin.password = bcrypt.hash("correct-password-99")
    admin.isActive = True
    role = MagicMock()
    role.value = "SUPER_ADMIN"
    admin.role = role
    mock_prisma.adminuser.find_unique.return_value = admin

    r = client.post(
        "/v1/auth/admin/login",
        json={"email": "admin@origin-auto.ae", "password": "correct-password-99"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["admin"]["email"] == "admin@origin-auto.ae"
    assert body["admin"]["role"] == "SUPER_ADMIN"


def test_admin_login_inactive_user_rejected(client: TestClient, mock_prisma: MagicMock):
    from passlib.hash import bcrypt

    admin = MagicMock()
    admin.password = bcrypt.hash("correct-password-99")
    admin.isActive = False  # ← key: account disabled
    mock_prisma.adminuser.find_unique.return_value = admin

    r = client.post(
        "/v1/auth/admin/login",
        json={"email": "admin@origin-auto.ae", "password": "correct-password-99"},
    )
    assert r.status_code == 401
