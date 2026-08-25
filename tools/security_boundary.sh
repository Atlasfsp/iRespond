#!/usr/bin/env bash
set -euo pipefail

fail() { echo "SECURITY_BOUNDARY_FAIL: $*" >&2; exit 1; }

echo "Checking repository security boundaries..."

# Production credentials and private keys must never be committed.
if git grep -n -I -E -e 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' -- . ':!tools/security_boundary.sh'; then
  fail "private key material found"
fi
if git grep -n -I -E -e '(AWS_SECRET_ACCESS_KEY|OBJECT_STORAGE_SECRET_KEY|OIDC_CLIENT_SECRET|DATABASE_PASSWORD)[[:space:]]*[:=][[:space:]]*[^$<{[:space:]][^[:space:]]{7,}' -- . ':!tools/security_boundary.sh'; then
  fail "literal production-style secret found"
fi

# YugabyteDB is the relational standard; PostGIS-specific runtime dependencies are prohibited.
if git grep -n -I -E -e 'CREATE EXTENSION.*postgis|ST_DWithin|geography\(Point|postgis/postgis' -- services deploy infra .github 2>/dev/null; then
  fail "PostGIS-specific production dependency found; use YugabyteDB + SS-44"
fi

# Container and Helm runtime must retain non-root/read-only hardening.
if ! grep -Eq '^USER[[:space:]]+([1-9][0-9]*|nonroot)(:([1-9][0-9]*|nonroot))?[[:space:]]*$' services/api/Dockerfile; then
  fail "API image must declare a non-root runtime user"
fi
git grep -q -E -e 'runAsNonRoot:[[:space:]]*true' -- deploy/helm/irespond || fail "Helm workload must require non-root execution"
git grep -q -E -e 'readOnlyRootFilesystem:[[:space:]]*true' -- deploy/helm/irespond || fail "Helm workload must use read-only root filesystem"

# No development-only authentication bypass may be enabled in deployable manifests.
if git grep -n -I -E -e 'AUTH_BYPASS|DISABLE_AUTH|SKIP_AUTH' -- deploy .github services/api/Dockerfile 2>/dev/null; then
  fail "authentication bypass flag found in deployable assets"
fi

echo "Security boundary checks passed."
