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
export function sendError(res, message, statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      details,
    },
  });
}
