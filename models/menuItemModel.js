import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
  },
  { _id: false },
);

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    veg: { type: Boolean, default: true },
    image: { type: imageSchema, default: null },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

menuItemSchema.index({ restaurant: 1, name: 1 });

export const MenuItem = mongoose.model("MenuItem", menuItemSchema);
