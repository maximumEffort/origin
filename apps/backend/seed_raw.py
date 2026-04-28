#!/usr/bin/env python3
"""Seed the Origin database with the real fleet using psycopg2 (no Prisma client needed).

Usage:
    set DATABASE_URL=postgresql://...
    python seed_raw.py
"""

import os
import sys
import uuid
from datetime import datetime

import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: Set DATABASE_URL environment variable first.")
    sys.exit(1)

CATEGORIES = [
    {"nameEn": "Sedan", "nameAr": "سيدان", "nameZh": "轿车", "icon": "sedan"},
    {"nameEn": "SUV", "nameAr": "دفع رباعي", "nameZh": "SUV", "icon": "suv"},
    {"nameEn": "Electric", "nameAr": "كهربائية", "nameZh": "电动车", "icon": "electric"},
    {"nameEn": "MPV", "nameAr": "ميني فان", "nameZh": "MPV", "icon": "mpv"},
]

FLEET = [
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
        "dailyRateAed": 100.00,
        "monthlyRateAed": 1400.00,
        "depositAmountAed": 1500.00,
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
        "dailyRateAed": 110.00,
        "monthlyRateAed": 1500.00,
        "depositAmountAed": 1500.00,
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
        "dailyRateAed": 130.00,
        "monthlyRateAed": 1700.00,
        "depositAmountAed": 1500.00,
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
        "dailyRateAed": 380.00,
        "monthlyRateAed": 4500.00,
        "depositAmountAed": 2500.00,
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
        "dailyRateAed": 380.00,
        "monthlyRateAed": 5200.00,
        "depositAmountAed": 2500.00,
        "mileageLimitMonthly": 5000,
    },
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
        "dailyRateAed": 120.00,
        "monthlyRateAed": 1900.00,
        "depositAmountAed": 1500.00,
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
        "dailyRateAed": 150.00,
        "monthlyRateAed": 2200.00,
        "depositAmountAed": 1500.00,
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
        "dailyRateAed": 150.00,
        "monthlyRateAed": 2500.00,
        "depositAmountAed": 1500.00,
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
        "dailyRateAed": 180.00,
        "monthlyRateAed": 2400.00,
        "depositAmountAed": 2000.00,
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
        "dailyRateAed": 180.00,
        "monthlyRateAed": 2600.00,
        "depositAmountAed": 2000.00,
        "mileageLimitMonthly": 9000,
    },
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
        "dailyRateAed": 400.00,
        "monthlyRateAed": 5800.00,
        "depositAmountAed": 2500.00,
        "mileageLimitMonthly": 5000,
    },
]


def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    now = datetime.utcnow()

    print("Origin Fleet Seed Script (psycopg2)")
    print("=" * 40)

    # 1. Upsert categories
    cat_map = {}
    for cat in CATEGORIES:
        cur.execute('SELECT id FROM vehicle_categories WHERE "nameEn" = %s', (cat["nameEn"],))
        row = cur.fetchone()
        if row:
            cat_map[cat["nameEn"]] = row[0]
            print(f"  Category '{cat['nameEn']}' already exists (id={row[0]})")
        else:
            cat_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO vehicle_categories (id, "nameEn", "nameAr", "nameZh", icon)
                   VALUES (%s, %s, %s, %s, %s)""",
                (cat_id, cat["nameEn"], cat["nameAr"], cat["nameZh"], cat["icon"]),
            )
            cat_map[cat["nameEn"]] = cat_id
            print(f"  Created category '{cat['nameEn']}' (id={cat_id})")

    # 2. Insert vehicles
    created = 0
    skipped = 0
    for v in FLEET:
        cur.execute("SELECT id FROM vehicles WHERE vin = %s", (v["vin"],))
        if cur.fetchone():
            print(f"  SKIP {v['brand']} {v['model']} -- VIN already exists")
            skipped += 1
            continue

        vid = str(uuid.uuid4())
        category_id = cat_map[v["category"]]
        cur.execute(
            """INSERT INTO vehicles (
                id, vin, "plateNumber", brand, model, year,
                "categoryId", "fuelType", transmission, colour, seats,
                status, "dailyRateAed", "monthlyRateAed",
                "downPaymentPct", "mileageLimitMonthly",
                notes, "createdAt", "updatedAt"
            ) VALUES (
                %s, %s, %s, %s::"Brand", %s, %s,
                %s, %s::"FuelType", %s::"Transmission", %s, %s,
                %s::"VehicleStatus", %s, %s,
                %s, %s,
                %s, %s, %s
            )""",
            (
                vid,
                v["vin"],
                v["plateNumber"],
                v["brand"],
                v["model"],
                v["year"],
                category_id,
                v["fuelType"],
                "AUTOMATIC",
                v["colour"],
                v["seats"],
                "AVAILABLE",
                v["dailyRateAed"],
                v["monthlyRateAed"],
                0.20,
                v["mileageLimitMonthly"],
                f"Deposit: AED {v['depositAmountAed']}",
                now,
                now,
            ),
        )
        print(f"  Created {v['brand']} {v['model']} ({v['vin']})")
        created += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDone -- {created} vehicles created, {skipped} skipped.")
    print(f"Categories: {len(cat_map)}")


if __name__ == "__main__":
    main()
