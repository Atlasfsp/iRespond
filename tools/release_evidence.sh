#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${1:-$root/build/evidence/release}"
rm -rf "$out"
mkdir -p "$out/bin" "$out/chart" "$out/inventory"

source_sha="$(git -C "$root" rev-parse HEAD)"
source_tree="$(git -C "$root" rev-parse HEAD^{tree})"
source_time="$(git -C "$root" show -s --format=%cI HEAD)"

cat > "$out/source.json" <<EOF
{
  "repository": "Atlasfsp/iRespond",
  "commit": "$source_sha",
  "tree": "$source_tree",
  "commitTime": "$source_time",
  "goToolchain": "$(cd "$root/services/api" && go version | sed 's/"/\\"/g')",
  "nodeVersion": "$(node --version)",
  "pnpmVersion": "$(pnpm --version)",
  "helmVersion": "$(helm version --short | sed 's/"/\\"/g')"
}
EOF

pushd "$root/services/api" >/dev/null
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X main.version=verify -X main.commit=$source_sha" -o "$out/bin/irespond-api-linux-amd64" ./cmd/server
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -o "$out/bin/irespond-migrate-linux-amd64" ./cmd/migrate
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -o "$out/bin/irespond-outbox-publisher-linux-amd64" ./cmd/outbox-publisher
go list -m all > "$out/inventory/go-modules.txt"
go version -m "$out/bin/irespond-api-linux-amd64" > "$out/inventory/api-buildinfo.txt"
popd >/dev/null

pushd "$root" >/dev/null
pnpm list --prod --depth Infinity --json > "$out/inventory/pnpm-production.json"
grep -E '^FROM ' services/api/Dockerfile > "$out/inventory/container-base-images.txt"
helm package deploy/helm/irespond --destination "$out/chart" >/dev/null
popd >/dev/null

(
  cd "$out"
  find bin chart inventory -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
  sha256sum source.json >> SHA256SUMS
)

python3 - "$out" <<'PY'
import hashlib, json, pathlib, sys
out = pathlib.Path(sys.argv[1])
entries = []
for path in sorted(p for p in out.rglob('*') if p.is_file() and p.name not in {'release-manifest.json'}):
    data = path.read_bytes()
    entries.append({
        'path': path.relative_to(out).as_posix(),
        'sha256': hashlib.sha256(data).hexdigest(),
        'bytes': len(data),
    })
manifest = {
    'schema': 'irespond.release-evidence/v1',
    'artifacts': entries,
}
(out / 'release-manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n')
PY

echo "release evidence generated at $out"
