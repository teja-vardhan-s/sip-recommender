-- CreateEnum
CREATE TYPE "RiskProfile" AS ENUM ('Conservative', 'Balanced', 'Aggressive');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('Low', 'Moderate', 'High');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('SIP', 'LUMP_SUM');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SIP_INSTALLMENT', 'REDEMPTION');

-- CreateTable
CREATE TABLE "Users" (
    "user_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "risk_profile" "RiskProfile" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "MutualFunds" (
    "fund_id" SERIAL NOT NULL,
    "fund_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "nav" DECIMAL(10,4) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MutualFunds_pkey" PRIMARY KEY ("fund_id")
);

-- CreateTable
CREATE TABLE "Investments" (
    "investment_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "fund_id" INTEGER NOT NULL,
    "investment_type" "InvestmentType" NOT NULL,
    "invested_amount" DECIMAL(12,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "units" DECIMAL(12,4) NOT NULL,
    "current_value" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investments_pkey" PRIMARY KEY ("investment_id")
);

-- CreateTable
CREATE TABLE "Transactions" (
    "txn_id" SERIAL NOT NULL,
    "investment_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "txn_date" TIMESTAMP(3) NOT NULL,
    "txn_type" "TransactionType" NOT NULL,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("txn_id")
);

-- CreateTable
CREATE TABLE "Recommendations" (
    "recommendation_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendations_pkey" PRIMARY KEY ("recommendation_id")
);

-- CreateTable
CREATE TABLE "Notifications" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- AddForeignKey
ALTER TABLE "Investments" ADD CONSTRAINT "Investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investments" ADD CONSTRAINT "Investments_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "MutualFunds"("fund_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "Investments"("investment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendations" ADD CONSTRAINT "Recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
