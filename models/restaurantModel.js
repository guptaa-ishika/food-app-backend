import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
  },
  { _id: false },
);

const restaurantSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    /**
     * Store cuisine as an array for clean querying & UI formatting.
     * Example: ["North Indian", "Biryani"] → UI: cuisine.join(" · ")
     */
    cuisine: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    /** Delivery estimate shown to customers. */
    deliveryMins: { type: Number, default: 30, min: 1 },
    /** Delivery fee shown to customers. */
    fee: { type: Number, default: 0, min: 0 },
    /**
     * Primary image URL (simple string for frontend cards).
     * We keep `coverImage` for Cloudinary publicId + future edits.
     */
    image: { type: String, default: "" },
    /** Simple offer label like "40% OFF", "BOGO", "Free delivery". */
    offer: { type: String, default: null },
    tags: {
      type: [String],
      enum: ["veg", "bestseller", "healthy", "spicy"],
      default: [],
    },
    city: { type: String, default: "" },
    address: { type: String, default: "" },

    /**
     * Back-compat fields used by existing services (orders, etc.).
     * Prefer using `fee` + `deliveryMins` going forward.
     */
    deliveryFee: { type: Number, default: 0, min: 0 },
    deliveryTimeMinutes: { type: Number, default: 30, min: 1 },
    coverImage: { type: imageSchema, default: null },
    /** Pending until admin approves (for new vendors). */
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

restaurantSchema.index({ name: "text", cuisine: "text", city: "text", tags: "text" });

export const Restaurant = mongoose.model("Restaurant", restaurantSchema);
