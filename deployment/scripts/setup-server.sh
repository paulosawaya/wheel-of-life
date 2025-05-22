#!/bin/bash

DB_PASSWORD=$1

echo "Installing system dependencies..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

echo "Installing MySQL..."
apt install -y mysql-server
mysql_secure_installation

echo "Creating database and user..."
mysql -e "CREATE DATABASE IF NOT EXISTS wheel_of_life;"
mysql -e "CREATE USER IF NOT EXISTS 'wheelapp'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
mysql -e "GRANT ALL PRIVILEGES ON wheel_of_life.* TO 'wheelapp'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo "Installing Python..."
apt install -y python3 python3-pip python3-venv python3-dev build-essential

echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo "Installing Apache..."
apt install -y apache2
a2enmod rewrite proxy proxy_http ssl headers
systemctl enable apache2

echo "Setting up UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "Installing security tools..."
apt install -y fail2ban

echo "Server setup completed!"