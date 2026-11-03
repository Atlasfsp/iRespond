# Logical restore verification boundary

The recovery script uses a new, uniquely named verification database. It rejects
source/destination equality, unrelated destination names and any existing scratch
database before destructive operations. It never forcibly terminates another session.
Cleanup retries only its newly created scratch database to tolerate a closing client.

For quiesced CI fixtures it compares table counts, migration counts/versions and
sorted JSONB row-content SHA-256 manifests for every public base table. Equal counts
alone cannot establish row integrity. A source write during the operation produces a
conservative mismatch; use a quiesced fixture. SQL/content-read failures fail closed.
Scratch dump/log paths are per-run, use restrictive permissions, and are removed on
success. Failed-operation diagnostics remain private in the disposable container.

This checks a logical dump/restore. It does not certify production topology, physical
PITR, failover, recovery objectives, encryption/key recovery or shared-storage durability.
Those require the canonical external gate owners and controlled production exercises.
