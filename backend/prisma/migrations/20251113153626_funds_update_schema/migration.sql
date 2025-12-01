/*
  Warnings:

  - You are about to drop the column `current_value` on the `Investments` table. All the data in the column will be lost.
  - You are about to drop the column `fund_id` on the `Investments` table. All the data in the column will be lost.
  - You are about to drop the column `invested_amount` on the `Investments` table. All the data in the column will be lost.
  - The primary key for the `MutualFunds` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `fund_id` on the `MutualFunds` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `MutualFunds` table. All the data in the column will be lost.
  - Added the required column `amount` to the `Investments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheme_code` to the `Investments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheme_code` to the `MutualFunds` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Investments" DROP CONSTRAINT "Investments_fund_id_fkey";

-- AlterTable
ALTER TABLE "Investments" DROP COLUMN "current_value",
DROP COLUMN "fund_id",
DROP COLUMN "invested_amount",
ADD COLUMN     "amount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "folio_number" TEXT,
ADD COLUMN     "scheme_code" TEXT NOT NULL,
ALTER COLUMN "duration_months" DROP NOT NULL,
ALTER COLUMN "units" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MutualFunds" DROP CONSTRAINT "MutualFunds_pkey",
DROP COLUMN "fund_id",
DROP COLUMN "updated_at",
ADD COLUMN     "nav_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "rating_source" TEXT,
ADD COLUMN     "scheme_code" TEXT NOT NULL,
ALTER COLUMN "risk_level" DROP NOT NULL,
ADD CONSTRAINT "MutualFunds_pkey" PRIMARY KEY ("scheme_code");

-- CreateTable
CREATE TABLE "NAVHistory" (
    "id" SERIAL NOT NULL,
    "scheme_code" TEXT NOT NULL,
    "nav" DECIMAL(10,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NAVHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NAVHistory" ADD CONSTRAINT "NAVHistory_scheme_code_fkey" FOREIGN KEY ("scheme_code") REFERENCES "MutualFunds"("scheme_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investments" ADD CONSTRAINT "Investments_scheme_code_fkey" FOREIGN KEY ("scheme_code") REFERENCES "MutualFunds"("scheme_code") ON DELETE RESTRICT ON UPDATE CASCADE;
