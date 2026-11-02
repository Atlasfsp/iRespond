#!/usr/bin/env python3
"""Archive generated evidence only; do not include the checkout or runner credentials."""
import datetime
import pathlib
import subprocess
import tarfile

root = pathlib.Path.home() / "runner/_work/iRespond/iRespond"
if not root.is_dir():
    raise SystemExit(0)
revision = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
output = pathlib.Path.home() / "evidence"
output.mkdir(exist_ok=True)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
target = output / f"irespond-{revision}-{stamp}.tar.gz"
allowed = [root / "build/evidence", root / "docs/documentation-system", root / "docs/manuals/generated/ui-interface-baseline.md"]
with tarfile.open(target, "w:gz") as archive:
    for path in allowed:
        candidates = path.rglob("*") if path.is_dir() else [path]
        for item in candidates:
            if item.is_file() and not item.is_symlink() and item.resolve().is_relative_to(root):
                archive.add(item, arcname=str(item.relative_to(root)), recursive=False)
print(target)
