#!/bin/bash

# Zephix Web-Based Local Development Setup
# This script sets up your local development environment for web access

set -e

echo "🚀 Setting up Zephix Web-Based Local Development..."

# Check if required tools are installed
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 20.x first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed. Please install npm first."
        exit 1
    fi
    
    echo "✅ Requirements check passed"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    
    # Install frontend dependencies
    echo "Installing frontend dependencies..."
    cd zephix-frontend
    npm install
    cd ..
    
    # Install backend dependencies
    echo "Installing backend dependencies..."
    cd zephix-backend
    npm install
    cd ..
    
    echo "✅ Dependencies installed successfully"
}

# Create environment files
setup_environment() {
    echo "🔧 Setting up environment configuration..."
    
    # Frontend environment
    if [ ! -f "zephix-frontend/.env.local" ]; then
        cat > zephix-frontend/.env.local << EOF
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Zephix
VITE_APP_VERSION=1.0.0
EOF
        echo "✅ Frontend environment file created"
    fi
    
    # Backend environment
    if [ ! -f "zephix-backend/.env" ]; then
        cat > zephix-backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=zephix_dev

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration (optional)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@zephix.com
EOF
        echo "✅ Backend environment file created"
    fi
}

# Setup database
setup_database() {
    echo "🗄️ Setting up database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 &> /dev/null; then
        echo "⚠️  PostgreSQL is not running. Please start PostgreSQL first."
        echo "   On Ubuntu/Debian: sudo systemctl start postgresql"
        echo "   On macOS: brew services start postgresql"
        echo "   On Windows: Start PostgreSQL service"
    else
        echo "✅ PostgreSQL is running"
    fi
}

# Create startup scripts
create_startup_scripts() {
    echo "📝 Creating startup scripts..."
    
    # Frontend startup script
    cat > start-frontend.sh << 'EOF'
#!/bin/bash
cd zephix-frontend
echo "🌐 Starting Zephix Frontend..."
echo "📱 Access at: http://localhost:5173"
echo "🌍 Network access: http://0.0.0.0:5173"
npm run dev:local
EOF
    chmod +x start-frontend.sh
    
    # Backend startup script
    cat > start-backend.sh << 'EOF'
#!/bin/bash
cd zephix-backend
echo "🔧 Starting Zephix Backend..."
echo "📡 API available at: http://localhost:3000"
echo "📚 Swagger docs at: http://localhost:3000/api"
npm run start:dev
EOF
    chmod +x start-backend.sh
    
    # Combined startup script
    cat > start-all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Zephix Development Environment..."
echo ""

# Start backend in background
echo "Starting backend..."
cd zephix-backend
npm run start:dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 5

# Start frontend
echo "Starting frontend..."
cd zephix-frontend
npm run dev:local &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Zephix Development Environment Started!"
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/api"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
EOF
    chmod +x start-all.sh
    
    echo "✅ Startup scripts created"
}

# Create VS Code Server setup
setup_vscode_server() {
    echo "💻 Setting up VS Code Server for web access..."
    
    # Install VS Code Server if not already installed
    if ! command -v code-server &> /dev/null; then
        echo "Installing VS Code Server..."
        curl -fsSL https://code-server.dev/install.sh | sh
    fi
    
    # Create VS Code Server config
    mkdir -p ~/.config/code-server
    cat > ~/.config/code-server/config.yaml << EOF
bind-addr: 0.0.0.0:8080
auth: password
password: zephix123
cert: false
EOF
    
    echo "✅ VS Code Server configured"
    echo "🌐 Access VS Code at: http://localhost:8080"
    echo "🔑 Password: zephix123"
}

# Create development guide
create_dev_guide() {
    echo "📚 Creating development guide..."
    
    cat > WEB_DEVELOPMENT_GUIDE.md << 'EOF'
# Zephix Web-Based Development Guide

## Quick Start

### 1. Start All Services
```bash
./start-all.sh
```

### 2. Access Your Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api
- **VS Code Web**: http://localhost:8080 (password: zephix123)

## Individual Service Management

### Frontend Only
```bash
./start-frontend.sh
```

### Backend Only
```bash
./start-backend.sh
```

## Development Workflow

1. **Code Changes**: Edit files in your preferred editor
2. **Auto-Reload**: Services automatically restart on file changes
3. **API Testing**: Use Swagger docs at http://localhost:3000/api
4. **Database**: PostgreSQL should be running on localhost:5432

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :3000
lsof -i :5173

# Kill process
kill -9 <PID>
```

### Database Connection Issues
- Ensure PostgreSQL is running
- Check credentials in zephix-backend/.env
- Verify database exists: `createdb zephix_dev`

### Frontend Build Issues
```bash
cd zephix-frontend
rm -rf node_modules package-lock.json
npm install
```

## Web-Based Development Options

### VS Code Server
- Access full IDE in browser at http://localhost:8080
- Password: zephix123
- Full IntelliSense, debugging, and extensions

### GitHub Codespaces
- Clone repository to GitHub
- Use GitHub Codespaces for cloud development
- Access from any device

### GitPod
- Connect repository to GitPod
- One-click development environment setup
- Collaborative coding capabilities
EOF
    
    echo "✅ Development guide created"
}

# Main execution
main() {
    check_requirements
    install_dependencies
    setup_environment
    setup_database
    create_startup_scripts
    setup_vscode_server
    create_dev_guide
    
    echo ""
    echo "🎉 Zephix Web-Based Development Setup Complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Start PostgreSQL database"
    echo "2. Run './start-all.sh' to start all services"
    echo "3. Access frontend at http://localhost:5173"
    echo "4. Access backend at http://localhost:3000"
    echo "5. Access VS Code Web at http://localhost:8080"
    echo ""
    echo "📚 See WEB_DEVELOPMENT_GUIDE.md for detailed instructions"
}

main "$@"