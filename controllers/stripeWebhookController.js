import { getStripe } from "../config/stripe.js";
import { Order } from "../models/orderModel.js";

/**
 * POST /webhook — raw body only. Mounted before express.json in server.js.
 */
export async function handleStripeWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET missing");
    return res.status(500).send("Webhook not configured");
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    return res.status(400).send("Missing stripe-signature");
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId;
        if (!orderId) {
          console.warn("[stripe webhook] payment_intent.succeeded without orderId metadata");
          break;
        }

        const chargeId =
          typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge?.id || null;

        await Order.findOneAndUpdate(
          { _id: orderId },
          {
            $set: {
              paymentStatus: "paid",
              stripePaymentIntentId: pi.id,
              stripePaymentId: chargeId,
            },
          },
        );
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await Order.findOneAndUpdate(
            { _id: orderId },
            { $set: { paymentStatus: "failed" } },
          );
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler error:", e);
    return res.status(500).json({ received: false });
  }

  return res.json({ received: true });
}
