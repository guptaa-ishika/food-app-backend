import { ApiError } from "../utils/ApiError.js";

/**
 * Wraps multer to forward upload errors to centralized handler.
 */
export function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        return next(new ApiError(400, err.message || "Upload failed"));
      }
      next();
    });
  };
}
