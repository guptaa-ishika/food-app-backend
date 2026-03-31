import { ApiError } from "../utils/ApiError.js";

/**
 * Central error handler — keep last in Express stack.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  } else if (statusCode === 500) {
    console.error(err);
  }

  const body = {
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === "production" ? "Internal Server Error" : message,
  };

  if (err instanceof ApiError && err.details) {
    body.details = err.details;
  }

  if (process.env.NODE_ENV !== "production" && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

export function notFound(req, res, next) {
  next(new ApiError(404, `Not found — ${req.method} ${req.originalUrl}`));
}
