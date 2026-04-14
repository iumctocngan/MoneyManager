import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from './http-error.js';

const scrypt = promisify(scryptCallback);
const PASSWORD_PREFIX = 'scrypt';

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);

  return `${PASSWORD_PREFIX}:${salt}:${Buffer.from(derivedKey).toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const [prefix, salt, originalHash] = String(storedHash).split(':');

  if (prefix !== PASSWORD_PREFIX || !salt || !originalHash) {
    throw new HttpError(500, 'Stored password hash format is invalid.');
  }

  const derivedKey = await scrypt(password, salt, 64);
  const candidateHash = Buffer.from(derivedKey).toString('hex');

  return timingSafeEqual(
    Buffer.from(candidateHash, 'hex'),
    Buffer.from(originalHash, 'hex')
  );
}
