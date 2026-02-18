-- CreateTable
CREATE TABLE "GitIntegration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "username" TEXT,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitRepository" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "provider" TEXT NOT NULL,
    "providerRepoId" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "integrationId" TEXT NOT NULL,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitRepository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitBranch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "repositoryId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitPullRequest" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "state" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "author" TEXT,
    "providerPRId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mergedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "GitPullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitCommit" (
    "id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT,
    "authorEmail" TEXT,
    "url" TEXT NOT NULL,
    "providerCommitId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "taskId" TEXT,
    "branchName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitDeployment" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "url" TEXT,
    "commitSha" TEXT NOT NULL,
    "providerDeploymentId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deployedAt" TIMESTAMP(3),

    CONSTRAINT "GitDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGitBranch" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskGitBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GitIntegration_userId_idx" ON "GitIntegration"("userId");

-- CreateIndex
CREATE INDEX "GitIntegration_organizationId_idx" ON "GitIntegration"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GitIntegration_userId_provider_key" ON "GitIntegration"("userId", "provider");

-- CreateIndex
CREATE INDEX "GitRepository_integrationId_idx" ON "GitRepository"("integrationId");

-- CreateIndex
CREATE INDEX "GitRepository_teamId_idx" ON "GitRepository"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "GitRepository_integrationId_providerRepoId_key" ON "GitRepository"("integrationId", "providerRepoId");

-- CreateIndex
CREATE INDEX "GitBranch_repositoryId_idx" ON "GitBranch"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "GitBranch_repositoryId_name_key" ON "GitBranch"("repositoryId", "name");

-- CreateIndex
CREATE INDEX "GitPullRequest_repositoryId_idx" ON "GitPullRequest"("repositoryId");

-- CreateIndex
CREATE INDEX "GitPullRequest_taskId_idx" ON "GitPullRequest"("taskId");

-- CreateIndex
CREATE INDEX "GitPullRequest_state_idx" ON "GitPullRequest"("state");

-- CreateIndex
CREATE UNIQUE INDEX "GitPullRequest_repositoryId_providerPRId_key" ON "GitPullRequest"("repositoryId", "providerPRId");

-- CreateIndex
CREATE INDEX "GitCommit_repositoryId_idx" ON "GitCommit"("repositoryId");

-- CreateIndex
CREATE INDEX "GitCommit_taskId_idx" ON "GitCommit"("taskId");

-- CreateIndex
CREATE INDEX "GitCommit_branchName_idx" ON "GitCommit"("branchName");

-- CreateIndex
CREATE INDEX "GitCommit_committedAt_idx" ON "GitCommit"("committedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GitCommit_repositoryId_sha_key" ON "GitCommit"("repositoryId", "sha");

-- CreateIndex
CREATE INDEX "GitDeployment_repositoryId_idx" ON "GitDeployment"("repositoryId");

-- CreateIndex
CREATE INDEX "GitDeployment_taskId_idx" ON "GitDeployment"("taskId");

-- CreateIndex
CREATE INDEX "GitDeployment_status_idx" ON "GitDeployment"("status");

-- CreateIndex
CREATE INDEX "GitDeployment_environment_idx" ON "GitDeployment"("environment");

-- CreateIndex
CREATE INDEX "TaskGitBranch_taskId_idx" ON "TaskGitBranch"("taskId");

-- CreateIndex
CREATE INDEX "TaskGitBranch_branchId_idx" ON "TaskGitBranch"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskGitBranch_taskId_branchId_key" ON "TaskGitBranch"("taskId", "branchId");

-- AddForeignKey
ALTER TABLE "GitIntegration" ADD CONSTRAINT "GitIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitIntegration" ADD CONSTRAINT "GitIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitRepository" ADD CONSTRAINT "GitRepository_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "GitIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitRepository" ADD CONSTRAINT "GitRepository_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitBranch" ADD CONSTRAINT "GitBranch_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GitRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitBranch" ADD CONSTRAINT "GitBranch_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "GitIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitPullRequest" ADD CONSTRAINT "GitPullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GitRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitPullRequest" ADD CONSTRAINT "GitPullRequest_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "GitIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitPullRequest" ADD CONSTRAINT "GitPullRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitCommit" ADD CONSTRAINT "GitCommit_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GitRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitCommit" ADD CONSTRAINT "GitCommit_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "GitIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitCommit" ADD CONSTRAINT "GitCommit_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitDeployment" ADD CONSTRAINT "GitDeployment_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GitRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitDeployment" ADD CONSTRAINT "GitDeployment_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "GitIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitDeployment" ADD CONSTRAINT "GitDeployment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGitBranch" ADD CONSTRAINT "TaskGitBranch_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGitBranch" ADD CONSTRAINT "TaskGitBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "GitBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGitBranch" ADD CONSTRAINT "TaskGitBranch_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "GitRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
