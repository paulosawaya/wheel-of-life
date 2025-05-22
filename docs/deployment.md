# Wheel of Life - Ubuntu Server Deployment Guide

## 📋 Prerequisites
- Ubuntu 20.04 LTS or newer
- Root or sudo access
- Domain name (wol.com) pointing to your server IP
- Basic terminal knowledge

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)
```bash
# Clone the repository
git clone https://github.com/yourusername/wheel-of-life.git
cd wheel-of-life

# Make deploy script executable
chmod +x deploy.sh

# Run deployment (will prompt for passwords)
sudo ./deploy.sh
```

### Option 2: Manual Step-by-Step Deployment

#### Step 1: Initial Server Setup
```bash
sudo chmod +x deployment/scripts/setup-server.sh
sudo ./deployment/scripts/setup-server.sh YOUR_DB_PASSWORD
```

#### Step 2: Deploy Backend
```bash
sudo chmod +x deployment/scripts/deploy-backend.sh
sudo ./deployment/scripts/deploy-backend.sh YOUR_DB_PASSWORD YOUR_JWT_SECRET
```

#### Step 3: Deploy Frontend
```bash
sudo chmod +x deployment/scripts/deploy-frontend.sh
sudo ./deployment/scripts/deploy-frontend.sh wol.com
```

#### Step 4: Setup SSL
```bash
sudo chmod +x deployment/scripts/setup-ssl.sh
sudo ./deployment/scripts/setup-ssl.sh wol.com
```

## 🔧 Configuration

### Backend Environment (.env)
```env
DATABASE_URL=mysql+pymysql://wheelapp:your_password@localhost/wheel_of_life
JWT_SECRET_KEY=your_very_secure_jwt_secret_key_at_least_32_characters_long
FLASK_ENV=production
FLASK_DEBUG=False
```

### Frontend Environment (.env)
```env
REACT_APP_API_URL=https://wol.com/api
```

## 🛡️ Security Features

- **UFW Firewall**: Only ports 22, 80, 443 allowed
- **SSL/HTTPS**: Automatic with Let's Encrypt
- **Security Headers**: XSS protection, HSTS, etc.
- **Fail2ban**: Protection against brute force attacks
- **MySQL Security**: Dedicated user with minimal privileges
- **File Permissions**: Secure .env and config files

## 📊 Monitoring & Maintenance

### Check Service Status
```bash
sudo systemctl status wheeloflife
sudo systemctl status apache2
sudo systemctl status mysql
```

### View Logs
```bash
# Application logs
sudo tail -f /var/log/wheeloflife/gunicorn_error.log
sudo tail -f /var/log/wheeloflife/gunicorn_access.log

# Apache logs
sudo tail -f /var/log/apache2/wheeloflife_error.log

# System logs
sudo journalctl -u wheeloflife -f
```

### Manual Backup
```bash
sudo /usr/local/bin/backup-wheeloflife.sh
```

### Restart Services
```bash
sudo systemctl restart wheeloflife
sudo systemctl restart apache2
```

## 🔄 Updates

### Update Application Code
```bash
cd /path/to/wheel-of-life
git pull origin main
sudo systemctl restart wheeloflife
```

### Update Frontend
```bash
cd /var/www/wheeloflife/frontend
sudo -u wheelapp npm run build
sudo cp -r build/* /var/www/html/wheeloflife/
```

## 🚨 Troubleshooting

### Service Won't Start
```bash
sudo journalctl -u wheeloflife --no-pager -l
```

### Database Connection Issues
```bash
mysql -u wheelapp -p wheel_of_life
```

### Permission Issues
```bash
sudo chown -R wheelapp:wheelapp /var/www/wheeloflife
sudo chmod 600 /var/www/wheeloflife/backend/.env
```

### Apache Configuration Test
```bash
sudo apache2ctl configtest
```

## 📝 Important Notes

1. **Domain Configuration**: Ensure wol.com and www.wol.com point to your server IP
2. **Strong Passwords**: Use secure passwords for database and JWT secret
3. **Regular Updates**: Keep system packages updated
4. **Monitor Logs**: Check logs regularly for issues
5. **Backup Testing**: Test backup restoration periodically

## 🎯 Final URLs

After successful deployment:
- **Main Application**: https://wol.com
- **API Endpoints**: https://wol.com/api
- **Auto HTTPS Redirect**: http://wol.com → https://wol.com

## 📞 Support

For issues or questions:
1. Check the logs first
2. Verify service status
3. Review firewall settings
4. Test database connectivity

Your Wheel of Life application should now be fully deployed and accessible!