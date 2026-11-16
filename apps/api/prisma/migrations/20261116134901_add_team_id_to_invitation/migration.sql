-- AlterTable
ALTER TABLE "StudentInvitation" ADD COLUMN     "teamId" UUID;

-- AddForeignKey
ALTER TABLE "StudentInvitation" ADD CONSTRAINT "StudentInvitation_teamId_schoolId_fkey" FOREIGN KEY ("teamId", "schoolId") REFERENCES "Team"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;
