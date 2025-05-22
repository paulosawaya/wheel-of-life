#!/bin/bash

DOMAIN=$1

echo "Setting up frontend..."

# Copy frontend files
cp -r frontend /var/www/wheeloflife/
cd /var/www/wheeloflife/frontend

# Create environment file
cat > .env << EOF
REACT_APP_API_URL=https://$DOMAIN/api
EOF

# Install dependencies and build
sudo -u wheelapp npm install
sudo -u wheelapp npm run build

# Copy build to web directory
mkdir -p /var/www/html/wheeloflife
cp -r build/* /var/www/html/wheeloflife/
chown -R www-data:www-data /var/www/html/wheeloflife

# IMPROVEMENT: Use template for Apache configuration
echo "Configuring Apache with domain: $DOMAIN"

# Process the template and substitute environment variables
export DOMAIN=$DOMAIN
envsubst '${DOMAIN}' < deployment/apache.conf.template > /etc/apache2/sites-available/wheeloflife.conf

# Enable the site
a2ensite wheeloflife.conf
a2dissite 000-default.conf
systemctl reload apache2

echo "Frontend deployment completed for domain: $DOMAIN"

