#!/usr/bin/env bash
set -euo pipefail

rendered="${1:-}"
if [[ -z "$rendered" || ! -s "$rendered" ]]; then
  echo "rendered Helm manifest is required" >&2
  exit 1
fi

require() {
  local pattern="$1"
  local message="$2"
  if ! grep -Eq "$pattern" "$rendered"; then
    echo "deployment contract missing: $message" >&2
    exit 1
  fi
}

require 'path: /readyz' 'readiness must use fail-closed /readyz'
require 'path: /livez' 'startup/liveness must use /livez'
require 'maxUnavailable: 0' 'rolling updates must preserve available replicas'
require 'maxSurge: 1' 'rolling updates must permit one surge replica'
require 'kind: PodDisruptionBudget' 'voluntary disruptions must be availability-bounded'
require 'prometheus.io/scrape: "true"' 'SS-06 scrape discovery annotation'
require 'name: MAX_REQUEST_BODY_BYTES' 'gateway body limit must be deploy-time configurable'
require 'name: REQUESTS_PER_MINUTE' 'gateway request limit must be deploy-time configurable'
require 'kind: HorizontalPodAutoscaler' 'API must have an autoscaling contract'
require 'averageUtilization: 70' 'HPA CPU target must render from GA defaults'
require 'kind: NetworkPolicy' 'API ingress must be isolated'
require 'policyTypes:' 'network policy must declare policy types'
require '^- Ingress$|[[:space:]]- Ingress' 'network policy must apply ingress isolation'

ready_count=$(grep -Ec 'path: /readyz' "$rendered")
live_count=$(grep -Ec 'path: /livez' "$rendered")
if [[ "$ready_count" -ne 1 || "$live_count" -lt 2 ]]; then
  echo "unexpected probe topology: readyz=$ready_count livez=$live_count" >&2
  exit 1
fi

if grep -Eq 'policyTypes:.*Egress' "$rendered"; then
  echo "default network policy must not impose provider-specific egress restrictions" >&2
  exit 1
fi

echo "deployment contract verified"
