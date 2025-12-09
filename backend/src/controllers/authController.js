import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import prisma from '../prismaClient.js';
import { z } from 'zod';
import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { AuthService } from '../services/authService.js';

// ---------- Config ----------
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refreshToken";

function cookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    };
}

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
        const token = req.cookies?.[REFRESH_COOKIE_NAME];
        const result = await AuthService.refresh(token);

        // AuthService.refresh returns { accessToken, refreshToken, expires_at, user }
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions());
        return res.json({ accessToken: result.accessToken });
    } catch (err) {
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
