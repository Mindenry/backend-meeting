# Backend Team - CollabHub API

NestJS + Prisma + PostgreSQL backend for CollabHub team collaboration platform.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

Create a PostgreSQL database and set the `DATABASE_URL` environment variable:

```bash
# Windows
setx DATABASE_URL "postgresql://USER:PASSWORD@localhost:5432/meetdb?schema=public"

# Linux/Mac
export DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/meetdb?schema=public"
```

### 3. Run Migrations

```bash
npx prisma migrate dev
```

### 4. Seed Database

```bash
npm run prisma:seed
```

This will create:
- 9 users
- 3 teams (Engineering, Design, Operations)
- Team members
- 6 meetings (upcoming and past)
- 8 tasks (various statuses)
- 6 channels
- Sample messages

### 5. Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Users
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Teams
- `GET /teams` - Get all teams
- `GET /teams/:id` - Get team by ID
- `POST /teams` - Create team
- `PATCH /teams/:id` - Update team
- `DELETE /teams/:id` - Delete team
- `GET /teams/:id/members` - List team members
- `POST /teams/:id/members` - Add team member
- `DELETE /teams/:id/members?userId=xxx` - Remove team member

### Meetings
- `GET /meetings` - Get all meetings (query: `?status=upcoming&teamId=xxx`)
- `GET /meetings/:id` - Get meeting by ID
- `POST /meetings` - Create meeting
- `PATCH /meetings/:id` - Update meeting
- `DELETE /meetings/:id` - Delete meeting

### Tasks
- `GET /tasks` - Get all tasks (query: `?status=todo&teamId=xxx&assigneeId=xxx`)
- `GET /tasks/:id` - Get task by ID
- `POST /tasks` - Create task
- `PATCH /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task

## WebSocket Events

The server supports WebSocket connections for real-time updates:

- `meeting:created` - New meeting created
- `meeting:updated` - Meeting updated
- `meeting:deleted` - Meeting deleted
- `task:created` - New task created
- `task:updated` - Task updated
- `task:deleted` - Task deleted
- `team:created` - New team created
- `team:updated` - Team updated
- `team:member:added` - Team member added

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)

### AI Copilot

To enable the internal AI Copilot features (meeting summaries, overdue tasks overview, and generic assistant),
configure **Gemini only**:

- `GEMINI_API_KEY` – Google Gemini API key used by:
  - `MeetingsService.generateAiSummary` (meeting chat summaries)
  - `CopilotService` (`POST /ai/ask`) for questions such as:
    - "สรุป meeting วันนี้"
    - "ตอนนี้ task อะไรบ้างที่ overdue"
    - "ช่วยร่างข้อความ standup ให้หน่อย"
- `GEMINI_MODEL` – (optional) Gemini model name. If not set, the system will:
  - Call `ListModels` to auto-select a model that supports `generateContent`.
  - Fallback to `gemini-1.5-flash-latest` if auto-detection fails.

If `GEMINI_API_KEY` is not set, any call to AI features will fail with an error indicating that Gemini is not configured.

