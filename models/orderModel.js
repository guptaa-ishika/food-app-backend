import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    imageUrl: { type: String, default: null },
  },
  { _id: false },
);

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: true },
    city: { type: String, required: true },
    pin: { type: String, required: true },
    label: { type: String, default: "Home" },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "preparing", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "cod" },
    /** Online payment lifecycle (Stripe). COD orders stay pending until delivery/cash. */
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String, default: null, index: true },
    /** Latest charge id from Stripe (payment_intent.latest_charge). */
    stripePaymentId: { type: String, default: null },
    deliveryAddress: { type: addressSchema, required: true },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ restaurant: 1, status: 1 });

export const Order = mongoose.model("Order", orderSchema);
