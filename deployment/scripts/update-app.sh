#!/bin/bash

# Quick update script for code changes
# This script pulls latest changes and restarts services without full redeployment

set -e

print_status() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

print_status "Updating Wheel of Life application..."

# Pull latest changes
cd /var/www/wheeloflife
print_status "Pulling latest changes from git..."
sudo -u wheelapp git pull origin main

# Update backend
print_status "Updating backend dependencies..."
cd backend
sudo -u wheelapp /var/www/wheeloflife/venv/bin/pip install -r requirements.txt

# Run migrations
print_status "Running database migrations..."
if [ -f "database/migrate.sql" ]; then
    # Read DB password from .env file
    DB_PASSWORD=$(grep DATABASE_URL .env | sed 's/.*wheelapp:\(.*\)@localhost.*/\1/')
    mysql -u wheelapp -p$DB_PASSWORD wheel_of_life < database/migrate.sql
fi

# Restart backend service
print_status "Restarting backend service..."
systemctl restart wheeloflife

# Update frontend
print_status "Building frontend..."
cd ../frontend
sudo -u wheelapp npm install
sudo -u wheelapp NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Deploy frontend build
print_status "Deploying frontend..."
sudo cp -r build/* /var/www/html/wheeloflife/

# Clear browser cache may be needed
print_status "Update completed!"
print_status "Note: Users may need to clear their browser cache to see updates"