#!/bin/sh
# entrypoint.sh

# Abort on any error
set -e

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Execute the main command (e.g., "npm start")
echo "Starting the application..."
exec "$@"