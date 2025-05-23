#!/bin/bash

# This script handles the deployment of the frontend application.
# It takes the domain name as the first argument.

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to print colored status messages
print_status() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}
print_warning() {
    echo -e "\033[0;33m[WARNING]\033[0m $1"
}
print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}


# Check if domain name is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <your_domain.com>"
    print_error "No domain name provided. Exiting."
    exit 1
fi

DOMAIN=$1 # Domain is the first argument to the script

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)" # Assumes script is in deployment/scripts

print_status "Setting up frontend for domain: $DOMAIN"
print_status "Project root: $PROJECT_ROOT"

# --- Stage 1: Prepare frontend source directory for build ---
FRONTEND_BUILD_SOURCE_DIR="/var/www/wheeloflife/frontend"

print_status "Ensuring frontend build source directory exists: $FRONTEND_BUILD_SOURCE_DIR"
sudo mkdir -p "$FRONTEND_BUILD_SOURCE_DIR"
sudo chown -R wheelapp:wheelapp "/var/www/wheeloflife"

print_status "Copying frontend source files from $PROJECT_ROOT/frontend to $FRONTEND_BUILD_SOURCE_DIR..."
sudo rsync -a --delete "$PROJECT_ROOT/frontend/" "$FRONTEND_BUILD_SOURCE_DIR/"

print_status "Setting ownership of $FRONTEND_BUILD_SOURCE_DIR to wheelapp:wheelapp..."
sudo chown -R wheelapp:wheelapp "$FRONTEND_BUILD_SOURCE_DIR"

# --- Stage 2: Build the React Application ---
cd "$FRONTEND_BUILD_SOURCE_DIR"

print_status "Creating frontend .env file with REACT_APP_API_URL=https://$DOMAIN/api..."
cat > .env << ENVEOF
REACT_APP_API_URL=https://$DOMAIN/api
ENVEOF
sudo chown wheelapp:wheelapp .env

print_status "Installing npm dependencies as user 'wheelapp' using 'npm install'..."
sudo -u wheelapp npm install

print_status "Building React application as user 'wheelapp' with PUBLIC_URL=https://$DOMAIN..."
export PUBLIC_URL="https://$DOMAIN" # Set PUBLIC_URL for the build
sudo -u wheelapp NODE_OPTIONS="--max-old-space-size=4096" npm run build
unset PUBLIC_URL # Unset after build

if [ ! -d "build" ]; then
    print_error "Frontend build failed - no 'build' directory created in $FRONTEND_BUILD_SOURCE_DIR/"
    exit 1
fi
print_status "Frontend build successful. Output in $FRONTEND_BUILD_SOURCE_DIR/build/"

# --- Stage 3: Deploy built files to Apache's DocumentRoot ---
APACHE_DOC_ROOT="/var/www/html/wheeloflife"

print_status "Ensuring Apache document root exists: $APACHE_DOC_ROOT"
sudo mkdir -p "$APACHE_DOC_ROOT"

print_status "Copying built files from $FRONTEND_BUILD_SOURCE_DIR/build to $APACHE_DOC_ROOT..."
sudo cp -r "$FRONTEND_BUILD_SOURCE_DIR/build/"* "$APACHE_DOC_ROOT/"
sudo chown -R www-data:www-data "$APACHE_DOC_ROOT"
print_status "Built files copied to $APACHE_DOC_ROOT and permissions set."

# --- Stage 4: Configure Apache ---
APACHE_CONF_TEMPLATE="$PROJECT_ROOT/deployment/apache.conf.template"
APACHE_SITE_CONF="/etc/apache2/sites-available/$DOMAIN.conf"

if [ -f "$APACHE_CONF_TEMPLATE" ]; then
    print_status "Configuring Apache virtual host for $DOMAIN using template $APACHE_CONF_TEMPLATE..."
    
    # Export the DOMAIN variable so envsubst can use it.
    # The template file (apache.conf.template) should use ${DOMAIN} as the placeholder.
    export DOMAIN 
    sudo DOMAIN="$DOMAIN" sh -c 'envsubst "\${DOMAIN}" < "$APACHE_CONF_TEMPLATE" > "$APACHE_SITE_CONF"'
    # Unset DOMAIN if it's important to remove it from the environment after this command.
    # For this script, it's likely fine as $DOMAIN is a script parameter.
    # unset DOMAIN

    print_status "Enabling Apache site $DOMAIN.conf..."
    # Use a2ensite -q to suppress "Site ... already enabled" if it's run multiple times.
    sudo a2ensite -q "$DOMAIN.conf" 
    
    if [ -f "/etc/apache2/sites-available/000-default.conf" ]; then
        if [ -L "/etc/apache2/sites-enabled/000-default.conf" ]; then
            print_status "Disabling default Apache site..."
            sudo a2dissite -q 000-default.conf
        fi
    fi
    print_status "Restarting Apache configuration..."
    # Use restart to ensure Apache starts if it was stopped or applies changes if running.
    sudo systemctl restart apache2 
else
    print_warning "Apache configuration template not found at $APACHE_CONF_TEMPLATE. Skipping Apache VHost setup."
    print_warning "You may need to configure Apache manually to serve from $APACHE_DOC_ROOT for domain $DOMAIN."
fi

print_status "Frontend deployment completed successfully for domain: $DOMAIN"
