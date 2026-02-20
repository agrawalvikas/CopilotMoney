-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "public"."Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "public"."Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "public"."Transaction"("categoryId");
