# iRespond external GA certification handoff

## Purpose

Repository CI can prove source-controlled behavior, but it cannot truthfully prove app-store signing, real production infrastructure, independent penetration testing, provider onboarding, human safeguarding operations or an independent release verdict. This handoff defines the evidence required after the repository reaches a green immutable candidate.

The handoff must always use the exact source commit recorded in `build/evidence/ga/ga-candidate.json`. Do not silently rebuild from a later branch head.

## Candidate acceptance rule

A candidate may leave repository CI only when the same GitHub Actions run is green for all five permanent jobs:

1. `mobile`
2. `security-boundary`
3. `supply-chain`
4. `api`
5. `deployment`

The API job includes real YugabyteDB/YSQL integration, real RustFS S3 evidence integration, migration idempotency, YugabyteDB dump/restore verification, the HTTP load regression gate and a production Docker image build. The supply-chain job creates the release provenance bundle and GA candidate handoff bundle.

A green repository candidate is **READY FOR EXTERNAL CERTIFICATION**, not GA.

## Canonical production boundaries

- Relational system of record: **YugabyteDB/YSQL**.
- Object storage: **RustFS**, consumed through the standard AWS S3 API/SDK.
- Advanced geospatial operations: Shared Services **SS-44**.
- Identity: **StratoID/OIDC**.
- Authorization: **SS-13** policy decisions with fail-closed application behavior.
- Notifications: **SS-18**.
- Regulated money movement: **PayCore/licensed payment providers**; iRespond pledges are not settlement records.
- Deployment/runtime target: **SkyForge** using the checked-in Helm chart while retaining portable artifacts.
- Build/sign/distribution: **AppForge**.
- Independent release judgment: **Droplet**.

RustFS is the platform standard, but the current RustFS release line is still pre-1.0. Production certification therefore requires real multi-node/failure-domain, upgrade, retention and recovery evidence rather than relying on the single-node CI integration proof.

## AppForge handoff

Target repository: `Atlasfsp/NexoCloud_AppForge`.

Input:

- source repository: `Atlasfsp/iRespond`;
- exact candidate commit from `ga-candidate.json`;
- `apps/mobile`;
- `services/api`;
- `deploy/helm/irespond`;
- `build/evidence/release`;
- `build/evidence/ga`.

Required external evidence:

- reproducible mobile build from the exact candidate;
- Apple archive/signing evidence on an authorized Apple runner/account;
- Android bundle/signing evidence on an authorized Google/Android runner/account;
- artifact checksums tied back to the candidate commit;
- store privacy metadata and declarations;
- store or enterprise-distribution submission/acceptance evidence as applicable;
- failure evidence if any signing, packaging or distribution lane cannot complete.

AppForge must not mark a mobile platform certified when the required real runner, signing identity or store/provider access is absent.

## SkyForge handoff

Target repository: `Atlasfsp/NexoCloud-SkyForge`.

Deployment input:

- exact candidate commit;
- `deploy/helm/irespond`;
- production image built from the candidate and identified by immutable digest;
- externally provisioned secrets/identities for YugabyteDB, RustFS, StratoID and required Shared Services.

Required external evidence:

- successful staging deployment to a real target;
- `/livez` and `/readyz` behavior with dependencies healthy and unhealthy;
- migration execution against production-class YugabyteDB;
- RustFS connectivity over production TLS;
- canary rollout with real traffic/smoke checks;
- rollback to the prior immutable revision;
- PDB/HPA/NetworkPolicy behavior under the target Kubernetes/runtime environment;
- DNS/TLS and SS-07 gateway connectivity;
- SS-06 observability ingestion;
- dated incident/rollback records rather than screenshots without source/revision identity.

## Droplet handoff

Target repository: `abiolaogu/Droplet`.

Droplet's documented public release-evaluation operation is:

`POST /api/v1/projects/{id}/releases/evaluate`

All `/api/v1` operations require tenant context, and mutations require `Idempotency-Key`. A `409` response can be a valid policy decision such as `MERGE BLOCKED` or `DO_NOT_SHIP`; the response body must be retained as release evidence rather than treated as a transport error.

Required input:

- exact source commit/tree;
- release and GA evidence bundles;
- repository workflow results;
- dependency/vulnerability evidence;
- load-regression evidence;
- deployment artifact identity;
- AppForge/SkyForge evidence when those lanes are available.

Required outcome:

- independent quality graph/evidence;
- explicit release verdict;
- no unresolved `MERGE BLOCKED` or `DO_NOT_SHIP` decision before GA.

## Production data-platform certification

### YugabyteDB

Repository CI proves YSQL compatibility and logical dump/restore. Production evidence must additionally prove TLS, the selected multi-zone/region topology, backup/PITR policy, monitoring, failover behavior and a dated restore exercise on production-class infrastructure.

### RustFS

Repository CI proves the application's actual signed PUT/HEAD/GET flow, create-only evidence uploads, SHA-256 binding and signed readback. Production evidence must additionally prove TLS, intended multi-node/erasure configuration, durability/failure-domain behavior, lifecycle/retention policy, upgrades and backup/recovery procedures.

## Security, legal and operational certification

The launch owner must attach evidence for the remaining entries in `config/ga/external-gates.json`, including independent penetration testing, privacy/legal review, safeguarding operations, payment-provider controls, real-device accessibility/low-bandwidth testing, incident/abuse response exercises and launch support ownership.

No one should convert a missing external result into PASS by editing the ledger. The correct state is BLOCKED until dated evidence exists or an authorized launch decision explicitly removes that capability from launch scope.

## Final GA decision

GA can be declared only when:

- the immutable repository candidate remains green;
- AppForge, SkyForge and Droplet evidence points to that same candidate;
- every launch-scope external gate has dated evidence and named ownership;
- any residual risk is explicitly accepted by the appropriate human owner;
- no unresolved independent `DO_NOT_SHIP`/`MERGE BLOCKED` decision exists.
