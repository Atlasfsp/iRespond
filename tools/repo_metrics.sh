#!/usr/bin/env bash
set -euo pipefail

# Count authored source lines, excluding vendored/generated/lock/documentation artifacts.
# Populate arrays portably: macOS still ships Bash 3, which has no `mapfile`.
code_files=()
while IFS= read -r file; do
  code_files+=("$file")
done < <(find apps packages services infra -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.go' -o -name '*.sql' -o -name '*.yml' -o -name '*.yaml' -o -name '*.json' \) \
  ! -name 'pnpm-lock.yaml' ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/build/*' | sort)

loc=0
for f in "${code_files[@]}"; do
  lines=$(wc -l < "$f")
  loc=$((loc + lines))
done

screens=()
while IFS= read -r screen; do
  screens+=("$screen")
done < <(find apps/mobile/app -type f -name '*.tsx' ! -name '_layout.tsx' | sort)

echo "IRespond repository metrics"
echo "SOURCE_LOC=$loc"
echo "SOURCE_FILES=${#code_files[@]}"
echo "MOBILE_SCREENS=${#screens[@]}"
printf 'SCREEN=%s\n' "${screens[@]}"
