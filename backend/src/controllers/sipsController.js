import AppError from "../utils/AppError.js";
import { ERROR_CODES } from "../utils/errorCodes.js";
import { SipService } from "../services/sipService.js";

export const createSip = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const {
            scheme_code,
            amount,
            start_date,
            duration_months,
            frequency = "Monthly"
        } = req.body;

        if (!scheme_code || !amount || !start_date) {
            return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "scheme_code, amount and start_date are required"));
        }

        const result = await SipService.createSip({
            user_id,
            scheme_code,
            amount,
            start_date,
            frequency,
            duration_months
        });

        return res.status(201).json({ success: true, sip: result.sip, expectedReturn: result.expectedReturn, basedOn: result.basedOn });

    } catch (err) {
        console.error("POST /api/sips/create error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};


export const getSips = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const sips = await InvestmentRepository.findByUser(user_id);
        return res.json({ success: true, data: sips });
    } catch (err) {
        console.error("GET /api/sips error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};


export const updateSip = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const investment_id = Number(req.params.id);
        const { amount, start_date, duration_months } = req.body;

        const inv = await InvestmentRepository.findById(investment_id);
        if (!inv || inv.user_id !== user_id) return next(new AppError(ERROR_CODES.NOT_FOUND, "SIP not found"));

        const updated = await InvestmentRepository.updateById(investment_id, {
            invested_amount: amount !== undefined ? amount : inv.invested_amount,
            start_date: start_date ? new Date(start_date) : inv.start_date,
            duration_months: duration_months !== undefined ? duration_months : inv.duration_months
        });

        return res.json({ success: true, updated });
    } catch (err) {
        console.error("PATCH /api/sips/:id error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};


export const deleteSip = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const investment_id = Number(req.params.id);

        const inv = await InvestmentRepository.findById(investment_id);
        if (!inv || inv.user_id !== user_id) return next(new AppError(ERROR_CODES.NOT_FOUND, "SIP not found"));

        await InvestmentRepository.deleteById(investment_id);

        return res.json({ success: true, message: "SIP deleted" });
    } catch (err) {
        console.error("DELETE /api/sips/:id error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};