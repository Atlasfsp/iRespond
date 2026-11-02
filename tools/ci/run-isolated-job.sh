#!/usr/bin/env bash
# Host-side controller. Token is streamed directly to the isolated machine.
set -euo pipefail
machine=irespond-ci
runner_name=irespond-isolated-release
labels="irespond-isolated${IRESPOND_RUNNER_EXTRA_LABEL:+,$IRESPOND_RUNNER_EXTRA_LABEL}"
orb run -m "$machine" sh -c 'test "$(uname -s)" = Linux && test ! -e /Users && test ! -e /mnt/mac && test -x "$HOME/runner/config.sh"'
gh api --method POST repos/Atlasfsp/iRespond/actions/runners/registration-token --jq .token |
  orb run -m "$machine" sh -c 'read -r registration_token; cd "$HOME/runner"; ./config.sh --unattended --ephemeral --disableupdate --url https://github.com/Atlasfsp/iRespond --token "$registration_token" --name "$1" --labels "$2" --work _work' sh "$runner_name" "$labels"
orb run -m "$machine" sh -c 'cd "$HOME/runner"; timeout 3600 ./run.sh'
# Ephemeral registration disappears automatically. Retain diagnostics, not checkout.
orb run -m "$machine" sh -c 'test ! -f "$HOME/runner/.runner" && rm -rf "$HOME/runner/_work"'
