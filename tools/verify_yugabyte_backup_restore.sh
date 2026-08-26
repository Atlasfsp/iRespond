#!/usr/bin/env bash
set -euo pipefail

container="${YUGABYTE_CONTAINER:-irespond-yugabyte}"
source_db="${YUGABYTE_SOURCE_DB:-yugabyte}"
restore_db="${YUGABYTE_RESTORE_DB:-irespond_restore_verify}"

exec_yb() {
  docker exec "$container" bash -lc "$*"
}

source_tables="$(exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$source_db' -Atc \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'\"")"
source_migrations="$(exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$source_db' -Atc \"SELECT count(*) FROM schema_migrations\"")"

if [[ "$source_tables" -lt 1 || "$source_migrations" -lt 1 ]]; then
  echo "source database is not sufficiently initialized for recovery verification" >&2
  exit 1
fi

exec_yb "/home/yugabyte/bin/ysql_dump --host \$(hostname) -U yugabyte -d '$source_db' --no-owner --no-privileges --file=/tmp/irespond-restore-verify.sql"
exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d yugabyte -v ON_ERROR_STOP=1 -c \"DROP DATABASE IF EXISTS $restore_db\""
exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d yugabyte -v ON_ERROR_STOP=1 -c \"CREATE DATABASE $restore_db\""
exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$restore_db' -v ON_ERROR_STOP=1 --file=/tmp/irespond-restore-verify.sql >/tmp/irespond-restore.log"

restored_tables="$(exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$restore_db' -Atc \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'\"")"
restored_migrations="$(exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$restore_db' -Atc \"SELECT count(*) FROM schema_migrations\"")"

if [[ "$source_tables" != "$restored_tables" ]]; then
  echo "backup restore table mismatch: source=$source_tables restored=$restored_tables" >&2
  exit 1
fi
if [[ "$source_migrations" != "$restored_migrations" ]]; then
  echo "backup restore migration mismatch: source=$source_migrations restored=$restored_migrations" >&2
  exit 1
fi

source_versions="$(exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$source_db' -Atc \"SELECT version FROM schema_migrations ORDER BY version\"")"
restored_versions="$(exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d '$restore_db' -Atc \"SELECT version FROM schema_migrations ORDER BY version\"")"
if [[ "$source_versions" != "$restored_versions" ]]; then
  echo "backup restore migration-version mismatch" >&2
  exit 1
fi

exec_yb "/home/yugabyte/bin/ysqlsh --host \$(hostname) -U yugabyte -d yugabyte -v ON_ERROR_STOP=1 -c \"DROP DATABASE $restore_db\""

echo "YugabyteDB recovery verified: tables=$source_tables migrations=$source_migrations"
