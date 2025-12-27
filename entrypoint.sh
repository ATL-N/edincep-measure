#!/bin/sh
# Exit immediately if a command exits with a non-zero status.
set -e

# 1. Wait for the database to be ready
echo "Waiting for database to be ready..."
export PGPASSWORD="$DB_PASSWORD" # PGPASSWORD is used by psql
ATTEMPTS=0
MAX_ATTEMPTS=20
# DB_HOST, DB_USER, DB_NAME are expected as environment variables from docker-compose.yml
while ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' > /dev/null 2>&1;
do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    echo "Database is not ready after $MAX_ATTEMPTS attempts. Exiting."
    exit 1
  fi
  echo "Database is not ready. Retrying in 3 seconds..."
  sleep 3
done
echo "Database is ready."

# Unset the password after use for security
unset PGPASSWORD

# 2. Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# 3. Start the Next.js application (the command is passed from the Dockerfile's CMD)
echo "Starting the application..."
exec "$@"
