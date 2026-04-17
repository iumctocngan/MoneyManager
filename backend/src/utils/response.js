/**
 * Standardizes success response format
 */
export function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Standardizes error response format
 */
export function sendError(res, message, statusCode = 500, code = null, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      details,
    },
  });
}
