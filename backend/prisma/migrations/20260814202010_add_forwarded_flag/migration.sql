-- AlterTable
ALTER TABLE "ProjectGroup" ADD COLUMN "forwardedToExamDept" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Thesis" ADD COLUMN "forwardedToExamDept" BOOLEAN NOT NULL DEFAULT false;
