#!/bin/bash

DB_PASSWORD=$1
JWT_SECRET=$2

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Setting up backend..."
echo "Project root: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

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
cat > /var/www/wheeloflife/backend/.env << ENVEOF
DATABASE_URL=mysql+pymysql://wheelapp:$DB_PASSWORD@localhost/wheel_of_life
JWT_SECRET_KEY=$JWT_SECRET
FLASK_ENV=production
FLASK_DEBUG=False
ENVEOF

chown wheelapp:wheelapp /var/www/wheeloflife/backend/.env
chmod 600 /var/www/wheeloflife/backend/.env

# Import database schema
mysql -u wheelapp -p$DB_PASSWORD wheel_of_life < "$PROJECT_ROOT/backend/database/schema.sql"

# Create log directory
mkdir -p /var/log/wheeloflife
chown wheelapp:wheelapp /var/log/wheeloflife

# Copy systemd service with absolute path
echo "Copying systemd service from: $PROJECT_ROOT/deployment/systemd/wheeloflife.service"
cp "$PROJECT_ROOT/deployment/systemd/wheeloflife.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable wheeloflife
systemctl start wheeloflife

echo "Backend deployment completed!"
