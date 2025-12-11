import { InvestmentRepository } from "../repositories/investmentRepository.js";
import { TransactionsRepository } from "../repositories/transactionsRepository.js";
import { getNextSipDate } from "../utils/sipDates.js";
import { NotificationService } from "./notificationService.js";
import prisma from "../prismaClient.js";
import { EmailService } from "./emailService.js";

export const SipSchedulerService = {
    async runScheduler() {
        const sips = await InvestmentRepository.findActiveSips();

        let scheduled = 0;
        let skipped = 0;

        for (const sip of sips) {
            const { investment_id, start_date, invested_amount, frequency } = sip;

            // find last installment (may be null)
            const lastTxn = await TransactionsRepository.findLastInstallment(investment_id);

            // compute next due using lastTxn and frequency
            const nextDue = getNextSipDate(start_date, lastTxn, frequency ?? "Monthly");

            // If last transaction exists and is >= next due date -> skip
            if (lastTxn && new Date(lastTxn.txn_date) >= nextDue) {
                skipped++;
                continue;
            }

            // Ensure we don't create duplicate pending txns for same date:
            const existing = await TransactionsRepository.findPendingForDate(investment_id, nextDue);
            if (existing) {
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
    },
};

export const SipNotificationService = {
    async notifyDueSIPs() {
        const sips = await InvestmentRepository.findActiveSips();
        let count = 0;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        for (const sip of sips) {
            const lastTxn = await TransactionsRepository.findLastInstallment(sip.investment_id);
            const next = getNextSipDate(sip.start_date, lastTxn, sip.frequency ?? "Monthly");
            const nextDateOnly = new Date(next);
            nextDateOnly.setHours(0, 0, 0, 0);

            if (nextDateOnly.getTime() === tomorrow.getTime()) {
                await NotificationService.notify(
                    sip.user_id,
                    `Your SIP of ₹${sip.invested_amount} for ${sip.fund_name ?? sip.fund_name} is due tomorrow.`
                );
                const user = await prisma.users.findUnique({ where: { user_id: sip.user_id } });
                if (user?.email) {
                    await EmailService.sendSimpleEmail({
                        to: user.email,
                        subject: "SIP due tomorrow",
                        html: `<p>Your SIP of ₹${sip.invested_amount} for ${sip.fund_name} is due tomorrow.</p>`
                    });
                }
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
            const lastTxn = await TransactionsRepository.findLastInstallment(sip.investment_id);
            const nextDue = getNextSipDate(sip.start_date, lastTxn, sip.frequency ?? "Monthly");
            const dueDateOnly = new Date(nextDue);
            dueDateOnly.setHours(0, 0, 0, 0);

            // If today is the due date but last transaction isn't SUCCESS
            if (dueDateOnly.getTime() === today.getTime()) {
                if (!lastTxn || lastTxn.status !== "SUCCESS") {
                    await NotificationService.notify(
                        sip.user_id,
                        `Your SIP of ₹${sip.invested_amount} for ${sip.fund_name ?? sip.fund_name} was missed today.`
                    );
                    count++;
                }
            }
        }

        return { missedToday: count };
    },
};