import { randomUUID } from 'node:crypto';

import { query } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';

/**
 * Kiểm tra session có thuộc về userId hay không.
 * Dùng chung cho các thao tác đọc/ghi message và xóa session
 * để đảm bảo người dùng không truy cập session của người khác.
 */
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

/** Lấy danh sách phiên chat của user, sắp xếp mới nhất lên đầu. */
export async function listSessions(userId) {
  return query(
    'SELECT * FROM chat_sessions WHERE user_id = :userId ORDER BY created_at DESC',
    { userId }
  );
}

/**
 * Lấy lịch sử tin nhắn của một phiên chat.
 * JOIN với chat_sessions để xác minh quyền sở hữu ngay trong query,
 * đảm bảo user không đọc được message của session người khác dù biết sessionId.
 */
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

/**
 * Tạo phiên chat mới với tiêu đề tùy chọn.
 * Tiêu đề mặc định là 'Cuộc trò chuyện mới' nếu client không gửi.
 */
export async function createSession(userId, title) {
  const id = randomUUID();
  await query(
    'INSERT INTO chat_sessions (id, user_id, title) VALUES (:id, :userId, :title)',
    { id, userId, title: title || 'Cuộc trò chuyện mới' }
  );
  return id;
}

/**
 * Lưu một tin nhắn vào phiên chat.
 * Xác minh quyền sở hữu trước khi ghi để tránh user giả mạo sessionId.
 * role: 'user' | 'assistant' — phân biệt tin nhắn của người dùng và AI.
 */
export async function saveMessage(userId, sessionId, role, content) {
  await assertSessionOwnership(userId, sessionId);

  const id = randomUUID();
  await query(
    `INSERT INTO chat_messages (id, session_id, role, content) 
     VALUES (:id, :sessionId, :role, :content)`,
    { id, sessionId, role, content }
  );
  return id;
}

/**
 * Xóa phiên chat.
 * Delete the session (cascades to messages)
 * affectedRows === 0 là fallback an toàn — dù assertSessionOwnership đã kiểm tra trước.
 */
export async function deleteSession(userId, sessionId) {
  await assertSessionOwnership(userId, sessionId);

  // Delete the session (cascades to messages)
  const result = await query(
    'DELETE FROM chat_sessions WHERE id = :sessionId AND user_id = :userId',
    { userId, sessionId }
  );

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Chat session not found.');
  }
}

