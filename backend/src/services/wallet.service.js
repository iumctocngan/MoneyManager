import { randomUUID } from 'node:crypto';
import { execute, query, withTransaction } from '../config/database.js';
import { toMysqlDateTime } from '../utils/datetime.js';
import { HttpError } from '../utils/http-error.js';
import { mapWallet } from '../utils/serializers.js';


/**
 * Query chuẩn để lấy thông tin ví kèm cờ has_transactions.
 * has_transactions được tính bằng subquery COUNT với LIMIT 1 để tối ưu hiệu năng —
 * chỉ cần biết có ít nhất 1 giao dịch, không cần đếm toàn bộ.
 * Cờ này dùng để ngăn xóa ví khi frontend cần cảnh báo người dùng.
 */
const WALLET_SELECT = `
  SELECT
    id,
    name,
    balance,
    color,
    icon,
    include_in_total,
    created_at,
    (
      SELECT COUNT(*)
      FROM transactions t
      WHERE t.wallet_id = wallets.id OR t.to_wallet_id = wallets.id
      LIMIT 1
    ) > 0 AS has_transactions
  FROM wallets
`;

/**
 * Điều chỉnh số dư ví theo delta (dương = tăng, âm = giảm).
 * Dùng `balance + :delta` thay vì set giá trị tuyệt đối để tránh race condition
 * khi nhiều giao dịch cập nhật cùng lúc — DB tự xử lý atomic.
 * Luôn chạy trong transaction để đảm bảo nhất quán với bảng transactions.
 */
export async function adjustWalletBalance(executor, userId, walletId, delta) {
  await execute(
    executor,
    `
      UPDATE wallets
      SET balance = balance + :delta
      WHERE id = :walletId AND user_id = :userId
    `,
    { delta, walletId, userId }
  );
}

/** Kiểm tra ví có tồn tại và thuộc về userId hay không. */
export async function walletExists(executor, userId, walletId) {
  const rows = await execute(
    executor,
    `
      SELECT id
      FROM wallets
      WHERE id = :walletId AND user_id = :userId
      LIMIT 1
    `,
    { walletId, userId }
  );

  return rows.length > 0;
}

/**
 * Kiểm tra ví tồn tại và ném lỗi 400 nếu không.
 * fieldName giúp thông báo lỗi chính xác trường nào không hợp lệ (walletId hay toWalletId).
 */
export async function assertWalletExists(executor, userId, walletId, fieldName = 'walletId') {
  const exists = await walletExists(executor, userId, walletId);

  if (!exists) {
    throw new HttpError(400, `${fieldName} "${walletId}" does not exist.`);
  }
}

/** Lấy danh sách tất cả ví của user, sắp xếp theo thời gian tạo tăng dần. */
export async function listWallets(userId, executor = query) {
  const rows = await execute(
    executor,
    `${WALLET_SELECT} WHERE user_id = :userId ORDER BY created_at ASC`,
    { userId }
  );

  return rows.map(mapWallet);
}

/** Lấy một ví theo ID, trả về null nếu không tìm thấy. */
export async function getWalletById(userId, id, executor = query) {
  const rows = await execute(
    executor,
    `${WALLET_SELECT} WHERE user_id = :userId AND id = :id LIMIT 1`,
    { userId, id }
  );

  return rows[0] ? mapWallet(rows[0]) : null;
}

/**
 * Tạo ví mới.
 * Cho phép client gửi kèm ID và createdAt để hỗ trợ đồng bộ offline-first.
 * Số dư ban đầu được set theo payload (ví có thể khởi tạo với số dư ≠ 0).
 */
export async function createWallet(userId, payload) {
  const id = payload.id ?? randomUUID();
  const createdAt = toMysqlDateTime(payload.createdAt ?? new Date());

  await query(
    `
      INSERT INTO wallets (
        id,
        user_id,
        name,
        balance,
        color,
        icon,
        include_in_total,
        created_at
      )
      VALUES (
        :id,
        :userId,
        :name,
        :balance,
        :color,
        :icon,
        :includeInTotal,
        :createdAt
      )
    `,
    {
      id,
      userId,
      name: payload.name,
      balance: payload.balance,
      color: payload.color,
      icon: payload.icon,
      includeInTotal: payload.includeInTotal ?? true,
      createdAt,
    }
  );

  return getWalletById(userId, id);
}

/**
 * Cập nhật ví theo kiểu partial update — chỉ ghi các trường có trong payload.
 * withTransaction bảo vệ tính nhất quán khi đọc rồi ghi trong cùng một phiên.
 * Dùng mảng updates[] để xây dựng SET động, tránh ghi đè trường không có thay đổi.
 */
export async function updateWallet(userId, id, payload) {
  return await withTransaction(async (connection) => {
    const current = await getWalletById(userId, id, connection);

    if (!current) {
      throw new HttpError(404, 'Wallet not found.');
    }

    const updates = [];
    const params = { id, userId };

    if (payload.name !== undefined) {
      updates.push('name = :name');
      params.name = payload.name;
    }

    if (payload.balance !== undefined) {
      // Chú ý: Việc ghi đè balance trực tiếp có thể gây lệch dữ liệu nếu có giao dịch song song.
      // Ưu tiên điều chỉnh qua giao dịch.
      updates.push('balance = :balance');
      // Math.round để đảm bảo lưu số nguyên VNĐ, tránh floating-point
      params.balance = Math.round(payload.balance);
    }

    if (payload.color !== undefined) {
      updates.push('color = :color');
      params.color = payload.color;
    }

    if (payload.icon !== undefined) {
      updates.push('icon = :icon');
      params.icon = payload.icon;
    }

    if (payload.includeInTotal !== undefined) {
      updates.push('include_in_total = :includeInTotal');
      params.includeInTotal = payload.includeInTotal;
    }

    // Chỉ thực hiện UPDATE khi có ít nhất một trường thay đổi
    if (updates.length > 0) {
      await execute(
        connection,
        `
          UPDATE wallets
          SET ${updates.join(', ')}
          WHERE id = :id AND user_id = :userId
        `,
        params
      );
    }

    return getWalletById(userId, id, connection);
  });
}

/**
 * Xóa ví và toàn bộ dữ liệu liên quan trong một transaction DB.
 * Thứ tự xóa quan trọng: transactions và budgets trước, ví sau
 * để không vi phạm foreign key constraint.
 */
export async function deleteWallet(userId, id) {
  await withTransaction(async (connection) => {
    const wallet = await getWalletById(userId, id, connection);

    if (!wallet) {
      throw new HttpError(404, 'Wallet not found.');
    }

    // Xóa tất cả giao dịch liên quan đến ví này
    await execute(
      connection,
      'DELETE FROM transactions WHERE user_id = :userId AND (wallet_id = :id OR to_wallet_id = :id)',
      { id, userId }
    );
    
    // Xóa các ngân sách liên quan đến ví này
    await execute(
      connection,
      'DELETE FROM budgets WHERE user_id = :userId AND wallet_id = :id',
      { id, userId }
    );
    
    // Cuối cùng xóa ví
    await execute(connection, 'DELETE FROM wallets WHERE user_id = :userId AND id = :id', {
      id,
      userId,
    });
  });
}
