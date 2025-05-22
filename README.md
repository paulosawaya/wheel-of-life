# Wheel of Life Assessment Application

A comprehensive life assessment tool that helps users evaluate different areas of their lives and create action plans for improvement.

## Features

- 🎯 **Comprehensive Assessment**: 48 questions across 4 life areas
- 📊 **Visual Results**: Interactive wheel diagram showing life balance
- 📋 **Action Planning**: Create targeted improvement plans
- 🔐 **User Authentication**: Secure login and registration
- 📱 **Responsive Design**: Works on desktop and mobile

## Technology Stack

- **Backend**: Python Flask, MySQL, JWT Authentication
- **Frontend**: React.js, Styled Components, Chart.js
- **Deployment**: Ubuntu, Apache, SSL/HTTPS
- **Security**: UFW Firewall, Let's Encrypt

## Quick Start

### Prerequisites
- Ubuntu 20.04+ server
- Domain name (wol.com)
- Basic terminal knowledge

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/wheel-of-life.git
cd wheel-of-life
```

2. **Run the deployment script**
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

3. **Configure your domain**
- Point wol.com to your server IP
- Update environment files
- Run SSL setup

## Manual Deployment

See [docs/deployment.md](docs/deployment.md) for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
