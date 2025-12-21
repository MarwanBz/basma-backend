#!/bin/bash

# Production deployment script for basma-backend
# This script pulls latest changes, builds the project, and restarts PM2

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Navigate to project directory
cd "$(dirname "$0")"

# Pull latest changes from main branch
echo "📥 Pulling latest changes..."
git pull origin main

# Install production dependencies (safer than npm install)
echo "📦 Installing dependencies..."
npm ci --production

# Build the project
echo "🔨 Building project..."
npm run build

# Restart PM2 processes with environment variable updates
echo "🔄 Restarting PM2 processes..."
npx pm2 restart all --update-env

# Show PM2 status
echo "✅ Deployment completed! PM2 status:"
npx pm2 list

echo "🎉 Production deployment successful!"