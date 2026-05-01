"""Identity platform service helpers."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status


def _enum_value(value: Any) -> str | None:
    if value is None:
        return None
    return value.value if hasattr(value, "value") else str(value)


async def require_customer_kyc_approved(db: Any, *, customer_id: str, country_id: str) -> Any:
    customer = await db.customer.find_unique(where={"id": customer_id})
    if customer is None or getattr(customer, "countryId", country_id) != country_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    kyc_status = _enum_value(getattr(customer, "kycStatus", None))
    if kyc_status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC must be approved before submitting a booking",
            headers={"X-KYC-Status": kyc_status or "UNKNOWN"},
        )
    return customer

