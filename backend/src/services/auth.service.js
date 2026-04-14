import { randomUUID } from 'node:crypto';
import { execute, query, withTransaction } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { mapUser } from '../utils/serializers.js';
import { createAccessToken } from '../utils/token.js';

const USER_SELECT = `
  SELECT
    id,
    email,
    name,
    last_login_at,
    created_at
  FROM users
`;

async function getUserRowByEmail(email, executor = query) {
  const rows = await execute(
    executor,
    `
      SELECT
        id,
        email,
        name,
        password_hash,
        last_login_at,
        created_at
      FROM users
      WHERE email = :email
      LIMIT 1
    `,
    { email }
  );

  return rows[0] ?? null;
}

export async function getUserById(id, executor = query) {
  const rows = await execute(
    executor,
    `${USER_SELECT} WHERE id = :id LIMIT 1`,
    { id }
  );

  return rows[0] ? mapUser(rows[0]) : null;
}

function buildAuthResponse(user) {
  return {
    accessToken: createAccessToken(user),
    user,
  };
}

export async function registerUser(payload) {
  const email = payload.email.toLowerCase();
  const name = payload.name ?? email.split('@')[0];
  const passwordHash = await hashPassword(payload.password);
  const userId = randomUUID();

  return withTransaction(async (connection) => {
    const existingUser = await getUserRowByEmail(email, connection);

    if (existingUser) {
      throw new HttpError(409, 'Email is already registered.');
    }

    await execute(
      connection,
      `
        INSERT INTO users (
          id,
          email,
          password_hash,
          name
        )
        VALUES (
          :id,
          :email,
          :passwordHash,
          :name
        )
      `,
      {
        id: userId,
        email,
        passwordHash,
        name,
      }
    );

    await execute(
      connection,
      `
        INSERT INTO app_settings (
          user_id,
          language,
          theme,
          first_day_of_month,
          show_balance,
          biometric_enabled
        )
        VALUES (
          :userId,
          'vi',
          'light',
          1,
          TRUE,
          FALSE
        )
      `,
      { userId }
    );

    const user = await getUserById(userId, connection);
    return buildAuthResponse(user);
  });
}

export async function loginUser(payload) {
  const email = payload.email.toLowerCase();
  const userRow = await getUserRowByEmail(email);

  if (!userRow) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  const passwordMatches = await verifyPassword(payload.password, userRow.password_hash);

  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  await query(
    `
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = :id
    `,
    { id: userRow.id }
  );

  const user = await getUserById(userRow.id);
  return buildAuthResponse(user);
}
