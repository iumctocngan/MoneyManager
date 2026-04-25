import { HumanMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import fs from 'fs';
import Groq from 'groq-sdk';
import path from 'path';

// ─── Clients (lazy singleton) ────────────────────────────────────────────────

const geminiModelCache = {};
let cachedGroqClient = null;

function getGeminiModel(modelName = 'gemini-2.5-flash') {
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

function getGroqClient() {
  if (!cachedGroqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY chưa được cấu hình');
    cachedGroqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return cachedGroqClient;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LIST_STRING =
  'food=Ăn uống, transport=Di chuyển, shopping=Mua sắm, entertainment=Giải trí, ' +
  'health=Sức khỏe, education=Học tập, housing=Nhà cửa, utilities=Tiện ích, ' +
  'clothing=Quần áo, beauty=Làm đẹp, family=Gia đình, travel=Du lịch, ' +
  'sports=Thể thao, pet=Thú cưng, gift=Quà tặng, other_expense=Khác (Chi), ' +
  'salary=Lương, freelance=Freelance, investment=Đầu tư, bonus=Thưởng, ' +
  'rental=Cho thuê, business=Kinh doanh, interest=Lãi suất, ' +
  'gift_income=Tiền quà, other_income=Khác (Thu)';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getVnNow() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('Z', '+07:00');
}

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
      prompt: 'Ghi âm thu chi tài chính: cành, nghìn, triệu, củ, lít, đồng, ăn trưa, đổ xăng...',
    });
    return typeof transcription === 'string' ? transcription : transcription.text;
  } finally {
    fileStream.destroy();
  }
}

/**
 * Trích xuất giao dịch từ văn bản bằng LangChain Chain.
 */
async function extractTransactionsFromText(transcript) {
  if (!transcript?.trim()) return [];

  try {
    const model = getGeminiModel('gemini-2.5-flash-lite');
    const today = getVnNow();

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
 */
async function extractTransactionFromReceipt(imagePath, mimeType) {
  if (!fs.existsSync(imagePath)) throw new Error(`File không tồn tại: ${imagePath}`);

  try {
    const finalMimeType = mimeType || getMimeType(imagePath);
    const model = getGeminiModel('gemini-2.5-flash');
    const today = getVnNow();
    const imageBuffer = await fs.promises.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const prompt = `Bạn là chuyên gia kế toán. Hãy đọc hóa đơn trong ảnh và trích xuất thành 1 giao dịch tổng cộng.
  
  QUY TẮC:
  1. amount: Số tiền TỔNG CỘNG (VND).
  2. type: "expense".
  3. categoryId: Chọn từ danh sách: ${CATEGORY_LIST_STRING}
  4. note: Tên cửa hàng/quán.
  5. date: Ngày trên hóa đơn hoặc "${today}" (ISO 8601).
  
  Trả về JSON mảng 1 phần tử.`;

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
  async transcribeTransactions(audioFilePath) {
    try {
      console.log('[aiService] Transcribing with Groq...');
      const transcript = await transcribeWithGroq(audioFilePath);
      console.log('[aiService] Transcript:', transcript);

      if (!transcript?.trim()) return [];

      console.log('[aiService] Extracting with LangChain...');
      return await extractTransactionsFromText(transcript);
    } finally {
      cleanupFile(audioFilePath);
    }
  },

  async scanReceipt(imagePath, mimeType) {
    try {
      console.log('[aiService] Scanning receipt with LangChain Multimodal...');
      return await extractTransactionFromReceipt(imagePath, mimeType);
    } finally {
      cleanupFile(imagePath);
    }
  },
};