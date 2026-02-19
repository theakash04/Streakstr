#!/bin/sh
set -e

echo "Running database migrations..."
npm run db:generate
npm run db:migrate

echo "Migrations complete. Starting application..."
exec "$@"
