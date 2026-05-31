import { aiService } from '../services/aiService.js';
import * as aiAgent from '../services/aiAgent.js';
import * as chatService from '../services/chat.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Nhận file audio, chuyển thành text qua Groq Whisper rồi trích xuất danh sách giao dịch bằng Gemini.
 * Trả về mảng giao dịch để frontend xử lý thêm (hiển thị preview, cho user xác nhận trước khi lưu).
 */
export const transcribe = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No audio file provided', 400);
    }

    const audioFilePath = req.file.path;

    // shouldCleanup=true: xóa file tạm ngay sau khi xử lý xong để tránh tốn dung lượng
    const transactions = await aiService.transcribeTransactions(audioFilePath, true);
    sendSuccess(res, transactions);
  } catch (error) {
    console.error('Transcription error:', error);
    sendError(res, error.message || 'Error processing audio');
  }
};

/**
 * Nhận ảnh hóa đơn, dùng Gemini Vision để đọc và trả về giao dịch đã trích xuất.
 * mimeType được lấy từ multer (req.file.mimetype) để truyền đúng loại ảnh cho API.
 */
export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    const imageFilePath = req.file.path;
    const mimeType = req.file.mimetype;

    const transactions = await aiService.scanReceipt(imageFilePath, mimeType);
    sendSuccess(res, transactions);
  } catch (error) {
    console.error('Receipt scan error:', error);
    sendError(res, error.message || 'Error scanning receipt');
  }
};

/**
 * Xử lý một lượt hội thoại với AI agent.
 * Luồng: lưu tin user → gọi agent → lưu phản hồi → trả về kèm dataModified flag.
 * dataModified=true báo hiệu frontend cần refetch dữ liệu (thay vì phân tích text để đoán).
 */
export const chat = async (req, res) => {
  try {
    const rawMessage = typeof req.body.message === 'string' ? req.body.message : '';
    const message = rawMessage.trim();
    let { sessionId } = req.body;
    const userId = req.user.id;

    if (!message) {
      return sendError(res, 'Message is required', 400);
    }

    // 1. Create session if it doesn't exist
    // Nếu chưa có sessionId, tạo session mới với tiêu đề lấy từ 50 ký tự đầu của tin nhắn
    if (!sessionId) {
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      sessionId = await chatService.createSession(userId, title);
    }

    // 2. Lưu tin nhắn user vào DB ngay — đảm bảo không mất lịch sử dù agent bị timeout
    await chatService.saveMessage(userId, sessionId, 'user', message);

    // 3. Get AI Response
    // sessionId được dùng làm thread_id cho LangGraph checkpoint — duy trì ngữ cảnh hội thoại
    const result = await aiAgent.chatWithAI(userId, sessionId, message);

    // 4. Save AI Response
    await chatService.saveMessage(userId, sessionId, 'assistant', result.text);

    // dataModified được truyền thẳng từ agent — frontend dùng để trigger refetch store
    sendSuccess(res, { response: result.text, sessionId, dataModified: result.dataModified });
  } catch (error) {
    console.error('AI Chat error:', error);
    sendError(res, error.message || 'Error communicating with AI', error.statusCode || 500);
  }
};

/**
 * Trả về danh sách tất cả phiên hội thoại của user hiện tại (dùng cho màn hình lịch sử chat).
 */
export const listSessions = async (req, res) => {
  try {
    const sessions = await chatService.listSessions(req.user.id);
    sendSuccess(res, sessions);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Trả về toàn bộ tin nhắn trong một phiên hội thoại cụ thể.
 * Kiểm tra quyền sở hữu (req.user.id) trong service để tránh user xem session của người khác.
 */
export const getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await chatService.getSessionMessages(req.user.id, sessionId);
    sendSuccess(res, messages);
  } catch (error) {
    sendError(res, error.message, error.statusCode || 500);
  }
};

/**
 * Xóa một phiên hội thoại và toàn bộ tin nhắn liên quan.
 * Chỉ xóa được session của chính user — service enforce ownership check.
 */
export async function deleteSession(req, res) {
  try {
    const { sessionId } = req.params;
    await chatService.deleteSession(req.user.id, sessionId);
    sendSuccess(res, { success: true });
  } catch (error) {
    sendError(res, error.message, error.statusCode || 500);
  }
}
