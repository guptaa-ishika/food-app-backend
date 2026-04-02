import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Requires Authorization: Bearer <token>. Sets req.user (full user doc without password).
 */
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authorized — no token");
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ApiError(500, "Server misconfiguration");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    throw new ApiError(401, "Not authorized — invalid token");
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  if (user.isActive === false) {
    throw new ApiError(403, "This account has been suspended");
  }

  req.user = user;
  next();
});

/**
 * After protect — only listed roles may access the route.
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authorized"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden — insufficient role"));
    }
    next();
  };
}
