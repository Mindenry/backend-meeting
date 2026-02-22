/*
  Warnings:

  - You are about to drop the `Goal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GoalCheckIn` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KeyResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OnboardingAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OnboardingTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OnboardingTaskProgress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OnboardingTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_parentGoalId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_userId_fkey";

-- DropForeignKey
ALTER TABLE "GoalCheckIn" DROP CONSTRAINT "GoalCheckIn_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "GoalCheckIn" DROP CONSTRAINT "GoalCheckIn_goalId_fkey";

-- DropForeignKey
ALTER TABLE "KeyResult" DROP CONSTRAINT "KeyResult_goalId_fkey";

-- DropForeignKey
ALTER TABLE "OnboardingAssignment" DROP CONSTRAINT "OnboardingAssignment_templateId_fkey";

-- DropForeignKey
ALTER TABLE "OnboardingAssignment" DROP CONSTRAINT "OnboardingAssignment_userId_fkey";

-- DropForeignKey
ALTER TABLE "OnboardingTask" DROP CONSTRAINT "OnboardingTask_templateId_fkey";

-- DropForeignKey
ALTER TABLE "OnboardingTaskProgress" DROP CONSTRAINT "OnboardingTaskProgress_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "OnboardingTemplate" DROP CONSTRAINT "OnboardingTemplate_organizationId_fkey";

-- DropTable
DROP TABLE "Goal";

-- DropTable
DROP TABLE "GoalCheckIn";

-- DropTable
DROP TABLE "KeyResult";

-- DropTable
DROP TABLE "OnboardingAssignment";

-- DropTable
DROP TABLE "OnboardingTask";

-- DropTable
DROP TABLE "OnboardingTaskProgress";

-- DropTable
DROP TABLE "OnboardingTemplate";
