Write-Host "🚀 Testing Tele-CICD Project Locally" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}

# Check TypeScript compilation
Write-Host "🔍 Checking TypeScript compilation..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ TypeScript compilation has warnings" -ForegroundColor Yellow
}

# Build the project
Write-Host "🏗️ Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Check if build was successful
if (Test-Path "dist") {
    Write-Host "✅ Build successful - dist folder created" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed - no dist folder found" -ForegroundColor Red
    exit 1
}

# Test Docker build
Write-Host "🐳 Testing Docker build..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    docker build -t tele-cicd-test .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker build successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker build failed" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️ Docker not installed, skipping Docker build test" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Local testing completed!" -ForegroundColor Green
Write-Host ""
Write-Host "To run the project locally:" -ForegroundColor Cyan
Write-Host "1. Copy .env.example to .env and configure your environment variables" -ForegroundColor White
Write-Host "2. Set up your PostgreSQL database" -ForegroundColor White
Write-Host "3. Run: npm run db:migrate" -ForegroundColor White
Write-Host "4. Run: npm run dev" -ForegroundColor White
