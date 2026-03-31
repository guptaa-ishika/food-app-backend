import Stripe from "stripe";

let stripeSingleton = null;

/**
 * Stripe server SDK — uses STRIPE_SECRET_KEY only (never expose to clients).
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

/** Smallest currency unit (e.g. paise for INR, cents for USD). */
export function amountToStripeMinorUnits(totalMajor, currency) {
  const cur = (currency || "inr").toLowerCase();
  const zeroDecimal = ["jpy", "krw", "vnd"].includes(cur);
  if (zeroDecimal) return Math.round(totalMajor);
  return Math.round(totalMajor * 100);
}
