import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import { ERROR_CODES } from "../utils/errorCodes.js";

function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return next(
            new AppError(
                ERROR_CODES.UNAUTHORIZED,
                "Missing Authorization header"
            )
        );
    }

    // Expected format: Bearer <access_token>
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return next(
            new AppError(
                ERROR_CODES.UNAUTHORIZED,
                "Authorization header malformed (expected: Bearer <token>)"
            )
        );
    }

    const token = parts[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // Special handling for expired token
            if (err.name === "TokenExpiredError") {
                return next(
                    new AppError(
                        ERROR_CODES.TOKEN_EXPIRED,
                        "ACCESS_TOKEN_EXPIRED - Expired at " + err.expiredAt
                    )
                );
            }

            return next(
                new AppError(
                    ERROR_CODES.UNAUTHORIZED,
                    "Invalid access token"
                )
            );
        }

        // Attach standardized user object
        req.user = {
            user_id: decoded.id,
            email: decoded.email || null,
            name: decoded.name || null,
            role: decoded.role || "USER",
            risk_profile: decoded.risk_profile || null,
        };

        next();
    });
}

export default authMiddleware;
