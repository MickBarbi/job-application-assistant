#!/bin/sh
set -eu

mkdir -p "${STORAGE_DIR:-/data/storage}"
npx prisma db push --skip-generate

exec "$@"
