import { HttpError } from '../utils/http-error.js';
import { sendError } from '../utils/response.js';

export function notFoundHandler(request, response, next) {
  next(new HttpError(404, `Cannot ${request.method} ${request.originalUrl}`));
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error.code === 'ER_DUP_ENTRY') {
    return sendError(response, 'A record with the same identifier already exists.', 409);
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return sendError(response, 'Related record was not found.', 400);
  }

  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  
  if (statusCode >= 500) {
    console.error(error);
  }

  sendError(
    response,
    error.message || 'Internal server error.',
    statusCode,
    null,
    error instanceof HttpError ? error.details : null
  );
}
