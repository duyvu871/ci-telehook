/*
  Warnings:

  - A unique constraint covering the columns `[chatId,repository]` on the table `notification_settings` will be added. If there are existing duplicate values, this will fail.
  - Made the column `projectId` on table `notification_settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `repository` on table `notification_settings` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."notification_settings_chatId_key";

-- AlterTable
ALTER TABLE "public"."notification_settings" ALTER COLUMN "projectId" SET NOT NULL,
ALTER COLUMN "repository" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_chatId_repository_key" ON "public"."notification_settings"("chatId", "repository");
