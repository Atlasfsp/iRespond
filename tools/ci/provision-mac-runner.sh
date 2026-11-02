#!/usr/bin/env bash
# Run on the Mac. Creates only a dedicated isolated Linux machine; no runner service.
set -euo pipefail
orb create --isolated --isolate-network --memory 6G --cpus 4 --disk 40G ubuntu:24.04 irespond-ci
orb run -m irespond-ci sh -c '
  set -eu
  test ! -e /Users && test ! -e /mnt/mac
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl git jq libicu74 libssl3 docker.io docker-buildx fuse-overlayfs gh unzip python3-pip python3-venv
  sudo usermod -aG docker "$USER"
  printf "%s\n" "{\"features\":{\"containerd-snapshotter\":false},\"storage-driver\":\"fuse-overlayfs\"}" | sudo tee /etc/docker/daemon.json >/dev/null
  sudo systemctl enable --now docker
  sudo systemctl restart docker
  printf "store-dir=%s/.cache/irespond-pnpm-store\nnetwork-concurrency=4\nfetch-retries=5\nfetch-timeout=120000\n" "$HOME" > "$HOME/.npmrc"
  mkdir -p "$HOME/runner"
  cd "$HOME/runner"
  curl -fL https://github.com/actions/runner/releases/download/v2.338.0/actions-runner-linux-arm64-2.338.0.tar.gz -o runner.tar.gz
  echo "628b4a7258487b80c1d3c221095a7ded349f5ae0175fd3dfab708d07428f041b  runner.tar.gz" | sha256sum -c -
  tar -xzf runner.tar.gz
  go_target="$HOME/runner/_work/_tool/go/1.26.10/arm64"
  mkdir -p "$go_target"
  curl -4 -fL --retry 3 --retry-all-errors --connect-timeout 15 --max-time 600 -C - https://go.dev/dl/go1.26.10.linux-arm64.tar.gz -o /tmp/irespond-go.tar.gz
  echo "3f4227ce7b206a513e794f1393adb473a07b46e94d18bd15d1c684bbb7319797  /tmp/irespond-go.tar.gz" | sha256sum -c -
  tar -xzf /tmp/irespond-go.tar.gz --strip-components=1 -C "$go_target"
  "$go_target/bin/go" version
  touch "${go_target}.complete"
'
orb run -m irespond-ci python3 - < tools/ci/verify-docker-whiteouts.py
python3 tools/ci/configure-runner-group.py
printf '%s\n' 'Ready. Start one ephemeral reviewed job with tools/ci/run-isolated-job.sh.'
