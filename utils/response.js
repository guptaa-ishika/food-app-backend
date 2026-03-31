/**
 * Consistent JSON shape for success responses.
 */
export function sendSuccess(res, { statusCode = 200, message, data = null, meta = null } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
}
