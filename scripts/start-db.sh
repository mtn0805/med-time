#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose up -d mongo
for attempt in $(seq 1 30); do
  if docker compose exec -T mongo mongosh --quiet --eval 'try { rs.status(); } catch (error) { if (error.code === 94) { rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]}); } else { throw error; } }' >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo 'MongoDB did not become available for initialization.' >&2
    exit 1
  fi
  sleep 1
done
for attempt in $(seq 1 30); do
  if docker compose exec -T mongo mongosh --quiet --eval 'quit(db.hello().isWritablePrimary ? 0 : 1)' >/dev/null 2>&1; then
    echo 'MongoDB rs0 primary is ready.'
    exit 0
  fi
  sleep 1
done
echo 'MongoDB replica set did not elect a primary.' >&2
exit 1
