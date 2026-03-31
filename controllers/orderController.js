import { validationResult } from "express-validator";
import { Order } from "../models/orderModel.js";
import { Restaurant } from "../models/restaurantModel.js";
import { createOrderDocument } from "../services/orderService.js";
import { sendSuccess } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const VENDOR_FLOW = ["pending", "accepted", "rejected", "preparing", "out_for_delivery", "delivered"];

export const createOrder = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, "Validation failed", errors.array());

  if (req.user.role !== "customer" && req.user.role !== "admin") {
    throw new ApiError(403, "Only customers can place orders");
  }

  const { restaurantId, items, deliveryAddress, paymentMethod = "cod" } = req.body;

  const order = await createOrderDocument(
    req.user._id,
    restaurantId,
    deliveryAddress,
    paymentMethod,
    items,
  );

  sendSuccess(res, { statusCode: 201, message: "Order placed", data: { order } });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("restaurant", "name city coverImage")
    .sort({ createdAt: -1 });

  sendSuccess(res, { data: { orders } });
});

export const listRestaurantOrders = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new ApiError(404, "Restaurant not found");

  if (String(restaurant.owner) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "Not allowed");
  }

  const orders = await Order.find({ restaurant: restaurantId })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  sendSuccess(res, { data: { orders } });
});

export const listAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate("user", "name email")
    .populate("restaurant", "name city")
    .sort({ createdAt: -1 })
    .limit(200);

  sendSuccess(res, { data: { orders } });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate({ path: "restaurant", select: "name owner city coverImage" });

  if (!order) throw new ApiError(404, "Order not found");

  const isCustomer = String(order.user._id || order.user) === String(req.user._id);
  const restaurant = order.restaurant;
  const isVendor =
    restaurant && String(restaurant.owner) === String(req.user._id);

  if (!isCustomer && !isVendor && req.user.role !== "admin") {
    throw new ApiError(403, "Not allowed");
  }

  sendSuccess(res, { data: { order } });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, "Validation failed", errors.array());

  const order = await Order.findById(req.params.id).populate("restaurant");
  if (!order) throw new ApiError(404, "Order not found");

  const { status } = req.body;

  if (!VENDOR_FLOW.includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const restaurant = await Restaurant.findById(order.restaurant);
  const isVendorOwner = restaurant && String(restaurant.owner) === String(req.user._id);

  if (req.user.role === "customer") {
    if (status !== "cancelled") throw new ApiError(403, "Customers can only cancel");
    if (order.status !== "pending") throw new ApiError(400, "Cannot cancel at this stage");
    if (String(order.user) !== String(req.user._id)) throw new ApiError(403, "Not your order");
    order.status = "cancelled";
  } else if (req.user.role === "admin") {
    order.status = status;
  } else if (isVendorOwner) {
    if (["cancelled"].includes(status) && req.user.role !== "admin") {
      throw new ApiError(403, "Vendor cannot set this status");
    }
    order.status = status;
  } else {
    throw new ApiError(403, "Not allowed");
  }

  await order.save();
  sendSuccess(res, { message: "Order updated", data: { order } });
});
