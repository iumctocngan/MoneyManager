import { randomUUID } from 'node:crypto';
import { execute, query, withTransaction } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { mapUser } from '../utils/serializers.js';
import { createAccessToken } from '../utils/token.js';
import { sendResetPasswordEmail } from './email.service.js';

// Các cột trả về khi query user — loại trừ password_hash để tránh rò rỉ dữ liệu nhạy cảm
const USER_SELECT = `
  SELECT
    id,
    email,
    name,
    last_login_at,
    created_at
  FROM users
`;

// Truy vấn nội bộ — có kèm password_hash để dùng cho xác thực, không export ra ngoài
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

  // Trả về null thay vì undefined để caller dễ kiểm tra
  return rows[0] ?? null;
}

/**
 * Lấy thông tin user theo ID, không trả về password_hash.
 * Nhận executor tùy chọn để có thể chạy trong transaction hiện có.
 */
export async function getUserById(id, executor = query) {
  const rows = await execute(
    executor,
    `${USER_SELECT} WHERE id = :id LIMIT 1`,
    { id }
  );

  return rows[0] ? mapUser(rows[0]) : null;
}

// Đóng gói phản hồi đăng ký/đăng nhập thành một cấu trúc chuẩn { accessToken, user }
function buildAuthResponse(user) {
  return {
    accessToken: createAccessToken(user),
    user,
  };
}

/**
 * Đăng ký tài khoản mới.
 * Dùng withTransaction để kiểm tra email trùng và insert user trong cùng một transaction,
 * tránh race condition khi hai request cùng email đến đồng thời.
 */
export async function registerUser(payload) {
  // Chuẩn hóa email về chữ thường để tránh trùng lặp do case
  const email = payload.email.toLowerCase();
  // Nếu không có tên, lấy phần trước @ của email làm tên mặc định
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



    // Đọc lại user từ DB để đảm bảo dữ liệu trả về nhất quán với schema
    const user = await getUserById(userId, connection);
    return buildAuthResponse(user);
  });
}

/**
 * Xác thực đăng nhập và cấp access token.
 * Trả về cùng một lỗi 401 cho cả hai trường hợp "sai email" và "sai mật khẩu"
 * để tránh lộ thông tin về tài khoản tồn tại hay không.
 */
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

  // Cập nhật thời điểm đăng nhập gần nhất — không cần transaction vì chỉ ghi một bảng
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

/**
 * Yêu cầu đặt lại mật khẩu: Sinh mã OTP ngẫu nhiên, lưu vào DB và gửi email.
 */
export async function requestPasswordReset(email) {
  const normalizedEmail = email.toLowerCase();
  const userRow = await getUserRowByEmail(normalizedEmail);

  if (!userRow) {
    // Để bảo mật, không báo lỗi nếu email không tồn tại, cứ trả về thành công ảo
    return { success: true };
  }

  // Sinh mã OTP 6 số ngẫu nhiên
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // OTP hết hạn sau 15 phút
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Lưu OTP vào DB
  await query(
    `
      UPDATE users
      SET reset_password_otp = :otp,
          reset_password_expires = :expiresAt
      WHERE id = :id
    `,
    { otp, expiresAt, id: userRow.id }
  );

  // Gửi email
  await sendResetPasswordEmail(normalizedEmail, otp);

  return { success: true };
}

/**
 * Xác minh mã OTP xem có hợp lệ và còn hạn không.
 */
export async function verifyPasswordResetOtp(email, otp) {
  const normalizedEmail = email.toLowerCase();

  const rows = await query(
    `
      SELECT id, reset_password_otp, reset_password_expires
      FROM users
      WHERE email = :email
      LIMIT 1
    `,
    { email: normalizedEmail }
  );

  const userRow = rows[0];

  if (!userRow || userRow.reset_password_otp !== otp) {
    throw new HttpError(400, 'Mã xác nhận không hợp lệ.');
  }

  if (new Date() > new Date(userRow.reset_password_expires)) {
    throw new HttpError(400, 'Mã xác nhận đã hết hạn.');
  }

  return { success: true };
}

/**
 * Đặt lại mật khẩu mới nếu OTP hợp lệ.
 */
export async function resetPassword(email, otp, newPassword) {
  const normalizedEmail = email.toLowerCase();

  // Xác minh lại OTP trước khi đổi mật khẩu để đảm bảo an toàn
  await verifyPasswordResetOtp(normalizedEmail, otp);

  const passwordHash = await hashPassword(newPassword);

  // Cập nhật mật khẩu và xóa OTP
  await query(
    `
      UPDATE users
      SET password_hash = :passwordHash,
          reset_password_otp = NULL,
          reset_password_expires = NULL
      WHERE email = :email
    `,
    { passwordHash, email: normalizedEmail }
  );

  return { success: true };
}

