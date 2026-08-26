# iRespond Runtime SLOs and Observability

## Boundary

iRespond owns the application signals required to operate and diagnose the service. SS-06 / VRQGO remains the shared platform for fleet-level metrics, traces, log indexing, alert routing and SLO aggregation. iRespond exposes standards-compatible signals for that platform to scrape and correlate; it does not create a competing telemetry backend.

## Runtime endpoints

- `GET /livez` proves the process can serve HTTP. It deliberately does not depend on downstream services and is suitable for Kubernetes liveness probes.
- `GET /readyz` fails closed when the relational store, identity, evidence or project plane is unavailable/unconfigured. It is suitable for readiness and traffic admission.
- `GET /metrics` exposes Prometheus-compatible application runtime, readiness, dependency-configuration and build-identity metrics.
- `GET /version` exposes build/version metadata for release correlation.

`/healthz` remains a lightweight service health endpoint for compatibility. Deployment systems should use `/livez` for process liveness and `/readyz` for traffic readiness.

## Initial GA service objectives

These are service objectives, not claims of achieved production availability before production telemetry exists.

| Signal | GA objective | Measurement source |
|---|---:|---|
| API availability | 99.9% monthly | successful edge/API requests aggregated by SS-06 |
| Readiness availability | 99.95% while release is intended to serve | `/readyz` probes |
| Core read API latency | p95 < 500 ms, p99 < 1,000 ms | gateway/application request telemetry |
| Core write API latency | p95 < 800 ms, p99 < 1,500 ms | gateway/application request telemetry |
| Server error ratio | < 0.5% over 5-minute windows | 5xx / total request telemetry |
| Safety-report persistence | 99.95% successful accepted writes | application + YugabyteDB telemetry |
| Evidence initiation | 99.9% successful accepted requests | application + object-storage telemetry |

Synthetic, load and production evidence must be attached before any document describes these objectives as achieved SLO performance.

## Prometheus metrics

The application currently exposes:

- `irespond_runtime_ready` — 1 only when required runtime planes are configured and traffic-ready.
- `irespond_runtime_dependency_configured{dependency,implementation}` — fail-closed configuration state for each required plane.
- `irespond_process_uptime_seconds` — process uptime.
- `irespond_build_info{version,git_sha}` — running build identity.

Request-rate, latency and error histograms should be introduced with the gateway/telemetry correlation slice so they share consistent route cardinality and trace/request identifiers with SS-07 and SS-06 rather than creating uncontrolled labels locally.

## Alerting expectations

The shared observability plane should page on sustained readiness failure, high 5xx ratio, severe latency burn, failed migration/release probes and safety-report persistence failure. Single transient failures should be recorded without creating alert storms. Multi-window burn-rate alerts are preferred for availability/latency SLOs.

## Release evidence

Every release candidate should expose a non-unknown `GIT_SHA` and an explicit `APP_VERSION` in promoted environments. Runtime dashboards and incident evidence must retain those dimensions so regressions can be tied to a release and rolled back through the deployment plane.
