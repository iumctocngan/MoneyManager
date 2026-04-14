import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';

let cachedAiClient = null;

function getAiClient() {
  if (!cachedAiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    cachedAiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return cachedAiClient;
}

const responseSchema = {
  type: Type.ARRAY,
  description: 'List of financial transactions extracted from the audio.',
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: 'Whether this is an expense or an income',
        enum: ['expense', 'income'],
      },
      amount: {
        type: Type.NUMBER,
        description: 'The amount of money involved, in numbers (e.g. 500k = 500000)',
      },
      categoryId: {
        type: Type.STRING,
        description: "The category ID of the transaction. Map to the closest one. For expenses: 'food', 'transport', 'shopping', 'entertainment', 'health', 'education', 'housing', 'utilities', 'clothing', 'beauty', 'family', 'travel', 'sports', 'pet', 'gift', 'other_expense'. For income: 'salary', 'freelance', 'investment', 'bonus', 'rental', 'business', 'interest', 'gift_income', 'other_income'.",
      },
      note: {
        type: Type.STRING,
        description: 'A very short, concise note describing the transaction (e.g., "Ăn trưa", "Lương tháng 10"). Keep it in Vietnamese.',
      },
      date: {
        type: Type.STRING,
        description: 'The date and time of the transaction in ISO 8601 format.',
      },
    },
    required: ['type', 'amount', 'categoryId', 'date', 'note'],
  },
};

export const aiService = {
  /**
   * Transcribes an audio file and extracts transactions.
   * @param {string} audioFilePath - Path to the local audio file.
   * @param {string} mimeType - MIME type of the audio.
   * @returns {Promise<Array>} List of transaction objects.
   */
  async transcribeTransactions(audioFilePath, mimeType) {
    const ai = getAiClient();
    
    // Read the file into memory as base64
    const audioBytes = fs.readFileSync(audioFilePath);
    const base64Data = audioBytes.toString('base64');
    
    const today = new Date().toISOString();
    
    // Standard system prompt
    const prompt = `Bạn là một trợ lý quản lý tài chính thông minh.
Nghe đoạn audio, trích xuất tất cả các giao dịch thu chi được nhắc đến.
1. Xác định số tiền (amount) chính xác (ví dụ "năm trăm cành", "năm trăm k" = 500000, "1 triệu" = 1000000).
2. Xác định loại (type): "expense" (chi tiêu) hoặc "income" (thu nhập).
3. Phân loại (categoryId) phù hợp nhất theo danh sách ID đã cung cấp.
4. Ghi chú (note) ngắn gọn bằng tiếng Việt.
5. Ngày giờ (date): Luôn sử dụng ngày giờ hiện tại là ${today} cho tất cả các giao dịch. Bỏ qua mọi từ ngữ chỉ thời gian mà người dùng nói. Trả về định dạng ISO 8601.

LƯU Ý QUAN TRỌNG (Xử lý tiếng ồn):
- Lọc nhiễu: Nếu trong đoạn audio có tiếng ồn trắng, tiếng TV, hoặc nhiều người cùng nói, hãy CHỈ tập trung vào thông tin giao dịch của người dùng chính (người đang trực tiếp ghi chép).
- Bỏ qua hội thoại thừa: Nếu người dùng đang nói chuyện với người khác (ví dụ: "Của chú hết bao nhiêu? Dạ 30 cành. Ok đây chú gửi nè") -> Hãy chỉ trích xuất giao dịch chi tiêu 30.000đ.
- Nếu đoạn audio không chứa bất kỳ thông tin giao dịch tài chính nào rõ ràng, hãy trả về mảng rỗng [].
`;

    // Make the call to Gemini
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/m4a',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.1,
          },
        });
        break; // success, exit retry loop
      } catch (err) {
        if (err.status === 503 && retries > 1) {
          retries--;
          console.log(`Model overloaded (503). Retrying in 2 seconds... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw err;
        }
      }
    }

    const resultText = response.text;
    
    try {
      return JSON.parse(resultText);
    } catch (e) {
      console.error('Failed to parse Gemini response', resultText);
      throw new Error('Không thể phân tích phản hồi từ AI');
    }
  },
};
