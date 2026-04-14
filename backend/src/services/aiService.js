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
        description: "The category ID. SELECT ONLY THE ID STRING. Expenses: food, transport, shopping, entertainment, health, education, housing, utilities, clothing, beauty, family, travel, sports, pet, gift, other_expense. Income: salary, freelance, investment, bonus, rental, business, interest, gift_income, other_income.",
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
    
    // 1. Tối ưu lại cách trình bày Category để AI chắc chắn chỉ lấy ID
    const categoryMapping = [
      'food (Danh mục: Ăn uống)', 'transport (Danh mục: Di chuyển)', 'shopping (Mua sắm)', 'entertainment (Giải trí)', 
      'health (Danh mục: Sức khỏe)', 'education (Danh mục: Giáo dục)', 'housing (Danh mục: Nhà cửa)', 'utilities (Danh mục: Tiện ích)', 
      'clothing (Danh mục: Quần áo)', 'beauty (Danh mục: Làm đẹp)', 'family (Danh mục: Gia đình)', 'travel (Danh mục: Du lịch)', 
      'sports (Danh mục: Thể thao)', 'pet (Danh mục: Thú cưng)', 'gift (Danh mục: Quà tặng)', 'other_expense (Danh mục: Chi phí khác)', 
      'salary (Danh mục: Lương)', 'freelance (Danh mục: Làm tự do)', 'investment (Danh mục: Đầu tư)', 'bonus (Danh mục: Thưởng)', 
      'rental (Danh mục: Cho thuê)', 'business (Danh mục: Kinh doanh)', 'interest (Danh mục: Lãi suất)', 'gift_income (Danh mục: Thu nhập quà tặng)', 
      'other_income (Danh mục: Thu nhập khác)'
    ].map(item => `ID: ${item}`).join('\n- ');

    // 2. Fix lỗi múi giờ: Lấy giờ chuẩn VN (GMT+7) và format ra ISO 8601
    const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000); 
    const today = vnTime.toISOString().replace('Z', '+07:00');
    
    const prompt = `Bạn là một trợ lý quản lý tài chính thông minh.
Nhiệm vụ của bạn là nghe đoạn audio và trích xuất TẤT CẢ các giao dịch thu chi được nhắc đến.

QUY TẮC TRÍCH XUẤT:
1. Số tiền (amount): Xác định chính xác bằng số nguyên (VND). Hiểu các từ lóng: "cành"/"k" = 1.000, "lít" = 100.000, "củ"/"triệu" = 1.000.000. (VD: "năm trăm cành" = 500000).
2. Loại (type): "expense" (chi tiêu) hoặc "income" (thu nhập).
3. Phân loại (categoryId): Lựa chọn ID phù hợp nhất CHỈ TRONG danh sách sau (Tuyệt đối chỉ lấy phần ID):
- ${categoryMapping}
4. Ghi chú (note): Ngắn gọn, súc tích bằng tiếng Việt (VD: "Ăn trưa", "Đổ xăng").
5. Ngày giờ (date): LUÔN gán giá trị là "${today}" cho tất cả giao dịch, bỏ qua mọi từ ngữ chỉ thời gian mà người dùng nói. Trả về đúng định dạng ISO 8601.

LƯU Ý QUAN TRỌNG (Xử lý tiếng ồn):
- Lọc nhiễu: Chỉ tập trung vào thông tin của người dùng chính. Bỏ qua hoàn toàn tiếng ồn trắng, tiếng TV, hoặc giọng người khác xen vào.
- Bỏ qua hội thoại thừa: Ví dụ audio "Của chú hết bao nhiêu? Dạ 30 cành. Ok đây chú gửi nè" -> Chỉ trích xuất 1 giao dịch chi tiêu amount: 30000.
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
            temperature: 0,
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
    } catch (_e) {
      console.error('Failed to parse Gemini response', resultText);
      throw new Error('Không thể phân tích phản hồi từ AI', { cause: _e });
    }
  },
};
