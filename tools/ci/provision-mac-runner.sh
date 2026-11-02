#!/usr/bin/env bash
# Run on the Mac. Creates only a dedicated isolated Linux machine; no runner service.
set -euo pipefail
orb create --isolated --isolate-network --memory 6G --cpus 4 --disk 40G ubuntu:24.04 irespond-ci
orb run -m irespond-ci sh -c '
  set -eu
  test ! -e /Users && test ! -e /mnt/mac
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl git jq libicu74 libssl3 docker.io gh unzip python3-pip python3-venv
  sudo usermod -aG docker "$USER"
  sudo systemctl enable --now docker
  mkdir -p "$HOME/runner"
  cd "$HOME/runner"
  curl -fL https://github.com/actions/runner/releases/download/v2.338.0/actions-runner-linux-arm64-2.338.0.tar.gz -o runner.tar.gz
  echo "628b4a7258487b80c1d3c221095a7ded349f5ae0175fd3dfab708d07428f041b  runner.tar.gz" | sha256sum -c -
  tar -xzf runner.tar.gz
'
python3 tools/ci/configure-runner-group.py
printf '%s\n' 'Ready. Start one ephemeral reviewed job with tools/ci/run-isolated-job.sh.'
