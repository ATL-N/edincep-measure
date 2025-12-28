#!/bin/sh
# Exit immediately if a command exits with a non-zero status.
set -e

# 1. Wait for the database to be ready
# The `measuremate-db` host is the name of the service in docker-compose.yml
echo "Waiting for database to be ready..."
export PGPASSWORD="$DB_PASSWORD"
ATTEMPTS=0
MAX_ATTEMPTS=20
while ! psql -h "measuremate-db" -U "$DB_USER" -d "$DB_NAME" -c '\q' > /dev/null 2>&1;
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

# 2. Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# 3. Seed the database if needed
echo "Seeding database..."
# The seed script should be idempotent, so it's safe to run every time.
npx prisma db seed

# Unset the password variable for security
unset PGPASSWORD

# 4. Start the Next.js application
echo "Starting Next.js standalone server on port 3009..."
# The server is located in the root of the standalone output
exec node server.js