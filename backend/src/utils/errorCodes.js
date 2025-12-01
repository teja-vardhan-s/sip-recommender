export const ERROR_CODES = {
    VALIDATION_ERROR: { code: 1001, message: "Invalid input data", status: 400 },
    UNAUTHORIZED: { code: 1002, message: "Unauthorized access", status: 401 },
    NOT_FOUND: { code: 1003, message: "Resource not found", status: 404 },
    SERVER_ERROR: { code: 1004, message: "Server encountered an error", status: 500 },
    DUPLICATE_ENTRY: { code: 1005, message: "Duplicate data detected", status: 409 },
    TOKEN_EXPIRED: {
        code: 1006,
        message: "Token expired",
        status: 401
    },
};