-- AlterTable
ALTER TABLE "public"."notification_settings" ADD COLUMN     "githubUsername" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "repository" TEXT;

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "webhookSecret" TEXT;

-- AddForeignKey
ALTER TABLE "public"."notification_settings" ADD CONSTRAINT "notification_settings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
