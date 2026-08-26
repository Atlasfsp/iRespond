#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${ROOT}/build/evidence/dependencies"
mkdir -p "${OUT}"

(
  cd "${ROOT}/services/api"
  go list -m -json all > "${OUT}/go-modules.jsonl"
  go env GOVERSION > "${OUT}/go-version.txt"
)

(
  cd "${ROOT}"
  pnpm list -r --depth Infinity --json > "${OUT}/pnpm-dependencies.json"
  pnpm --version > "${OUT}/pnpm-version.txt"
)

sha256sum "${ROOT}/pnpm-lock.yaml" "${ROOT}/services/api/go.mod" "${ROOT}/services/api/go.sum" > "${OUT}/manifest-sha256.txt"
{
  echo "generated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "git_sha=${GITHUB_SHA:-unknown}"
  echo "source=Atlasfsp/iRespond"
} > "${OUT}/provenance.txt"

echo "Dependency inventory written to ${OUT}"
