-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "commentedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_commentedById_fkey" FOREIGN KEY ("commentedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
