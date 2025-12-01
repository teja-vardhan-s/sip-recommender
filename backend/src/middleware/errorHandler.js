export default function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    const code = err.code || 1004; // fallback server error code
    // prefer the specific detail if it's given, otherwise we'll go with a generic message
    const message = err.details || err.message || "Server encountered an error";

    const payload = { error: { code, message } };
    if (process.env.NODE_ENV === "development") {
        payload.error.stack = err.stack;
        if (err.details) payload.error.details = err.details;
    }

    res.status(status).json(payload);
}