#!/bin/bash

# Wheel of Life - Automated Deployment Script
# Run with: sudo ./deploy.sh

set -e

echo "🚀 Starting Wheel of Life deployment..."

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
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# IMPROVEMENT: Load configuration from file or environment
CONFIG_FILE="deployment/.env.deploy"
if [ -f "$CONFIG_FILE" ]; then
    print_status "Loading configuration from $CONFIG_FILE"
    source "$CONFIG_FILE"
fi

# Get configuration with defaults
read -p "Enter your domain (default: ${DOMAIN:-wol.com}): " INPUT_DOMAIN
DOMAIN=${INPUT_DOMAIN:-${DOMAIN:-wol.com}}

read -s -p "Enter MySQL password for wheelapp user (default: generate random): " INPUT_DB_PASSWORD
echo
DB_PASSWORD=${INPUT_DB_PASSWORD:-${DB_PASSWORD:-$(openssl rand -base64 32)}}

read -s -p "Enter JWT secret key (default: generate random): " INPUT_JWT_SECRET
echo
JWT_SECRET=${INPUT_JWT_SECRET:-${JWT_SECRET:-$(openssl rand -base64 48)}}

# IMPROVEMENT: Save configuration for future deployments
mkdir -p deployment
cat > deployment/.env.deploy << EOF
# Deployment Configuration
# Generated on $(date)
DOMAIN=$DOMAIN
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
EOF

chmod 600 deployment/.env.deploy

print_status "Configuration:"
print_status "Domain: $DOMAIN"
print_status "Database password: [HIDDEN]"
print_status "JWT secret: [HIDDEN]"
print_status "Config saved to: deployment/.env.deploy"

# Confirm before proceeding
read -p "Proceed with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 1
fi

print_status "Starting automated deployment..."

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Create application user
print_status "Creating application user..."
if ! id "wheelapp" &>/dev/null; then
    adduser --disabled-password --gecos "" wheelapp
    usermod -aG sudo wheelapp
fi

# Run individual deployment scripts
chmod +x deployment/scripts/*.sh

print_status "Setting up server environment..."
./deployment/scripts/setup-server.sh "$DB_PASSWORD"

print_status "Deploying backend..."
./deployment/scripts/deploy-backend.sh "$DB_PASSWORD" "$JWT_SECRET"

print_status "Deploying frontend..."
./deployment/scripts/deploy-frontend.sh "$DOMAIN"

print_status "Setting up SSL..."
./deployment/scripts/setup-ssl.sh "$DOMAIN"

print_status "Setting up monitoring and backups..."
cp deployment/scripts/backup.sh /usr/local/bin/backup-wheeloflife.sh
chmod +x /usr/local/bin/backup-wheeloflife.sh

# Add backup to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-wheeloflife.sh") | crontab -

print_status "🎉 Deployment completed successfully!"
echo
echo "Your Wheel of Life application is now available at:"
echo "🌐 https://$DOMAIN"
echo "🔗 API: https://$DOMAIN/api"
echo
echo "Configuration saved to: deployment/.env.deploy"
echo "Database password: $DB_PASSWORD"
echo "JWT secret: $JWT_SECRET"
echo
echo "Next steps:"
echo "1. Test the application: curl https://$DOMAIN/api/life-areas"
echo "2. Check logs: sudo journalctl -u wheeloflife -f"
echo "3. Monitor status: sudo systemctl status wheeloflife"
echo
print_warning "Don't forget to:"
print_warning "- Keep your deployment/.env.deploy file secure"
print_warning "- Set up monitoring alerts"
print_warning "- Test backups regularly"