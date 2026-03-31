import multer from "multer";

const memory = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only image uploads are allowed"));
    return;
  }
  cb(null, true);
};

/**
 * Single image in memory — pass buffer to Cloudinary.
 */
export const uploadSingleImage = multer({
  storage: memory,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).single("image");
