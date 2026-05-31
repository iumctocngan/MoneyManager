import { HumanMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import fs from 'fs';
import Groq from 'groq-sdk';
import path from 'path';

// ─── Clients (lazy singleton) ────────────────────────────────────────────────

// Cache theo tên model để tái sử dụng instance, tránh khởi tạo lại mỗi request
const geminiModelCache = {};
let cachedGroqClient = null;

/**
 * Trả về (hoặc khởi tạo) Gemini model theo tên.
 * Lazy singleton: chỉ tạo khi lần đầu gọi, sau đó dùng lại từ cache.
 */
function getGeminiModel(modelName = 'gemini-3.1-flash-lite') {
  if (!geminiModelCache[modelName]) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY chưa được cấu hình');
    geminiModelCache[modelName] = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: modelName,
      temperature: 0,
    });
  }
  return geminiModelCache[modelName];
}

/**
 * Trả về (hoặc khởi tạo) Groq client dùng cho Whisper transcription.
 * Groq được chọn thay vì Gemini cho audio vì tốc độ transcription nhanh hơn và hỗ trợ tiếng Việt tốt hơn.
 */
function getGroqClient() {
  if (!cachedGroqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY chưa được cấu hình');
    cachedGroqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return cachedGroqClient;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Danh sách danh mục dạng "key=label" để nhúng vào prompt — LLM chọn đúng categoryId từ danh sách này
const CATEGORY_LIST_STRING =
  'food=Ăn uống, transport=Di chuyển, shopping=Mua sắm, entertainment=Giải trí, ' +
  'health=Sức khỏe, education=Học tập, housing=Nhà cửa, utilities=Tiện ích, ' +
  'clothing=Quần áo, beauty=Làm đẹp, family=Gia đình, travel=Du lịch, ' +
  'sports=Thể thao, pet=Thú cưng, gift=Quà tặng, other_expense=Khác (Chi), ' +
  'salary=Lương, freelance=Freelance, investment=Đầu tư, bonus=Thưởng, ' +
  'rental=Cho thuê, business=Kinh doanh, interest=Lãi suất, ' +
  'gift_income=Tiền quà, other_income=Khác (Thu)';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Trả về thời gian hiện tại theo múi giờ Việt Nam (UTC+7) dạng ISO 8601.
 * Dùng offset thủ công thay vì Intl.DateTimeFormat để đảm bảo format nhất quán cho LLM.
 */
function getVnNow() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('Z', '+07:00');
}

/**
 * Xác định MIME type từ phần mở rộng file ảnh để truyền đúng cho Gemini multimodal.
 * Fallback về 'image/jpeg' nếu extension không nhận ra.
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
  };
  return map[ext] || 'image/jpeg';
}

/**
 * Xóa file tạm sau khi xử lý xong để tránh tốn dung lượng ổ đĩa.
 * Dùng unlink đồng bộ trong finally block — không throw nếu thất bại để tránh che giấu lỗi chính.
 */
function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`[aiService] Đã xóa file tạm: ${filePath}`);
    } catch (err) {
      console.error(`[aiService] Không thể xóa file tạm: ${filePath}`, err.message);
    }
  }
}

// ─── LangChain Implementation ────────────────────────────────────────────────

/**
 * Chuyển audio → text bằng Groq Whisper.
 * Dùng prompt gợi ý các từ tài chính tiếng Việt để tăng độ chính xác nhận dạng từ chuyên ngành.
 */
async function transcribeWithGroq(audioFilePath) {
  const groq = getGroqClient();
  const fileStream = fs.createReadStream(audioFilePath);

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3',
      language: 'vi',
      response_format: 'text',
      // Prompt gợi ý giúp Whisper nhận dạng đúng các từ viết tắt tiền tệ tiếng Việt (cành, củ, lít...)
      prompt: 'Ghi âm thu chi tài chính: cành, nghìn, triệu, củ, lít, đồng, ăn trưa, đổ xăng...',
    });
    return typeof transcription === 'string' ? transcription : transcription.text;
  } finally {
    fileStream.destroy();
  }
}

/**
 * Trích xuất giao dịch từ văn bản bằng LangChain Chain.
 * Dùng PromptTemplate → Gemini → JsonOutputParser pipeline để đảm bảo output là JSON hợp lệ.
 */
async function extractTransactionsFromText(transcript) {
  if (!transcript?.trim()) return [];

  try {
    const model = getGeminiModel('gemini-3.1-flash-lite');
    const today = getVnNow();

    // PromptTemplate cho phép inject biến (transcript, categories, today) an toàn vào prompt
    const promptTemplate = PromptTemplate.fromTemplate(`
      Bạn là trợ lý quản lý tài chính. Trích xuất TẤT CẢ giao dịch thu chi từ TRANSCRIPT.
      
      TRANSCRIPT: "{transcript}"
      
      QUY TẮC:
      1. amount: Số nguyên VND (cành/k=1.000, lít=100.000, củ/triệu=1.000.000).
      2. type: "expense" hoặc "income".
      3. categoryId: Chọn từ: {categories}
      4. note: Tiếng Việt ngắn gọn.
      5. date: Luôn dùng "{today}"
      
      Trả về định dạng JSON là một mảng các đối tượng.
    `);

    // JsonOutputParser tự động parse và validate chuỗi JSON từ LLM, throw nếu format sai
    const parser = new JsonOutputParser();
    const chain = promptTemplate.pipe(model).pipe(parser);

    return await chain.invoke({
      transcript,
      categories: CATEGORY_LIST_STRING,
      today,
    });
  } catch (error) {
    console.error('[aiService] extractTransactionsFromText failed:', error.message);
    return [];
  }
}

/**
 * Phân tích hóa đơn bằng LangChain Multimodal.
 * Dùng Gemini Vision: ảnh được encode base64 rồi nhúng trực tiếp vào HumanMessage content.
 */
async function extractTransactionFromReceipt(imagePath, mimeType) {
  if (!fs.existsSync(imagePath)) throw new Error(`File không tồn tại: ${imagePath}`);

  try {
    const finalMimeType = mimeType || getMimeType(imagePath);
    const model = getGeminiModel('gemini-3.1-flash-lite');
    const today = getVnNow();
    const imageBuffer = await fs.promises.readFile(imagePath);
    // Gemini Vision API nhận ảnh qua data URI (base64), không hỗ trợ truyền đường dẫn file trực tiếp
    const base64Image = imageBuffer.toString('base64');

    const prompt = `Bạn là chuyên gia kế toán. Hãy đọc hóa đơn trong ảnh và trích xuất thành 1 giao dịch tổng cộng.
  
  QUY TẮC:
  1. amount: Số tiền TỔNG CỘNG (VND).
  2. type: "expense".
  3. categoryId: Chọn từ danh sách: ${CATEGORY_LIST_STRING}
  4. note: Tên cửa hàng/quán.
  5. date: Ngày trên hóa đơn hoặc "${today}" (ISO 8601).
  
  Trả về JSON mảng 1 phần tử.`;

    // Multimodal message: content là mảng gồm text prompt + image_url (data URI)
    const message = new HumanMessage({
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${finalMimeType};base64,${base64Image}`,
          },
        },
      ],
    });

    const parser = new JsonOutputParser();
    const chain = model.pipe(parser);

    return await chain.invoke([message]);
  } catch (error) {
    console.error('[aiService] extractTransactionFromReceipt failed:', error.message);
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const aiService = {
  /**
   * Pipeline hoàn chỉnh: audio file → Groq Whisper transcript → Gemini trích xuất giao dịch.
   * shouldCleanup=true (mặc định) để tự động xóa file tạm sau khi xử lý.
   */
  async transcribeTransactions(audioFilePath, shouldCleanup = true) {
    try {
      console.log('[aiService] Transcribing with Groq...');
      const transcript = await transcribeWithGroq(audioFilePath);
      console.log('[aiService] Transcript:', transcript);

      if (!transcript?.trim()) return [];

      console.log('[aiService] Extracting with LangChain...');
      return await extractTransactionsFromText(transcript);
    } finally {
      if (shouldCleanup) cleanupFile(audioFilePath);
    }
  },

  /**
   * Phân tích ảnh hóa đơn và trả về mảng giao dịch đã trích xuất.
   * File tạm được xóa trong finally block bất kể thành công hay thất bại.
   */
  async scanReceipt(imagePath, mimeType, shouldCleanup = true) {
    try {
      console.log('[aiService] Scanning receipt with LangChain Multimodal...');
      return await extractTransactionFromReceipt(imagePath, mimeType);
    } finally {
      if (shouldCleanup) cleanupFile(imagePath);
    }
  },
};