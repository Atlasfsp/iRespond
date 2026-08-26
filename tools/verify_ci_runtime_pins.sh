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

echo "CI runtime image pins verified"
