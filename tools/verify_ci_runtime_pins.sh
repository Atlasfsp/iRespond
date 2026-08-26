#!/usr/bin/env bash
set -euo pipefail

workflow=".github/workflows/verify.yml"

if grep -Eq '(^|[[:space:]])[^[:space:]]+:latest([[:space:]]|$)' "$workflow"; then
  echo "mutable :latest image tag is not allowed in verification workflow" >&2
  exit 1
fi

require_digest() {
  local image="$1"
  if ! grep -Fq "$image@sha256:" "$workflow"; then
    echo "verification runtime image is not digest pinned: $image" >&2
    exit 1
  fi
}

require_digest "yugabytedb/yugabyte"
require_digest "minio/minio"

while IFS= read -r action_ref; do
  [[ "$action_ref" == ./* ]] && continue
  ref="${action_ref##*@}"
  if [[ ! "$ref" =~ ^[0-9a-f]{40}$ ]]; then
    echo "GitHub Action is not pinned to a full commit SHA: $action_ref" >&2
    exit 1
  fi
done < <(sed -nE 's/^[[:space:]]*-[[:space:]]+uses:[[:space:]]+([^[:space:]#]+).*/\1/p' "$workflow")

echo "CI runtime and GitHub Action pins verified"
