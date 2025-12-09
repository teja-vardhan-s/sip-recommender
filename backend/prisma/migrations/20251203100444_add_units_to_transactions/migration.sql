-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "processed_at" TIMESTAMP(3),
ADD COLUMN     "units" DECIMAL(18,6);
