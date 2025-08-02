# AI Medical Scribe MVP - Setup Instructions

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ 
- Python 3.11+
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd medai
```

### 2. Environment Setup

Create environment files:

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Web environment  
cp web/.env.example web/.env
# Edit web/.env with your configuration
```

### 3. Start All Services

```bash
# Start all services with Docker Compose
docker compose up -d

# Verify services are running
docker compose ps
```

### 4. Initialize Database

```bash
# The database will be automatically initialized with the schema
# Check logs to confirm
docker compose logs postgres
```

### 5. Access Applications

- **Web Console**: http://localhost:3001
- **API Gateway**: http://localhost:3000
- **Python Service**: http://localhost:8000
- **Database**: localhost:5432
- **Redis**: localhost:6379

## Development Setup

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### Web Development

```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run e2e tests
npm run test:e2e
```

### Mobile Development

```bash
cd mobile

# Install dependencies
npm install

# iOS (requires macOS)
npx react-native run-ios

# Android
npx react-native run-android
```

## Testing

### Unit Tests

```bash
# Backend tests
cd backend && npm test

# Web tests  
cd web && npm test

# Mobile tests
cd mobile && npm test
```

### E2E Tests

```bash
# Web e2e tests
cd web && npm run test:e2e

# Mobile e2e tests (requires device/simulator)
cd mobile && npm run test:e2e
```

### API Tests

```bash
# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:8000/health
```

## Configuration

### Environment Variables

#### Backend (.env)
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://medai_user:medai_password@localhost:5432/medai
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
OPENAI_API_KEY=your-openai-api-key
```

#### Web (.env)
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Database Configuration

The PostgreSQL database includes:
- Users and clinics tables
- Audio recordings and transcripts
- Draft notes and final notes
- Audit logs for compliance
- Proper indexes for performance

### Security Features

- JWT authentication
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

## Deployment

### Production Deployment

1. **Build Docker Images**
```bash
docker build -f backend/Dockerfile.gateway -t medai/gateway:latest ./backend
docker build -f backend/Dockerfile.python -t medai/scribe-core:latest ./backend
docker build -f web/Dockerfile -t medai/web:latest ./web
```

2. **Deploy with Docker Compose**
```bash
docker compose -f docker-compose.prod.yml up -d
```

3. **Set up Reverse Proxy**
```nginx
# nginx.conf
server {
    listen 80;
    server_name medai.com;
    
    location / {
        proxy_pass http://web:3001;
    }
    
    location /api {
        proxy_pass http://gateway:3000;
    }
}
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

## Monitoring and Logging

### Health Checks

- Backend: `GET /health`
- Python Service: `GET /health`
- Database: PostgreSQL health check
- Redis: Redis health check

### Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f gateway
docker compose logs -f scribe-core
```

### Metrics

- Application metrics via Prometheus
- Database performance monitoring
- API response times
- Error rates and alerts

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check database logs
docker compose logs postgres
```

2. **Redis Connection Failed**
```bash
# Check if Redis is running
docker compose ps redis

# Test Redis connection
docker compose exec redis redis-cli ping
```

3. **API Gateway Not Responding**
```bash
# Check gateway logs
docker compose logs gateway

# Restart gateway
docker compose restart gateway
```

4. **Python Service Errors**
```bash
# Check Python service logs
docker compose logs scribe-core

# Check OpenAI API key
echo $OPENAI_API_KEY
```

### Performance Issues

1. **Slow Database Queries**
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

2. **Memory Issues**
```bash
# Check container memory usage
docker stats
```

3. **Network Issues**
```bash
# Test network connectivity
docker compose exec gateway ping scribe-core
```

## Security Checklist

- [ ] Change default passwords
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Set up backup procedures
- [ ] Configure rate limiting
- [ ] Enable CORS properly
- [ ] Validate all inputs
- [ ] Sanitize outputs
- [ ] Use secure headers

## Compliance Features

### GDPR Compliance

- Data encryption at rest and in transit
- Right to be forgotten implementation
- Data retention policies
- Audit trail logging
- EU data residency

### HIPAA Compliance

- PHI protection
- Access controls
- Audit logging
- Data backup
- Incident response

## Support

For issues and questions:

1. Check the logs: `docker compose logs`
2. Review the documentation
3. Run tests: `npm test`
4. Check GitHub Issues
5. Contact the development team

## Future Enhancements

- Analytics dashboard
- Admin panel
- Multi-language support
- Advanced pricing tiers
- Real-time collaboration
- Mobile push notifications
- Advanced AI models
- Integration with more EHR systems 