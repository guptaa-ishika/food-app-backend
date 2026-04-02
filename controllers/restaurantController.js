import { validationResult } from "express-validator";
import { Restaurant } from "../models/restaurantModel.js";
import { MenuItem } from "../models/menuItemModel.js";
import { deleteByPublicId } from "../services/cloudinaryService.js";
import { sendSuccess } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createRestaurant = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, "Validation failed", errors.array());

  if (req.user.role !== "vendor" && req.user.role !== "admin") {
    throw new ApiError(403, "Only vendors or admins can create restaurants");
  }

  const owner = req.user.role === "admin" && req.body.owner ? req.body.owner : req.user._id;

  const cuisine = Array.isArray(req.body.cuisine)
    ? req.body.cuisine
    : typeof req.body.cuisine === "string" && req.body.cuisine.trim()
      ? [req.body.cuisine.trim()]
      : [];

  const payload = {
    owner,
    name: req.body.name,
    description: req.body.description,
    cuisine,
    city: req.body.city,
    address: req.body.address,
    // New names (frontend cards)
    fee: Number(req.body.fee ?? req.body.deliveryFee) || 0,
    deliveryMins: Number(req.body.deliveryMins ?? req.body.deliveryTimeMinutes) || 30,
    image: req.body.image || req.body.coverImage?.url || "",
    offer: req.body.offer ?? null,
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    // rating/reviews are system-controlled (users/vendors can't set them)
    rating: 0,
    reviews: 0,

    // Back-compat (existing services)
    deliveryFee: Number(req.body.deliveryFee ?? req.body.fee) || 0,
    deliveryTimeMinutes: Number(req.body.deliveryTimeMinutes ?? req.body.deliveryMins) || 30,
    isApproved: req.user.role === "admin" ? Boolean(req.body.isApproved) : false,
  };

  if (req.body.coverImage?.url) {
    payload.coverImage = {
      url: req.body.coverImage.url,
      publicId: req.body.coverImage.publicId || null,
    };
    payload.image = req.body.coverImage.url;
  }

  const restaurant = await Restaurant.create(payload);
  sendSuccess(res, { statusCode: 201, message: "Restaurant created", data: { restaurant } });
});

export const listRestaurants = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user?.role === "admin") {
    if (req.query.owner) filter.owner = req.query.owner;
    if (req.query.pending === "true") filter.isApproved = false;
    if (req.query.approved === "true") filter.isApproved = true;
    if (req.query.city) filter.city = new RegExp(req.query.city, "i");
  } else if (req.user?.role === "vendor") {
    filter.owner = req.user._id;
    if (req.query.city) filter.city = new RegExp(req.query.city, "i");
  } else {
    /** Anonymous + customers: only live, approved restaurants. */
    filter.isApproved = true;
    filter.isActive = true;
    if (req.query.city) filter.city = new RegExp(req.query.city, "i");
  }

  const restaurants = await Restaurant.find(filter)
    .populate("owner", "name email role")
    .sort({ createdAt: -1 });

  sendSuccess(res, { data: { restaurants } });
});

export const getRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id).populate("owner", "name email role");
  if (!restaurant) throw new ApiError(404, "Restaurant not found");

  const isOwner = req.user && String(restaurant.owner) === String(req.user._id);
  const isPrivileged = req.user?.role === "admin" || isOwner;

  if (!isPrivileged && (!restaurant.isApproved || !restaurant.isActive)) {
    throw new ApiError(404, "Restaurant not found");
  }

  sendSuccess(res, { data: { restaurant } });
});

export const updateRestaurant = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, "Validation failed", errors.array());

  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) throw new ApiError(404, "Restaurant not found");

  const isOwner = String(restaurant.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    throw new ApiError(403, "Not allowed to update this restaurant");
  }

  const {
    name,
    description,
    cuisine,
    city,
    address,
    deliveryFee,
    deliveryTimeMinutes,
    fee,
    deliveryMins,
    image,
    offer,
    tags,
    coverImage,
    isApproved,
  } = req.body;

  if (name !== undefined) restaurant.name = name;
  if (description !== undefined) restaurant.description = description;
  if (cuisine !== undefined) {
    restaurant.cuisine = Array.isArray(cuisine)
      ? cuisine
      : typeof cuisine === "string" && cuisine.trim()
        ? [cuisine.trim()]
        : [];
  }
  if (city !== undefined) restaurant.city = city;
  if (address !== undefined) restaurant.address = address;
  if (fee !== undefined) restaurant.fee = Number(fee);
  if (deliveryMins !== undefined) restaurant.deliveryMins = Number(deliveryMins);
  if (image !== undefined) restaurant.image = image || "";
  if (offer !== undefined) restaurant.offer = offer;
  if (tags !== undefined) restaurant.tags = Array.isArray(tags) ? tags : [];
  // rating/reviews are system-controlled; ignore any incoming values

  // Back-compat updates
  if (deliveryFee !== undefined) restaurant.deliveryFee = Number(deliveryFee);
  if (deliveryTimeMinutes !== undefined) restaurant.deliveryTimeMinutes = Number(deliveryTimeMinutes);

  if (req.user.role === "admin" && isApproved !== undefined) {
    restaurant.isApproved = Boolean(isApproved);
  }

  if (coverImage?.url) {
    if (restaurant.coverImage?.publicId && coverImage.publicId !== restaurant.coverImage.publicId) {
      await deleteByPublicId(restaurant.coverImage.publicId);
    }
    restaurant.coverImage = {
      url: coverImage.url,
      publicId: coverImage.publicId || null,
    };
    restaurant.image = coverImage.url;
  }

  await restaurant.save();
  sendSuccess(res, { message: "Restaurant updated", data: { restaurant } });
});

export const deleteRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) throw new ApiError(404, "Restaurant not found");

  const isOwner = String(restaurant.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    throw new ApiError(403, "Not allowed");
  }

  if (restaurant.coverImage?.publicId) {
    await deleteByPublicId(restaurant.coverImage.publicId);
  }

  await MenuItem.deleteMany({ restaurant: restaurant._id });
  await restaurant.deleteOne();

  sendSuccess(res, { message: "Restaurant deleted" });
});
