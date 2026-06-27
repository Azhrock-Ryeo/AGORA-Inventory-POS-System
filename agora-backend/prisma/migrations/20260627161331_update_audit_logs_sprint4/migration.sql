/*
  Warnings:

  - You are about to drop the column `entity_id` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `entity_type` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `performed_by` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `description` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOGIN';
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'EXPORT';
ALTER TYPE "AuditAction" ADD VALUE 'VOID';
ALTER TYPE "AuditAction" ADD VALUE 'ADJUST';
ALTER TYPE "AuditAction" ADD VALUE 'FAILED';

-- DropIndex
DROP INDEX "AuditLog_entity_type_entity_id_idx";

-- DropIndex
DROP INDEX "AuditLog_performed_by_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "entity_id",
DROP COLUMN "entity_type",
DROP COLUMN "performed_by",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "module" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Success',
ADD COLUMN     "user_id" TEXT,
ADD COLUMN     "user_role" TEXT,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "old_value" SET DATA TYPE TEXT,
ALTER COLUMN "new_value" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
