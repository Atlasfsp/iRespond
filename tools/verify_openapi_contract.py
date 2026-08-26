#!/usr/bin/env python3
"""Fail CI when the registered iRespond HTTP surface drifts from OpenAPI.

Dependency-free by design: it extracts literal Go 1.22+ ServeMux patterns and the
method/path structure of our checked-in OpenAPI YAML. This is a coverage gate,
not a replacement for a full OpenAPI validator.
"""
from __future__ import annotations

import pathlib
import re
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / "services" / "api" / "cmd" / "server"
OPENAPI = ROOT / "services" / "api" / "openapi.yaml"

ROUTE_RE = re.compile(r'HandleFunc\("(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD) ([^" ]+)"')
PATH_RE = re.compile(r"^  (/[^:]*):\s*$")
METHOD_RE = re.compile(r"^    (get|post|put|patch|delete|options|head):\s*$")
OPERATION_RE = re.compile(r"^      operationId:\s*([^\s#]+)")
RESPONSES_RE = re.compile(r"^      responses:\s*$")


def source_routes() -> set[tuple[str, str]]:
    routes: set[tuple[str, str]] = set()
    for source in sorted(SERVER_DIR.glob("*.go")):
        if source.name.endswith("_test.go"):
            continue
        text = source.read_text(encoding="utf-8")
        routes.update((m.group(1), m.group(2)) for m in ROUTE_RE.finditer(text))
    return routes


def openapi_routes() -> tuple[set[tuple[str, str]], list[str], list[tuple[str, str]]]:
    routes: set[tuple[str, str]] = set()
    operation_ids: list[str] = []
    missing_responses: list[tuple[str, str]] = []
    current_path: str | None = None
    current_method: str | None = None
    operation_has_responses = False

    def flush_operation() -> None:
        nonlocal current_method, operation_has_responses
        if current_path and current_method and not operation_has_responses:
            missing_responses.append((current_method.upper(), current_path))
        current_method = None
        operation_has_responses = False

    for raw in OPENAPI.read_text(encoding="utf-8").splitlines():
        path_match = PATH_RE.match(raw)
        if path_match:
            flush_operation()
            current_path = path_match.group(1)
            continue
        method_match = METHOD_RE.match(raw)
        if method_match and current_path:
            flush_operation()
            current_method = method_match.group(1)
            routes.add((current_method.upper(), current_path))
            continue
        if current_method:
            operation_match = OPERATION_RE.match(raw)
            if operation_match:
                operation_ids.append(operation_match.group(1))
            if RESPONSES_RE.match(raw):
                operation_has_responses = True
    flush_operation()
    return routes, operation_ids, missing_responses


def fmt(items: set[tuple[str, str]] | list[tuple[str, str]]) -> str:
    return "\n".join(f"  {method:7} {path}" for method, path in sorted(items))


def main() -> int:
    source = source_routes()
    documented, operation_ids, missing_responses = openapi_routes()
    missing = source - documented
    stale = documented - source
    duplicate_operation_ids = sorted(k for k, n in Counter(operation_ids).items() if n > 1)

    errors: list[str] = []
    if missing:
        errors.append("registered routes missing from OpenAPI:\n" + fmt(missing))
    if stale:
        errors.append("OpenAPI routes with no registered server route:\n" + fmt(stale))
    if missing_responses:
        errors.append("OpenAPI operations missing responses:\n" + fmt(missing_responses))
    if len(operation_ids) != len(documented):
        errors.append(
            f"every operation must have exactly one operationId: operations={len(documented)} operationIds={len(operation_ids)}"
        )
    if duplicate_operation_ids:
        errors.append("duplicate operationId values: " + ", ".join(duplicate_operation_ids))

    if errors:
        print("OpenAPI contract gate FAILED", file=sys.stderr)
        for error in errors:
            print("\n" + error, file=sys.stderr)
        return 1

    print(f"OpenAPI contract verified: {len(source)} registered method/path operations")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
