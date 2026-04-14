import { getUserById } from '../services/auth.service.js';
import { verifyAccessToken } from '../utils/token.js';

export async function requireAuth(request, response, next) {
  try {
    const authorization = request.get('authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      response.status(401).json({ message: 'Missing bearer access token.' });
      return;
    }

    const token = authorization.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      response.status(401).json({ message: 'Authenticated user was not found.' });
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
