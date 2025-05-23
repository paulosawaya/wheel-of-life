#!/bin/bash

DOMAIN=$1

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Setting up frontend..."
echo "Project root: $PROJECT_ROOT"
echo "Available memory:"
free -h

cd "$PROJECT_ROOT"

# Copy frontend files
cp -r frontend /var/www/wheeloflife/
cd /var/www/wheeloflife/frontend

# Create environment file
cat > .env << ENVEOF
REACT_APP_API_URL=https://$DOMAIN/api
ENVEOF

# IMPROVED: Install with memory optimizations
echo "Installing npm dependencies..."
sudo -u wheelapp npm ci

# IMPROVED: Build with increased memory and optimizations
echo "Building React application..."
sudo -u wheelapp NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Verify build was successful
if [ ! -d "build" ]; then
    echo "ERROR: Frontend build failed - no build directory created"
    exit 1
fi

# Copy build to web directory
mkdir -p /var/www/html/wheeloflife
cp -r build/* /var/www/html/wheeloflife/
chown -R www-data:www-data /var/www/html/wheeloflife

# Configure Apache
echo "Configuring Apache with domain: $DOMAIN"
export DOMAIN=$DOMAIN
envsubst '${DOMAIN}' < "$PROJECT_ROOT/deployment/apache.conf.template" > /etc/apache2/sites-available/wheeloflife.conf

a2ensite wheeloflife.conf
a2dissite 000-default.conf
systemctl reload apache2

echo "Frontend deployment completed for domain: $DOMAIN"
