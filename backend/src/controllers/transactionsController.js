import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { TransactionsRepository } from '../repositories/transactionsRepository.js';
import { InvestmentRepository } from '../repositories/investmentRepository.js';

/**
 * Utility: get day start/end Date objects for a given date
 */
function dayRangeFor(date) {
    const d = new Date(date);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
}

export const getTxns = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const { status, type } = req.query;

        const transactions = await TransactionsRepository.findByUserWithFilters(user_id, status, type);
        return res.json({ success: true, data: transactions });
    } catch (err) {
        console.error('GET /api/transactions error:', err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};

/**
 * Update transaction status (PENDING -> SUCCESS/FAILED/SKIPPED)
 * When marking SUCCESS:
 *   - compute units = amount / nav_on_txn_date (NAVHistory; fallback to current MutualFunds.nav)
 *   - update investment.units and investment.invested_amount
 */
export const updateTxn = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const txn_id = Number(req.params.txn_id);
        const { status } = req.body; // "SUCCESS" or "FAILED" or "PENDING" or "SKIPPED"

        if (!['SUCCESS', 'FAILED', 'PENDING', 'SKIPPED'].includes(status)) {
            return next(new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid status'));
        }

        // fetch transaction + investment + ownership check
        const txn = await TransactionsRepository.findById(txn_id);
        if (!txn) return next(new AppError(ERROR_CODES.NOT_FOUND, 'Transaction not found'));
        if (txn.investment.user_id !== user_id) return next(new AppError(ERROR_CODES.UNAUTHORIZED, 'Not authorized'));

        // no-op if same status
        if (txn.status === status) return res.json({ success: true, txn });

        // Update transaction record status
        const updatedTxn = await TransactionsRepository.setTransactionStatus(txn_id, status);

        // If marking SUCCESS, compute units and update investment totals
        if (status === 'SUCCESS') {
            const inv = await InvestmentRepository.findById(txn.investment_id);
            if (!inv) {
                // should not happen, but handle gracefully
                await TransactionsRepository.setTransactionStatus(txn_id, 'PENDING');
                return next(new AppError(ERROR_CODES.SERVER_ERROR, 'Linked investment not found'));
            }

            // Find NAV for txn date in NAVHistory (use day range)
            const { start, end } = dayRangeFor(txn.txn_date);
            let navRecord = await TransactionsRepository.findNavHistoryForSchemeOnDate(inv.scheme_code, start, end);

            // fallback to latest nav from MutualFunds
            if (!navRecord) {
                const fund = await TransactionsRepository.findFundNav(inv.scheme_code);
                if (!fund || !fund.nav) {
                    // rollback txn status to PENDING and return error
                    await TransactionsRepository.rollbackTransactionToPending(txn_id).catch(() => { });
                    return next(new AppError(ERROR_CODES.SERVER_ERROR, 'NAV not available for computing units'));
                }
                navRecord = { nav: fund.nav, date: new Date() };
            }

            const navValue = Number(navRecord.nav);
            if (!navValue || navValue <= 0) {
                await TransactionsRepository.rollbackTransactionToPending(txn_id).catch(() => { });
                return next(new AppError(ERROR_CODES.SERVER_ERROR, 'Invalid NAV for computing units'));
            }

            // compute units (floating)
            const unitsBought = Number(txn.amount) / navValue;

            // update investment: add units and add to invested_amount
            const updatedInvestment = await TransactionsRepository.updateInvestmentTotals(
                inv.investment_id,
                unitsBought,
                Number(txn.amount)
            );

            // Return updated txn + investment summary
            return res.json({
                success: true,
                txn: updatedTxn,
                investment: updatedInvestment,
                unitsBought,
            });
        }

        // If mark FAILED or PENDING just return
        return res.json({ success: true, txn: updatedTxn });
    } catch (err) {
        console.error('PATCH /api/transactions/:txn_id/status error:', err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};
