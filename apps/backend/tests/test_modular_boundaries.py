"""Import boundary checks for the modular monolith."""

from __future__ import annotations

import ast
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src" / "origin_backend"


def _imports(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module)
    return found


def test_core_has_no_business_module_imports() -> None:
    forbidden = (
        "origin_backend.platform",
        "origin_backend.products",
        "origin_backend.services",
        "origin_backend.gateways",
        "origin_backend.admin",
        "origin_backend.bookings",
        "origin_backend.calculator",
        "origin_backend.customers",
        "origin_backend.kyc",
        "origin_backend.vehicles",
    )
    offenders: list[str] = []
    for path in (SRC / "core").rglob("*.py"):
        for module in _imports(path):
            if module.startswith(forbidden):
                offenders.append(f"{path.relative_to(SRC)} imports {module}")
    assert offenders == []


def test_products_do_not_import_gateways_or_legacy_modules() -> None:
    forbidden = (
        "origin_backend.gateways",
        "origin_backend.admin",
        "origin_backend.bookings",
        "origin_backend.calculator",
        "origin_backend.customers",
        "origin_backend.kyc",
        "origin_backend.vehicles",
    )
    offenders: list[str] = []
    for path in (SRC / "products").rglob("*.py"):
        for module in _imports(path):
            if module.startswith(forbidden):
                offenders.append(f"{path.relative_to(SRC)} imports {module}")
    assert offenders == []

