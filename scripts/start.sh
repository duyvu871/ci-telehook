#!/bin/bash
set -e

echo "🚀 Starting application..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until npx prisma db push --skip-generate; do
  echo "Database is not ready yet. Retrying in 5 seconds..."
  sleep 5
done

echo "✅ Database schema synchronized"

# Start the application
echo "🎯 Starting Node.js application..."
exec "$@"
