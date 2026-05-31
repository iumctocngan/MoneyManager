/**
 * Bọc async route handler để tự động bắt lỗi và chuyển sang Express error handler.
 * Tránh phải viết try/catch lặp lại trong mỗi controller.
 */
export function asyncHandler(handler) {
  return function wrappedHandler(request, response, next) {
    // Promise.resolve bọc cả handler đồng bộ lẫn async — mọi lỗi đều được .catch(next) bắt
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}
