# iRespond Supply-Chain Policy

## Release rule

A release candidate is not eligible for merge or promotion when any of the following is true:

- the committed pnpm lockfile cannot satisfy a frozen install;
- `go mod tidy` changes committed `go.mod` or `go.sum`;
- Go module checksum verification fails;
- `pnpm audit --prod --audit-level high` reports a blocking production advisory;
- the official `govulncheck` scan finds a reachable known vulnerability;
- dependency inventory evidence cannot be generated.

Every vulnerability and dependency gate must execute against the exact candidate head SHA being considered for promotion. Passing evidence from an earlier workflow snapshot is not reusable as approval for a later head.

## Evidence

CI emits dependency evidence containing the resolved Go module graph, resolved pnpm workspace graph, tool versions, manifest SHA-256 values, source repository and candidate Git SHA. Evidence is retained with the workflow run and must be associated with the candidate reviewed by the independent release gate. The GitHub workflow head SHA and the candidate SHA inside dependency evidence must match.

## Workflow-control bootstrap

Changes that introduce a new `pull_request` workflow job cannot prove that new job from the same PR when the default branch does not yet contain that workflow definition. Such a workflow-control change may only merge after all previously-established gates pass and the workflow file has been reviewed for least privilege. The immediate `main` push run is then the acceptance test for the newly introduced gate. No subsequent release candidate is eligible for promotion until that main run proves the new job.

## Exceptions

There is no silent vulnerability ignore mechanism in the repository. A future exception must be explicit, time-bounded, linked to an approved risk record, describe exploitability and compensating controls, identify an owner and expiry, and remain visible to the independent release gate.

## Tooling

The Go vulnerability lane uses the official Go vulnerability scanner (`govulncheck`) and the Go vulnerability database. JavaScript production dependencies are checked through the pnpm audit interface. Tool versions used by required CI are pinned or otherwise captured in evidence.
