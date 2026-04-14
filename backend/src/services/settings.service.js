import { execute, query } from '../config/database.js';
import { mapSettings } from '../utils/serializers.js';

async function ensureSettingsRow(userId, executor = query) {
  await execute(
    executor,
    `
      INSERT IGNORE INTO app_settings (
        user_id,
        language,
        theme,
        first_day_of_month,
        show_balance,
        biometric_enabled
      )
      VALUES (:userId, 'vi', 'light', 1, TRUE, FALSE)
    `,
    { userId }
  );
}

export async function getSettings(userId, executor = query) {
  await ensureSettingsRow(userId, executor);
  const rows = await execute(
    executor,
    `
      SELECT
        language,
        theme,
        first_day_of_month,
        show_balance,
        biometric_enabled
      FROM app_settings
      WHERE user_id = :userId
      LIMIT 1
    `,
    { userId }
  );

  return mapSettings(rows[0]);
}

export async function updateSettings(userId, payload) {
  await ensureSettingsRow(userId);

  const updates = [];
  const params = { userId };

  if (payload.language !== undefined) {
    updates.push('language = :language');
    params.language = payload.language;
  }

  if (payload.theme !== undefined) {
    updates.push('theme = :theme');
    params.theme = payload.theme;
  }

  if (payload.firstDayOfMonth !== undefined) {
    updates.push('first_day_of_month = :firstDayOfMonth');
    params.firstDayOfMonth = payload.firstDayOfMonth;
  }

  if (payload.showBalance !== undefined) {
    updates.push('show_balance = :showBalance');
    params.showBalance = payload.showBalance;
  }

  if (payload.biometricEnabled !== undefined) {
    updates.push('biometric_enabled = :biometricEnabled');
    params.biometricEnabled = payload.biometricEnabled;
  }

  if (updates.length > 0) {
    await query(
      `
        UPDATE app_settings
        SET ${updates.join(', ')}
        WHERE user_id = :userId
      `,
      params
    );
  }

  return getSettings(userId);
}
