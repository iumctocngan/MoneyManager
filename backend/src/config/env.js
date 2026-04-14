import dotenv from 'dotenv';

dotenv.config();

function getNumber(name, fallback) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }

  return value;
}

function getString(name, fallback = '') {
  const rawValue = process.env[name];
  return rawValue === undefined || rawValue === '' ? fallback : rawValue;
}

export const env = {
  nodeEnv: getString('NODE_ENV', 'development'),
  port: getNumber('PORT', 4000),
  corsOrigin: getString('CORS_ORIGIN', '*'),
  auth: {
    tokenSecret: getString('AUTH_TOKEN_SECRET', 'dev-insecure-secret'),
    accessTokenTtlHours: getNumber('ACCESS_TOKEN_TTL_HOURS', 168),
  },
  db: {
    host: getString('DB_HOST', '127.0.0.1'),
    port: getNumber('DB_PORT', 3306),
    user: getString('DB_USER', 'root'),
    password: getString('DB_PASSWORD', ''),
    database: getString('DB_NAME', 'money_manager'),
  },
};
