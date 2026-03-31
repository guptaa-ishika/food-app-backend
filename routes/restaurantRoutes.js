import { Router } from "express";
import { body } from "express-validator";
import {
  createRestaurant,
  listRestaurants,
  getRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from "../controllers/restaurantController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { optionalAuth } from "../middleware/optionalAuthMiddleware.js";

const router = Router();

router.get("/", optionalAuth, listRestaurants);
router.get("/:id", optionalAuth, getRestaurant);

router.post(
  "/",
  protect,
  authorize("vendor", "admin"),
  [
    body("name").trim().notEmpty(),
    body("owner").optional().matches(/^[a-fA-F0-9]{24}$/).withMessage("Invalid owner id"),
  ],
  createRestaurant,
);

router.patch(
  "/:id",
  protect,
  [
    body("name").optional().trim().notEmpty(),
    body("deliveryFee").optional().isNumeric(),
    body("deliveryTimeMinutes").optional().isInt({ min: 1 }),
  ],
  updateRestaurant,
);

router.delete("/:id", protect, deleteRestaurant);

export default router;
