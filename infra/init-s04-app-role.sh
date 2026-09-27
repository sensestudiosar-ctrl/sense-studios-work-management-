#!/bin/sh
set -eu

: "${S04_APP_DB_PASSWORD:?Set S04_APP_DB_PASSWORD in the untracked environment file}"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_password="$S04_APP_DB_PASSWORD" \
  --set=database_name="$POSTGRES_DB" <<'SQL'
CREATE ROLE sense_app_runtime
  LOGIN PASSWORD :'app_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE :"database_name" TO sense_app_runtime;
SQL
