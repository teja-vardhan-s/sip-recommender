import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { AuthRepository } from '../repositories/authRepository.js';
import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);
const CREATE_TOKEN_MAX_ATTEMPTS = 5;

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

    /**
   * Refresh flow:
   *  - require an old refresh token
   *  - ensure it exists in DB
   *  - verify its signature; treat TokenExpiredError specially
   *  - rotate tokens (replace stored token) and return new tokens + user
   */
    async refresh(oldToken) {
        if (!oldToken) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "Missing refresh token");
        }

        // 1) ensure the token exists in DB
        const stored = await AuthRepository.findRefreshToken(oldToken);
        if (!stored) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "Invalid refresh token");
        }

        // 2) verify signature & expiration by jwt.verify
        let decoded;
        try {
            decoded = jwt.verify(oldToken, process.env.REFRESH_SECRET);
        } catch (err) {
            // best-effort delete stored token if signature invalid/expired
            await AuthRepository.deleteRefreshToken(oldToken).catch(() => { });
            if (err.name === "TokenExpiredError") {
                throw new AppError(ERROR_CODES.TOKEN_EXPIRED, "REFRESH_TOKEN_EXPIRED");
            }
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "Invalid refresh token");
        }

        // 3) check DB expiry field (extra safeguard)
        if (stored.expires_at && new Date() > new Date(stored.expires_at)) {
            await AuthRepository.deleteRefreshToken(oldToken).catch(() => { });
            throw new AppError(ERROR_CODES.TOKEN_EXPIRED, "REFRESH_TOKEN_EXPIRED");
        }

        // 4) load user
        const user = await AuthRepository.findUserById(decoded.id);
        if (!user) {
            await AuthRepository.deleteRefreshToken(oldToken).catch(() => { });
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "User not found");
        }

        // 5) prepare tokens
        const newAccessToken = generateAccessToken(user);
        const expires_at = new Date(Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7) * 24 * 3600 * 1000);

        // Attempt 1: atomic replace (updateMany)
        let newRefreshToken = generateRefreshToken(user);
        try {
            const updateRes = await AuthRepository.replaceRefreshToken(oldToken, newRefreshToken, expires_at);
            if (updateRes && updateRes.count > 0) {
                // success — someone replaced the exact row
                return { accessToken: newAccessToken, refreshToken: newRefreshToken, expires_at, user };
            }
            // if count === 0, fall through to try to discover concurrent replacement
        } catch (err) {
            console.warn("replaceRefreshToken threw; falling back:", err?.message ?? err);
        }

        // Attempt 2: maybe another process already rotated the token. Try to find the current active token for the user:
        try {
            const current = await AuthRepository.findLatestRefreshTokenForUser(user.user_id ?? user.id);
            if (current && current.token && (!current.expires_at || new Date(current.expires_at) > new Date())) {
                // If the current token differs from oldToken, it means someone else rotated.
                // Return that token so the client can continue using the valid rotated token.
                return { accessToken: newAccessToken, refreshToken: current.token, expires_at: current.expires_at ?? expires_at, user };
            }
        } catch (err) {
            console.warn("Error while reading latest refresh token for user:", err?.message ?? err);
        }

        // Attempt 3: delete old token and try to create a new one (with retry for collisions)
        await AuthRepository.deleteRefreshToken(oldToken).catch(() => { });

        for (let attempt = 0; attempt < CREATE_TOKEN_MAX_ATTEMPTS; attempt++) {
            const candidate = attempt === 0 ? newRefreshToken : generateRefreshToken(user);
            try {
                await AuthRepository.createRefreshToken({
                    user_id: user.user_id ?? user.id,
                    token: candidate,
                    expires_at,
                });
                return { accessToken: newAccessToken, refreshToken: candidate, expires_at, user };
            } catch (err) {
                // detect Prisma unique constraint error (P2002)
                const isUniqueError = err?.code === "P2002" || (err instanceof PrismaClientKnownRequestError && err.code === "P2002");
                if (isUniqueError) {
                    console.warn("Refresh token collision, regenerating token (attempt)", attempt + 1);
                    // generate a new token in next loop iteration
                    continue;
                }
                console.error("Unexpected error creating refresh token:", err);
                throw new AppError(ERROR_CODES.SERVER_ERROR, "Failed to rotate refresh token");
            }
        }

        // all attempts exhausted: force re-login
        throw new AppError(ERROR_CODES.SERVER_ERROR, "Failed to generate unique refresh token; please login again");
    },
    async logout(token) {
        if (!token) return;
        await AuthRepository.deleteRefreshToken(token).catch(() => { });
        return true;
    }
};