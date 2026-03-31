import { Router } from "express";
import { register, login, me } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { registerRules, loginRules } from "../validators/authValidators.js";

const router = Router();

router.post("/register", registerRules, register);
router.post("/login", loginRules, login);
router.get("/me", protect, me);

export default router;
