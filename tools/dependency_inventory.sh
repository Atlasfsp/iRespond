#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-${ROOT}/build/evidence/dependencies}"
mkdir -p "${OUT}"
OUT="$(cd "$OUT" && pwd)"

(
  cd "${ROOT}/services/api"
  go list -m -json all > "${OUT}/go-modules.jsonl"
  go mod graph > "${OUT}/go-module-graph.txt"
  go env GOVERSION > "${OUT}/go-version.txt"
)

(
  cd "${ROOT}"
  # The lockfile is the authoritative complete resolved JavaScript graph. Keep
  # the human/tool-readable workspace inventory bounded so evidence generation
  # cannot exhaust runner memory on highly connected React Native graphs.
  pnpm list -r --depth 0 --json > "${OUT}/pnpm-workspaces.json"
  cp pnpm-lock.yaml pnpm-workspace.yaml "${OUT}/"
  mkdir -p "${OUT}/patches"
  cp patches/*.patch "${OUT}/patches/"
  pnpm --version > "${OUT}/pnpm-version.txt"
)

sha256sum "${ROOT}/pnpm-lock.yaml" "${ROOT}/services/api/go.mod" "${ROOT}/services/api/go.sum" "${ROOT}/pnpm-workspace.yaml" "${ROOT}"/patches/*.patch > "${OUT}/manifest-sha256.txt"
{
  echo "generated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "git_sha=${GITHUB_SHA:-unknown}"
  echo "source=Atlasfsp/iRespond"
  echo "javascript_resolution=pnpm-lock.yaml"
  echo "workspace_inventory=pnpm-workspaces.json"
  echo "go_resolution=go-modules.jsonl"
} > "${OUT}/provenance.txt"

git -C "$ROOT" diff --exit-code -- services/api/go.mod services/api/go.sum pnpm-lock.yaml pnpm-workspace.yaml patches
python3 "${ROOT}/tools/ci/verify-dependency-inventory.py" "$OUT"

echo "Dependency inventory written to ${OUT}"
