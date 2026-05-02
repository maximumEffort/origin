"""Money primitive. Every monetary value in the system is a (amount_minor, currency_code) pair."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Money:
    amount_minor: int
    currency_code: str  # ISO 4217 alpha-3, uppercase

    def __post_init__(self) -> None:
        if not isinstance(self.amount_minor, int):
            raise TypeError("amount_minor must be int (no floats)")
        if len(self.currency_code) != 3 or not self.currency_code.isupper():
            raise ValueError(f"currency_code must be 3-char uppercase ISO 4217, got {self.currency_code!r}")

    def __add__(self, other: Money) -> Money:
        if other.currency_code != self.currency_code:
            raise ValueError(f"currency mismatch: {self.currency_code} vs {other.currency_code}")
        return Money(self.amount_minor + other.amount_minor, self.currency_code)

    def __sub__(self, other: Money) -> Money:
        if other.currency_code != self.currency_code:
            raise ValueError(f"currency mismatch: {self.currency_code} vs {other.currency_code}")
        return Money(self.amount_minor - other.amount_minor, self.currency_code)

    def to_wire(self) -> dict[str, int | str]:
        return {"amount_minor": self.amount_minor, "currency_code": self.currency_code}

    @classmethod
    def from_wire(cls, payload: dict) -> Money:
        return cls(int(payload["amount_minor"]), str(payload["currency_code"]).upper())
