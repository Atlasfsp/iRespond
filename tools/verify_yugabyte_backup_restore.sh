#!/usr/bin/env bash
set -euo pipefail

container="${YUGABYTE_CONTAINER:-irespond-yugabyte}"
source_db="${YUGABYTE_SOURCE_DB:-yugabyte}"
restore_db="${YUGABYTE_RESTORE_DB:-irespond_restore_verify_$$}"

# Never let verification overwrite the source, a system database or an unrelated
# database. A scratch destination must not already exist, even in this namespace.
[[ "$source_db" =~ ^[a-z_][a-z0-9_]*$ ]] || { echo 'invalid source database name' >&2; exit 1; }
[[ "$restore_db" =~ ^irespond_restore_verify(_[a-z0-9]+)?$ ]] || { echo 'restore destination must use the verification scratch namespace' >&2; exit 1; }
[[ "$restore_db" != "$source_db" ]] || { echo 'restore destination cannot equal source' >&2; exit 1; }

dump_path="/tmp/${restore_db}.sql"
restore_log="/tmp/${restore_db}.log"

exec_yb() { docker exec "$container" bash -lc "$*"; }
query() { exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$1' -v ON_ERROR_STOP=1 -Atc \"$2\""; }

created=false
cleanup() {
  local code=$?
  trap - EXIT
  if [[ "$created" = true ]]; then
    local removed=false
    for attempt in {1..10}; do
      if query yugabyte "DROP DATABASE $restore_db"; then removed=true; break; fi
      sleep 1
    done
    if [[ "$removed" != true ]]; then
      echo "unable to remove owned scratch database $restore_db; no sessions were force-terminated" >&2
      code=1
    fi
  fi
  if [[ "$code" = 0 ]]; then exec_yb "rm -f '$dump_path' '$restore_log'"; fi
  exit "$code"
}
trap cleanup EXIT

existing="$(query yugabyte "SELECT count(*) FROM pg_database WHERE datname='$restore_db'")"
[[ "$existing" = 0 ]] || { echo 'restore destination already exists; refusing overwrite' >&2; exit 1; }
source_tables="$(query "$source_db" "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")"
source_migrations="$(query "$source_db" 'SELECT count(*) FROM schema_migrations')"
[[ "$source_tables" -gt 0 && "$source_migrations" -gt 0 ]] || { echo 'source database is not initialized for recovery verification' >&2; exit 1; }

content_manifest() {
  local database="$1" tables table digest
  tables="$(query "$database" "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")" || return 1
  while IFS= read -r table; do
    [[ "$table" =~ ^[a-z_][a-z0-9_]*$ ]] || return 1
    digest="$(exec_yb "set -o pipefail; /home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$database' -v ON_ERROR_STOP=1 -Atc \"COPY (SELECT to_jsonb(t)::text FROM public.\\\"$table\\\" t ORDER BY to_jsonb(t)::text) TO STDOUT\" | sha256sum | cut -d ' ' -f 1")" || return 1
    [[ "$digest" =~ ^[0-9a-f]{64}$ ]] || return 1
    printf '%s|%s\n' "$table" "$digest"
  done <<< "$tables"
}

# Quiesced logical fixtures only. A concurrent source write causes a conservative
# mismatch; this is not a production snapshot/PITR or durability certification.
source_manifest="$(content_manifest "$source_db")"
source_versions="$(query "$source_db" 'SELECT version FROM schema_migrations ORDER BY version')"
exec_yb "umask 077; /home/yugabyte/postgres/bin/ysql_dump --host \$(hostname) -U yugabyte -d '$source_db' --no-owner --no-privileges --file='$dump_path'"
query yugabyte "CREATE DATABASE $restore_db"
created=true
exec_yb "umask 077; /home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$restore_db' -v ON_ERROR_STOP=1 --file='$dump_path' >'$restore_log'"

restored_tables="$(query "$restore_db" "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")"
restored_migrations="$(query "$restore_db" 'SELECT count(*) FROM schema_migrations')"
restored_versions="$(query "$restore_db" 'SELECT version FROM schema_migrations ORDER BY version')"
[[ "$source_tables" = "$restored_tables" && "$source_migrations" = "$restored_migrations" && "$source_versions" = "$restored_versions" ]] || { echo 'backup restore schema/migration mismatch' >&2; exit 1; }
restored_manifest="$(content_manifest "$restore_db")"
[[ "$source_manifest" = "$restored_manifest" ]] || { echo 'backup restore row-content mismatch' >&2; exit 1; }
echo "YugabyteDB logical recovery verified: tables=$source_tables migrations=$source_migrations rowContent=equal"
