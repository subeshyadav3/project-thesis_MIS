-- AlterTable
ALTER TABLE "Thesis" ADD COLUMN     "programId" INTEGER;

-- AddForeignKey
ALTER TABLE "Thesis" ADD CONSTRAINT "Thesis_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
