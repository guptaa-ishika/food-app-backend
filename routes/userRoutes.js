import { Router } from "express";
import { body } from "express-validator";
import {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  updateMe,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

const updateMeRules = [
  body("name").optional().trim().notEmpty(),
  body("password").optional().isLength({ min: 6 }),
];

router.patch("/me", protect, updateMeRules, updateMe);

router.use(protect, authorize("admin"));

router.get("/", listUsers);
router.get("/:id", getUser);
router.patch(
  "/:id",
  [
    body("name").optional().trim().notEmpty(),
    body("role").optional().isIn(["customer", "vendor", "admin"]),
  ],
  updateUser,
);
router.delete("/:id", deleteUser);

export default router;
