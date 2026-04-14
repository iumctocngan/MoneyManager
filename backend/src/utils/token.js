import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(input) {
  return createHmac('sha256', env.auth.tokenSecret).update(input).digest('base64url');
}

export function createAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + env.auth.accessTokenTtlHours * 60 * 60;
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64urlEncode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: now,
      exp,
    })
  );
  const signature = sign(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token) {
  const parts = String(token).split('.');

  if (parts.length !== 3) {
    throw new HttpError(401, 'Invalid access token.');
  }

  const [header, payload, signature] = parts;
  const expectedSignature = sign(`${header}.${payload}`);

  if (
    Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature) ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw new HttpError(401, 'Invalid access token signature.');
  }

  let parsedPayload;

  try {
    parsedPayload = JSON.parse(base64urlDecode(payload));
  } catch {
    throw new HttpError(401, 'Invalid access token payload.');
  }

  const now = Math.floor(Date.now() / 1000);

  if (!parsedPayload.sub || !parsedPayload.exp || parsedPayload.exp <= now) {
    throw new HttpError(401, 'Access token has expired.');
  }

  return parsedPayload;
}
