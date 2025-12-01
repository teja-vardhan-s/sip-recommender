import { ERROR_CODES } from "./errorCodes.js";

export default class AppError extends Error {
    constructor(errorCode = ERROR_CODES.SERVER_ERROR, details = null) {
        const message = errorCode?.message || "Unknown error";
        super(message);

        this.code = errorCode?.code || 1004;
        this.status = errorCode?.status || 500;
        this.details = details;
    }
}
