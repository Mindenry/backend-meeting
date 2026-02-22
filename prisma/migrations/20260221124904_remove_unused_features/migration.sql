/*
  Warnings:

  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveBalance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeavePolicy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Poll` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PollOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PollResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportTicket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportTicketComment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_userId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveBalance" DROP CONSTRAINT "LeaveBalance_userId_fkey";

-- DropForeignKey
ALTER TABLE "LeavePolicy" DROP CONSTRAINT "LeavePolicy_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "Poll" DROP CONSTRAINT "Poll_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "Poll" DROP CONSTRAINT "Poll_teamId_fkey";

-- DropForeignKey
ALTER TABLE "PollOption" DROP CONSTRAINT "PollOption_pollId_fkey";

-- DropForeignKey
ALTER TABLE "PollResponse" DROP CONSTRAINT "PollResponse_optionId_fkey";

-- DropForeignKey
ALTER TABLE "PollResponse" DROP CONSTRAINT "PollResponse_pollId_fkey";

-- DropForeignKey
ALTER TABLE "PollResponse" DROP CONSTRAINT "PollResponse_userId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_userId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicketComment" DROP CONSTRAINT "SupportTicketComment_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicketComment" DROP CONSTRAINT "SupportTicketComment_userId_fkey";

-- DropTable
DROP TABLE "Expense";

-- DropTable
DROP TABLE "LeaveBalance";

-- DropTable
DROP TABLE "LeavePolicy";

-- DropTable
DROP TABLE "LeaveRequest";

-- DropTable
DROP TABLE "Poll";

-- DropTable
DROP TABLE "PollOption";

-- DropTable
DROP TABLE "PollResponse";

-- DropTable
DROP TABLE "SupportTicket";

-- DropTable
DROP TABLE "SupportTicketComment";
