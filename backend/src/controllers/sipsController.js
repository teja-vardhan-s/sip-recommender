import AppError from "../utils/AppError.js";
import { ERROR_CODES } from "../utils/errorCodes.js";
import { SipService } from "../services/sipService.js";
import { InvestmentRepository } from "../repositories/investmentRepository.js";

export const createSip = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const {
            scheme_code,
            invested_amount: amount,
            start_date,
            duration_months,
            frequency = "Monthly",
            goal_id = null,
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
            duration_months,
            goal_id
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

        // only accept allowed fields from client; block start_date and fund changes in controller
        const { invested_amount, frequency, duration_months } = req.body;

        const inv = await InvestmentRepository.findById(investment_id);
        if (!inv || inv.user_id !== user_id) return next(new AppError(ERROR_CODES.NOT_FOUND, "SIP not found"));

        // block changing start_date, scheme, etc.
        if (req.body.start_date || req.body.scheme_code) {
            return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Start date or scheme cannot be modified"));
        }

        // Optionally validate values here (e.g., invested_amount > 0)
        if (invested_amount !== undefined && Number(invested_amount) <= 0) {
            return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid invested amount"));
        }

        const updated = await InvestmentRepository.updateSipSafely(investment_id, {
            invested_amount,
            frequency,
            duration_months,
            goal_id: req.body.goal_id !== undefined ? req.body.goal_id : inv.goal_id,
        });

        return res.json({ success: true, sip: updated });
    } catch (err) {
        console.error("PATCH /api/sips/:id error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};




export const getSipById = async (req, res, next) => {
    try {

        const user_id = req.user.user_id;
        const investment_id = Number(req.params.id);

        if (!investment_id || isNaN(investment_id)) {
            return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid SIP ID"));
        }

        const inv = await InvestmentRepository.findById(investment_id);
        if (!inv || inv.user_id !== user_id) return next(new AppError(ERROR_CODES.NOT_FOUND, "SIP not found"));

        return res.json({ success: true, data: inv });
    } catch (err) {
        console.error("GET /api/sips/:id error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
}


export const stopSip = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const id = Number(req.params.id);
        if (!id) return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid SIP ID"));

        const inv = await InvestmentRepository.findById(id);
        if (!inv || inv.user_id !== user_id) return next(new AppError(ERROR_CODES.NOT_FOUND, "SIP not found"));

        const updated = await InvestmentRepository.stopSipSafely(id);

        return res.json({ success: true, sip: updated });
    } catch (err) {
        console.error("PATCH /api/sips/:id/stop error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};

export const startSip = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const id = Number(req.params.id);
        if (!id) return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid SIP ID"));

        const inv = await InvestmentRepository.findById(id);
        if (!inv || inv.user_id !== user_id) return next(new AppError(ERROR_CODES.NOT_FOUND, "SIP not found"));

        const updated = await InvestmentRepository.restartSipSafely(id);

        return res.json({ success: true, sip: updated });
    } catch (err) {
        console.error("PATCH /api/sips/:id/start error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};