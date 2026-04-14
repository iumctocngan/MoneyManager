import { HttpError } from '../utils/http-error.js';

export function notFoundHandler(request, response, next) {
  next(new HttpError(404, `Cannot ${request.method} ${request.originalUrl}`));
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error.code === 'ER_DUP_ENTRY') {
    response.status(409).json({ message: 'A record with the same identifier already exists.' });
    return;
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    response.status(400).json({ message: 'Related record was not found.' });
    return;
  }

  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const payload = {
    message: error.message || 'Internal server error.',
  };

  if (error instanceof HttpError && error.details) {
    payload.details = error.details;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json(payload);
}
