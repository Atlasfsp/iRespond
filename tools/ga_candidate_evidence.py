#!/usr/bin/env python3
"""Generate a machine-readable iRespond GA-candidate handoff bundle.

This only packages repository evidence. It does not call providers, sign apps,
deploy infrastructure, or fabricate external certification results.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "build/evidence/ga"
RELEASE = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "build/evidence/release"
EXTERNAL = ROOT / "config/ga/external-gates.json"


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True).strip()


def source_metrics() -> dict[str, int]:
    extensions = {".go", ".ts", ".tsx", ".js", ".jsx", ".sql", ".yaml", ".yml", ".sh", ".py"}
    excluded = {"node_modules", ".git", "build", "dist", "vendor"}
    files: list[pathlib.Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in extensions:
            continue
        if any(part in excluded for part in path.parts):
            continue
        files.append(path)
    loc = sum(len(path.read_text(encoding="utf-8", errors="ignore").splitlines()) for path in files)
    screen_dir = ROOT / "apps/mobile/app"
    screens = sum(1 for p in screen_dir.rglob("*.tsx") if not p.name.startswith("_") and p.name not in {"+not-found.tsx"})
    return {"sourceLoc": loc, "sourceFiles": len(files), "mobileScreens": screens}


def openapi_operation_count() -> int:
    text = (ROOT / "services/api/openapi.yaml").read_text(encoding="utf-8")
    return len(re.findall(r"^\s{6}operationId:\s+", text, re.M))


def main() -> int:
    required = [
        ROOT / "services/api/openapi.yaml",
        ROOT / "deploy/helm/irespond/Chart.yaml",
        ROOT / "pnpm-lock.yaml",
        ROOT / "services/api/go.sum",
        ROOT / "docs/GA_READINESS.md",
        EXTERNAL,
        RELEASE / "release-manifest.json",
    ]
    missing = [str(p) for p in required if not p.is_file() or p.stat().st_size == 0]
    if missing:
        print("Missing GA candidate prerequisites:\n" + "\n".join(missing), file=sys.stderr)
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    external = json.loads(EXTERNAL.read_text(encoding="utf-8"))
    release_manifest = json.loads((RELEASE / "release-manifest.json").read_text(encoding="utf-8"))
    source_sha = git("rev-parse", "HEAD")

    candidate = {
        "schema": "irespond.ga-candidate/v1",
        "decision": "READY_FOR_EXTERNAL_CERTIFICATION",
        "ga": False,
        "blockedByExternalEvidence": True,
        "repository": "Atlasfsp/iRespond",
        "source": {
            "commit": source_sha,
            "tree": git("rev-parse", "HEAD^{tree}"),
            "commitTime": git("show", "-s", "--format=%cI", "HEAD"),
        },
        "canonicalDataPlane": {
            "relationalSystemOfRecord": "YugabyteDB/YSQL",
            "objectStore": "RustFS via standard AWS S3 API/SDK",
            "advancedGeospatial": "Shared Services SS-44",
        },
        "metrics": {**source_metrics(), "openApiRegisteredOperations": openapi_operation_count()},
        "repositoryControlledEvidence": {
            "requiredWorkflowJobs": ["mobile", "security-boundary", "supply-chain", "api", "deployment"],
            "apiJobIncludes": [
                "real YugabyteDB/YSQL integration",
                "real RustFS evidence integration",
                "migration idempotency",
                "YugabyteDB dump/restore recovery",
                "HTTP load regression baseline",
                "production image build",
            ],
            "releaseManifestSha256": sha256(RELEASE / "release-manifest.json"),
            "releaseArtifactCount": len(release_manifest.get("artifacts", [])),
        },
        "performanceRegressionPolicy": {
            "seedNeeds": 40,
            "requests": 300,
            "concurrency": 20,
            "minimumSuccessPercent": 100,
            "maximumP95Ms": 1000,
            "minimumRequestsPerSecond": 20,
            "note": "Repository CI regression baseline only; not production capacity certification.",
        },
        "handoffs": {
            "appForge": {
                "repository": "Atlasfsp/NexoCloud_AppForge",
                "sourceRepository": "Atlasfsp/iRespond",
                "sourceCommit": source_sha,
                "inputs": ["apps/mobile", "services/api", "deploy/helm/irespond", "build/evidence/release", "build/evidence/ga"],
                "requiredOutcome": "Build, sign and distribute the immutable candidate and return real-machine/store evidence.",
            },
            "skyForge": {
                "repository": "Atlasfsp/NexoCloud-SkyForge",
                "sourceCommit": source_sha,
                "deploymentArtifact": "deploy/helm/irespond",
                "requiredOutcome": "Deploy the exact candidate and prove readiness, canary, rollback, DNS/TLS and observability connectivity.",
            },
            "droplet": {
                "repository": "abiolaogu/Droplet",
                "apiContract": "POST /api/v1/projects/{id}/releases/evaluate",
                "requirements": ["tenant context", "Idempotency-Key", "immutable candidate evidence"],
                "sourceCommit": source_sha,
                "requiredOutcome": "Return an independent release verdict; MERGE BLOCKED or DO_NOT_SHIP remains blocking evidence.",
            },
        },
        "externalGates": external["gates"],
        "externalGatesSha256": sha256(EXTERNAL),
        "policy": external["policy"],
    }
    payload = json.dumps(candidate, indent=2, sort_keys=True) + "\n"
    target = OUT / "ga-candidate.json"
    target.write_text(payload, encoding="utf-8")
    (OUT / "SHA256SUMS").write_text(f"{sha256(target)}  ga-candidate.json\n", encoding="utf-8")
    print(f"GA candidate evidence generated at {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
