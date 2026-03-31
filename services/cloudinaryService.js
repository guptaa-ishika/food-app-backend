import { cloudinary } from "../config/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Upload a buffer to Cloudinary. Multer memoryStorage gives buffer + mimetype.
 */
export async function uploadBuffer(buffer, { folder = "food-delivery", resourceType = "image" } = {}) {
  if (!buffer?.length) {
    throw new ApiError(400, "Empty file buffer");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, overwrite: false },
      (err, result) => {
        if (err) return reject(err);
        if (!result) return reject(new Error("Cloudinary returned no result"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Delete asset by public_id (e.g. "food-delivery/avatars/xyz").
 */
export async function deleteByPublicId(publicId) {
  if (!publicId || typeof publicId !== "string") return { result: "noop" };
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.error("[cloudinary] destroy failed", publicId, e.message);
    throw new ApiError(500, "Failed to delete image from storage");
  }
}
