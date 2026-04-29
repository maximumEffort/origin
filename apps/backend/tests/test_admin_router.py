"""
Tests for the /v1/admin endpoints.

Each endpoint enforces both an admin token and a role filter; the tests
exercise both gates plus the per-endpoint behaviour. We mint real JWTs
so the auth dependency runs end-to-end.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from origin_backend.auth.jwt import issue_access_token

ADMIN_ID = "admin-1"
SALES_ID = "admin-sales"
FLEET_ID = "admin-fleet"
FINANCE_ID = "admin-finance"
CUSTOMER_ID = "cust-1"


# ── Fakes ──────────────────────────────────────────────────────────────


def _admin(role: str, *, admin_id: str | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        id=admin_id or ADMIN_ID,
        email="a@b.co",
        fullName="Admin",
        role=SimpleNamespace(value=role),
        isActive=True,
    )


def _booking(
    *, bid: str = "bk-1", status: str = "SUBMITTED", deposit_paid: bool = False
) -> SimpleNamespace:
    return SimpleNamespace(
        id=bid,
        reference=f"BK-2026-{bid.upper()}",
        customerId=CUSTOMER_ID,
        vehicleId="veh-1",
        status=SimpleNamespace(value=status),
        startDate=datetime(2026, 4, 1, tzinfo=UTC),
        endDate=datetime(2026, 7, 1, tzinfo=UTC),
        quotedTotalAed=Decimal("3000.00"),
        depositAmountAed=Decimal("1000.00"),
        depositPaid=deposit_paid,
        mileagePackage=3000,
        notes=None,
        vehicle=SimpleNamespace(monthlyRateAed=Decimal("1000.00")),
    )


def _customer(kyc: str = "PENDING") -> SimpleNamespace:
    return SimpleNamespace(
        id=CUSTOMER_ID,
        phone="+971501234567",
        email=None,
        fullName="Amr",
        kycStatus=SimpleNamespace(value=kyc),
        preferredLanguage=SimpleNamespace(value="en"),
    )


def _vehicle(vid: str = "veh-1", status: str = "AVAILABLE") -> SimpleNamespace:
    return SimpleNamespace(
        id=vid,
        plateNumber="ABC-1234",
        brand="BYD",
        model="Atto 3",
        year=2026,
        status=SimpleNamespace(value=status),
    )


def _payment(amount: str) -> SimpleNamespace:
    return SimpleNamespace(amountAed=Decimal(amount))


def _category() -> SimpleNamespace:
    return SimpleNamespace(id="cat-1", nameEn="Electric", nameAr="Electric", nameZh="Electric")


# ── Headers ────────────────────────────────────────────────────────────


def _admin_headers(role: str = "SUPER_ADMIN", admin_id: str | None = None) -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_access_token(sub=admin_id or ADMIN_ID, role=role)}"}


def _customer_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_access_token(sub=CUSTOMER_ID, role='customer')}"}


# ── Auth gating ────────────────────────────────────────────────────────


def test_admin_requires_auth(client: TestClient):
    assert client.get("/v1/admin/stats").status_code == 401


def test_admin_rejects_customer_token(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.get("/v1/admin/stats", headers=_customer_headers())
    assert r.status_code == 403


def test_admin_role_gate_blocks_unprivileged_role(client: TestClient, mock_prisma: MagicMock):
    """FLEET_MANAGER cannot list customers (SALES + SUPER_ADMIN only)."""
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    r = client.get("/v1/admin/customers", headers=_admin_headers("FLEET_MANAGER"))
    assert r.status_code == 403


def test_admin_role_gate_allows_super_admin(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SUPER_ADMIN")
    mock_prisma.customer.find_many.return_value = []
    r = client.get("/v1/admin/customers", headers=_admin_headers("SUPER_ADMIN"))
    assert r.status_code == 200


# ── /admin/stats ───────────────────────────────────────────────────────


def test_stats_revenue_uses_db_sum_not_python_sum(client: TestClient, mock_prisma: MagicMock):
    """#116 — the dashboard must SUM at the DB layer, never stream every paid
    payment row into Python memory."""
    mock_prisma.adminuser.find_unique.return_value = _admin("FINANCE")
    mock_prisma.customer.count.return_value = 0
    mock_prisma.booking.count.return_value = 0
    mock_prisma.lease.count.return_value = 0
    mock_prisma.vehicle.count.return_value = 0
    mock_prisma.query_first.return_value = {"total": 12345.67}

    r = client.get("/v1/admin/stats", headers=_admin_headers("FINANCE"))
    assert r.status_code == 200
    assert r.json()["totalRevenueAed"] == 12345.67

    # Stream-and-sum must not be used.
    mock_prisma.payment.find_many.assert_not_called()
    # And the SQL we send must be a SUM filtering on PAID.
    sql_call = mock_prisma.query_first.await_args
    assert sql_call is not None
    sql = sql_call.args[0]
    assert "SUM" in sql.upper()
    assert "amountAed" in sql
    assert sql_call.args[1] == "PAID"


def test_stats_aggregates_across_models(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("FINANCE")

    # `customer.count` is called twice from get_dashboard_stats (total + pending);
    # they fire concurrently via asyncio.gather, so an iterable side_effect would
    # break — discriminate on the where filter instead.
    async def customer_count(**kwargs):
        return 7 if (kwargs.get("where") or {}).get("kycStatus") == "SUBMITTED" else 40

    mock_prisma.customer.count.side_effect = customer_count
    mock_prisma.booking.count.return_value = 3
    mock_prisma.lease.count.return_value = 12
    mock_prisma.vehicle.count.return_value = 18
    # Revenue is now aggregated DB-side via SUM("amountAed") (#116)
    mock_prisma.query_first.return_value = {"total": 3500.0}

    r = client.get("/v1/admin/stats", headers=_admin_headers("FINANCE"))
    assert r.status_code == 200
    body = r.json()
    assert body == {
        "totalCustomers": 40,
        "pendingKyc": 7,
        "pendingBookings": 3,
        "activeLeases": 12,
        "availableVehicles": 18,
        "totalRevenueAed": 3500.0,
    }


# ── /admin/bookings ────────────────────────────────────────────────────


def test_list_bookings_passes_status_filter(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_many.return_value = []
    r = client.get("/v1/admin/bookings?status=SUBMITTED", headers=_admin_headers("SALES"))
    assert r.status_code == 200
    where = mock_prisma.booking.find_many.call_args.kwargs["where"]
    assert where == {"status": "SUBMITTED"}


def test_approve_booking_404(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_unique.return_value = None
    r = client.post("/v1/admin/bookings/missing/approve", headers=_admin_headers("SALES"))
    assert r.status_code == 404


def test_approve_booking_400_when_not_submitted(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_unique.return_value = _booking(status="DRAFT")
    r = client.post("/v1/admin/bookings/bk-1/approve", headers=_admin_headers("SALES"))
    assert r.status_code == 400


def test_approve_booking_happy_path(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_unique.return_value = _booking()
    mock_prisma.booking.update.return_value = _booking(status="APPROVED")
    r = client.post("/v1/admin/bookings/bk-1/approve", headers=_admin_headers("SALES"))
    assert r.status_code == 200
    update_args = mock_prisma.booking.update.call_args.kwargs
    assert update_args["data"] == {"status": "APPROVED"}


def test_reject_booking_passes_reason_to_notes(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_unique.return_value = _booking()
    mock_prisma.booking.update.return_value = _booking(status="REJECTED")
    r = client.post(
        "/v1/admin/bookings/bk-1/reject",
        headers=_admin_headers("SALES"),
        json={"reason": "Documents unclear"},
    )
    assert r.status_code == 200
    update_args = mock_prisma.booking.update.call_args.kwargs
    assert update_args["data"] == {"status": "REJECTED", "notes": "Documents unclear"}


# ── /admin/customers ───────────────────────────────────────────────────


def test_list_customers_filter(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.customer.find_many.return_value = []
    r = client.get("/v1/admin/customers?kycStatus=SUBMITTED", headers=_admin_headers("SALES"))
    assert r.status_code == 200
    where = mock_prisma.customer.find_many.call_args.kwargs["where"]
    assert where == {"kycStatus": "SUBMITTED"}


def test_get_customer_404(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    # First find_unique resolves the admin token, second is the lookup.
    # Switch to side_effect so the second one returns None.
    mock_prisma.customer.find_unique.return_value = None
    r = client.get("/v1/admin/customers/missing", headers=_admin_headers("SALES"))
    assert r.status_code == 404


def test_approve_kyc_400_when_not_submitted(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.customer.find_unique.return_value = _customer(kyc="APPROVED")
    r = client.post("/v1/admin/customers/cust-1/kyc/approve", headers=_admin_headers("SALES"))
    assert r.status_code == 400


def test_approve_kyc_happy(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.customer.find_unique.return_value = _customer(kyc="SUBMITTED")
    mock_prisma.customer.update.return_value = _customer(kyc="APPROVED")
    r = client.post("/v1/admin/customers/cust-1/kyc/approve", headers=_admin_headers("SALES"))
    assert r.status_code == 200
    update_args = mock_prisma.customer.update.call_args.kwargs
    assert update_args["data"] == {"kycStatus": "APPROVED"}


def test_reject_kyc_with_reason(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.customer.find_unique.return_value = _customer(kyc="SUBMITTED")
    mock_prisma.customer.update.return_value = _customer(kyc="REJECTED")
    r = client.post(
        "/v1/admin/customers/cust-1/kyc/reject",
        headers=_admin_headers("SALES"),
        json={"reason": "Documents expired"},
    )
    assert r.status_code == 200
    update_args = mock_prisma.customer.update.call_args.kwargs
    assert update_args["data"] == {
        "kycStatus": "REJECTED",
        "kycRejectionReason": "Documents expired",
    }


# ── /admin/bookings/:id/create-lease ───────────────────────────────────


def test_create_lease_404_when_booking_missing(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_unique.return_value = None
    r = client.post("/v1/admin/bookings/missing/create-lease", headers=_admin_headers("SALES"))
    assert r.status_code == 404


def test_create_lease_400_when_not_approved(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_unique.return_value = _booking(status="SUBMITTED")
    r = client.post("/v1/admin/bookings/bk-1/create-lease", headers=_admin_headers("SALES"))
    assert r.status_code == 400


def test_create_lease_400_when_already_exists(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_unique.return_value = _booking(status="APPROVED")
    mock_prisma.lease.find_first.return_value = SimpleNamespace(id="ls-existing")
    r = client.post("/v1/admin/bookings/bk-1/create-lease", headers=_admin_headers("SALES"))
    assert r.status_code == 400
    assert "already exists" in r.json()["message"].lower()


def test_create_lease_happy_path(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_unique.return_value = _booking(status="APPROVED")
    mock_prisma.lease.find_first.return_value = None
    mock_prisma.lease.count.return_value = 41
    new_lease = SimpleNamespace(id="ls-new")
    mock_prisma.lease.create.return_value = new_lease

    r = client.post("/v1/admin/bookings/bk-1/create-lease", headers=_admin_headers("SALES"))
    assert r.status_code == 201

    create_args = mock_prisma.lease.create.call_args.kwargs["data"]
    # Reference is monotonic with the existing lease count, padded to 5 chars
    assert create_args["reference"].endswith("-00042")
    assert create_args["status"] == "ACTIVE"
    assert create_args["bookingId"] == "bk-1"

    # Vehicle marked LEASED, booking marked CONVERTED
    update_calls = mock_prisma.vehicle.update.call_args.kwargs
    assert update_calls["data"] == {"status": "LEASED"}
    booking_update = mock_prisma.booking.update.call_args.kwargs
    assert booking_update["data"] == {"status": "CONVERTED"}

    # Payment schedule created — first row is DEPOSIT, rest MONTHLY
    payments_call = mock_prisma.payment.create_many.call_args.kwargs["data"]
    assert payments_call[0]["type"] == "DEPOSIT"
    assert all(p["type"] == "MONTHLY" for p in payments_call[1:])
    # 3 months between 2026-04-01 and 2026-07-01
    assert len(payments_call) == 3
    # Booking with depositPaid=False (default) leaves first payment PENDING
    assert payments_call[0]["status"] == "PENDING"
    assert "paidAt" not in payments_call[0]


def test_create_lease_marks_first_payment_paid_when_deposit_collected(
    client: TestClient, mock_prisma: MagicMock
):
    """#129 — if checkout already collected the deposit, the first lease
    payment must be PAID, not PENDING. Otherwise the customer is double-billed."""
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_unique.return_value = _booking(status="APPROVED", deposit_paid=True)
    mock_prisma.lease.find_first.return_value = None
    mock_prisma.lease.count.return_value = 0
    mock_prisma.lease.create.return_value = SimpleNamespace(id="ls-new")

    r = client.post("/v1/admin/bookings/bk-1/create-lease", headers=_admin_headers("SALES"))
    assert r.status_code == 201

    payments = mock_prisma.payment.create_many.call_args.kwargs["data"]
    assert payments[0]["type"] == "DEPOSIT"
    assert payments[0]["status"] == "PAID"
    assert payments[0]["paidAt"] is not None
    # Subsequent rents stay PENDING
    assert all(p["status"] == "PENDING" for p in payments[1:])


# ── /admin/leases ──────────────────────────────────────────────────────


def test_list_leases_finance_can_read(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("FINANCE")
    mock_prisma.lease.find_many.return_value = []
    r = client.get("/v1/admin/leases?status=ACTIVE", headers=_admin_headers("FINANCE"))
    assert r.status_code == 200
    where = mock_prisma.lease.find_many.call_args.kwargs["where"]
    assert where == {"status": "ACTIVE"}


def test_list_leases_only_pulls_next_due_payment(client: TestClient, mock_prisma: MagicMock):
    """#137 §1 — list view must NOT fetch full payment history per row.

    Pulling all payments ships ~1200 rows for a 50-lease page (24-month
    leases), when the UI only renders "next due". Verify the include narrows
    to one pending-or-overdue payment ordered by dueDate.
    """
    mock_prisma.adminuser.find_unique.return_value = _admin("FINANCE")
    mock_prisma.lease.find_many.return_value = []
    r = client.get("/v1/admin/leases", headers=_admin_headers("FINANCE"))
    assert r.status_code == 200

    include = mock_prisma.lease.find_many.call_args.kwargs["include"]
    payments = include["payments"]
    assert payments["take"] == 1
    assert payments["order_by"] == {"dueDate": "asc"}
    assert payments["where"] == {"status": {"in": ["PENDING", "OVERDUE"]}}


# ── /admin/leases/:id/complete  (#136 §2) ──────────────────────────────


def _active_lease(*, lid: str = "ls-1", vid: str = "veh-1") -> SimpleNamespace:
    """Minimal Lease shape that complete() touches."""
    return SimpleNamespace(
        id=lid,
        reference=f"LS-2026-{lid}",
        bookingId="bk-1",
        customerId=CUSTOMER_ID,
        vehicleId=vid,
        startDate=datetime(2026, 1, 1, tzinfo=UTC),
        endDate=datetime(2026, 4, 1, tzinfo=UTC),
        serviceType=SimpleNamespace(value="RENT"),
        monthlyRateAed=Decimal("3500.00"),
        vatRate=Decimal("0.05"),
        mileageLimitMonthly=2500,
        downPaymentAed=None,
        status=SimpleNamespace(value="ACTIVE"),
        renewalOfId=None,
        agreementPdfUrl=None,
        notes=None,
        createdAt=datetime(2026, 1, 1, tzinfo=UTC),
        updatedAt=datetime(2026, 1, 1, tzinfo=UTC),
    )


def test_complete_lease_blocks_sales(client: TestClient, mock_prisma: MagicMock):
    """SALES role cannot complete a lease — only SUPER_ADMIN + FLEET_MANAGER."""
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    r = client.post("/v1/admin/leases/ls-1/complete", headers=_admin_headers("SALES"))
    assert r.status_code == 403


def test_complete_lease_404_when_missing(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    mock_prisma.lease.find_unique.return_value = None
    r = client.post(
        "/v1/admin/leases/missing/complete",
        headers=_admin_headers("FLEET_MANAGER"),
    )
    assert r.status_code == 404


def test_complete_lease_400_when_not_active(client: TestClient, mock_prisma: MagicMock):
    """Cannot complete a RENEWED lease — its vehicle is held by the renewal."""
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    renewed = _active_lease()
    renewed.status = SimpleNamespace(value="RENEWED")
    mock_prisma.lease.find_unique.return_value = renewed
    r = client.post("/v1/admin/leases/ls-1/complete", headers=_admin_headers("FLEET_MANAGER"))
    assert r.status_code == 400
    # No DB mutations on a refused complete
    mock_prisma.lease.update_many.assert_not_called()
    mock_prisma.execute_raw.assert_not_called()


def test_complete_lease_idempotent_when_already_completed(
    client: TestClient, mock_prisma: MagicMock
):
    """Calling complete twice is safe — second call is a no-op."""
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    done = _active_lease()
    done.status = SimpleNamespace(value="COMPLETED")
    mock_prisma.lease.find_unique.return_value = done
    r = client.post("/v1/admin/leases/ls-1/complete", headers=_admin_headers("FLEET_MANAGER"))
    assert r.status_code == 200
    # No further mutations on the second call
    mock_prisma.lease.update_many.assert_not_called()
    mock_prisma.execute_raw.assert_not_called()


def test_complete_lease_happy_path_frees_vehicle(client: TestClient, mock_prisma: MagicMock):
    """ACTIVE lease → COMPLETED + vehicle.status flipped to AVAILABLE + audit row."""
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER", admin_id=FLEET_ID)
    lease = _active_lease(lid="ls-1", vid="veh-1")
    completed = _active_lease(lid="ls-1", vid="veh-1")
    completed.status = SimpleNamespace(value="COMPLETED")
    # First find_unique returns ACTIVE; second (post-update) returns COMPLETED.
    mock_prisma.lease.find_unique.side_effect = [lease, completed]
    # Conditional update succeeds (1 row updated).
    mock_prisma.lease.update_many.return_value = 1
    # The atomic vehicle-free SQL flips the row (1 row affected = freed).
    mock_prisma.execute_raw.return_value = 1

    r = client.post("/v1/admin/leases/ls-1/complete", headers=_admin_headers("FLEET_MANAGER"))
    assert r.status_code == 200
    assert r.json()["status"] == "COMPLETED"

    # Lease flipped to COMPLETED via *conditional* update (race-safe).
    update_kwargs = mock_prisma.lease.update_many.call_args.kwargs
    assert update_kwargs["where"] == {"id": "ls-1", "status": "ACTIVE"}
    assert update_kwargs["data"] == {"status": "COMPLETED"}

    # Vehicle freed via atomic SQL (no read-then-write race).
    raw_call = mock_prisma.execute_raw.call_args
    assert 'UPDATE "vehicles"' in raw_call.args[0]
    assert "NOT EXISTS" in raw_call.args[0]
    assert raw_call.args[1] == "veh-1"

    # Audit log written
    audit_data = mock_prisma.auditlog.create.call_args.kwargs["data"]
    assert audit_data["userId"] == FLEET_ID
    assert audit_data["action"] == "COMPLETE"
    assert audit_data["entityType"] == "LEASE"
    assert audit_data["entityId"] == "ls-1"
    assert audit_data["newValue"]["vehicleFreed"] is True


def test_complete_lease_keeps_vehicle_leased_when_other_active_lease_exists(
    client: TestClient, mock_prisma: MagicMock
):
    """Defensive: the atomic SQL refuses to free if another ACTIVE lease exists.

    Today's schema doesn't allow parallel ACTIVE leases, but the WHERE NOT
    EXISTS guard prevents a race window from making a leased car bookable.
    """
    mock_prisma.adminuser.find_unique.return_value = _admin("SUPER_ADMIN")
    lease = _active_lease(lid="ls-1", vid="veh-1")
    completed = _active_lease(lid="ls-1", vid="veh-1")
    completed.status = SimpleNamespace(value="COMPLETED")
    mock_prisma.lease.find_unique.side_effect = [lease, completed]
    mock_prisma.lease.update_many.return_value = 1
    # SQL guard prevents the free (0 rows affected).
    mock_prisma.execute_raw.return_value = 0

    r = client.post("/v1/admin/leases/ls-1/complete", headers=_admin_headers("SUPER_ADMIN"))
    assert r.status_code == 200

    # The SQL still ran — but it didn't update anything.
    mock_prisma.execute_raw.assert_called_once()

    # Audit metadata reflects the no-free path.
    audit_data = mock_prisma.auditlog.create.call_args.kwargs["data"]
    assert audit_data["newValue"]["vehicleFreed"] is False


def test_complete_lease_409_when_concurrent_modification(
    client: TestClient, mock_prisma: MagicMock
):
    """Race: concurrent renew flips the lease to RENEWED between our read and write.

    The conditional update fails (0 rows affected), we re-fetch, see it's not
    COMPLETED either, and surface a 409 instead of silently clobbering.
    """
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    initial = _active_lease()
    after_renew = _active_lease()
    after_renew.status = SimpleNamespace(value="RENEWED")
    # First read sees ACTIVE; conditional update fails; re-read shows RENEWED.
    mock_prisma.lease.find_unique.side_effect = [initial, after_renew]
    mock_prisma.lease.update_many.return_value = 0

    r = client.post("/v1/admin/leases/ls-1/complete", headers=_admin_headers("FLEET_MANAGER"))
    assert r.status_code == 409
    # Crucially: vehicle was NOT freed because we bailed out before the SQL.
    mock_prisma.execute_raw.assert_not_called()


def test_complete_lease_idempotent_under_concurrent_complete(
    client: TestClient, mock_prisma: MagicMock
):
    """Race: another admin completed the lease simultaneously.

    Conditional update fails (0 rows), but re-fetch shows COMPLETED — the
    desired end state. Return 200 idempotently rather than 409.
    """
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    initial = _active_lease()
    already_completed = _active_lease()
    already_completed.status = SimpleNamespace(value="COMPLETED")
    mock_prisma.lease.find_unique.side_effect = [initial, already_completed]
    mock_prisma.lease.update_many.return_value = 0

    r = client.post("/v1/admin/leases/ls-1/complete", headers=_admin_headers("FLEET_MANAGER"))
    assert r.status_code == 200
    assert r.json()["status"] == "COMPLETED"
    mock_prisma.execute_raw.assert_not_called()


# ── /admin/vehicles ────────────────────────────────────────────────────


def test_list_vehicles_finance_can_read(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("FINANCE")
    mock_prisma.vehicle.find_many.return_value = []
    r = client.get("/v1/admin/vehicles", headers=_admin_headers("FINANCE"))
    assert r.status_code == 200


def test_create_vehicle_blocks_sales(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    r = client.post(
        "/v1/admin/vehicles",
        headers=_admin_headers("SALES"),
        json={
            "brand": "BYD",
            "model": "Atto 3",
            "year": 2026,
            "monthlyRateAed": 3000,
            "colour": "white",
            "plateNumber": "ABC-1234",
            "mileageLimitMonthly": 3000,
            "seats": 5,
        },
    )
    assert r.status_code == 403


def test_create_vehicle_auto_category(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    mock_prisma.vehiclecategory.find_first.return_value = None
    mock_prisma.vehiclecategory.create.return_value = _category()
    mock_prisma.vehicle.create.return_value = _vehicle()

    r = client.post(
        "/v1/admin/vehicles",
        headers=_admin_headers("FLEET_MANAGER"),
        json={
            "brand": "BYD",
            "model": "Atto 3",
            "year": 2026,
            "monthlyRateAed": 3000,
            "colour": "white",
            "plateNumber": "ABC-1234",
            "mileageLimitMonthly": 3000,
            "seats": 5,
            "fuelType": "electric",
        },
    )
    assert r.status_code == 201
    cat_create = mock_prisma.vehiclecategory.create.call_args.kwargs["data"]
    assert cat_create["nameEn"] == "Electric"

    vehicle_data = mock_prisma.vehicle.create.call_args.kwargs["data"]
    assert vehicle_data["categoryId"] == "cat-1"
    assert vehicle_data["fuelType"] == "ELECTRIC"
    assert vehicle_data["transmission"] == "AUTOMATIC"
    assert vehicle_data["vin"].startswith("ORIGIN-")


def test_update_vehicle_404(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    mock_prisma.vehicle.find_unique.return_value = None
    r = client.patch(
        "/v1/admin/vehicles/missing",
        headers=_admin_headers("FLEET_MANAGER"),
        json={"colour": "red"},
    )
    assert r.status_code == 404


def test_update_vehicle_partial(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    mock_prisma.vehicle.find_unique.return_value = _vehicle()
    mock_prisma.vehicle.update.return_value = _vehicle()
    r = client.patch(
        "/v1/admin/vehicles/veh-1",
        headers=_admin_headers("FLEET_MANAGER"),
        json={"colour": "red", "monthlyRateAed": 3500},
    )
    assert r.status_code == 200
    update_args = mock_prisma.vehicle.update.call_args.kwargs
    # Only the keys we sent — not the absent ones
    assert update_args["data"] == {"colour": "red", "monthlyRateAed": 3500}


def test_set_vehicle_status_404(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    mock_prisma.vehicle.find_unique.return_value = None
    r = client.post(
        "/v1/admin/vehicles/missing/status",
        headers=_admin_headers("FLEET_MANAGER"),
        json={"status": "MAINTENANCE"},
    )
    assert r.status_code == 404


def test_set_vehicle_status_happy(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin("FLEET_MANAGER")
    mock_prisma.vehicle.find_unique.return_value = _vehicle()
    mock_prisma.vehicle.update.return_value = _vehicle(status="MAINTENANCE")
    r = client.post(
        "/v1/admin/vehicles/veh-1/status",
        headers=_admin_headers("FLEET_MANAGER"),
        json={"status": "MAINTENANCE"},
    )
    assert r.status_code == 200
    update_args = mock_prisma.vehicle.update.call_args.kwargs
    assert update_args["data"] == {"status": "MAINTENANCE"}
