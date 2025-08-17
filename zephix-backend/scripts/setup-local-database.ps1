# Zephix Local Database Setup Script (PowerShell)
# This script sets up a local PostgreSQL database for development on Windows

param(
    [string]$DBName = "zephix_development",
    [string]$DBUser = "zephix_user",
    [string]$DBPassword = ""
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

Write-Host "🚀 Setting up Zephix local development database..." -ForegroundColor $Blue

# Check if PostgreSQL is running
try {
    $pgStatus = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgStatus -and $pgStatus.Status -eq "Running") {
        Write-Host "✅ PostgreSQL is running" -ForegroundColor $Green
    } else {
        Write-Host "❌ PostgreSQL is not running. Please start PostgreSQL first." -ForegroundColor $Red
        Write-Host "   You can start it from Services or run: net start postgresql" -ForegroundColor $Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Could not check PostgreSQL status. Please ensure PostgreSQL is installed and running." -ForegroundColor $Red
    exit 1
}

# Generate password if not provided
if (-not $DBPassword) {
    $DBPassword = "zephix_dev_password_$(Get-Date -UFormat %s)"
}

Write-Host "📋 Database Configuration:" -ForegroundColor $Blue
Write-Host "   Database: $DBName" -ForegroundColor $White
Write-Host "   User: $DBUser" -ForegroundColor $White
Write-Host "   Password: $DBPassword" -ForegroundColor $White

# Check if psql is available
try {
    $psqlVersion = psql --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ psql command available" -ForegroundColor $Green
    } else {
        Write-Host "❌ psql command not found. Please add PostgreSQL bin directory to PATH." -ForegroundColor $Red
        Write-Host "   Typical path: C:\Program Files\PostgreSQL\[version]\bin" -ForegroundColor $Yellow
        exit 1
    }
} catch {
    Write-Host "❌ psql command not found. Please ensure PostgreSQL is properly installed." -ForegroundColor $Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Manual Setup Instructions:" -ForegroundColor $Blue
Write-Host "Since this script requires database superuser access, please run these commands manually:" -ForegroundColor $Yellow
Write-Host ""
Write-Host "⚠️  SAFETY: Check if resources exist before creating:" -ForegroundColor $Yellow
Write-Host "   - Check user: SELECT 1 FROM pg_roles WHERE rolname='$DBUser';" -ForegroundColor $White
Write-Host "   - Check database: SELECT 1 FROM pg_database WHERE datname='$DBName';" -ForegroundColor $White
Write-Host ""

Write-Host "1. Open psql as superuser (usually postgres):" -ForegroundColor $White
Write-Host "   psql -U postgres" -ForegroundColor $Yellow

Write-Host "2. Create the user:" -ForegroundColor $White
Write-Host "   CREATE USER $DBUser WITH PASSWORD '$DBPassword';" -ForegroundColor $Yellow

Write-Host "3. Create the database:" -ForegroundColor $White
Write-Host "   CREATE DATABASE $DBName OWNER $DBUser;" -ForegroundColor $Yellow

Write-Host "4. Grant privileges:" -ForegroundColor $White
Write-Host "   GRANT ALL PRIVILEGES ON DATABASE $DBName TO $DBUser;" -ForegroundColor $Yellow
Write-Host "   \c $DBName" -ForegroundColor $Yellow
Write-Host "   GRANT ALL PRIVILEGES ON SCHEMA public TO $DBUser;" -ForegroundColor $Yellow
Write-Host "   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DBUser;" -ForegroundColor $Yellow
Write-Host "   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DBUser;" -ForegroundColor $Yellow
Write-Host "   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DBUser;" -ForegroundColor $Yellow
Write-Host "   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DBUser;" -ForegroundColor $Yellow

Write-Host "5. Exit psql:" -ForegroundColor $White
Write-Host "   \q" -ForegroundColor $Yellow

Write-Host ""
Write-Host "6. Test the connection:" -ForegroundColor $White
Write-Host "   psql `"postgresql://$DBUser`:$DBPassword@localhost:5432/$DBName`" -c `"SELECT 1;`" -ForegroundColor $Yellow

Write-Host ""
Write-Host "7. Create .env file with these values:" -ForegroundColor $Blue
Write-Host "   DB_HOST=localhost" -ForegroundColor $White
Write-Host "   DB_PORT=5432" -ForegroundColor $White
Write-Host "   DB_NAME=$DBName" -ForegroundColor $White
Write-Host "   DB_USERNAME=$DBUser" -ForegroundColor $White
Write-Host "   DB_PASSWORD=$DBPassword" -ForegroundColor $White

Write-Host ""
Write-Host "💡 Alternative: Use pgAdmin or another GUI tool to create the user and database." -ForegroundColor $Blue
Write-Host "💡 Make sure to grant the same privileges listed above." -ForegroundColor $Blue

Write-Host ""
Write-Host "🎯 After setup, test with:" -ForegroundColor $Blue
Write-Host "   npm run start:dev" -ForegroundColor $Yellow
