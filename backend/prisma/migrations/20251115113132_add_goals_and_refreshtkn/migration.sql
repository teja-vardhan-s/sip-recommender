/*
  Warnings:

  - You are about to drop the column `amount` on the `Investments` table. All the data in the column will be lost.
  - You are about to drop the column `folio_number` on the `Investments` table. All the data in the column will be lost.
  - Added the required column `invested_amount` to the `Investments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TxnStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- AlterTable
ALTER TABLE "Investments" DROP COLUMN "amount",
DROP COLUMN "folio_number",
ADD COLUMN     "current_value" DECIMAL(20,8),
ADD COLUMN     "goal_id" INTEGER,
ADD COLUMN     "invested_amount" DECIMAL(20,8) NOT NULL,
ALTER COLUMN "units" SET DATA TYPE DECIMAL(20,8);

-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "status" "TxnStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "RefreshTokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshTokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goals" (
    "goal_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(20,2) NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "expected_return" DECIMAL(6,4) NOT NULL,
    "calculated_sip" DECIMAL(20,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Goals_pkey" PRIMARY KEY ("goal_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshTokens_token_key" ON "RefreshTokens"("token");

-- AddForeignKey
ALTER TABLE "RefreshTokens" ADD CONSTRAINT "RefreshTokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goals" ADD CONSTRAINT "Goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investments" ADD CONSTRAINT "Investments_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "Goals"("goal_id") ON DELETE SET NULL ON UPDATE CASCADE;
