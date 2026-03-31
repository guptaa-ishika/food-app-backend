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
    cuisine: { type: String, default: "" },
    city: { type: String, default: "" },
    address: { type: String, default: "" },
    deliveryFee: { type: Number, default: 0, min: 0 },
    deliveryTimeMinutes: { type: Number, default: 30, min: 1 },
    coverImage: { type: imageSchema, default: null },
    /** Pending until admin approves (for new vendors). */
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

restaurantSchema.index({ name: "text", cuisine: "text", city: "text" });

export const Restaurant = mongoose.model("Restaurant", restaurantSchema);
