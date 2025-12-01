import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { AuthRepository } from '../repositories/authRepository.js';
import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);

function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user.user_id,
            email: user.email,
            name: user.name,
            role: user.role || 'USER',
            risk_profile: user.risk_profile ?? null
        },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.user_id },
        process.env.REFRESH_SECRET,
        { expiresIn: `${REFRESH_TOKEN_EXPIRES_DAYS}d` }
    );
}

export const AuthService = {
    async signup({ name, email, password, risk_profile }) {
        const existing = await AuthRepository.findUserByEmail(email);
        if (existing) throw new AppError(ERROR_CODES.DUPLICATE_ENTRY, 'Email already registered');

        const hashed = await argon2.hash(password);
        const user = await AuthRepository.createUser({
            name,
            email,
            password: hashed,
            risk_profile: risk_profile ?? null
        });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

        await AuthRepository.createRefreshToken({ user_id: user.user_id, token: refreshToken, expires_at });

        return { user, accessToken, refreshToken, expires_at };
    },

    async login({ email, password }) {
        const user = await AuthRepository.findUserByEmail(email);
        if (!user) throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');

        const valid = await argon2.verify(user.password, password);
        if (!valid) throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');

        // revoke previous refresh tokens (single-device model)
        await AuthRepository.deleteRefreshTokensByUser(user.user_id);

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

        await AuthRepository.createRefreshToken({ user_id: user.user_id, token: refreshToken, expires_at });

        return { user, accessToken, refreshToken, expires_at };
    },

    async refresh(oldToken) {
        if (!oldToken) throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Missing refresh token');

        const stored = await AuthRepository.findRefreshToken(oldToken);
        if (!stored) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid refresh token');
        }

        let decoded;
        try {
            decoded = jwt.verify(oldToken, process.env.REFRESH_SECRET);
        } catch (err) {
            // invalid signature -> remove and reject
            await AuthRepository.deleteRefreshToken(oldToken).catch(() => { });
            throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid refresh token');
        }

        if (new Date() > stored.expires_at) {
            await AuthRepository.deleteRefreshToken(oldToken).catch(() => { });
            throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Expired refresh token');
        }

        const user = await AuthRepository.findUserById(decoded.id);
        if (!user) {
            await AuthRepository.deleteRefreshToken(oldToken).catch(() => { });
            throw new AppError(ERROR_CODES.UNAUTHORIZED, 'User not found');
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

        // try to atomically replace stored token; if update fails (e.g. concurrent), recreate
        try {
            await AuthRepository.replaceRefreshToken(oldToken, newRefreshToken, expires_at);
        } catch (err) {
            // fallback: remove old and create new
            await AuthRepository.deleteRefreshToken(oldToken).catch(() => { });
            await AuthRepository.createRefreshToken({ user_id: user.user_id, token: newRefreshToken, expires_at });
        }

        return { accessToken: newAccessToken, refreshToken: newRefreshToken, expires_at, user };
    },

    async logout(token) {
        if (!token) return;
        await AuthRepository.deleteRefreshToken(token).catch(() => { });
        return true;
    }
};