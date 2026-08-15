-- AlterEnum
ALTER TYPE "GroupStatus" ADD VALUE 'REJECTED';

-- AlterEnum
ALTER TYPE "ThesisStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "formEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "formFields" JSONB;

-- AlterTable
ALTER TABLE "ProjectGroup" ADD COLUMN     "cluster" TEXT,
ADD COLUMN     "supervisorAssignmentStatus" TEXT;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "Thesis" ADD COLUMN     "createdVia" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "supervisorAssignmentStatus" TEXT;

-- CreateTable
CREATE TABLE "FormResponse" (
    "id" SERIAL NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "thesisId" INTEGER,
    "formData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormResponse_announcementId_idx" ON "FormResponse"("announcementId");

-- CreateIndex
CREATE INDEX "FormResponse_studentId_idx" ON "FormResponse"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "FormResponse_announcementId_studentId_key" ON "FormResponse"("announcementId", "studentId");

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProjectGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "Thesis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
