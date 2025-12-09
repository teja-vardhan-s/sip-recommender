/*
  Warnings:

  - Added the required column `expected_return` to the `Investments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "TxnStatus" ADD VALUE 'SKIPPED';

-- AlterTable
ALTER TABLE "Investments" ADD COLUMN     "expected_return" DECIMAL(5,4) NOT NULL;
