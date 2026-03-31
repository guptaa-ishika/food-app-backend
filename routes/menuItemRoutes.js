import { Router } from "express";
import { body } from "express-validator";
import {
  createMenuItem,
  listMenuItems,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menuItemController.js";
import { protect } from "../middleware/authMiddleware.js";
import { optionalAuth } from "../middleware/optionalAuthMiddleware.js";

const router = Router();

router.get("/restaurant/:restaurantId/menu-items", optionalAuth, listMenuItems);

router.post(
  "/restaurant/:restaurantId/menu-items",
  protect,
  [
    body("name").trim().notEmpty(),
    body("price").isFloat({ min: 0 }),
    body("veg").optional().isBoolean(),
  ],
  createMenuItem,
);

router.get("/menu-items/:itemId", optionalAuth, getMenuItem);

router.patch(
  "/menu-items/:itemId",
  protect,
  [
    body("name").optional().trim().notEmpty(),
    body("price").optional().isFloat({ min: 0 }),
    body("veg").optional().isBoolean(),
    body("isAvailable").optional().isBoolean(),
  ],
  updateMenuItem,
);

router.delete("/menu-items/:itemId", protect, deleteMenuItem);

export default router;
