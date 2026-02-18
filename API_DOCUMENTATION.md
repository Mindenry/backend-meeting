# 📚 API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints require JWT authentication. Include token in header:
```
Authorization: Bearer <token>
```

---

## 🔧 Repositories API

### Create Repository
```http
POST /repositories
Content-Type: application/json

{
  "name": "my-project",
  "description": "Project repository",
  "url": "https://github.com/user/repo",
  "isPrivate": true,
  "teamId": "team-uuid"
}
```

### List Repositories
```http
GET /repositories?teamId=team-uuid&ownerId=user-uuid
```

### Get Repository
```http
GET /repositories/:id
```

### Create Branch
```http
POST /repositories/:id/branches
Content-Type: application/json

{
  "name": "feature/new-feature",
  "isDefault": false
}
```

### Create Commit
```http
POST /repositories/:id/commits
Content-Type: application/json

{
  "sha": "abc123def456",
  "message": "Add new feature",
  "branch": "main",
  "filesChanged": [
    { "path": "src/file.ts", "additions": 10, "deletions": 2 }
  ]
}
```

### Create Pull Request
```http
POST /repositories/:id/pull-requests
Content-Type: application/json

{
  "title": "Add new feature",
  "description": "This PR adds a new feature",
  "sourceBranch": "feature/new-feature",
  "targetBranch": "main"
}
```

### Create Code Review
```http
POST /repositories/pull-requests/:prId/reviews
Content-Type: application/json

{
  "status": "approved",
  "comment": "Looks good!"
}
```

### Create Code Comment
```http
POST /repositories/pull-requests/:prId/comments
Content-Type: application/json

{
  "content": "Consider using a constant here",
  "filePath": "src/file.ts",
  "lineNumber": 42
}
```

### Link PR to Task
```http
POST /repositories/pull-requests/:prId/link-task/:taskId
```

---

## 🤖 AI API

### Generate Meeting Summary
```http
POST /ai/meetings/:meetingId/summary
Content-Type: application/json

{
  "transcription": "Meeting transcript here..."
}
```

### Get Meeting Summary
```http
GET /ai/meetings/:meetingId/summary
```

### Generate Code Review
```http
POST /ai/pull-requests/:prId/review
Content-Type: application/json

{
  "codeDiff": "diff --git a/file.ts..."
}
```

### Get Task Suggestions
```http
POST /ai/tasks/:taskId/suggestions
```

### Chat Assistant
```http
POST /ai/chat
Content-Type: application/json

{
  "message": "What tasks do I have today?",
  "context": {}
}
```

### Generate Document
```http
POST /ai/documents/generate
Content-Type: application/json

{
  "type": "meeting_minutes",
  "context": {
    "title": "Team Meeting",
    "participants": ["User 1", "User 2"]
  }
}
```

### Get AI History
```http
GET /ai/history?type=meeting_summary
```

---

## 🏢 Virtual Office API

### Create Room
```http
POST /virtual-office/rooms
Content-Type: application/json

{
  "name": "Main Office",
  "description": "Team workspace",
  "type": "office",
  "capacity": 50,
  "isPrivate": false,
  "teamId": "team-uuid"
}
```

### List Rooms
```http
GET /virtual-office/rooms?teamId=team-uuid&type=office
```

### Join Room
```http
POST /virtual-office/rooms/:id/join
Content-Type: application/json

{
  "position": { "x": 100, "y": 200 }
}
```

### Leave Room
```http
POST /virtual-office/rooms/:id/leave
```

### Update Presence
```http
PATCH /virtual-office/rooms/:id/presence
Content-Type: application/json

{
  "position": { "x": 150, "y": 250 },
  "status": "active"
}
```

### Get Room Presences
```http
GET /virtual-office/rooms/:id/presences
```

### Create Quick Huddle
```http
POST /virtual-office/quick-huddle
Content-Type: application/json

{
  "teamId": "team-uuid",
  "participantIds": ["user1-uuid", "user2-uuid"]
}
```

### WebSocket Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/virtual-office', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join room
socket.emit('join-room', {
  roomId: 'room-uuid',
  userId: 'user-uuid',
  position: { x: 100, y: 200 }
});

// Update position
socket.emit('update-position', {
  roomId: 'room-uuid',
  userId: 'user-uuid',
  position: { x: 150, y: 250 }
});

// Listen for events
socket.on('user-joined', (presence) => {
  console.log('User joined:', presence);
});

socket.on('position-updated', (presence) => {
  console.log('Position updated:', presence);
});
```

---

## ⚙️ Workflows API

### Create Workflow
```http
POST /workflows
Content-Type: application/json

{
  "name": "Auto-create task from PR",
  "description": "Creates a task when PR is merged",
  "trigger": "pr_merged",
  "conditions": {
    "field": "status",
    "operator": "equals",
    "value": "merged"
  },
  "actions": [
    {
      "type": "create_task",
      "title": "Review PR: {{title}}",
      "description": "PR merged: {{description}}",
      "priority": "high",
      "assigneeId": "{{creatorId}}"
    }
  ],
  "teamId": "team-uuid"
}
```

### List Workflows
```http
GET /workflows?teamId=team-uuid&isActive=true
```

### Execute Workflow
```http
POST /workflows/:id/execute
Content-Type: application/json

{
  "input": {
    "id": "pr-uuid",
    "title": "PR Title",
    "description": "PR Description",
    "type": "pullrequest"
  }
}
```

### Trigger Workflow by Event
```http
POST /workflows/trigger/pr_merged
Content-Type: application/json

{
  "data": {
    "id": "pr-uuid",
    "title": "PR Title",
    "status": "merged"
  }
}
```

### Get Workflow Runs
```http
GET /workflows/:id/runs?status=completed&limit=10
```

---

## 📊 Analytics API

### Get Team Analytics
```http
GET /analytics/teams/:teamId?start=2024-01-01&end=2024-01-31
```

### Get User Metrics
```http
GET /analytics/users/:userId?start=2024-01-01&end=2024-01-31
```

### Get Dashboard Data
```http
GET /analytics/dashboard/:teamId
```

### Get My Metrics
```http
GET /analytics/my-metrics?start=2024-01-01&end=2024-01-31
```

---

## 📝 Example Workflow Configurations

### 1. Auto-create Task from Meeting
```json
{
  "name": "Create tasks from meeting action items",
  "trigger": "meeting_ended",
  "conditions": {
    "field": "hasActionItems",
    "operator": "equals",
    "value": true
  },
  "actions": [
    {
      "type": "create_task",
      "title": "{{actionItem}}",
      "description": "From meeting: {{meetingTitle}}",
      "assigneeId": "{{assigneeId}}",
      "priority": "medium"
    }
  ]
}
```

### 2. Auto-schedule Follow-up Meeting
```json
{
  "name": "Schedule follow-up after PR review",
  "trigger": "pr_reviewed",
  "conditions": {
    "field": "reviewStatus",
    "operator": "equals",
    "value": "changes_requested"
  },
  "actions": [
    {
      "type": "create_meeting",
      "title": "Follow-up: {{prTitle}}",
      "description": "Discuss PR review feedback",
      "startTime": "{{nextWeek}}",
      "endTime": "{{nextWeekPlus1Hour}}"
    },
    {
      "type": "send_notification",
      "userId": "{{prCreatorId}}",
      "title": "Follow-up Meeting Scheduled",
      "message": "A follow-up meeting has been scheduled for your PR"
    }
  ]
}
```

### 3. Auto-link PR to Task
```json
{
  "name": "Link PR to related task",
  "trigger": "pr_created",
  "conditions": {
    "field": "hasTaskReference",
    "operator": "equals",
    "value": true
  },
  "actions": [
    {
      "type": "link_pr_to_task",
      "pullRequestId": "{{id}}",
      "taskId": "{{taskId}}"
    }
  ]
}
```

### 4. Auto-generate AI Summary
```json
{
  "name": "Generate AI summary after meeting",
  "trigger": "meeting_ended",
  "actions": [
    {
      "type": "create_ai_summary",
      "meetingId": "{{id}}"
    }
  ]
}
```

---

## 🔐 Environment Variables

Create `.env` file:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/meetdb"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# OpenAI (Optional - for AI features)
OPENAI_API_KEY="sk-..."

# Server
PORT=3000
NODE_ENV=development
```

---

## 🚀 Quick Start

1. **Start Server**
   ```bash
   cd backend-meeting
   npm run start:dev
   ```

2. **Test API**
   ```bash
   # Get auth token first
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password"}'

   # Use token in subsequent requests
   curl -X GET http://localhost:3000/api/repositories \
     -H "Authorization: Bearer <token>"
   ```

3. **Connect WebSocket**
   ```javascript
   const socket = io('http://localhost:3000/virtual-office', {
     auth: { token: 'your-jwt-token' }
   });
   ```

---

## 📌 Response Formats

### Success Response
```json
{
  "id": "uuid",
  "name": "Example",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

---

## 🔄 WebSocket Events

### Virtual Office Events

**Client → Server:**
- `join-room` - Join a virtual room
- `leave-room` - Leave a virtual room
- `update-position` - Update user position
- `update-status` - Update user status
- `request-presences` - Request room presences

**Server → Client:**
- `user-joined` - User joined room
- `user-left` - User left room
- `position-updated` - Position updated
- `status-updated` - Status updated
- `room-presences` - Room presences data

---

## 📚 Additional Resources

- See `PROJECT_FEATURES.md` for feature descriptions
- See `IMPLEMENTATION_SUMMARY.md` for implementation details
