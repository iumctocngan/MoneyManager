import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import Groq from 'groq-sdk';

// ─── Clients (lazy singleton) ────────────────────────────────────────────────

let cachedGeminiClient = null;
let cachedGroqClient = null;

function getGeminiClient() {
  if (!cachedGeminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY chưa được cấu hình');
    cachedGeminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return cachedGeminiClient;
}

function getGroqClient() {
  if (!cachedGroqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY chưa được cấu hình');
    cachedGroqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return cachedGroqClient;
}

// ─── Gemini response schema ──────────────────────────────────────────────────

const responseSchema = {
  type: Type.ARRAY,
  description: 'Danh sách giao dịch tài chính trích xuất từ transcript.',
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: 'Loại giao dịch: chi tiêu hay thu nhập',
        enum: ['expense', 'income'],
      },
      amount: {
        type: Type.NUMBER,
        description: 'Số tiền (VND, số nguyên). VD: "500 cành" = 500000',
      },
      categoryId: {
        type: Type.STRING,
        description:
          'ID danh mục. Chỉ lấy đúng ID, không thêm gì khác. ' +
          'Chi tiêu: food, transport, shopping, entertainment, health, education, housing, utilities, clothing, beauty, family, travel, sports, pet, gift, other_expense. ' +
          'Thu nhập: salary, freelance, investment, bonus, rental, business, interest, gift_income, other_income.',
      },
      note: {
        type: Type.STRING,
        description: 'Ghi chú ngắn bằng tiếng Việt. VD: "Ăn trưa", "Đổ xăng", "Lương tháng 5".',
      },
      date: {
        type: Type.STRING,
        description: 'Ngày giờ ISO 8601.',
      },
    },
    required: ['type', 'amount', 'categoryId', 'date', 'note'],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Giờ hiện tại theo múi giờ Việt Nam (GMT+7), định dạng ISO 8601 */
function getVnNow() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('Z', '+07:00');
}

/**
 * Retry với exponential back-off.
 * Retry khi gặp 503 (model quá tải) hoặc 429 (rate limit).
 */
async function withRetry(fn, retries = 3, baseDelayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err.status === 503 || err.status === 429;
      if (retryable && attempt < retries) {
        const wait = baseDelayMs * attempt;
        console.warn(`[aiService] Lần ${attempt} thất bại (${err.status}). Thử lại sau ${wait}ms…`);
        await new Promise((r) => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
}

// ─── Bước 1: Transcribe bằng Groq Whisper ────────────────────────────────────

/**
 * Chuyển audio → text bằng Groq Whisper (miễn phí, nhanh, chống nhiễu tốt).
 *
 * Tại sao Groq Whisper tốt hơn Gemini trong môi trường ồn:
 * - Whisper được train trên 680k giờ audio thực tế (đường phố, lớp học, v.v.)
 * - Groq chạy trên LPU → latency thấp hơn OpenAI Whisper API gốc
 * - `language: 'vi'` giúp decoder ưu tiên tiếng Việt, giảm lỗi phiên âm
 * - `prompt` (initial prompt) bias decoder về từ vựng tài chính VN
 *
 * @param {string} audioFilePath  Đường dẫn file âm thanh local
 * @returns {Promise<string>}     Văn bản transcript thô
 */
async function transcribeWithGroq(audioFilePath) {
  const groq = getGroqClient();

  // Groq kiem tra extension cua filename trong multipart upload.
  // Expo tao file tam doi khi khong co extension hoac co path la,
  // nen ta gan ten file ro rang de Groq nhan dang dung dinh dang.
  const VALID_EXTENSIONS = ['.flac', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.ogg', '.opus', '.wav', '.webm'];
  const extMatch = audioFilePath.match(/(\.[a-zA-Z0-9]+)(\?.*)?$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';
  const safeFilename = VALID_EXTENSIONS.includes(ext)
    ? audioFilePath.split(/[\\/]/).pop().split('?')[0]
    : 'audio.m4a';

  // Groq SDK doc .name de set filename trong Content-Disposition cua multipart
  const fileStream = Object.assign(fs.createReadStream(audioFilePath), { name: safeFilename });

  const transcription = await withRetry(() =>
    groq.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3',   // model mạnh nhất, vẫn miễn phí trên Groq
      language: 'vi',
      response_format: 'text',
      // Initial prompt: bias Whisper về từ vựng tài chính tiếng Việt
      // Giúp nhận diện "cành", "củ", "lít", "nghìn" chính xác hơn
      prompt:
        'Đây là ghi âm người dùng liệt kê các khoản thu chi trong ngày. ' +
        'Bỏ qua tiếng ồn nền và tiếng người khác. Tập trung vào giọng người nói chính. ' +
        'Từ thường gặp: cành, nghìn, triệu, củ, lít, đồng, ' +
        'ăn trưa, đổ xăng, mua sắm, lương, thưởng, chuyển khoản, cafe, grab.',
    })
  );

  // Groq trả về string khi response_format = 'text'
  return typeof transcription === 'string' ? transcription : (transcription?.text ?? '');
}

// ─── Bước 2: Trích xuất giao dịch từ text bằng Gemini ────────────────────────

/**
 * Dùng Gemini phân tích transcript text → danh sách giao dịch có cấu trúc.
 * Gemini chỉ xử lý text sạch (không có nhiễu) nên kết quả chính xác hơn nhiều.
 *
 * @param {string} transcript  Văn bản transcript từ Whisper
 * @returns {Promise<Array>}   Mảng giao dịch
 */
async function extractTransactionsFromText(transcript) {
  if (!transcript?.trim()) return [];

  const ai = getGeminiClient();
  const today = getVnNow();

  const categoryList =
    // Chi tiêu
    'food=Ăn uống, transport=Di chuyển, shopping=Mua sắm, entertainment=Giải trí, ' +
    'health=Sức khỏe, education=Giáo dục, housing=Nhà cửa, utilities=Tiện ích, ' +
    'clothing=Quần áo, beauty=Làm đẹp, family=Gia đình, travel=Du lịch, ' +
    'sports=Thể thao, pet=Thú cưng, gift=Quà tặng, other_expense=Chi phí khác, ' +
    // Thu nhập
    'salary=Lương, freelance=Làm tự do, investment=Đầu tư, bonus=Thưởng, ' +
    'rental=Cho thuê, business=Kinh doanh, interest=Lãi suất, ' +
    'gift_income=Thu nhập quà tặng, other_income=Thu nhập khác';

  const prompt = `Bạn là trợ lý quản lý tài chính. Đọc TRANSCRIPT bên dưới và trích xuất TẤT CẢ giao dịch thu chi.

TRANSCRIPT:
"""
${transcript}
"""

QUY TẮC BẮT BUỘC:
1. amount: Số nguyên VND. Từ lóng: "cành"/"k"=1.000 | "lít"=100.000 | "củ"/"triệu"=1.000.000
   VD: "30 cành"=30000 | "2 củ rưỡi"=2500000 | "500k"=500000
2. type: "expense" (chi) hoặc "income" (thu).
3. categoryId: Chỉ dùng đúng ID trong danh sách sau (không thêm bất kỳ ký tự nào):
   ${categoryList}
4. note: Ngắn gọn, tiếng Việt. VD: "Ăn trưa", "Đổ xăng", "Tiền lương".
5. date: Dùng đúng giá trị này cho tất cả giao dịch: "${today}"

LƯU Ý:
- Nếu không có giao dịch rõ ràng → trả về [].
- Một câu có thể chứa nhiều giao dịch → trả về nhiều phần tử.
- Bỏ qua hội thoại thừa, chỉ lấy thông tin tài chính.
- VD: "Của chú hết bao nhiêu? Dạ 30 cành." → 1 expense amount=30000.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0,
      },
    })
  );

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error('[aiService] Không thể parse Gemini response:', response.text);
    throw new Error('Không thể phân tích phản hồi từ AI', { cause: e });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const aiService = {
  /**
   * Pipeline 2 bước: Audio → Groq Whisper → text → Gemini → transactions[]
   *
   * @param {string} audioFilePath  Đường dẫn file âm thanh
   * @param {string} mimeType       Giữ lại để tương thích với code cũ (không dùng nữa)
   * @returns {Promise<Array>}      Danh sách giao dịch
   */
  async transcribeTransactions(audioFilePath, mimeType) {
    console.log('[aiService] Bước 1: Transcribe bằng Groq Whisper…');
    const transcript = await transcribeWithGroq(audioFilePath);
    console.log('[aiService] Transcript:', transcript);

    if (!transcript?.trim()) {
      console.warn('[aiService] Transcript rỗng, trả về []');
      return [];
    }

    console.log('[aiService] Bước 2: Trích xuất giao dịch bằng Gemini…');
    const transactions = await extractTransactionsFromText(transcript);
    console.log('[aiService] Kết quả:', transactions);
    return transactions;
  },

  // Expose để test độc lập (không cần audio)
  extractTransactionsFromText,
};