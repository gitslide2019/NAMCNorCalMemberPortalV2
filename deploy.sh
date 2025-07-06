#!/bin/bash

# NAMC NorCal Member Portal Deployment Script
# This script handles the deployment process for production

set -e

echo "🚀 Starting NAMC NorCal Member Portal Deployment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found. Please create it from .env.example${NC}"
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=(
    "POSTGRES_DB"
    "POSTGRES_USER" 
    "POSTGRES_PASSWORD"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "COOKIE_SECRET"
    "REDIS_PASSWORD"
    "CORS_ORIGIN"
    "NEXT_PUBLIC_API_URL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All prerequisites met${NC}"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p nginx/logs
mkdir -p nginx/ssl

# Check for SSL certificates
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo -e "${YELLOW}⚠️  SSL certificates not found. Generating self-signed certificates...${NC}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=California/L=San Francisco/O=NAMC NorCal/CN=localhost"
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

echo "🌱 Seeding database..."
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma db seed

echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
services=("postgres" "redis" "backend" "frontend" "nginx")
all_healthy=true

for service in "${services[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "${service}.*Up"; then
        echo -e "${GREEN}✅ $service is running${NC}"
    else
        echo -e "${RED}❌ $service is not running${NC}"
        all_healthy=false
    fi
done

if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}✅ All services are running successfully!${NC}"
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "📌 Access the application at:"
    echo "   - Frontend: https://localhost"
    echo "   - Backend API: https://localhost/api"
    echo ""
    echo "📊 View logs with:"
    echo "   docker-compose -f docker-compose.prod.yml logs -f [service-name]"
    echo ""
    echo "🛑 To stop all services:"
    echo "   docker-compose -f docker-compose.prod.yml down"
else
    echo -e "${RED}❌ Some services failed to start. Check logs for details.${NC}"
    exit 1
fi