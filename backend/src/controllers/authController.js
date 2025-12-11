import { z } from 'zod';
import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { AuthService } from '../services/authService.js';
import { REFRESH_COOKIE_NAME, cookieOptions } from "../utils/cookies.js";


// ---------- Validation schemas ----------
const signupSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    risk_profile: z.enum(["Conservative", "Balanced", "Aggressive"]).optional()
});

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1)
});

export const signup = async (req, res, next) => {
    try {
        const parsed = signupSchema.parse(req.body);

        const { user, accessToken, refreshToken } = await AuthService.signup(parsed);

        // set refresh cookie and return safe user + access token
        res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions());
        return res.status(201).json({
            user: { user_id: user.user_id, name: user.name, email: user.email, risk_profile: user.risk_profile },
            accessToken
        });
    } catch (err) {
        if (err?.name === "ZodError") return next(new AppError(ERROR_CODES.VALIDATION_ERROR, err.errors));
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};

export const login = async (req, res, next) => {
    try {
        const parsed = loginSchema.parse(req.body);

        const { user, accessToken, refreshToken } = await AuthService.login(parsed);

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions());
        return res.json({
            user: { user_id: user.user_id, name: user.name, email: user.email, risk_profile: user.risk_profile },
            accessToken
        });
    } catch (err) {
        if (err?.name === "ZodError") return next(new AppError(ERROR_CODES.VALIDATION_ERROR, err.errors));
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};

export const refresh = async (req, res, next) => {
    try {
        // read cookie safely
        console.log("Cookies received:", req.cookies);
        const token = req.cookies?.[REFRESH_COOKIE_NAME];


        // call service (service will throw AppError with appropriate code/message)
        const result = await AuthService.refresh(token);

        // rotate cookie (new refresh token)
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions());

        // return access token and (optionally) user info
        return res.json({
            success: true,
            accessToken: result.accessToken,
            user: result.user ? {
                user_id: result.user.user_id ?? result.user.id,
                name: result.user.name ?? null,
                email: result.user.email ?? null,
                risk_profile: result.user.risk_profile ?? null,
            } : undefined,
        });
    } catch (err) {
        // Ensure AppError bubbles to your error middleware with correct code/status
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};

export const logout = async (req, res, next) => {
    try {
        const token = req.cookies?.[REFRESH_COOKIE_NAME];
        await AuthService.logout(token);
        res.clearCookie(REFRESH_COOKIE_NAME, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
        });
        return res.json({ success: true });
    } catch (err) {
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};
