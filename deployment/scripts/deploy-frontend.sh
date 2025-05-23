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

DOMAIN=$1

# Get absolute paths
# SCRIPT_DIR: The directory where this script (deploy-frontend.sh) is located.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# PROJECT_ROOT: The root directory of the project (assumed to be two levels up from SCRIPT_DIR).
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)" # Adjust if your script is elsewhere

print_status "Setting up frontend for domain: $DOMAIN"
print_status "Project root: $PROJECT_ROOT"
print_status "Script directory: $SCRIPT_DIR"

# --- Stage 1: Prepare frontend source directory for build ---
# This is where the frontend code from your Git repo will be copied to and built.
# The 'wheelapp' user needs to own this directory to run npm commands without permission issues.
FRONTEND_BUILD_SOURCE_DIR="/var/www/wheeloflife/frontend"

print_status "Ensuring frontend build source directory exists: $FRONTEND_BUILD_SOURCE_DIR"
sudo mkdir -p "$FRONTEND_BUILD_SOURCE_DIR"
# Ensure wheelapp owns the parent directory structure if it was just created by root's mkdir.
# This chown is important for the rsync step if wheelapp needs to write into parts of it,
# though rsync is run with sudo here. The most critical chown is for the actual
# $FRONTEND_BUILD_SOURCE_DIR after files are copied.
sudo chown -R wheelapp:wheelapp "/var/www/wheeloflife" # Make sure parent is accessible if needed

print_status "Copying frontend source files from $PROJECT_ROOT/frontend to $FRONTEND_BUILD_SOURCE_DIR..."
# Use rsync for efficient copying.
# -a: archive mode (preserves permissions, ownership*, links, etc.)
# --delete: removes files in destination if they don't exist in source
# *Ownership preservation with -a when rsync is run as root can be tricky.
#  It might try to preserve source ownership. We will explicitly chown afterwards.
sudo rsync -a --delete "$PROJECT_ROOT/frontend/" "$FRONTEND_BUILD_SOURCE_DIR/"

print_status "Setting ownership of $FRONTEND_BUILD_SOURCE_DIR to wheelapp:wheelapp..."
# CRITICAL: Ensure wheelapp owns all files in the build source directory
# *after* copying, so npm commands run as wheelapp have correct permissions.
sudo chown -R wheelapp:wheelapp "$FRONTEND_BUILD_SOURCE_DIR"

# --- Stage 2: Build the React Application ---
# Navigate to the frontend source directory where the build will occur.
cd "$FRONTEND_BUILD_SOURCE_DIR"

print_status "Creating frontend .env file with REACT_APP_API_URL=https://$DOMAIN/api..."
# This .env file is used by the React application at runtime for its configuration.
cat > .env << ENVEOF
REACT_APP_API_URL=https://$DOMAIN/api
ENVEOF
# Ensure wheelapp owns the .env file it might read or modify (though usually just read by build).
sudo chown wheelapp:wheelapp .env

print_status "Installing npm dependencies as user 'wheelapp' using 'npm ci'..."
# 'npm ci' is preferred for deployment for faster, more reliable builds from package-lock.json.
# This command requires package-lock.json to be present and consistent with package.json.
# If package-lock.json is missing or problematic, 'npm install' should be used first
# (possibly manually one time) to generate/fix it, and then package-lock.json committed to Git.
sudo -u wheelapp npm ci
# If 'npm ci' fails due to missing package-lock.json, use 'npm install' instead for the first run:
# print_warning "npm ci failed, attempting npm install. Ensure package-lock.json is in your repository for future 'npm ci' use."
# sudo -u wheelapp npm install


print_status "Building React application as user 'wheelapp' with PUBLIC_URL=https://$DOMAIN..."
# Set PUBLIC_URL environment variable for the build process.
# This tells Create React App what the root path of the application will be.
export PUBLIC_URL="https://$DOMAIN"
# Use NODE_OPTIONS to increase memory for the build process if needed.
sudo -u wheelapp NODE_OPTIONS="--max-old-space-size=4096" npm run build
# Unset PUBLIC_URL after the build is complete.
unset PUBLIC_URL

# Verify build was successful by checking for the existence of the 'build' directory.
if [ ! -d "build" ]; then
    print_error "Frontend build failed - no 'build' directory created in $FRONTEND_BUILD_SOURCE_DIR/"
    exit 1
fi
print_status "Frontend build successful. Output in $FRONTEND_BUILD_SOURCE_DIR/build/"

# --- Stage 3: Deploy built files to Apache's DocumentRoot ---
# APACHE_DOC_ROOT is where Apache will serve the static frontend files from.
APACHE_DOC_ROOT="/var/www/html/wheeloflife"

print_status "Ensuring Apache document root exists: $APACHE_DOC_ROOT"
sudo mkdir -p "$APACHE_DOC_ROOT"

print_status "Copying built files from $FRONTEND_BUILD_SOURCE_DIR/build to $APACHE_DOC_ROOT..."
# Copy all contents of the 'build' directory to Apache's serving directory.
sudo cp -r "$FRONTEND_BUILD_SOURCE_DIR/build/"* "$APACHE_DOC_ROOT/"
# Set ownership of the deployed files to www-data (or your Apache user/group)
# so that Apache can read and serve them.
sudo chown -R www-data:www-data "$APACHE_DOC_ROOT"
print_status "Built files copied to $APACHE_DOC_ROOT and permissions set."

# --- Stage 4: Configure Apache ---
# This section assumes an Apache configuration template exists in your project.
APACHE_CONF_TEMPLATE="$PROJECT_ROOT/deployment/apache.conf.template"
# Name the Apache site configuration file after your domain for clarity, or use a fixed name.
APACHE_SITE_CONF="/etc/apache2/sites-available/$DOMAIN.conf"

if [ -f "$APACHE_CONF_TEMPLATE" ]; then
    print_status "Configuring Apache virtual host for $DOMAIN using template $APACHE_CONF_TEMPLATE..."
    # Export DOMAIN_NAME_VAR for envsubst. Using a distinct variable name avoids conflicts.
    export DOMAIN_NAME_VAR="$DOMAIN"
    # Replace placeholders (like ${DOMAIN_NAME_VAR}) in the template and write to the site config file.
    # Ensure your apache.conf.template uses ${DOMAIN_NAME_VAR} where the domain name should be.
    sudo sh -c "envsubst '\${DOMAIN_NAME_VAR}' < \"$APACHE_CONF_TEMPLATE\" > \"$APACHE_SITE_CONF\""
    unset DOMAIN_NAME_VAR # Unset the temporary variable

    print_status "Enabling Apache site $DOMAIN.conf..."
    sudo a2ensite "$DOMAIN.conf"
    # It's common to disable the default site if this is the primary site on the server.
    if [ -f "/etc/apache2/sites-available/000-default.conf" ]; then
        # Check if it's already disabled to avoid error messages
        if [ -L "/etc/apache2/sites-enabled/000-default.conf" ]; then
            print_status "Disabling default Apache site..."
            sudo a2dissite 000-default.conf
        fi
    fi
    print_status "Reloading Apache configuration..."
    sudo systemctl reload apache2 # Use reload for graceful restart of Apache
else
    print_warning "Apache configuration template not found at $APACHE_CONF_TEMPLATE. Skipping Apache VHost setup."
    print_warning "You may need to configure Apache manually to serve from $APACHE_DOC_ROOT for domain $DOMAIN."
fi

print_status "Frontend deployment completed successfully for domain: $DOMAIN"
print_status "React app built with PUBLIC_URL=https://$DOMAIN and API pointing to https://$DOMAIN/api"
print_status "Static files deployed to $APACHE_DOC_ROOT"
