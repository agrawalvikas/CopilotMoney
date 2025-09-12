-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN "tellerAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_tellerAccountId_key" ON "public"."Account"("tellerAccountId") WHERE "tellerAccountId" IS NOT NULL;
