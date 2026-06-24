#!/bin/bash
set -e

echo "Starting deployment update..."

# Run tests first — fail fast if something's broken
echo "Running test suite..."
npm test

# Pull latest changes
echo "Pulling latest code..."
git pull

# Build and restart containers
# Build and restart containers
echo "Rebuilding and restarting containers..."
docker compose up -d --build --remove-orphans
docker compose restart nginx

# Run database migrations
echo "Running database migrations..."
# Wait a few seconds for the app to initialize if needed, though 'exec' usually waits for container start
sleep 5
docker compose exec -T app node scripts/run-migrations.js


# Cleanup unused images
echo "Cleaning up old images..."
docker image prune -f

echo "Deployment update complete!"
