import mongoose from "mongoose";
import { MenuItem } from "../models/menuItemModel.js";
import { Restaurant } from "../models/restaurantModel.js";
import { Order } from "../models/orderModel.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Validates items belong to restaurant, builds line items and totals.
 * @param {string} restaurantId
 * @param {{ menuItemId: string, qty: number }[]} rawItems
 */
export async function buildOrderPayload(restaurantId, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ApiError(400, "Order must include at least one item");
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new ApiError(404, "Restaurant not found");
  }
  if (!restaurant.isApproved) {
    throw new ApiError(400, "Restaurant is not approved for orders");
  }
  if (!restaurant.isActive) {
    throw new ApiError(400, "Restaurant is not accepting orders");
  }

  const ids = rawItems.map((i) => i.menuItemId).filter(Boolean);
  const uniqueIds = [...new Set(ids.map((id) => String(id)))];
  const objectIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));

  const menuDocs = await MenuItem.find({
    _id: { $in: objectIds },
    restaurant: restaurant._id,
    isAvailable: true,
  });

  const byId = new Map(menuDocs.map((m) => [String(m._id), m]));

  const items = [];
  let subtotal = 0;

  for (const line of rawItems) {
    const mid = String(line.menuItemId);
    const qty = Number(line.qty);
    if (!mid || !Number.isFinite(qty) || qty < 1) {
      throw new ApiError(400, "Each item needs valid menuItemId and qty");
    }
    const doc = byId.get(mid);
    if (!doc) {
      throw new ApiError(400, `Invalid or unavailable menu item: ${mid}`);
    }
    const lineTotal = doc.price * qty;
    subtotal += lineTotal;
    items.push({
      menuItem: doc._id,
      name: doc.name,
      price: doc.price,
      qty,
      imageUrl: doc.image?.url || null,
    });
  }

  const tax = Math.round(subtotal * 0.05);
  const deliveryFee = restaurant.deliveryFee || 0;
  const total = subtotal + tax + deliveryFee;

  return {
    restaurant,
    items,
    subtotal,
    tax,
    deliveryFee,
    total,
  };
}

export async function createOrderDocument(userId, restaurantId, deliveryAddress, paymentMethod, rawItems) {
  const payload = await buildOrderPayload(restaurantId, rawItems);

  const method = paymentMethod || "cod";
  const order = await Order.create({
    user: userId,
    restaurant: payload.restaurant._id,
    items: payload.items,
    subtotal: payload.subtotal,
    tax: payload.tax,
    deliveryFee: payload.deliveryFee,
    total: payload.total,
    status: "pending",
    paymentMethod: method,
    paymentStatus: "pending",
    deliveryAddress,
  });

  return order.populate([
    { path: "restaurant", select: "name city coverImage" },
    { path: "user", select: "name email" },
  ]);
}
