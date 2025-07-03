-- AlterTable
ALTER TABLE "Runner" ADD COLUMN     "claimedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Runner" ADD CONSTRAINT "Runner_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
