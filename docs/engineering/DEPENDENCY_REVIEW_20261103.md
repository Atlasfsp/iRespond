# Dependency review — 3 November 2026

The source review used a pinned local govulncheck v1.9.0 (official Go vulnerability database) and the pinned pnpm runtime's production audit. These are dependency/static checks, not an independent penetration test or production certification.

At feature source 89fdd6e / merge 4361184, the Go scan reported 18 advisory matches at module level in `github.com/klauspost/compress v1.18.0` and `golang.org/x/crypto v0.51.0`. No vulnerable call paths were reported as reachable. The production JavaScript audit reported zero high/critical, three moderate and one low finding; this is a different scope from GitHub's older default-main alert count.

Compatible stable updates: compress v1.18.7 and x/crypto v0.58.0, plus the selected x/sync v0.24.0, x/sys v0.49.0 and x/text v0.43.0. Go stays pinned to 1.26.10. No architecture, authentication authority or domain behavior is intentionally changed. Canonical module sums are retained in go.sum.

The post-update Darwin/ARM64 and Linux/ARM64 (CGO disabled, matching the production target) scans each report one remaining module-level advisory, GO-2026-5932, concerning unused/unmaintained OpenPGP. No vulnerable call path is reported. The advertised upstream fix is a later pseudoversion; this increment retains the verified stable release rather than silently introducing an unreleased commit or suppressing the finding. This is not a claim of zero advisories. See the official record: https://pkg.go.dev/vuln/GO-2026-5932 .

Linux/ARM64 static analysis completed with no called findings. Complete race tests against isolated YugabyteDB/RustFS, vet and dependency verification are tracked in the execution ledger before merge. Native Maven/NDK dependencies and physical-device behavior are outside the npm/Go scan scope and remain native release gates. Main remains protected and ga=false.

The npm audit still lists low-severity deepmerge with no patched version in its report, and moderate minimatch/glob findings whose advertised fixes require major versions 11/14. They remain visible; this increment does not force incompatible SDK transitive upgrades or suppress advisories. A supported Expo dependency migration and native acceptance are separate work.
