-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastCommit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "repositoryId" TEXT NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commit" (
    "id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "filesChanged" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repositoryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Commit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mergedAt" TIMESTAMP(3),
    "repositoryId" TEXT NOT NULL,
    "commitId" TEXT,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequestReview" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,

    CONSTRAINT "PullRequestReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "replyToId" TEXT,

    CONSTRAINT "CodeComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepositoryWebhook" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repositoryId" TEXT NOT NULL,

    CONSTRAINT "RepositoryWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInteraction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT,
    "response" TEXT NOT NULL,
    "context" JSONB,
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "tokensUsed" INTEGER,
    "cost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "meetingId" TEXT,
    "taskId" TEXT,
    "documentId" TEXT,
    "repositoryId" TEXT,

    CONSTRAINT "AIInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISummary" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyPoints" JSONB,
    "actionItems" JSONB,
    "sentiment" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relatedId" TEXT NOT NULL,
    "relatedType" TEXT NOT NULL,

    CONSTRAINT "AISummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICodeReview" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "suggestions" JSONB NOT NULL,
    "overallScore" DOUBLE PRECISION,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICodeReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITaskSuggestion" (
    "id" TEXT NOT NULL,
    "taskId" TEXT,
    "suggestion" TEXT NOT NULL,
    "priority" TEXT,
    "reasoning" TEXT,
    "estimatedTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AITaskSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'office',
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "VirtualRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualRoomPresence" (
    "id" TEXT NOT NULL,
    "position" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "VirtualRoomPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "workflowId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAnalytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metrics" JSONB NOT NULL,
    "productivityScore" DOUBLE PRECISION,
    "meetingHours" DOUBLE PRECISION,
    "activeMembers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "TeamAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductivityMetrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "meetingsAttended" INTEGER NOT NULL DEFAULT 0,
    "codeCommits" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "focusTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductivityMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LinkedPullRequests" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LinkedPullRequests_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Repository_teamId_idx" ON "Repository"("teamId");

-- CreateIndex
CREATE INDEX "Repository_ownerId_idx" ON "Repository"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_teamId_name_key" ON "Repository"("teamId", "name");

-- CreateIndex
CREATE INDEX "Branch_repositoryId_idx" ON "Branch"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_repositoryId_name_key" ON "Branch"("repositoryId", "name");

-- CreateIndex
CREATE INDEX "Commit_repositoryId_idx" ON "Commit"("repositoryId");

-- CreateIndex
CREATE INDEX "Commit_authorId_idx" ON "Commit"("authorId");

-- CreateIndex
CREATE INDEX "Commit_createdAt_idx" ON "Commit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Commit_repositoryId_sha_key" ON "Commit"("repositoryId", "sha");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_commitId_key" ON "PullRequest"("commitId");

-- CreateIndex
CREATE INDEX "PullRequest_repositoryId_idx" ON "PullRequest"("repositoryId");

-- CreateIndex
CREATE INDEX "PullRequest_creatorId_idx" ON "PullRequest"("creatorId");

-- CreateIndex
CREATE INDEX "PullRequest_status_idx" ON "PullRequest"("status");

-- CreateIndex
CREATE INDEX "PullRequestReview_pullRequestId_idx" ON "PullRequestReview"("pullRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequestReview_pullRequestId_reviewerId_key" ON "PullRequestReview"("pullRequestId", "reviewerId");

-- CreateIndex
CREATE INDEX "CodeComment_pullRequestId_idx" ON "CodeComment"("pullRequestId");

-- CreateIndex
CREATE INDEX "CodeComment_authorId_idx" ON "CodeComment"("authorId");

-- CreateIndex
CREATE INDEX "RepositoryWebhook_repositoryId_idx" ON "RepositoryWebhook"("repositoryId");

-- CreateIndex
CREATE INDEX "AIInteraction_userId_idx" ON "AIInteraction"("userId");

-- CreateIndex
CREATE INDEX "AIInteraction_meetingId_idx" ON "AIInteraction"("meetingId");

-- CreateIndex
CREATE INDEX "AIInteraction_taskId_idx" ON "AIInteraction"("taskId");

-- CreateIndex
CREATE INDEX "AIInteraction_type_idx" ON "AIInteraction"("type");

-- CreateIndex
CREATE INDEX "AIInteraction_createdAt_idx" ON "AIInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "AISummary_relatedId_relatedType_idx" ON "AISummary"("relatedId", "relatedType");

-- CreateIndex
CREATE INDEX "AISummary_type_idx" ON "AISummary"("type");

-- CreateIndex
CREATE INDEX "AICodeReview_pullRequestId_idx" ON "AICodeReview"("pullRequestId");

-- CreateIndex
CREATE INDEX "AITaskSuggestion_taskId_idx" ON "AITaskSuggestion"("taskId");

-- CreateIndex
CREATE INDEX "VirtualRoom_teamId_idx" ON "VirtualRoom"("teamId");

-- CreateIndex
CREATE INDEX "VirtualRoom_type_idx" ON "VirtualRoom"("type");

-- CreateIndex
CREATE INDEX "VirtualRoomPresence_roomId_idx" ON "VirtualRoomPresence"("roomId");

-- CreateIndex
CREATE INDEX "VirtualRoomPresence_userId_idx" ON "VirtualRoomPresence"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualRoomPresence_roomId_userId_key" ON "VirtualRoomPresence"("roomId", "userId");

-- CreateIndex
CREATE INDEX "Workflow_teamId_idx" ON "Workflow"("teamId");

-- CreateIndex
CREATE INDEX "Workflow_isActive_idx" ON "Workflow"("isActive");

-- CreateIndex
CREATE INDEX "Workflow_trigger_idx" ON "Workflow"("trigger");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_idx" ON "WorkflowRun"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");

-- CreateIndex
CREATE INDEX "WorkflowRun_startedAt_idx" ON "WorkflowRun"("startedAt");

-- CreateIndex
CREATE INDEX "TeamAnalytics_teamId_idx" ON "TeamAnalytics"("teamId");

-- CreateIndex
CREATE INDEX "TeamAnalytics_date_idx" ON "TeamAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TeamAnalytics_teamId_date_key" ON "TeamAnalytics"("teamId", "date");

-- CreateIndex
CREATE INDEX "ProductivityMetrics_userId_idx" ON "ProductivityMetrics"("userId");

-- CreateIndex
CREATE INDEX "ProductivityMetrics_date_idx" ON "ProductivityMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ProductivityMetrics_userId_date_key" ON "ProductivityMetrics"("userId", "date");

-- CreateIndex
CREATE INDEX "_LinkedPullRequests_B_index" ON "_LinkedPullRequests"("B");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestReview" ADD CONSTRAINT "PullRequestReview_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestReview" ADD CONSTRAINT "PullRequestReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeComment" ADD CONSTRAINT "CodeComment_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeComment" ADD CONSTRAINT "CodeComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeComment" ADD CONSTRAINT "CodeComment_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "CodeComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryWebhook" ADD CONSTRAINT "RepositoryWebhook_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInteraction" ADD CONSTRAINT "AIInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualRoom" ADD CONSTRAINT "VirtualRoom_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualRoomPresence" ADD CONSTRAINT "VirtualRoomPresence_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VirtualRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualRoomPresence" ADD CONSTRAINT "VirtualRoomPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAnalytics" ADD CONSTRAINT "TeamAnalytics_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LinkedPullRequests" ADD CONSTRAINT "_LinkedPullRequests_A_fkey" FOREIGN KEY ("A") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LinkedPullRequests" ADD CONSTRAINT "_LinkedPullRequests_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
