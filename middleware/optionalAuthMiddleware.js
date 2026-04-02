import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Attaches req.user if a valid Bearer token is sent; otherwise continues without user.
 * Use for routes that behave differently for logged-in users (e.g. vendor vs public list).
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) return next();

  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.sub);
    if (user && user.isActive !== false) req.user = user;
  } catch {
    /* invalid token — treat as anonymous */
  }
  next();
});
