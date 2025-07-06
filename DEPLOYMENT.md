# NAMC NorCal Member Portal - Deployment Guide

This guide provides comprehensive instructions for deploying the NAMC NorCal Member Portal to production.

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)
- SSL certificates (for HTTPS)
- Domain name with DNS configured

## Quick Start Deployment

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/namc-norcal-portal.git
   cd namc-norcal-portal
   ```

2. **Set up environment variables**
   ```bash
   cp .env.production.example .env
   # Edit .env with your production values
   ```

3. **Run the deployment script**
   ```bash
   ./deploy.sh
   ```

## Manual Deployment Steps

### 1. Environment Setup

Create a `.env` file from the template:
```bash
cp .env.production.example .env
```

**Required environment variables:**
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` (use secure 64-byte hex strings)
- `REDIS_PASSWORD`
- `CORS_ORIGIN` (your frontend domain)
- `NEXT_PUBLIC_API_URL` (your API endpoint)

### 2. SSL Certificates

Place your SSL certificates in `nginx/ssl/`:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

For testing, generate self-signed certificates:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

### 3. Build and Deploy

Using Docker Compose:
```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Run database migrations
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# Seed database (first time only)
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma db seed

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Verify Deployment

Check service health:
```bash
docker-compose -f docker-compose.prod.yml ps
```

View logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f [service-name]
```

## Production Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Nginx     │────▶│  Frontend   │────▶│   Backend   │
│  (Reverse   │     │  (Next.js)  │     │  (Express)  │
│   Proxy)    │     │  Port 3000  │     │  Port 8000  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  PostgreSQL │
                                        │    Redis    │
                                        └─────────────┘
```

## CI/CD Pipeline

The project includes GitHub Actions workflow for automated deployment:

1. **On push to main branch:**
   - Run tests
   - Build Docker images
   - Push to GitHub Container Registry
   - Deploy to production server

2. **Setup GitHub Secrets:**
   - `DEPLOY_HOST` - Production server IP/hostname
   - `DEPLOY_USER` - SSH username
   - `DEPLOY_KEY` - SSH private key
   - `NEXT_PUBLIC_API_URL` - Production API URL

## Security Considerations

1. **Secrets Management:**
   - Never commit `.env` files
   - Use strong, unique passwords
   - Rotate secrets regularly

2. **Network Security:**
   - Use HTTPS only in production
   - Configure firewall rules
   - Implement rate limiting

3. **Database Security:**
   - Use strong passwords
   - Enable SSL for database connections
   - Regular backups

4. **Application Security:**
   - Keep dependencies updated
   - Enable security headers
   - Implement proper authentication

## Monitoring and Maintenance

### Health Checks

- Frontend: `https://your-domain.com/api/health`
- Backend: `https://your-domain.com/api/health`
- Database: `docker exec namc-norcal-db pg_isready`

### Backup Strategy

1. **Database Backups:**
   ```bash
   docker exec namc-norcal-db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
   ```

2. **Uploaded Files:**
   ```bash
   tar -czf uploads-backup.tar.gz uploads/
   ```

### Updates and Maintenance

1. **Update application:**
   ```bash
   git pull origin main
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Database migrations:**
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Check if ports 80, 443, 3000, 8000 are available
   - Modify port mappings in docker-compose.prod.yml if needed

2. **Database connection errors:**
   - Verify DATABASE_URL format
   - Check PostgreSQL container logs
   - Ensure database is running

3. **SSL certificate errors:**
   - Verify certificate files exist
   - Check certificate validity
   - Ensure proper file permissions

### Debug Commands

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# Access backend container
docker exec -it namc-norcal-backend sh

# Access database
docker exec -it namc-norcal-db psql -U $POSTGRES_USER -d $POSTGRES_DB

# Check Redis
docker exec -it namc-norcal-redis redis-cli
```

## Scaling Considerations

For high-traffic deployments:

1. **Horizontal Scaling:**
   - Use Docker Swarm or Kubernetes
   - Add load balancer
   - Scale backend/frontend replicas

2. **Database Optimization:**
   - Enable connection pooling
   - Add read replicas
   - Optimize queries and indexes

3. **Caching Strategy:**
   - Implement Redis caching
   - Use CDN for static assets
   - Enable browser caching

## Support

For deployment assistance:
- Check logs for detailed error messages
- Review this documentation
- Contact the development team

Remember to regularly update dependencies and monitor security advisories for all components.