import { Router } from "express";
import {
  createOrder,
  listMyOrders,
  listRestaurantOrders,
  listAllOrders,
  getOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { createOrderRules, updateOrderStatusRules } from "../validators/orderValidators.js";

const router = Router();

router.post("/", protect, authorize("customer", "admin"), createOrderRules, createOrder);

router.get("/me", protect, authorize("customer", "admin"), listMyOrders);

router.get("/restaurant/:restaurantId", protect, authorize("vendor", "admin"), listRestaurantOrders);

router.get("/admin/all", protect, authorize("admin"), listAllOrders);

router.get("/:id", protect, getOrder);

router.patch("/:id/status", protect, updateOrderStatusRules, updateOrderStatus);

export default router;
