#!/bin/bash

BACKUP_DIR="/var/backups/wheeloflife"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Read database password from env file
DB_PASSWORD=$(grep DATABASE_URL /var/www/wheeloflife/backend/.env | cut -d':' -f3 | cut -d'@' -f1)

# Backup database
mysqldump -u wheelapp -p$DB_PASSWORD wheel_of_life > $BACKUP_DIR/database_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /var/www wheeloflife

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
