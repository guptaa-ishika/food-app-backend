import mongoose from "mongoose";

const cartLineSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    items: { type: [cartLineSchema], default: [] },
  },
  { timestamps: true },
);

export const Cart = mongoose.model("Cart", cartSchema);
