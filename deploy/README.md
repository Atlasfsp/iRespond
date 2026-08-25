# iRespond deployment

The canonical runtime packaging is a portable OCI image plus Helm chart. SkyForge is the preferred NexoCloud deployment target, but the chart intentionally remains standard Kubernetes so the product is not locked to one control plane.

## Workloads

- **API** — mobile/web API, horizontally scalable.
- **Migration hook** — applies idempotent YugabyteDB/YSQL migrations before install/upgrade.
- **Outbox publisher** — publishes committed iRespond domain events to the shared SS-03 NATS/Redpanda plane.

## Required external configuration

The repository contains no production secret values. Before deployment an operator/platform must provide a secret named by the chart values containing `DATABASE_URL`, `NATS_URL`, `OBJECT_STORAGE_ACCESS_KEY`, and `OBJECT_STORAGE_SECRET_KEY`, plus non-secret OIDC/object-storage endpoint configuration.

The relational endpoint must be YugabyteDB/YSQL. Production identity is StratoID/OIDC; production authorization, geospatial, media/trust, notification, privacy and payment capabilities are integrated through the Shared Services contracts as they are completed and certified.

## Render

```bash
helm lint deploy/helm/irespond
helm template irespond deploy/helm/irespond \
  --set image.repository=registry.example/irespond-api \
  --set image.tag=sha-0123456789abcdef
```

## SkyForge handoff

SkyForge should deploy the rendered chart/release using an immutable image digest, inject secret references through its Vault integration, expose only the API service through the approved gateway, and retain deployment/rollback evidence. A successful chart render or CI image build is not evidence of a real SkyForge production deployment.
