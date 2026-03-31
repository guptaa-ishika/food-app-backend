import { uploadBuffer, deleteByPublicId } from "../services/cloudinaryService.js";
import { sendSuccess } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const FOLDERS = {
  avatar: "food-delivery/avatars",
  restaurant: "food-delivery/restaurants",
  menu: "food-delivery/menu",
};

/**
 * POST /api/upload/image
 * multipart field name: image
 * query or body: folder=avatar|restaurant|menu (default avatar)
 */
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file?.buffer) {
    throw new ApiError(400, "No image file — use field name 'image'");
  }

  const folderKey = req.body.folder || req.query.folder || "avatar";
  const folder = FOLDERS[folderKey] || FOLDERS.avatar;

  const result = await uploadBuffer(req.file.buffer, { folder });

  sendSuccess(res, {
    statusCode: 201,
    message: "Uploaded",
    data: {
      url: result.url,
      publicId: result.publicId,
    },
  });
});

export { deleteByPublicId };
