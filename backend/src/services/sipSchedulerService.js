import { InvestmentRepository } from "../repositories/investmentRepository.js";
import { TransactionsRepository } from "../repositories/transactionsRepository.js";
import { getNextSipDate } from "../utils/sipDates.js";

export const SipSchedulerService = {

    async runScheduler() {
        const sips = await InvestmentRepository.findActiveSips();

        let scheduled = 0;
        let skipped = 0;

        for (const sip of sips) {
            const { investment_id, start_date, invested_amount } = sip;

            const lastTxn = await TransactionsRepository.findLastInstallment(investment_id);
            const nextDue = getNextSipDate(start_date);

            // If last transaction exists and is >= next due date -> skip
            if (lastTxn && new Date(lastTxn.txn_date) >= nextDue) {
                skipped++;
                continue;
            }

            // Create pending SIP installment
            await TransactionsRepository.create({
                investment_id,
                amount: invested_amount,
                txn_type: "SIP_INSTALLMENT",
                txn_date: nextDue,
                status: "PENDING",
            });

            scheduled++;
        }

        return {
            totalSips: sips.length,
            scheduled,
            skipped,
        };
    }
};

export const SipNotificationService = {

    async notifyDueSIPs() {
        const sips = await InvestmentRepository.findActiveSips();

        let count = 0;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        for (const sip of sips) {
            const next = getNextSipDate(sip.start_date);
            const nextDateOnly = new Date(next.setHours(0, 0, 0, 0));

            if (nextDateOnly.getTime() === tomorrow.getTime()) {
                await NotificationService.notify(
                    sip.user_id,
                    `Your SIP of ₹${sip.invested_amount} for ${sip.fund_name} is due tomorrow.`
                );
                count++;
            }
        }

        return { dueTomorrow: count };
    },


    async notifyMissedSIPs() {
        const sips = await InvestmentRepository.findActiveSips();

        let count = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const sip of sips) {
            const lastTxn = await prisma.transactions.findFirst({
                where: {
                    investment_id: sip.investment_id,
                    txn_type: "SIP_INSTALLMENT"
                },
                orderBy: { txn_date: "desc" }
            });

            const nextDue = getNextSipDate(sip.start_date);
            const dueDateOnly = new Date(nextDue.setHours(0, 0, 0, 0));

            // If today is the due date but transaction status is NOT PAID
            if (dueDateOnly.getTime() === today.getTime()) {
                if (!lastTxn || lastTxn.status !== "PAID") {
                    await NotificationService.notify(
                        sip.user_id,
                        `Your SIP of ₹${sip.invested_amount} for ${sip.fund_name} was missed today.`
                    );
                    count++;
                }
            }
        }

        return { missedToday: count };
    }
};