import { getUserById } from '../services/auth.service.js';
import { verifyAccessToken } from '../utils/token.js';
import { HttpError } from '../utils/http-error.js';

export async function requireAuth(request, response, next) {
  try {
    const authorization = request.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      next(new HttpError(401, 'Missing bearer access token.'));
      return;
    }

    const token = authorization.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      next(new HttpError(401, 'Authenticated user was not found.'));
      return;
    }

    request.auth = {
      userId: user.id,
      email: user.email,
    };
    request.user = user;

    next();
  } catch (error) {
    next(error);
  }
}
