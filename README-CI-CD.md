# GitHub CI/CD Setup Guide

## 🚀 Quick Setup

### 1. Repository Setup

1. Push your code to GitHub repository
2. Go to your repository Settings → Secrets and variables → Actions
3. Add the required secrets (see below)

### 2. Required Secrets

Add these secrets in your GitHub repository:

```
WEBHOOK_SECRET=your-webhook-secret-for-notifications
WEBHOOK_URL=https://your-domain.com/api/webhook/github
DATABASE_URL=your-production-database-url (for production deployment)
```

### 3. Optional Secrets

For enhanced functionality:

```
DOCKER_REGISTRY_TOKEN=your-docker-registry-token
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

## 📋 Available Workflows

### 1. Simple Build (`simple-build.yml`)
- **Trigger**: Push to main/develop, Pull Requests
- **Purpose**: Basic build verification
- **Actions**: Install deps → Generate Prisma → Build → Test Docker

### 2. CI/CD Pipeline (`ci-cd.yml`)
- **Trigger**: Push to main/develop, Pull Requests
- **Purpose**: Full CI/CD with notifications
- **Actions**: Test → Build → Security Scan → Deploy → Notify

### 3. Code Quality (`code-quality.yml`)
- **Trigger**: Push to main/develop, Pull Requests
- **Purpose**: Basic code checks (relaxed rules)
- **Actions**: TypeScript check → Prisma validation → Build check

### 4. Database Migration (`database-migration.yml`)
- **Trigger**: Manual workflow dispatch
- **Purpose**: Run database migrations
- **Actions**: Deploy or reset database migrations

### 5. Dependency Update (`dependency-update.yml`)
- **Trigger**: Weekly schedule, Manual
- **Purpose**: Automatic dependency updates
- **Actions**: Update deps → Create PR

## 🔧 Environment Setup

### Development Environment
```bash
NODE_ENV=development
PORT=3000
JWT_SECRET=your-dev-jwt-secret
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
DEFAULT_BOT_USERNAME=admin
DEFAULT_BOT_PASSWORD=admin123
WEBHOOK_SECRET=dev-webhook-secret
DATABASE_URL=postgresql://postgres:password@localhost:5432/tele_cicd
```

### Production Environment
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
DEFAULT_BOT_USERNAME=your-github-username
DEFAULT_BOT_PASSWORD=your-secure-password
WEBHOOK_SECRET=your-webhook-secret
DATABASE_URL=your-production-database-url
```

## 🐳 Docker Deployment

### Using Docker Compose

1. **Development**:
```bash
npm run docker:dev
```

2. **Production**:
```bash
npm run docker:up
```

### Manual Docker Commands

```bash
# Build image
docker build -t tele-cicd .

# Run with environment file
docker run --env-file .env -p 3000:3000 tele-cicd
```

## 📡 Webhook Integration

### GitHub Webhook Setup

1. Go to your repository Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhook/github`
3. Content type: `application/json`
4. Secret: Use your `WEBHOOK_SECRET`
5. Events: Select "Workflow runs"

### Workflow Notification Example

```yaml
- name: Send notification
  if: always()
  run: |
    STATUS="${{ job.status }}"
    REPO="${{ github.repository }}"
    RUN_ID="${{ github.run_id }}"
    WORKFLOW="${{ github.workflow }}"
    BRANCH="${{ github.ref_name }}"
    COMMIT_SHA="${{ github.sha }}"
    COMMIT_MESSAGE="${{ github.event.head_commit.message }}"
    ACTOR="${{ github.actor }}"
    RUN_URL="https://github.com/$REPO/actions/runs/$RUN_ID"
    
    PAYLOAD='{
      "workflow_name": "'$WORKFLOW'",
      "repository": "'$REPO'",
      "run_id": "'$RUN_ID'",
      "run_url": "'$RUN_URL'",
      "status": "'$STATUS'",
      "branch": "'$BRANCH'",
      "commit_sha": "'$COMMIT_SHA'",
      "commit_message": "'$COMMIT_MESSAGE'",
      "actor": "'$ACTOR'"
    }'

    curl -X POST -H "Content-Type: application/json" \
         -H "X-Webhook-Secret: ${{ secrets.WEBHOOK_SECRET }}" \
         -d "$PAYLOAD" "${{ secrets.WEBHOOK_URL }}"
```

## 🛠️ Local Testing

### Quick Test Script

```bash
# Linux/macOS
./scripts/test-local.sh

# Windows PowerShell
.\scripts\test-local.ps1

# Or use npm
npm run test:local
```

### Manual Testing Steps

1. **Install Dependencies**:
```bash
npm install
```

2. **Generate Prisma Client**:
```bash
npx prisma generate
```

3. **Build Project**:
```bash
npm run build
```

4. **Test Docker Build**:
```bash
docker build -t tele-cicd-test .
```

## 🔍 Troubleshooting

### Common Issues

1. **Build Fails**: Check TypeScript errors with `npx tsc --noEmit`
2. **Docker Build Fails**: Ensure all dependencies are in package.json
3. **Database Issues**: Verify DATABASE_URL and run migrations
4. **Webhook Not Working**: Check WEBHOOK_SECRET and URL

### Debug Commands

```bash
# Check workflow status
gh run list

# View workflow logs
gh run view <run-id>

# Test webhook locally
curl -X POST -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: your-secret" \
     -d '{"workflow_name":"test","repository":"user/repo","status":"success"}' \
     http://localhost:3000/api/webhook/github
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
