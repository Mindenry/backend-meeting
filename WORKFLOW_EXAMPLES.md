# 🔄 Workflow Examples

## Overview
Workflows allow you to automate repetitive tasks based on events. Each workflow consists of:
- **Trigger**: Event that starts the workflow
- **Conditions**: Optional checks before executing
- **Actions**: Tasks to perform

---

## 📋 Common Workflow Patterns

### 1. Auto-create Task from PR Merge

**Use Case**: When a PR is merged, automatically create a task for deployment or testing.

```json
{
  "name": "Create deployment task on PR merge",
  "description": "Automatically creates a deployment task when PR is merged",
  "trigger": "pr_merged",
  "conditions": {
    "field": "status",
    "operator": "equals",
    "value": "merged"
  },
  "actions": [
    {
      "type": "create_task",
      "title": "Deploy: {{title}}",
      "description": "Deploy PR #{{number}} to production\n\n{{description}}",
      "priority": "high",
      "assigneeId": "{{creatorId}}",
      "tags": ["deployment", "pr-{{number}}"]
    },
    {
      "type": "send_notification",
      "userId": "{{creatorId}}",
      "title": "Deployment Task Created",
      "message": "A deployment task has been created for your merged PR"
    }
  ],
  "teamId": "your-team-id"
}
```

---

### 2. Auto-generate Meeting Summary

**Use Case**: After a meeting ends, automatically generate AI summary and create action items.

```json
{
  "name": "Auto-generate meeting summary",
  "description": "Generates AI summary and creates tasks from action items",
  "trigger": "meeting_ended",
  "actions": [
    {
      "type": "create_ai_summary",
      "meetingId": "{{id}}"
    }
  ],
  "teamId": "your-team-id"
}
```

**Note**: The AI service will automatically:
- Generate meeting summary
- Extract action items
- Create tasks from action items

---

### 3. Auto-schedule Follow-up Meeting

**Use Case**: When PR review requests changes, schedule a follow-up meeting.

```json
{
  "name": "Schedule follow-up after PR review",
  "description": "Schedules a follow-up meeting when PR review requests changes",
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
      "description": "Discuss PR review feedback and required changes",
      "startTime": "{{addDays(now(), 1)}}",
      "endTime": "{{addHours(startTime, 1)}}",
      "hostId": "{{prCreatorId}}"
    },
    {
      "type": "send_notification",
      "userId": "{{prCreatorId}}",
      "title": "Follow-up Meeting Scheduled",
      "message": "A follow-up meeting has been scheduled to discuss PR feedback"
    },
    {
      "type": "send_notification",
      "userId": "{{reviewerId}}",
      "title": "Follow-up Meeting Scheduled",
      "message": "A follow-up meeting has been scheduled to discuss PR feedback"
    }
  ],
  "teamId": "your-team-id"
}
```

---

### 4. Link PR to Task Automatically

**Use Case**: When a PR mentions a task ID, automatically link them.

```json
{
  "name": "Auto-link PR to task",
  "description": "Links PR to task when task ID is mentioned in PR description",
  "trigger": "pr_created",
  "conditions": {
    "field": "description",
    "operator": "contains",
    "value": "task-"
  },
  "actions": [
    {
      "type": "link_pr_to_task",
      "pullRequestId": "{{id}}",
      "taskId": "{{extractTaskId(description)}}"
    }
  ],
  "teamId": "your-team-id"
}
```

---

### 5. Notify Team on Important Events

**Use Case**: Notify all team members when a critical PR is created.

```json
{
  "name": "Notify team on critical PR",
  "description": "Notifies all team members when a PR is marked as critical",
  "trigger": "pr_created",
  "conditions": {
    "field": "priority",
    "operator": "equals",
    "value": "critical"
  },
  "actions": [
    {
      "type": "send_notification",
      "userId": "{{teamMember1}}",
      "title": "Critical PR Created",
      "message": "{{prTitle}} requires immediate attention"
    },
    {
      "type": "send_notification",
      "userId": "{{teamMember2}}",
      "title": "Critical PR Created",
      "message": "{{prTitle}} requires immediate attention"
    }
  ],
  "teamId": "your-team-id"
}
```

---

### 6. Auto-update Task Status

**Use Case**: When a PR linked to a task is merged, mark the task as done.

```json
{
  "name": "Mark task done on PR merge",
  "description": "Automatically marks linked task as done when PR is merged",
  "trigger": "pr_merged",
  "conditions": {
    "field": "hasLinkedTask",
    "operator": "equals",
    "value": true
  },
  "actions": [
    {
      "type": "update_task",
      "taskId": "{{linkedTaskId}}",
      "status": "done",
      "updates": {
        "completedAt": "{{now()}}"
      }
    }
  ],
  "teamId": "your-team-id"
}
```

---

### 7. Create Task from Meeting Action Items

**Use Case**: After a meeting, create tasks for each action item.

```json
{
  "name": "Create tasks from meeting action items",
  "description": "Creates tasks from meeting action items automatically",
  "trigger": "meeting_ended",
  "conditions": {
    "field": "hasActionItems",
    "operator": "equals",
    "value": true
  },
  "actions": [
    {
      "type": "create_task",
      "title": "{{actionItem1}}",
      "description": "From meeting: {{meetingTitle}}\nDate: {{meetingDate}}",
      "assigneeId": "{{actionItem1Assignee}}",
      "priority": "medium",
      "dueDate": "{{actionItem1DueDate}}"
    },
    {
      "type": "create_task",
      "title": "{{actionItem2}}",
      "description": "From meeting: {{meetingTitle}}\nDate: {{meetingDate}}",
      "assigneeId": "{{actionItem2Assignee}}",
      "priority": "medium",
      "dueDate": "{{actionItem2DueDate}}"
    }
  ],
  "teamId": "your-team-id"
}
```

---

## 🎯 Trigger Types

Available trigger events:
- `pr_created` - Pull request created
- `pr_merged` - Pull request merged
- `pr_closed` - Pull request closed
- `pr_reviewed` - Pull request reviewed
- `commit_pushed` - Code committed
- `meeting_ended` - Meeting ended
- `meeting_started` - Meeting started
- `task_completed` - Task completed
- `task_created` - Task created
- `message_mentioned` - User mentioned in message

---

## ⚙️ Action Types

Available action types:
- `create_task` - Create a new task
- `create_meeting` - Schedule a meeting
- `send_notification` - Send notification to user
- `update_task` - Update task status/properties
- `link_pr_to_task` - Link PR to task
- `create_ai_summary` - Generate AI summary

---

## 🔧 Condition Operators

Available operators:
- `equals` - Exact match
- `not_equals` - Not equal
- `contains` - String contains
- `greater_than` - Numeric greater than
- `less_than` - Numeric less than
- `in` - Value in array
- `not_in` - Value not in array

---

## 📝 Variable Interpolation

Use `{{variable}}` to interpolate values from the event data:

- `{{id}}` - Event entity ID
- `{{title}}` - Title
- `{{description}}` - Description
- `{{creatorId}}` - Creator user ID
- `{{teamId}}` - Team ID
- `{{now()}}` - Current timestamp
- `{{addDays(date, days)}}` - Add days to date
- `{{addHours(date, hours)}}` - Add hours to date

---

## 🚀 Creating Workflows via API

```bash
curl -X POST http://localhost:3000/api/workflows \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auto-create task from PR merge",
    "trigger": "pr_merged",
    "actions": [
      {
        "type": "create_task",
        "title": "Deploy: {{title}}",
        "priority": "high"
      }
    ],
    "teamId": "your-team-id"
  }'
```

---

## 💡 Best Practices

1. **Test workflows** in development before enabling in production
2. **Use conditions** to prevent unnecessary actions
3. **Keep actions simple** - one action per workflow is often better
4. **Monitor workflow runs** to ensure they're working correctly
5. **Use notifications** sparingly to avoid notification fatigue
6. **Document workflows** with clear descriptions

---

## 🔍 Monitoring Workflows

Check workflow execution history:
```bash
curl -X GET http://localhost:3000/api/workflows/:id/runs \
  -H "Authorization: Bearer <token>"
```

Response includes:
- Execution status (running, completed, failed)
- Input/output data
- Error messages (if failed)
- Execution time
