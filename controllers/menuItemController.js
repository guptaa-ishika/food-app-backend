import { validationResult } from "express-validator";
import { Restaurant } from "../models/restaurantModel.js";
import { MenuItem } from "../models/menuItemModel.js";
import { deleteByPublicId } from "../services/cloudinaryService.js";
import { sendSuccess } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function assertRestaurantAccess(user, restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new ApiError(404, "Restaurant not found");
  const isOwner = String(restaurant.owner) === String(user._id);
  if (!isOwner && user.role !== "admin") {
    throw new ApiError(403, "Not allowed to manage this restaurant's menu");
  }
  return restaurant;
}

export const createMenuItem = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, "Validation failed", errors.array());

  const { restaurantId } = req.params;
  await assertRestaurantAccess(req.user, restaurantId);

  const payload = {
    restaurant: restaurantId,
    name: req.body.name,
    description: req.body.description,
    price: Number(req.body.price),
    veg: Boolean(req.body.veg),
    isAvailable: req.body.isAvailable !== false,
  };

  if (req.body.image?.url) {
    payload.image = {
      url: req.body.image.url,
      publicId: req.body.image.publicId || null,
    };
  }

  const item = await MenuItem.create(payload);
  sendSuccess(res, { statusCode: 201, message: "Menu item created", data: { menuItem: item } });
});

export const listMenuItems = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw new ApiError(404, "Restaurant not found");

  const isOwner = req.user && String(restaurant.owner) === String(req.user._id);
  const publicOk = restaurant.isApproved && restaurant.isActive;

  if (!publicOk && !isOwner && req.user?.role !== "admin") {
    throw new ApiError(404, "Restaurant not found");
  }

  const onlyAvailable = !isOwner && req.user?.role !== "admin";
  const query = { restaurant: restaurantId };
  if (onlyAvailable) query.isAvailable = true;

  const items = await MenuItem.find(query).sort({ createdAt: -1 });
  sendSuccess(res, { data: { menuItems: items } });
});

export const getMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.itemId).populate("restaurant");
  if (!item) throw new ApiError(404, "Menu item not found");
  sendSuccess(res, { data: { menuItem: item } });
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, "Validation failed", errors.array());

  const item = await MenuItem.findById(req.params.itemId);
  if (!item) throw new ApiError(404, "Menu item not found");

  await assertRestaurantAccess(req.user, item.restaurant);

  const { name, description, price, veg, isAvailable, image } = req.body;
  if (name !== undefined) item.name = name;
  if (description !== undefined) item.description = description;
  if (price !== undefined) item.price = Number(price);
  if (veg !== undefined) item.veg = Boolean(veg);
  if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);

  if (image?.url) {
    if (item.image?.publicId && image.publicId !== item.image.publicId) {
      await deleteByPublicId(item.image.publicId);
    }
    item.image = { url: image.url, publicId: image.publicId || null };
  }

  await item.save();
  sendSuccess(res, { message: "Menu item updated", data: { menuItem: item } });
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.itemId);
  if (!item) throw new ApiError(404, "Menu item not found");

  await assertRestaurantAccess(req.user, item.restaurant);

  if (item.image?.publicId) {
    await deleteByPublicId(item.image.publicId);
  }

  await item.deleteOne();
  sendSuccess(res, { message: "Menu item deleted" });
});
