#!/bin/bash

echo "🚀 Testing Tele-CICD Project Locally"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
npx tsc --noEmit || echo "⚠️ TypeScript compilation has warnings"

# Build the project
echo "🏗️ Building project..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build successful - dist folder created"
else
    echo "❌ Build failed - no dist folder found"
    exit 1
fi

# Test Docker build
echo "🐳 Testing Docker build..."
if command -v docker &> /dev/null; then
    docker build -t tele-cicd-test . && echo "✅ Docker build successful" || echo "❌ Docker build failed"
else
    echo "⚠️ Docker not installed, skipping Docker build test"
fi

echo ""
echo "🎉 Local testing completed!"
echo ""
echo "To run the project locally:"
echo "1. Copy .env.example to .env and configure your environment variables"
echo "2. Set up your PostgreSQL database"
echo "3. Run: npm run db:migrate"
echo "4. Run: npm run dev"
