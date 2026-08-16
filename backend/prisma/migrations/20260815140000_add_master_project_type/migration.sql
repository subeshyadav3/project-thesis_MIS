-- CreateEnum
CREATE TYPE "MasterProjectType" AS ENUM ('PROJECT', 'THESIS');

-- Migrate existing rows: legacy 'MASTER' string becomes THESIS
ALTER TABLE "Thesis" ALTER COLUMN "projectType" DROP DEFAULT;
UPDATE "Thesis" SET "projectType" = 'THESIS' WHERE "projectType" NOT IN ('PROJECT', 'THESIS');
ALTER TABLE "Thesis" ALTER COLUMN "projectType" TYPE "MasterProjectType" USING ("projectType"::text::"MasterProjectType");
ALTER TABLE "Thesis" ALTER COLUMN "projectType" SET DEFAULT 'THESIS';