#!/usr/bin/env python3
"""Ingest approved runtime screenshots, advance the freshness manifest, and invoke manual rebuild."""
from __future__ import annotations
import argparse, hashlib, json, shutil, subprocess, sys
from pathlib import Path
from frontend_fingerprint import build_plan, git_blob_sha, head_revision, load

PNG_SIG=b"\x89PNG\r\n\x1a\n"

def image_sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def require_safe_png(path: Path) -> None:
    data=path.read_bytes()
    if not data.startswith(PNG_SIG): raise ValueError(f"{path} is not a PNG")
    if len(data) < 1024: raise ValueError(f"{path} is unexpectedly small")

def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--screenshots-dir", required=True, help="Approved runtime screenshots from a demo/test tenant; never production PII")
    ap.add_argument("--routes", default="tools/docs-sync/routes.json")
    ap.add_argument("--manifest", default="docs/manuals/ui-screenshot-manifest.json")
    ap.add_argument("--assets-dir", default="docs/manuals/assets/ui")
    ap.add_argument("--build", action="store_true")
    args=ap.parse_args(); root=Path(args.repo_root).resolve(); src=Path(args.screenshots_dir).resolve()
    routes=load(root/args.routes); manifest_path=root/args.manifest; manifest=load(manifest_path)
    plan=build_plan(root,routes,manifest)
    if plan["missing_paths"] or plan["untracked_routes"]:
        print("Cannot refresh while frontend route coverage is incomplete.",file=sys.stderr); return 3
    if plan["watch_only_changes"]:
        print("Watch-only frontend screens changed. Update route/manual mapping before refreshing.",file=sys.stderr); return 4
    assets=root/args.assets_dir; assets.mkdir(parents=True,exist_ok=True)
    by_id={s["id"]:s for s in routes["screens"]}
    current_screens=manifest.setdefault("screens",{})
    for stale in plan["stale_screens"]:
        sid=stale["screen_id"]; spec=by_id[sid]; incoming=src/spec["screenshot_file"]
        if not incoming.exists():
            print(f"Missing approved screenshot for {sid}: {incoming}",file=sys.stderr); return 5
        require_safe_png(incoming); dest=assets/spec["screenshot_file"]; shutil.copy2(incoming,dest)
        current_screens[sid]={
            "screenshot_file":spec["screenshot_file"],
            "screenshot_sha256":image_sha(dest),
            "source_fingerprints":{rel:git_blob_sha(root/rel) for rel in spec["source_paths"]},
            "manuals":spec.get("manuals",[]),
            "capture_class":"approved-runtime-demo-fixture"
        }
    manifest["shared_fingerprints"]={rel:git_blob_sha(root/rel) for rel in routes.get("shared_paths",[])}
    manifest["watch_only_fingerprints"]={rel:git_blob_sha(root/rel) for rel in routes.get("watch_only_paths",[])}
    manifest["source_revision"]=head_revision(root)
    manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")
    if args.build:
        cmd=[sys.executable,"tools/docs-sync/build_manuals.py"]
        subprocess.run(cmd,cwd=root,check=True)
    print("Manual screenshot manifest refreshed. Review generated document diffs before publication.")
    return 0

if __name__ == "__main__": raise SystemExit(main())
