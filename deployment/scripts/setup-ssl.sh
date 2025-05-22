#!/bin/bash

DOMAIN=$1

echo "Setting up SSL certificate..."

# Install Certbot
apt install -y certbot python3-certbot-apache

# Get SSL certificate
certbot --apache -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Test auto-renewal
certbot renew --dry-run

echo "SSL setup completed!"
