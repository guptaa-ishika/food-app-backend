import { Router } from "express";
import { body } from "express-validator";
import { getCart, syncCartItem, clearCart } from "../controllers/cartController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect, authorize("customer", "admin"));

router.get("/", getCart);

router.post(
  "/items",
  [
    body("restaurantId").notEmpty().withMessage("restaurantId required"),
    body("menuItemId").notEmpty().withMessage("menuItemId required"),
    body("delta").isInt({ min: -1, max: 1 }).withMessage("delta must be -1 or 1"),
  ],
  syncCartItem,
);

router.delete("/", clearCart);

export default router;
