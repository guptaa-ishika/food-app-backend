import { body } from "express-validator";

export const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password min 6 characters"),
  body("role").optional().isIn(["customer", "vendor"]).withMessage("role must be customer or vendor"),
];

export const loginRules = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  body("role").optional().isIn(["customer", "vendor", "admin"]).withMessage("role must be customer, vendor, or admin"),
];
