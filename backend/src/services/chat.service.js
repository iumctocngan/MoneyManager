import { randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';

async function assertSessionOwnership(userId, sessionId) {
  const rows = await query(
    `
      SELECT id
      FROM chat_sessions
      WHERE id = :sessionId AND user_id = :userId
      LIMIT 1
    `,
    { userId, sessionId }
  );

  if (!rows[0]) {
    throw new HttpError(404, 'Chat session not found.');
  }
}

export async function listSessions(userId) {
  return query(
    'SELECT * FROM chat_sessions WHERE user_id = :userId ORDER BY created_at DESC',
    { userId }
  );
}

export async function getSessionMessages(userId, sessionId) {
  await assertSessionOwnership(userId, sessionId);

  return query(
    `
      SELECT cm.*
      FROM chat_messages cm
      INNER JOIN chat_sessions cs ON cs.id = cm.session_id
      WHERE cm.session_id = :sessionId AND cs.user_id = :userId
      ORDER BY cm.created_at ASC
    `,
    { userId, sessionId }
  );
}

export async function createSession(userId, title) {
  const id = randomUUID();
  await query(
    'INSERT INTO chat_sessions (id, user_id, title) VALUES (:id, :userId, :title)',
    { id, userId, title: title || 'Cuộc trò chuyện mới' }
  );
  return id;
}

export async function saveMessage(userId, sessionId, role, content, fileUri = null) {
  await assertSessionOwnership(userId, sessionId);

  const id = randomUUID();
  await query(
    `INSERT INTO chat_messages (id, session_id, role, content, file_uri) 
     VALUES (:id, :sessionId, :role, :content, :fileUri)`,
    { id, sessionId, role, content, fileUri }
  );
  return id;
}

export async function deleteSession(userId, sessionId) {
  const result = await query(
    'DELETE FROM chat_sessions WHERE id = :sessionId AND user_id = :userId',
    { userId, sessionId }
  );

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Chat session not found.');
  }
}
