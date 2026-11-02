# ADR-008: isolated, ephemeral trusted CI

Status: accepted for repository engineering; independent security approval pending.
Date: 2026-11-02.

Use the existing MacBook's disposable isolated Ubuntu ARM64 machine for Linux
integration tests. No Mac home shares, forwarded SSH agent, production credentials
or host Docker socket. Dedicated VM Docker access is root-equivalent inside that
VM and does not cross the host boundary. Run one job at a time.

GitHub runner group 4 is restricted to iRespond and explicitly reviewed workflow
and branch refs. Forks and unapproved refs cannot select a live runner. New domain
branches do not automatically join that allowlist. Local integration on those
branches is reported as local, not a passing required GitHub context.

Real trusted scheduler smoke 41388518495 passed. Required checks at e90b95b execute;
mandatory artifact uploads fail organization storage quota. Keep upload failures
and base-controlled documentation ownership checks intact. No paid billing
activation, synthetic success status, rule removal, auto-merge or admin bypass.

Bootstrap: `tools/ci/provision-mac-runner.sh`; ephemeral execution:
`tools/ci/run-isolated-job.sh`. Validate selected repositories after each group
update. Remove registration, workspace and task-owned VM after execution; retain
sanitized source-bound evidence. Explicitly reprovision rather than running a
persistent public-PR worker on the personal login. Original evidence and cleanup
receipts are in `build/evidence/completion/` (local, ignored).
