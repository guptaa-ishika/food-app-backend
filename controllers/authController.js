import { validationResult } from "express-validator";
import { User } from "../models/userModel.js";
import { generateToken } from "../utils/generateToken.js";
import { sendSuccess } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(422, "Validation failed", errors.array());
  }

  const { name, email, password, role } = req.body;

  const exists = await User.findOne({ email });
  console.log('exists', exists);
  if (exists) {
    throw new ApiError(409, "Email already registered");
  }

  /** Public signup: customer or vendor only (admin created via DB or internal tooling). */
  const safeRole = role === "vendor" ? "vendor" : "customer";

  const user = await User.create({
    name,
    email,
    password,
    role: safeRole,
  });

  const token = generateToken(user._id);

  sendSuccess(res, {
    statusCode: 201,
    message: "Registered successfully",
    data: {
      user: user.toSafeJSON(),
      token,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(422, "Validation failed", errors.array());
  }

  const { email, password, role } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.isActive === false) {
    throw new ApiError(403, "This account has been suspended");
  }

  /**
   * Optional role enforcement:
   * - Customer login page can omit role.
   * - Vendor/Admin login pages send role, and we reject mismatches.
   */
  if (role && user.role !== role) {
    throw new ApiError(403, "Invalid role for this account");
  }

  const token = generateToken(user._id);

  sendSuccess(res, {
    message: "Login successful",
    data: {
      user: user.toSafeJSON(),
      token,
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { user: req.user.toSafeJSON() } });
});
