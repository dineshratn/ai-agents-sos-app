# Deployment Guide - Multi-Agent Emergency Assessment System

Complete guide for deploying the SOS Multi-Agent System to production environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Docker**: v20.10 or higher
- **Docker Compose**: v2.0 or higher (optional)
- **Python**: 3.11+ (for local development)
- **Git**: For cloning repository

### API Keys

You'll need an OpenRouter API key:

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Create an account
3. Generate an API key
4. Copy the key for configuration

**Cost Estimate:**
- DeepSeek Chat: ~$0.0012 per emergency assessment
- 1,000 requests: ~$1.20
- Very affordable for development and production

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/docker-ai-agents-training.git
cd docker-ai-agents-training/week1-basics
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your OpenRouter API key
nano .env
```

Add to `.env`:
```env
OPENROUTER_API_KEY=your_actual_api_key_here
VERIFY_SSL=true
```

### 3. Build & Run

```bash
# Build Docker image
cd agents
docker build -t sos-agents:latest .

# Run container
docker run -d \
  --name sos-agents \
  -p 8000:8000 \
  --env-file ../.env \
  sos-agents:latest

# Check logs
docker logs -f sos-agents
```

### 4. Verify Deployment

```bash
# Health check
curl http://localhost:8000/health

# API information
curl http://localhost:8000/

# Test assessment
curl -X POST http://localhost:8000/assess-multi \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Severe chest pain",
    "location": "Home"
  }'
```

**Expected Response:** JSON with assessment, guidance, resources, and metrics.

---

## Environment Configuration

### Required Environment Variables

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-xxxxx...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
SITE_URL=http://localhost:3000
SITE_NAME=SOS Multi-Agent System

# Model Configuration
MODEL_NAME=deepseek/deepseek-chat
TEMPERATURE=0.3
MAX_TOKENS=1000

# Server Configuration
HOST=0.0.0.0
PORT=8000

# SSL Configuration (for corporate proxies)
VERIFY_SSL=true
```

### Optional Environment Variables

```env
# Logging
LOG_LEVEL=INFO

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=60

# Checkpointing
CHECKPOINT_BACKEND=memory  # Options: memory, redis, postgres
```

### .env.example Template

Create `.env.example` for version control:

```env
# Copy this file to .env and fill in your values
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
SITE_URL=http://localhost:3000
SITE_NAME=SOS Multi-Agent System
MODEL_NAME=deepseek/deepseek-chat
TEMPERATURE=0.3
MAX_TOKENS=1000
HOST=0.0.0.0
PORT=8000
VERIFY_SSL=true
```

---

## Docker Deployment

### Method 1: Simple Docker Run

**Development:**
```bash
docker run -d \
  --name sos-agents \
  -p 8000:8000 \
  --env-file .env \
  sos-agents:latest
```

**Production:**
```bash
docker run -d \
  --name sos-agents \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  --memory="2g" \
  --cpus="1.0" \
  --health-cmd="curl -f http://localhost:8000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  sos-agents:latest
```

### Method 2: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  sos-agents:
    build:
      context: ./agents
      dockerfile: Dockerfile
    container_name: sos-agents
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Optional: Node.js Gateway (if using frontend)
  # node-gateway:
  #   build:
  #     context: ./backend
  #     dockerfile: Dockerfile
  #   container_name: node-gateway
  #   ports:
  #     - "3000:3000"
  #   environment:
  #     - PYTHON_SERVICE_URL=http://sos-agents:8000
  #   depends_on:
  #     - sos-agents
  #   restart: unless-stopped
```

**Deploy:**
```bash
docker-compose up -d
docker-compose logs -f
```

---

## Production Deployment

### 1. Cloud Deployment (AWS ECS Example)

**Create ECS Task Definition:**

```json
{
  "family": "sos-agents",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "sos-agents",
      "image": "your-ecr-repo/sos-agents:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "MODEL_NAME",
          "value": "deepseek/deepseek-chat"
        }
      ],
      "secrets": [
        {
          "name": "OPENROUTER_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:openrouter-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sos-agents",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

**Deploy Steps:**
```bash
# 1. Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t sos-agents:latest agents/
docker tag sos-agents:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/sos-agents:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/sos-agents:latest

# 2. Create/Update ECS Service
aws ecs create-service \
  --cluster production \
  --service-name sos-agents \
  --task-definition sos-agents \
  --desired-count 2 \
  --launch-type FARGATE \
  --load-balancers targetGroupArn=<target-group-arn>,containerName=sos-agents,containerPort=8000
```

### 2. Kubernetes Deployment

**Create `k8s-deployment.yaml`:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sos-agents
  labels:
    app: sos-agents
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sos-agents
  template:
    metadata:
      labels:
        app: sos-agents
    spec:
      containers:
      - name: sos-agents
        image: your-registry/sos-agents:latest
        ports:
        - containerPort: 8000
        env:
        - name: MODEL_NAME
          value: "deepseek/deepseek-chat"
        - name: OPENROUTER_API_KEY
          valueFrom:
            secretKeyRef:
              name: openrouter-secret
              key: api-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: sos-agents-service
spec:
  selector:
    app: sos-agents
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

**Deploy:**
```bash
# Create secret
kubectl create secret generic openrouter-secret \
  --from-literal=api-key='your-api-key'

# Deploy
kubectl apply -f k8s-deployment.yaml

# Check status
kubectl get pods
kubectl logs -f deployment/sos-agents
```

### 3. Reverse Proxy (Nginx)

**nginx.conf:**

```nginx
upstream sos_agents {
    least_conn;
    server 127.0.0.1:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yoursite.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yoursite.com;

    ssl_certificate /etc/ssl/certs/yoursite.crt;
    ssl_certificate_key /etc/ssl/private/yoursite.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://sos_agents;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## Monitoring & Maintenance

### 1. Health Checks

**Basic Health Check:**
```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "SOS Multi-Agent System",
  "version": "3.0.0",
  "model": "deepseek/deepseek-chat",
  "provider": "OpenRouter"
}
```

### 2. Log Monitoring

**View Logs:**
```bash
# Real-time logs
docker logs -f sos-agents

# Last 100 lines
docker logs --tail 100 sos-agents

# Search for errors
docker logs sos-agents | grep "❌"

# View workflow completions
docker logs sos-agents | grep "WORKFLOW COMPLETED"
```

### 3. Performance Monitoring

**Key Metrics to Track:**

```bash
# Request rate
docker logs sos-agents | grep "WORKFLOW STARTED" | wc -l

# Average response time
docker logs sos-agents | grep "Total execution time" | awk '{print $NF}' | awk '{s+=$1; n++} END {print s/n "s"}'

# Error rate
docker logs sos-agents | grep -c "❌"

# Confidence scores
docker logs sos-agents | grep "CONFIDENCE" | awk '{print $NF}'
```

### 4. Resource Usage

```bash
# Container stats
docker stats sos-agents

# Disk usage
docker system df

# Clean up
docker system prune -a
```

### 5. Backup & Recovery

**Backup Configuration:**
```bash
# Backup environment
cp .env .env.backup.$(date +%Y%m%d)

# Export Docker image
docker save sos-agents:latest | gzip > sos-agents-backup.tar.gz
```

**Recovery:**
```bash
# Restore image
docker load < sos-agents-backup.tar.gz

# Restart container
docker stop sos-agents
docker rm sos-agents
docker run -d --name sos-agents -p 8000:8000 --env-file .env sos-agents:latest
```

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

**Symptoms:**
```bash
docker ps -a
# STATUS: Exited (1)
```

**Solution:**
```bash
# Check logs
docker logs sos-agents

# Common issues:
# - Missing .env file → Create .env with OPENROUTER_API_KEY
# - Invalid API key → Verify key in .env
# - Port conflict → Change port: -p 8001:8000
```

#### 2. Connection Errors in Responses

**Symptoms:**
```json
{
  "assessment": {
    "emergency_type": "unknown",
    "confidence": 1.0
  }
}
```

**Solution:**
```bash
# Check API key
docker exec sos-agents env | grep OPENROUTER_API_KEY

# Test API key directly
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek/deepseek-chat","messages":[{"role":"user","content":"test"}]}'

# Check SSL verification
# If behind corporate proxy, set VERIFY_SSL=false in .env
```

#### 3. Slow Response Times

**Symptoms:**
- Responses taking >10 seconds

**Solution:**
```bash
# Check network
docker exec sos-agents ping -c 3 openrouter.ai

# Monitor LLM calls
docker logs -f sos-agents | grep "LLM_CALL"

# Consider faster model or regional deployment
```

#### 4. High Memory Usage

**Symptoms:**
```bash
docker stats sos-agents
# MEM USAGE: >2GB
```

**Solution:**
```bash
# Restart container
docker restart sos-agents

# Limit memory
docker update --memory="2g" sos-agents

# Check for memory leaks in logs
docker logs sos-agents | grep -i "memory"
```

---

## Security Best Practices

1. **API Keys**
   - Never commit .env to version control
   - Use secrets management (AWS Secrets Manager, Vault)
   - Rotate keys regularly

2. **Network Security**
   - Use HTTPS in production
   - Implement rate limiting
   - Use firewall rules

3. **Container Security**
   - Run as non-root user
   - Use minimal base images
   - Scan for vulnerabilities
   - Keep dependencies updated

4. **Monitoring**
   - Set up alerting
   - Monitor unusual patterns
   - Track error rates
   - Log security events

---

## Maintenance Schedule

**Daily:**
- Check health endpoint
- Monitor error logs
- Review performance metrics

**Weekly:**
- Analyze usage patterns
- Check resource utilization
- Review confidence scores
- Update dependencies

**Monthly:**
- Security audit
- Cost analysis
- Performance optimization
- Backup verification

---

## Support & Resources

- **Documentation**: `/docs` directory
- **API Docs**: http://localhost:8000/docs
- **Issue Tracking**: GitHub Issues
- **Email Support**: support@yoursite.com

---

## Conclusion

This deployment guide covers development, staging, and production scenarios. Follow security best practices and monitor your deployment regularly for optimal performance.

**Next Steps:**
1. Set up monitoring and alerting
2. Configure backup strategy
3. Implement CI/CD pipeline
4. Performance testing and optimization
