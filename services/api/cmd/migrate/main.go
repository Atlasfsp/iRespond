package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" { log.Fatal("DATABASE_URL is required") }
	migrationDir := strings.TrimSpace(os.Getenv("MIGRATION_DIR")); if migrationDir == "" { migrationDir = "migrations" }
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL); if err != nil { log.Fatal(err) }; defer pool.Close()
	if err := pool.Ping(ctx); err != nil { log.Fatalf("YugabyteDB/YSQL unavailable: %v", err) }
	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`); err != nil { log.Fatal(err) }
	entries, err := os.ReadDir(migrationDir); if err != nil { log.Fatal(err) }
	names := make([]string,0); for _,e := range entries { if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") { names=append(names,e.Name()) } }; sort.Strings(names)
	for _, name := range names {
		var exists bool; if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)`, name).Scan(&exists); err != nil { log.Fatal(err) }; if exists { continue }
		body, err := os.ReadFile(filepath.Join(migrationDir,name)); if err != nil { log.Fatal(err) }
		tx, err := pool.Begin(ctx); if err != nil { log.Fatal(err) }
		if _, err = tx.Exec(ctx,string(body)); err == nil { _,err=tx.Exec(ctx,`INSERT INTO schema_migrations(version) VALUES($1)`,name) }
		if err != nil { _=tx.Rollback(ctx); log.Fatalf("migration %s: %v",name,err) }
		if err=tx.Commit(ctx);err!=nil{log.Fatal(err)};fmt.Printf("applied %s\n",name)
	}
}
