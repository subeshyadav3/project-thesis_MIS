-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "programId" INTEGER;

-- CreateIndex
CREATE INDEX "AuditLog_programId_idx" ON "AuditLog"("programId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
