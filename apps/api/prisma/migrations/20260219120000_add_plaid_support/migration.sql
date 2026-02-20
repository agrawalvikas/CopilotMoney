-- CreateEnum
CREATE TYPE "public"."ConnectionProvider" AS ENUM ('TELLER', 'PLAID');

-- AlterTable Connection: add provider, make tellerId optional, add plaidItemId + plaidCursor
ALTER TABLE "public"."Connection"
  ADD COLUMN "provider" "public"."ConnectionProvider" NOT NULL DEFAULT 'TELLER',
  ADD COLUMN "plaidItemId" TEXT,
  ADD COLUMN "plaidCursor" TEXT,
  ALTER COLUMN "tellerId" DROP NOT NULL;

-- AlterTable Account: add plaidAccountId
ALTER TABLE "public"."Account"
  ADD COLUMN "plaidAccountId" TEXT;

-- AlterTable Transaction: make tellerTransactionId optional, add plaidTransactionId
ALTER TABLE "public"."Transaction"
  ADD COLUMN "plaidTransactionId" TEXT,
  ALTER COLUMN "tellerTransactionId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Connection_plaidItemId_key" ON "public"."Connection"("plaidItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_plaidAccountId_key" ON "public"."Account"("plaidAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_plaidTransactionId_key" ON "public"."Transaction"("plaidTransactionId");
