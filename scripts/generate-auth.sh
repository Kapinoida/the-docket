#!/bin/bash

# Ensure nginx directory exists
mkdir -p nginx

HTPASSWD_FILE="nginx/.htpasswd"

if [ -f "$HTPASSWD_FILE" ]; then
    echo "Warning: $HTPASSWD_FILE already exists."
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

read -p "Enter username: " USERNAME
read -s -p "Enter password: " PASSWORD
echo

# Check if htpasswd command exists locally
if command -v htpasswd &> /dev/null; then
    htpasswd -bc "$HTPASSWD_FILE" "$USERNAME" "$PASSWORD"
else
    # Fallback to docker if local command missing, or python/perl if preferred
    # Using python for portability without needing apache2-utils or docker run overhead if not needed, 
    # but docker is safer bet in this context since user has docker.
    echo "Using Docker to generate hash..."
    if ! docker run --rm --entrypoint htpasswd httpd:alpine -bn "$USERNAME" "$PASSWORD" > "$HTPASSWD_FILE"; then
         echo "Docker failed. Trying python fallback..."
         # Simple crypt fallback (might be weak on some systems but standard for basic auth)
         python3 -c "import crypt; print('${USERNAME}:' + crypt.crypt('${PASSWORD}', crypt.mksalt(crypt.METHOD_SHA512)))" > "$HTPASSWD_FILE"
    fi
fi

echo "Credentials generated in $HTPASSWD_FILE"
