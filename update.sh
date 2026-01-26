#!/bin/bash

echo "Starting deployment update..."

# Pull latest changes
echo "Pulling latest code..."
git pull

# Build and restart containers
echo "Rebuilding and restarting containers..."
docker-compose up -d --build --remove-orphans

# Cleanup unused images
echo "Cleaning up old images..."
docker image prune -f

echo "Deployment update complete!"
