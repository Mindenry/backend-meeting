# 🚀 Quick Start Guide

## Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

## Setup Steps

### 1. Install Dependencies
```bash
cd backend-meeting
npm install
```

### 2. Configure Environment
Create `.env` file (copy from `.env.example` if exists):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/meetdb"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development

```

### 3. Setup Database
```bash
# Run migrations
npx prisma migrate dev

# (Optional) Seed database
npm run prisma:seed
```

### 4. Start Development Server
```bash
npm run start:dev
```

Server will start on `http://localhost:3000`

### 5. Verify Installation
```bash
# Check if server is running
curl http://localhost:3000/api

# Or visit in browser
# http://localhost:3000/api
```

## API Endpoints

Base URL: `http://localhost:3000/api`

### Authentication
```bash
# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Response includes JWT token
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Use Token
```bash
# Include in header
Authorization: Bearer <token>
```

## Testing New Features

### 1. Test Git Repository
```bash
# Create repository
curl -X POST http://localhost:3000/api/repositories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-repo",
    "description": "Test repository"
  }'
```

### 2. Test Meeting Summary
```bash
# Generate meeting summary (rule-based, no AI required)
curl -X POST http://localhost:3000/api/meetings/:meetingId/ai-summary \
  -H "Authorization: Bearer <token>"
```

### 3. Test Virtual Office
```bash
# Create virtual room
curl -X POST http://localhost:3000/api/virtual-office/rooms \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Office",
    "type": "office",
    "capacity": 50
  }'
```

### 4. Test Workflows
```bash
# Create workflow
curl -X POST http://localhost:3000/api/workflows \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auto-create task from PR",
    "trigger": "pr_merged",
    "actions": [{
      "type": "create_task",
      "title": "Deploy: {{title}}",
      "priority": "high"
    }]
  }'
```

### 5. Test Analytics
```bash
# Get team analytics
curl -X GET http://localhost:3000/api/analytics/teams/:teamId \
  -H "Authorization: Bearer <token>"
```

## WebSocket Connection

### Virtual Office WebSocket
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/virtual-office', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join room
socket.emit('join-room', {
  roomId: 'room-id',
  userId: 'user-id',
  position: { x: 100, y: 200 }
});

// Listen for events
socket.on('user-joined', (presence) => {
  console.log('User joined:', presence);
});
```

## Common Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:prod        # Start production server
npm run build              # Build for production

# Database
npx prisma migrate dev      # Run migrations
npx prisma generate        # Generate Prisma Client
npx prisma studio          # Open Prisma Studio (GUI)

# Testing
npm run test               # Run unit tests
npm run test:e2e          # Run e2e tests
npm run test:cov          # Run with coverage

# Linting
npm run lint              # Check code style
npm run format            # Format code
```

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check database exists: `createdb meetdb`

### Port Already in Use
- Change PORT in .env
- Or kill process: `lsof -ti:3000 | xargs kill`

### Prisma Client Not Generated
```bash
npx prisma generate
```

### Migration Issues
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or create new migration
npx prisma migrate dev --name your_migration_name
```

## Next Steps

1. ✅ Database setup complete
2. ✅ Server running
3. 📖 Read `API_DOCUMENTATION.md` for API details
4. 📖 Read `WORKFLOW_EXAMPLES.md` for workflow examples
5. 📖 Read `PROJECT_FEATURES.md` for feature overview
6. 🚀 Start building frontend!

## Support

- API Documentation: `API_DOCUMENTATION.md`
- Workflow Examples: `WORKFLOW_EXAMPLES.md`
- Project Features: `PROJECT_FEATURES.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
