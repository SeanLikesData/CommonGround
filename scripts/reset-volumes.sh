#!/usr/bin/env bash
set -euo pipefail

# Stop services and delete all docker compose volumes for this project.
# This wipes MongoDB and Neo4j data — there is no undo.

cd "$(dirname "$0")/.."

read -r -p "This will delete all MongoDB and Neo4j data. Continue? [y/N] " reply
case "$reply" in
  y|Y|yes|YES) ;;
  *) echo "Aborted."; exit 1 ;;
esac

docker compose down -v
echo "Volumes removed."
