#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Build the application
echo "📦 Building application..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm run validate-modules

# Deploy to production
echo "🌐 Deploying to production..."
# Add your deployment commands here

echo "✅ Deployment complete!"
