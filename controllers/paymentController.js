import { body, validationResult } from "express-validator";
import { Order } from "../models/orderModel.js";
import { getStripe, amountToStripeMinorUnits } from "../config/stripe.js";
import { sendSuccess } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const currency = () => (process.env.STRIPE_CURRENCY || "inr").toLowerCase();

export const createIntentRules = [
  body("orderId").notEmpty().withMessage("orderId is required"),
  body("amount").isInt({ min: 1 }).withMessage("amount must be a positive integer (minor units)"),
];

/**
 * POST /api/payment/create-intent
 * Creates or reuses a PaymentIntent for an order. Validates client amount against DB total.
 */
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(422, "Validation failed", errors.array());
  }

  const { orderId, amount } = req.body;
  const amountMinor = Number(amount);

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  if (String(order.user) !== String(req.user._id)) {
    throw new ApiError(403, "Not allowed to pay for this order");
  }
  if (order.paymentMethod !== "stripe") {
    throw new ApiError(400, "Order is not configured for Stripe payment");
  }
  if (order.paymentStatus === "paid") {
    throw new ApiError(400, "Order is already paid");
  }
  if (order.status === "cancelled") {
    throw new ApiError(400, "Cannot pay for a cancelled order");
  }

  const cur = currency();
  const expectedMinor = amountToStripeMinorUnits(order.total, cur);

  if (!Number.isFinite(amountMinor) || amountMinor !== expectedMinor) {
    throw new ApiError(400, "Amount does not match order total");
  }

  const stripe = getStripe();

  if (order.stripePaymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (existing.status === "succeeded") {
      throw new ApiError(400, "Payment already completed");
    }
    if (
      existing.status === "requires_payment_method" ||
      existing.status === "requires_confirmation" ||
      existing.status === "processing"
    ) {
      return sendSuccess(res, {
        message: "Payment intent ready",
        data: {
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
        },
      });
    }
    if (existing.status === "canceled") {
      order.stripePaymentIntentId = null;
      await order.save();
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: expectedMinor,
    currency: cur,
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId: order._id.toString(),
      userId: order.user.toString(),
    },
  });

  order.stripePaymentIntentId = paymentIntent.id;
  await order.save();

  sendSuccess(res, {
    statusCode: 201,
    message: "Payment intent created",
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    },
  });
});
