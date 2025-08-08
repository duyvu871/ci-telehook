# GitHub CI/CD Telegram Notification Bot

Một ứng dụng Node.js với Express, TypeScript, Prisma và PostgreSQL để nhận webhook từ GitHub CI/CD và gửi thông báo qua Telegram bot.

## Tính năng

- 🤖 **Telegram Bot**: Nhận thông báo CI/CD qua Telegram
- 🔐 **Authentication**: Đăng nhập an toàn với JWT
- 📊 **Project Management**: Quản lý dự án và cài đặt thông báo
- 🔗 **GitHub Webhooks**: Tự động nhận webhook từ GitHub Actions
- 🐳 **Docker Support**: Triển khai dễ dàng với Docker
- 📱 **Responsive API**: RESTful API với documentation

## Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd tele-cicd
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình environment variables

Copy file `.env.example` thành `.env` và cấu hình:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/tele_cicd?schema=public"

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Webhook Security
WEBHOOK_SECRET=your-webhook-secret

# Default Bot Credentials
DEFAULT_BOT_USERNAME=your-github-username
DEFAULT_BOT_PASSWORD=your-secure-password
```

### 4. Thiết lập database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. Chạy ứng dụng

#### Development
```bash
npm run dev
```

#### Production
```bash
npm run build
npm start
```

#### Docker
```bash
# Development
npm run docker:dev

# Production
npm run docker:up
```

## Sử dụng

### 1. Thiết lập Telegram Bot

1. Tạo bot mới với [@BotFather](https://t.me/botfather)
2. Lấy token và cập nhật vào `.env`
3. Lấy chat ID của bạn và cập nhật vào `.env`

### 2. Cấu hình GitHub Webhook

1. Vào Settings > Webhooks của repository
2. Thêm webhook với URL: `https://your-domain.com/api/webhook/github`
3. Chọn events: `Workflow runs`
4. Thêm secret trong header `X-Webhook-Secret`

### 3. API Endpoints

#### Authentication
```bash
# Login
POST /api/auth/login
{
  "username": "your-username",
  "password": "your-password"
}

# Change password
POST /api/auth/change-password
Authorization: Bearer <token>
{
  "currentPassword": "current-password",
  "newPassword": "new-password"
}

# Get profile
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Projects
```bash
# Create project
POST /api/projects
Authorization: Bearer <token>
{
  "name": "My Project",
  "repository": "username/repository",
  "description": "Project description"
}

# Get projects
GET /api/projects
Authorization: Bearer <token>

# Toggle project status
PATCH /api/projects/:id/toggle
Authorization: Bearer <token>
```

#### Webhooks
```bash
# GitHub webhook
POST /api/webhook/github
X-Webhook-Secret: your-webhook-secret
{
  "workflow_name": "CI",
  "repository": "username/repository",
  "run_id": "123456789",
  "run_url": "https://github.com/username/repository/actions/runs/123456789",
  "status": "success",
  "branch": "main",
  "commit_sha": "abc123def456",
  "commit_message": "Fix bug",
  "actor": "username"
}
```

### 4. Telegram Bot Commands

- `/start` - Khởi động bot
- `/register` - Đăng ký nhận thông báo
- `/settings` - Xem cài đặt thông báo
- `/projects` - Xem danh sách dự án
- `/toggle_success` - Bật/tắt thông báo thành công
- `/toggle_failure` - Bật/tắt thông báo thất bại
- `/toggle_build` - Bật/tắt thông báo build
- `/toggle_deploy` - Bật/tắt thông báo deploy
- `/toggle_test` - Bật/tắt thông báo test
- `/help` - Xem trợ giúp

## GitHub Actions Workflow Example

```yaml
name: CI/CD Notification
on:
  workflow_run:
    workflows: ["CI", "Deploy"]
    types: [completed]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        run: |
          STATUS="${{ github.event.workflow_run.conclusion }}"
          REPO="${{ github.repository }}"
          RUN_ID="${{ github.event.workflow_run.id }}"
          WORKFLOW="${{ github.event.workflow_run.name }}"
          BRANCH="${{ github.event.workflow_run.head_branch }}"
          COMMIT_SHA="${{ github.event.workflow_run.head_sha }}"
          COMMIT_MESSAGE="${{ github.event.head_commit.message }}"
          ACTOR="${{ github.event.workflow_run.actor.login }}"
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

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database
npm run db:studio    # Open Prisma Studio
npm run docker:dev   # Start with Docker (development)
npm run docker:up    # Start with Docker (production)
npm run docker:down  # Stop Docker containers
```

### Database Management

```bash
# Access PostgreSQL in Docker
docker exec -it tele-cicd-db-1 psql -U postgres -d tele_cicd

# Access pgAdmin
# Open http://localhost:8080
# Email: admin@example.com
# Password: admin
```

### Project Structure

```
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic
│   ├── types/           # TypeScript types
│   └── index.ts         # Main application file
├── prisma/
│   └── schema.prisma    # Database schema
├── docker-compose.yml   # Production Docker setup
├── docker-compose.dev.yml # Development Docker setup
├── Dockerfile           # Docker image definition
└── README.md           # This file
```

## Troubleshooting

### Common Issues

1. **Database connection error**
   - Kiểm tra DATABASE_URL trong .env
   - Đảm bảo PostgreSQL đang chạy

2. **Telegram bot không hoạt động**
   - Kiểm tra TELEGRAM_BOT_TOKEN
   - Đảm bảo bot đã được start với /start

3. **Webhook không nhận được**
   - Kiểm tra WEBHOOK_SECRET
   - Kiểm tra URL webhook trên GitHub

### Logs

```bash
# Docker logs
npm run docker:logs

# Application logs
tail -f logs/app.log
```

## License

MIT

## Support

Nếu gặp vấn đề, vui lòng tạo issue hoặc liên hệ admin.
