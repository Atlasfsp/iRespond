#!/usr/bin/env bash
set -euo pipefail
for script in tools/ci/*.sh; do bash -n "$script"; done
node --check apps/web/app.js
node --check apps/web/stitch-catalog.js
node --experimental-strip-types --test --test-concurrency="${IRESPOND_TEST_CONCURRENCY:-1}" tools/ci/*.test.mjs
python3 -m unittest discover -s tools/ci -p 'test_*.py'
for check in fieldwork_design horizon_experience web_frontend frontend_api_coverage frontend_execution frontend_reachability frontend_authorization; do
  node "tools/verify_${check}.mjs"
done
node --experimental-strip-types tools/offline_demo.test.mjs
python3 tools/verify_openapi_contract.py
bash tools/security_boundary.sh
bash tools/verify_ci_runtime_pins.sh
