-- DropForeignKey
ALTER TABLE "AcademicYear" DROP CONSTRAINT "AcademicYear_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Program" DROP CONSTRAINT "Program_departmentId_fkey";

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

