-- CreateIndex
CREATE INDEX "NAVHistory_scheme_code_date_idx" ON "NAVHistory"("scheme_code", "date");

-- CreateIndex
CREATE INDEX "NAVHistory_scheme_code_idx" ON "NAVHistory"("scheme_code");
