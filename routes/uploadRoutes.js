import { Router } from "express";
import { uploadImage } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadSingleImage } from "../middleware/uploadMiddleware.js";
import { handleUpload } from "../middleware/handleUpload.js";

const router = Router();

router.post("/image", protect, handleUpload(uploadSingleImage), uploadImage);

export default router;
