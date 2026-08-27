#!/usr/bin/env python3
"""Fail-closed frontend/manual freshness check for iRespond living documentation."""
from __future__ import annotations
import argparse, hashlib, json, subprocess, sys
from pathlib import Path


def git_blob_sha(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def head_revision(root: Path) -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    except Exception:
        return "unknown"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def scan_routes(root: Path, frontend_root: str) -> list[str]:
    base = root / frontend_root
    if not base.exists():
        return []
    found=[]
    for p in base.rglob("*.tsx"):
        rel=p.relative_to(root).as_posix()
        if p.name == "_layout.tsx":
            continue
        found.append(rel)
    return sorted(found)


def build_plan(root: Path, routes: dict, manifest: dict) -> dict:
    shared = routes.get("shared_paths", [])
    manifest_shared = manifest.get("shared_fingerprints", {})
    missing=[]; changed_shared=[]
    current_shared={}
    for rel in shared:
        p=root/rel
        if not p.exists(): missing.append(rel); continue
        fp=git_blob_sha(p); current_shared[rel]=fp
        if manifest_shared.get(rel) != fp: changed_shared.append(rel)

    stale=[]
    covered=set(shared) | set(routes.get("watch_only_paths", []))
    manifest_screens=manifest.get("screens", {})
    for screen in routes.get("screens", []):
        sid=screen["id"]; expected=manifest_screens.get(sid, {}).get("source_fingerprints", {})
        current={}; reasons=[]
        for rel in screen.get("source_paths", []):
            covered.add(rel); p=root/rel
            if not p.exists(): missing.append(rel); continue
            fp=git_blob_sha(p); current[rel]=fp
            if expected.get(rel) != fp: reasons.append(f"source_changed:{rel}")
        if changed_shared: reasons.extend(f"shared_changed:{p}" for p in changed_shared)
        if reasons:
            stale.append({"screen_id":sid,"screenshot_file":screen["screenshot_file"],"manuals":screen.get("manuals",[]),"reasons":reasons,"current_source_fingerprints":current})

    watch_changed=[]
    watch_expected=manifest.get("watch_only_fingerprints", {})
    for rel in routes.get("watch_only_paths", []):
        p=root/rel
        if not p.exists(): missing.append(rel); continue
        fp=git_blob_sha(p)
        if watch_expected.get(rel) != fp:
            watch_changed.append({"path":rel,"reason":"manual_review_required"})

    actual=set(scan_routes(root, routes.get("frontend_root", "apps/mobile/app")))
    untracked=sorted(actual-covered)
    return {
        "schema_version":1,
        "head_revision":head_revision(root),
        "baseline_revision":manifest.get("source_revision"),
        "stale_screens":stale,
        "watch_only_changes":watch_changed,
        "changed_shared_paths":changed_shared,
        "untracked_routes":untracked,
        "missing_paths":sorted(set(missing)),
        "is_fresh":not stale and not watch_changed and not untracked and not missing,
        "current_shared_fingerprints":current_shared,
    }


def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--routes", default="tools/docs-sync/routes.json")
    ap.add_argument("--manifest", default="docs/manuals/ui-screenshot-manifest.json")
    ap.add_argument("--out", default="manual-change-plan.json")
    ap.add_argument("--fail-on-stale", action="store_true")
    args=ap.parse_args(); root=Path(args.repo_root).resolve()
    plan=build_plan(root, load(root/args.routes), load(root/args.manifest))
    out=Path(args.out); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(plan,indent=2)+"\n")
    print(json.dumps(plan,indent=2))
    if args.fail_on_stale and not plan["is_fresh"]:
        print("Living manuals are stale or route coverage is incomplete. Refresh approved interface captures and manuals before merge.", file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__": raise SystemExit(main())
