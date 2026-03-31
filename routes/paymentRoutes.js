import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createPaymentIntent, createIntentRules } from "../controllers/paymentController.js";

const router = Router();

router.post("/create-intent", protect, createIntentRules, createPaymentIntent);

export default router;
