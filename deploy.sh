#!/bin/bash

# Wheel of Life - Automated Deployment Script
# Run with: sudo ./deploy.sh

set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting Wheel of Life deployment..."

# Determine the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR" # Assuming deploy.sh is in the project root
cd "$PROJECT_ROOT" # Change to project root

echo "📁 Project root: $PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)."
    exit 1
fi

# Load configuration from file or environment if it exists
CONFIG_FILE="deployment/.env.deploy"
if [ -f "$CONFIG_FILE" ]; then
    print_status "Loading configuration from $CONFIG_FILE"
    source "$CONFIG_FILE" # Source the .env.deploy file to load variables
fi

# Get configuration with defaults, allowing override from sourced file
# Use :- for default value if variable is unset or null
read -p "Enter your domain (e.g., myapp.example.com, default: ${DOMAIN:-rdv.embedados.com}): " INPUT_DOMAIN
DOMAIN=${INPUT_DOMAIN:-${DOMAIN:-rdv.embedados.com}} # Default to rdv.embedados.com if nothing is provided or sourced

# Generate random password if not set or provided
DEFAULT_DB_PASSWORD=$(openssl rand -base64 32)
read -s -p "Enter MySQL password for wheelapp user (default: use existing or generate random): " INPUT_DB_PASSWORD
echo
DB_PASSWORD=${INPUT_DB_PASSWORD:-${DB_PASSWORD:-$DEFAULT_DB_PASSWORD}}

# Generate random JWT secret if not set or provided
DEFAULT_JWT_SECRET=$(openssl rand -base64 48)
read -s -p "Enter JWT secret key (default: use existing or generate random): " INPUT_JWT_SECRET
echo
JWT_SECRET=${INPUT_JWT_SECRET:-${JWT_SECRET:-$DEFAULT_JWT_SECRET}}

# Save configuration for future deployments or reference
mkdir -p deployment # Ensure deployment directory exists
cat > deployment/.env.deploy << EOF
# Deployment Configuration
# Generated/Updated on $(date)
DOMAIN=$DOMAIN
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
EOF

chmod 600 deployment/.env.deploy # Secure the config file

print_status "Configuration to be used:"
print_status "Domain: $DOMAIN"
print_status "Database password: [HIDDEN]" # Do not print passwords to console
print_status "JWT secret: [HIDDEN]"
print_status "Config saved to/updated: deployment/.env.deploy"

# Confirm before proceeding
read -p "Proceed with deployment using the above configuration? (y/N): " -n 1 -r
echo # Move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled by user."
    exit 1
fi

print_status "Starting automated deployment for domain: $DOMAIN"

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Create application user if it doesn't exist
print_status "Ensuring application user 'wheelapp' exists..."
if ! id "wheelapp" &>/dev/null; then
    adduser --system --disabled-password --group --shell /bin/bash --gecos "Wheel of Life Application User" wheelapp
    # Consider adding to sudo group only if absolutely necessary for specific tasks,
    # and ideally remove sudo rights after setup. For running the app, it shouldn't need sudo.
    # usermod -aG sudo wheelapp
else
    print_status "User 'wheelapp' already exists."
fi

# Verify deployment scripts exist and are executable
if [ ! -d "deployment/scripts" ]; then
    print_error "Deployment scripts directory not found: deployment/scripts. Make sure you are in the project root."
    exit 1
fi
chmod +x deployment/scripts/*.sh

# Run individual deployment scripts
print_status "Setting up server environment (dependencies, MySQL, Apache, Firewall)..."
./deployment/scripts/setup-server.sh "$DB_PASSWORD"

print_status "Deploying backend application..."
./deployment/scripts/deploy-backend.sh "$DB_PASSWORD" "$JWT_SECRET"

print_status "Deploying frontend application..."
./deployment/scripts/deploy-frontend.sh "$DOMAIN"

print_status "Setting up SSL certificate with Certbot..."
./deployment/scripts/setup-ssl.sh "$DOMAIN"

print_status "Setting up monitoring and backups..."
if [ -f "deployment/scripts/backup.sh" ]; then
    # Ensure backup directory exists and has correct permissions for the script to write to
    # The backup.sh script itself creates /var/backups/wheeloflife
    cp deployment/scripts/backup.sh /usr/local/bin/backup-wheeloflife.sh
    chmod +x /usr/local/bin/backup-wheeloflife.sh
    
    # Add backup to crontab if not already present
    (crontab -l 2>/dev/null | grep -q -F "/usr/local/bin/backup-wheeloflife.sh") || \
    ( (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-wheeloflife.sh") | crontab - )
    print_status "Backup script configured."
else
    print_warning "Backup script (deployment/scripts/backup.sh) not found. Skipping backup setup."
fi

# Final systemctl daemon-reload and restart of services to ensure all changes are applied
print_status "Reloading systemd and restarting services..."
sudo systemctl daemon-reload
sudo systemctl restart wheeloflife.service
sudo systemctl restart apache2

print_status "🎉 Deployment completed successfully!"
echo
echo "Your Wheel of Life application should now be available at:"
echo -e "🌐 ${GREEN}https://$DOMAIN${NC}"
echo -e "🔗 API should be at: ${GREEN}https://$DOMAIN/api${NC}"
echo
echo "Configuration used is saved in: deployment/.env.deploy"
echo "Database password and JWT secret are stored there. Keep this file secure."
echo
echo "Next steps:"
echo "1. Test the application thoroughly by visiting https://$DOMAIN in your browser."
echo "2. Check service status: sudo systemctl status wheeloflife.service && sudo systemctl status apache2"
echo "3. Monitor logs if needed: sudo journalctl -u wheeloflife.service -f"
echo
print_warning "Important Reminders:"
print_warning "- Ensure your DNS for '$DOMAIN' (and 'www.$DOMAIN' if configured for SSL) points to this server's IP address."
print_warning "- Keep your 'deployment/.env.deploy' file secure."
print_warning "- Set up comprehensive monitoring and alerts for production environments."
print_warning "- Test your backups regularly."

exit 0
