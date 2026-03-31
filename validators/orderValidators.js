import { body } from "express-validator";

export const createOrderRules = [
  body("restaurantId").notEmpty().withMessage("restaurantId required"),
  body("items").isArray({ min: 1 }).withMessage("items array required"),
  body("items.*.menuItemId").notEmpty(),
  body("items.*.qty").isInt({ min: 1 }),
  body("deliveryAddress.line1").trim().notEmpty(),
  body("deliveryAddress.city").trim().notEmpty(),
  body("deliveryAddress.pin").matches(/^[0-9]{6}$/).withMessage("PIN must be 6 digits"),
  body("paymentMethod").optional().isIn(["cod", "stripe", "upi"]),
];

export const updateOrderStatusRules = [body("status").notEmpty()];
