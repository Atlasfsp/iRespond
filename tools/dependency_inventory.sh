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
  # The lockfile is the authoritative complete resolved JavaScript graph. Keep
  # the human/tool-readable workspace inventory bounded so evidence generation
  # cannot exhaust runner memory on highly connected React Native graphs.
  pnpm list -r --depth 0 --json > "${OUT}/pnpm-workspaces.json"
  cp pnpm-lock.yaml "${OUT}/pnpm-lock.yaml"
  pnpm --version > "${OUT}/pnpm-version.txt"
)

sha256sum "${ROOT}/pnpm-lock.yaml" "${ROOT}/services/api/go.mod" "${ROOT}/services/api/go.sum" > "${OUT}/manifest-sha256.txt"
{
  echo "generated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "git_sha=${GITHUB_SHA:-unknown}"
  echo "source=Atlasfsp/iRespond"
  echo "javascript_resolution=pnpm-lock.yaml"
  echo "workspace_inventory=pnpm-workspaces.json"
  echo "go_resolution=go-modules.jsonl"
} > "${OUT}/provenance.txt"

echo "Dependency inventory written to ${OUT}"
