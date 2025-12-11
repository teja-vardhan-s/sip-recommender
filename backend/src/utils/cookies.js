export const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refreshToken";

export function cookieOptions() {
    const env = process.env.NODE_ENV || "development";
    // In production you typically want: secure: true, sameSite: "None"
    return {
        httpOnly: true,
        secure: env === "production",
        sameSite: env === "production" ? "None" : "Lax",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7),
    };
}