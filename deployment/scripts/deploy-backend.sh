#!/bin/bash

DB_PASSWORD=$1
JWT_SECRET=$2

echo "Setting up backend..."

# Create application directory
mkdir -p /var/www/wheeloflife
chown wheelapp:wheelapp /var/www/wheeloflife

# Copy backend files
cp -r backend /var/www/wheeloflife/
chown -R wheelapp:wheelapp /var/www/wheeloflife/backend

# Setup Python environment
cd /var/www/wheeloflife
sudo -u wheelapp python3 -m venv venv
sudo -u wheelapp /var/www/wheeloflife/venv/bin/pip install -r backend/requirements.txt

# Create environment file
cat > /var/www/wheeloflife/backend/.env << EOF
DATABASE_URL=mysql+pymysql://wheelapp:$DB_PASSWORD@localhost/wheel_of_life
JWT_SECRET_KEY=$JWT_SECRET
FLASK_ENV=production
FLASK_DEBUG=False
EOF

chown wheelapp:wheelapp /var/www/wheeloflife/backend/.env
chmod 600 /var/www/wheeloflife/backend/.env

# Import database schema
mysql -u wheelapp -p$DB_PASSWORD wheel_of_life < backend/database/schema.sql

# Create log directory
mkdir -p /var/log/wheeloflife
chown wheelapp:wheelapp /var/log/wheeloflife

# Create systemd service
cp deployment/systemd/wheeloflife.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable wheeloflife
systemctl start wheeloflife

echo "Backend deployment completed!"
