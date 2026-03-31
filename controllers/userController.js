import { validationResult } from "express-validator";
import { User } from "../models/userModel.js";
import { deleteByPublicId } from "../services/cloudinaryService.js";
import { sendSuccess } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  sendSuccess(res, { data: { users } });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) throw new ApiError(404, "User not found");
  sendSuccess(res, { data: { user } });
});

export const updateUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(422, "Validation failed", errors.array());
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  const { name, role } = req.body;
  if (name) user.name = name;
  if (role && ["customer", "vendor", "admin"].includes(role)) {
    user.role = role;
  }

  await user.save();
  sendSuccess(res, { message: "User updated", data: { user: user.toSafeJSON() } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (user.avatar?.publicId) {
    await deleteByPublicId(user.avatar.publicId);
  }
  await user.deleteOne();
  sendSuccess(res, { message: "User deleted" });
});

/** Current user updates profile (name, optional password). */
export const updateMe = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(422, "Validation failed", errors.array());
  }

  const user = await User.findById(req.user._id).select("+password");
  const { name, password, currentPassword, avatar } = req.body;

  if (name) user.name = name;

  if (avatar?.url) {
    if (user.avatar?.publicId && avatar.publicId !== user.avatar.publicId) {
      await deleteByPublicId(user.avatar.publicId);
    }
    user.avatar = { url: avatar.url, publicId: avatar.publicId || null };
  }

  if (password) {
    if (!currentPassword) {
      throw new ApiError(400, "currentPassword required to set new password");
    }
    if (!(await user.comparePassword(currentPassword))) {
      throw new ApiError(401, "Current password is incorrect");
    }
    user.password = password;
  }

  await user.save();
  sendSuccess(res, { message: "Profile updated", data: { user: user.toSafeJSON() } });
});
