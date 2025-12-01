import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { InvestmentRepository } from '../repositories/investmentRepository.js';
import { MutualFundsRepository } from '../repositories/mutualFundsRepository.js';
import { expectedReturnFromFund } from '../utils/fundExpectedReturn.js';

/**
 * SipService
 * Centralizes SIP creation logic used by both sipsController and goalsController.
 */
export const SipService = {
    /**
     * Create a SIP (optionally linked to a goal).
     * opts: { user_id, scheme_code, amount, start_date, frequency?, duration_months?, goal_id? }
     */
    async createSip(opts) {
        const {
            user_id,
            scheme_code,
            amount,
            start_date,
            frequency = 'Monthly',
            duration_months = null,
            goal_id = null,
        } = opts || {};

        // basic validation (controllers should also validate request shape via Zod)
        if (!user_id || !scheme_code || !amount || !start_date) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'user_id, scheme_code, amount and start_date are required');
        }

        // ensure numeric amount
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'amount must be a positive number');
        }

        // validate date
        const sd = new Date(start_date);
        if (isNaN(sd.getTime())) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'start_date is invalid');
        }

        // verify fund exists
        const fund = await MutualFundsRepository.findBySchemeCode(scheme_code);
        if (!fund) {
            throw new AppError(ERROR_CODES.NOT_FOUND, 'Fund not found');
        }

        // compute expected return (fund-based)
        const fundReturn = expectedReturnFromFund(fund.category, fund.risk_level);

        // prepare investment payload
        const payload = {
            user_id,
            scheme_code,
            investment_type: 'SIP',
            invested_amount: amt,
            start_date: sd,
            frequency,
            duration_months,
            goal_id,
            units: 0,
            expected_return: fundReturn,
        };

        // create investment
        const sip = await InvestmentRepository.create(payload);

        return {
            sip,
            expectedReturn: fundReturn,
            basedOn: { category: fund.category, risk_level: fund.risk_level },
        };
    },
};