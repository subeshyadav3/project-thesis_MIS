-- DropForeignKey
ALTER TABLE "ProjectGroup" DROP CONSTRAINT "ProjectGroup_academicYearId_fkey";

-- DropIndex
DROP INDEX "ProjectGroup_academicYearId_idx";

-- AlterTable
ALTER TABLE "ProjectGroup" ALTER COLUMN "academicYearId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ProjectGroup" ADD CONSTRAINT "ProjectGroup_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
