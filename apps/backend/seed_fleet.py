#!/usr/bin/env python3
"""Seed the Origin database with the real fleet of 11 rental vehicles.

Usage (from apps/backend/):
    uv run python seed_fleet.py

Requires:
  - DATABASE_URL env var pointing at the Origin PostgreSQL database
  - Prisma client generated (`uv run prisma generate`)
  - Prisma migrations applied (`uv run prisma migrate deploy`)

This script is idempotent: it checks for existing categories and vehicles
(by VIN) before inserting, so re-running it is safe.
"""

import asyncio
import sys
from decimal import Decimal

from prisma import Prisma

# ── Vehicle categories ──────────────────────────────────────────

CATEGORIES = [
    {"nameEn": "Sedan",    "nameAr": "سيدان",        "nameZh": "轿车",   "icon": "sedan"},
    {"nameEn": "SUV",      "nameAr": "دفع رباعي",    "nameZh": "SUV",    "icon": "suv"},
    {"nameEn": "Electric", "nameAr": "كهربائية",      "nameZh": "电动车", "icon": "electric"},
    {"nameEn": "MPV",      "nameAr": "ميني فان",     "nameZh": "MPV",    "icon": "mpv"},
]

# ── Fleet data ──────────────────────────────────────────────────
# All prices are AED inclusive of 5% VAT.
# mileageLimitMonthly: 9000 km/month (300 km/day) for standard tier,
#                      5000 km/month for premium (ZEEKR, Hongqi H9, WEY).
# Excess km charge: AED 1/km (handled at booking level, not stored here).

FLEET = [
    # ── Sedans ──────────────────────────────────────────────────
    {
        "vin": "LGWDF4A55SF100001",
        "plateNumber": "AD-A-10001",
        "brand": "DONGFENG",
        "model": "Shine E1",
        "year": 2025,
        "category": "Sedan",
        "fuelType": "PETROL",
        "seats": 5,
        "colour": "Pearl White",
        "dailyRateAed": Decimal("100.00"),
        "monthlyRateAed": Decimal("1400.00"),
        "depositAmountAed": Decimal("1500.00"),
        "mileageLimitMonthly": 9000,
    },
    {
        "vin": "LFAJ4BAM3NF200002",
        "plateNumber": "AD-B-20002",
        "brand": "BESTUNE",
        "model": "B70S",
        "year": 2023,
        "category": "Sedan",
        "fuelType": "PETROL",
        "seats": 5,
        "colour": "Titanium Grey",
        "dailyRateAed": Decimal("110.00"),
        "monthlyRateAed": Decimal("1500.00"),
        "depositAmountAed": Decimal("1500.00"),
        "mileageLimitMonthly": 9000,
    },
    {
        "vin": "LFAJ4BAM3NF300003",
        "plateNumber": "AD-C-30003",
        "brand": "HONGQI",
        "model": "H5",
        "year": 2023,
        "category": "Sedan",
        "fuelType": "PETROL",
        "seats": 5,
        "colour": "Obsidian Black",
        "dailyRateAed": Decimal("130.00"),
        "monthlyRateAed": Decimal("1700.00"),
        "depositAmountAed": Decimal("1500.00"),
        "mileageLimitMonthly": 9000,
    },
    {
        "vin": "LFAJ4BAM3NF400004",
        "plateNumber": "AD-D-40004",
        "brand": "HONGQI",
        "model": "H9",
        "year": 2023,
        "category": "Sedan",
        "fuelType": "PETROL",
        "seats": 5,
        "colour": "Imperial Red",
        "dailyRateAed": Decimal("380.00"),
        "monthlyRateAed": Decimal("4500.00"),
        "depositAmountAed": Decimal("2500.00"),
        "mileageLimitMonthly": 5000,
    },
    {
        "vin": "LZERECMA1SF500005",
        "plateNumber": "AD-E-50005",
        "brand": "ZEEKR",
        "model": "001",
        "year": 2025,
        "category": "Electric",
        "fuelType": "ELECTRIC",
        "seats": 5,
        "colour": "Cosmos Blue",
        "dailyRateAed": Decimal("380.00"),
        "monthlyRateAed": Decimal("5200.00"),
        "depositAmountAed": Decimal("2500.00"),
        "mileageLimitMonthly": 5000,
    },
    # ── SUVs ────────────────────────────────────────────────────
    {
        "vin": "LGWEF4A55NF600006",
        "plateNumber": "AD-F-60006",
        "brand": "GREAT_WALL",
        "model": "JOLION",
        "year": 2023,
        "category": "SUV",
        "fuelType": "PETROL",
        "seats": 5,
        "colour": "Desert Sand",
        "dailyRateAed": Decimal("120.00"),
        "monthlyRateAed": Decimal("1900.00"),
        "depositAmountAed": Decimal("1500.00"),
        "mileageLimitMonthly": 9000,
    },
    {
        "vin": "LFAJ4BAM3NF700007",
        "plateNumber": "AD-G-70007",
        "brand": "HONGQI",
        "model": "HS5",
        "year": 2022,
        "category": "SUV",
        "fuelType": "PETROL",
        "seats": 5,
        "colour": "Glacier White",
        "dailyRateAed": Decimal("150.00"),
        "monthlyRateAed": Decimal("2200.00"),
        "depositAmountAed": Decimal("1500.00"),
        "mileageLimitMonthly": 9000,
    },
    {
        "vin": "LGWFF4A55PF800008",
        "plateNumber": "AD-H-80008",
        "brand": "FORTING",
        "model": "T5 EVO",
        "year": 2024,
        "category": "SUV",
        "fuelType": "PETROL",
        "seats": 5,
        "colour": "Midnight Blue",
        "dailyRateAed": Decimal("150.00"),
        "monthlyRateAed": Decimal("2500.00"),
        "depositAmountAed": Decimal("1500.00"),
        "mileageLimitMonthly": 9000,
    },
    {
        "vin": "LZERECMA1SF900009",
        "plateNumber": "AD-J-90009",
        "brand": "ZEEKR",
        "model": "X",
        "year": 2025,
        "category": "SUV",
        "fuelType": "ELECTRIC",
        "seats": 5,
        "colour": "Aurora Green",
        "dailyRateAed": Decimal("180.00"),
        "monthlyRateAed": Decimal("2400.00"),
        "depositAmountAed": Decimal("2000.00"),
        "mileageLimitMonthly": 5000,
    },
    {
        "vin": "LGWFF4A55PFA00010",
        "plateNumber": "AD-K-10010",
        "brand": "FORTING",
        "model": "U-Tour M4",
        "year": 2024,
        "category": "SUV",
        "fuelType": "PETROL",
        "seats": 7,
        "colour": "Silver Metallic",
        "dailyRateAed": Decimal("180.00"),
        "monthlyRateAed": Decimal("2600.00"),
        "depositAmountAed": Decimal("2000.00"),
        "mileageLimitMonthly": 9000,
    },
    # ── MPV ─────────────────────────────────────────────────────
    {
        "vin": "LGWGF4A55NFA00011",
        "plateNumber": "AD-L-10011",
        "brand": "WEY",
        "model": "GAOSHAN",
        "year": 2023,
        "category": "MPV",
        "fuelType": "HYBRID",
        "seats": 7,
        "colour": "Champagne Gold",
        "dailyRateAed": Decimal("400.00"),
        "monthlyRateAed": Decimal("5800.00"),
        "depositAmountAed": Decimal("2500.00"),
        "mileageLimitMonthly": 5000,
    },
]


async def seed() -> None:
    db = Prisma()
    await db.connect()

    try:
        # ── 1. Upsert categories ────────────────────────────────
        cat_map: dict[str, str] = {}  # nameEn -> id

        for cat in CATEGORIES:
            existing = await db.vehiclecategory.find_first(
                where={"nameEn": cat["nameEn"]}
            )
            if existing:
                cat_map[cat["nameEn"]] = existing.id
                print(f"  Category '{cat['nameEn']}' already exists (id={existing.id})")
            else:
                created = await db.vehiclecategory.create(data=cat)
                cat_map[cat["nameEn"]] = created.id
                print(f"  Created category '{cat['nameEn']}' (id={created.id})")

        # ── 2. Insert vehicles (skip if VIN exists) ─────────────
        created_count = 0
        skipped_count = 0

        for v in FLEET:
            existing = await db.vehicle.find_first(where={"vin": v["vin"]})
            if existing:
                print(f"  SKIP {v['brand']} {v['model']} — VIN already exists")
                skipped_count += 1
                continue

            category_name = v.pop("category")
            deposit = v.pop("depositAmountAed")
            category_id = cat_map[category_name]

            await db.vehicle.create(
                data={
                    "vin": v["vin"],
                    "plateNumber": v["plateNumber"],
                    "brand": v["brand"],
                    "model": v["model"],
                    "year": v["year"],
                    "categoryId": category_id,
                    "fuelType": v["fuelType"],
                    "transmission": "AUTOMATIC",
                    "colour": v["colour"],
                    "seats": v["seats"],
                    "status": "AVAILABLE",
                    "dailyRateAed": v["dailyRateAed"],
                    "monthlyRateAed": v["monthlyRateAed"],
                    "mileageLimitMonthly": v["mileageLimitMonthly"],
                    "downPaymentPct": Decimal("0.20"),
                    "notes": f"Deposit: AED {deposit}",
                }
            )
            print(f"  Created {v['brand']} {v['model']} ({v['vin']})")
            created_count += 1

        # ── Summary ─────────────────────────────────────────────
        print(f"\nDone — {created_count} vehicles created, {skipped_count} skipped.")
        print(f"Categories: {len(cat_map)}")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    print("Origin Fleet Seed Script")
    print("=" * 40)
    asyncio.run(seed())
