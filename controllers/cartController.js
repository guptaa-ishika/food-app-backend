import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Cart } from "../models/cartModel.js";
import { Restaurant } from "../models/restaurantModel.js";
import { MenuItem } from "../models/menuItemModel.js";
import { sendSuccess } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function emptyCartPayload() {
  return { restaurantId: null, items: {} };
}

function formatCartPayload(cart) {
  if (!cart || !cart.items?.length) {
    return emptyCartPayload();
  }

  const rid = String(cart.restaurant._id || cart.restaurant);
  const items = {};

  for (const line of cart.items) {
    const m = line.menuItem;
    if (!m?._id) continue;
    if (m.isAvailable === false) continue;

    const mid = String(m._id);
    const key = `${rid}:${mid}`;
    items[key] = {
      id: mid,
      name: m.name,
      price: m.price,
      veg: Boolean(m.veg),
      qty: line.qty,
      desc: m.description || "",
      description: m.description || "",
      image: m.image,
      restaurantId: rid,
    };
  }

  return { restaurantId: rid, items };
}

async function loadCartFormatted(userId) {
  const cart = await Cart.findOne({ user: userId })
    .populate("restaurant", "name fee deliveryFee deliveryMins deliveryTimeMinutes")
    .populate({
      path: "items.menuItem",
      select: "name price veg description image isAvailable restaurant",
    });

  if (!cart) return emptyCartPayload();

  /** Populated `cart.restaurant` is a document; compare ids, not String(object). */
  const cartRestaurantId = String(cart.restaurant._id ?? cart.restaurant);

  const filteredItems = cart.items.filter((line) => {
    const m = line.menuItem;
    if (!m || m.isAvailable === false) return false;
    const midR = m.restaurant ? String(m.restaurant._id ?? m.restaurant) : "";
    return midR === cartRestaurantId;
  });

  if (filteredItems.length !== cart.items.length) {
    cart.items = filteredItems;
    if (cart.items.length === 0) {
      await cart.deleteOne();
      return emptyCartPayload();
    }
    cart.markModified("items");
    await cart.save();
  }

  return formatCartPayload(cart);
}

async function assertRestaurantAndItem(restaurantId, menuItemId) {
  if (!mongoose.Types.ObjectId.isValid(restaurantId) || !mongoose.Types.ObjectId.isValid(menuItemId)) {
    throw new ApiError(400, "Invalid restaurant or menu item id");
  }

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new ApiError(404, "Restaurant not found");
  if (!restaurant.isApproved || !restaurant.isActive) {
    throw new ApiError(400, "Restaurant is not available for orders");
  }

  const menuItem = await MenuItem.findOne({
    _id: menuItemId,
    restaurant: restaurantId,
    isAvailable: true,
  });
  if (!menuItem) throw new ApiError(400, "Menu item not found or unavailable");

  return { restaurant, menuItem };
}

export const getCart = asyncHandler(async (req, res) => {
  const payload = await loadCartFormatted(req.user._id);
  sendSuccess(res, { data: { cart: payload } });
});

export const syncCartItem = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, "Validation failed", errors.array());

  const { restaurantId, menuItemId, delta } = req.body;
  const d = Number(delta);

  if (d === 1) {
    await assertRestaurantAndItem(restaurantId, menuItemId);

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      await Cart.create({
        user: req.user._id,
        restaurant: restaurantId,
        items: [{ menuItem: menuItemId, qty: 1 }],
      });
    } else if (String(cart.restaurant) !== String(restaurantId)) {
      cart.restaurant = restaurantId;
      cart.items = [{ menuItem: menuItemId, qty: 1 }];
      cart.markModified("items");
      await cart.save();
    } else {
      const idx = cart.items.findIndex((line) => String(line.menuItem) === String(menuItemId));
      if (idx >= 0) {
        cart.items[idx].qty += 1;
        cart.markModified("items");
      } else {
        cart.items.push({ menuItem: menuItemId, qty: 1 });
        cart.markModified("items");
      }
      await cart.save();
    }
  } else if (d === -1) {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || String(cart.restaurant) !== String(restaurantId)) {
      sendSuccess(res, { data: { cart: emptyCartPayload() } });
      return;
    }

    const idx = cart.items.findIndex((line) => String(line.menuItem) === String(menuItemId));
    if (idx < 0) {
      const payload = await loadCartFormatted(req.user._id);
      sendSuccess(res, { data: { cart: payload } });
      return;
    }

    cart.items[idx].qty -= 1;
    if (cart.items[idx].qty <= 0) {
      cart.items.splice(idx, 1);
    }
    cart.markModified("items");

    if (cart.items.length === 0) {
      await cart.deleteOne();
      sendSuccess(res, { data: { cart: emptyCartPayload() } });
      return;
    }

    await cart.save();
  } else {
    throw new ApiError(400, "delta must be 1 or -1");
  }

  const payload = await loadCartFormatted(req.user._id);
  sendSuccess(res, { data: { cart: payload } });
});

export const clearCart = asyncHandler(async (req, res) => {
  await Cart.deleteOne({ user: req.user._id });
  sendSuccess(res, { message: "Cart cleared", data: { cart: emptyCartPayload() } });
});
