#!/usr/bin/env python3
"""Reject incomplete inventories and bind the full resolution graph and patches."""
import hashlib
import json
import pathlib
import sys

out = pathlib.Path(sys.argv[1])
workspaces = json.loads((out / "pnpm-workspaces.json").read_text())
mobile = next((item for item in workspaces if item.get("name") == "@irespond/mobile"), None)
if not mobile or "expo" not in mobile.get("dependencies", {}):
    raise SystemExit("Inventory omits the production mobile workspace")
for name in ("go-modules.jsonl", "go-module-graph.txt", "pnpm-lock.yaml", "pnpm-workspace.yaml", "manifest-sha256.txt"):
    if not (out / name).is_file() or (out / name).stat().st_size == 0:
        raise SystemExit(f"Missing complete dependency evidence: {name}")
lock = (out / "pnpm-lock.yaml").read_text()
if "packages:" not in lock or "snapshots:" not in lock:
    raise SystemExit("Full pnpm resolution graph required")
patch = out / "patches/metro@0.82.5.patch"
if not patch.is_file() or "imageSizeModule.imageSize" not in patch.read_text():
    raise SystemExit("Metro compatibility patch missing from inventory")
files = {str(path.relative_to(out)): hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(out.rglob("*")) if path.is_file() and path.name != "inventory-manifest.json"}
(out / "inventory-manifest.json").write_text(json.dumps({"schema": "irespond.dependency-inventory.v1", "workspaceRoots": [item.get("name") for item in workspaces], "completeJavascriptGraph": "pnpm-lock.yaml", "completeGoGraph": "go-module-graph.txt", "sha256": files}, indent=2) + "\n")
print("Dependency inventory verified: mobile roots, full graphs, policy and Metro patch")
