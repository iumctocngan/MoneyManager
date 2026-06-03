import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;

try {
  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465, // true cho port 465, false cho port khác
    auth: {
      user: env.email.user,
      pass: env.email.pass,
    },
  });
} catch (error) {
  console.error('Failed to configure email transporter:', error);
}

/**
 * Gửi email chứa mã OTP đặt lại mật khẩu
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} otp - Mã OTP 6 số
 */
export async function sendResetPasswordEmail(to, otp) {
  if (!transporter) {
    console.error('Email transporter is not configured. Falling back to console logging.');
    console.log(`[EMAIL MOCK] To: ${to} | OTP: ${otp}`);
    return;
  }

  const mailOptions = {
    from: `"MoneyManager" <${env.email.user}>`,
    to,
    subject: 'Mã xác nhận đặt lại mật khẩu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">Yêu cầu đặt lại mật khẩu</h2>
        <p>Xin chào,</p>
        <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản MoneyManager của bạn.</p>
        <p>Mã xác nhận OTP của bạn là:</p>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Mã này sẽ hết hạn trong vòng 15 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ hỗ trợ để bảo vệ tài khoản.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reset password email sent to ${to}`);
  } catch (error) {
    console.error('Error sending reset password email:', error);
    // Vẫn log ra console để có thể test nếu cấu hình email chưa chuẩn
    console.log(`[EMAIL MOCK] To: ${to} | OTP: ${otp}`);
    throw new Error('Lỗi khi gửi email xác nhận. Vui lòng thử lại sau.', { cause: error });
  }
}
