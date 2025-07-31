-- AddOrganizationalHierarchy
-- Add organizational hierarchy columns to Company table

-- Add new columns for organizational hierarchy
ALTER TABLE "Company" ADD COLUMN "organizationType" TEXT NOT NULL DEFAULT 'PARENT';
ALTER TABLE "Company" ADD COLUMN "parentCompanyId" TEXT;
ALTER TABLE "Company" ADD COLUMN "location" TEXT;
ALTER TABLE "Company" ADD COLUMN "description" TEXT;

-- Add foreign key constraint for parent company relationship
ALTER TABLE "Company" ADD CONSTRAINT "Company_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;