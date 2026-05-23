import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createAgent, summarizationMiddleware } from 'langchain';
import { z } from 'zod';

import { env } from '../config/env.js';
import { aiService } from './aiService.js';
import { listBudgets } from './budget.service.js';
import { createTransaction, listTransactions } from './transaction.service.js';
import { listWallets } from './wallet.service.js';

// ─── Constants ────────────────────────────────────────────────────────────────

// prettier-ignore
const CATEGORIES = {
  food: 'Ăn uống', transport: 'Di chuyển', shopping: 'Mua sắm', entertainment: 'Giải trí',
  health: 'Sức khỏe', education: 'Học tập', housing: 'Nhà cửa', utilities: 'Tiện ích',
  clothing: 'Quần áo', beauty: 'Làm đẹp', family: 'Gia đình', travel: 'Du lịch',
  sports: 'Thể thao', pet: 'Thú cưng', gift: 'Quà tặng', other_expense: 'Khác (Chi)',
  salary: 'Lương', freelance: 'Freelance', investment: 'Đầu tư', bonus: 'Thưởng',
  rental: 'Cho thuê', business: 'Kinh doanh', interest: 'Lãi suất', gift_income: 'Tiền quà',
  other_income: 'Khác (Thu)',
};

const categoryKeys = Object.keys(CATEGORIES);

// ─── State Schema ─────────────────────────────────────────────────────────────

const agentStateSchema = z.object({
  messages: z.array(z.any()).default([]),
  lastUsedWalletId: z.string().optional().describe('ID ví được sử dụng gần nhất trong phiên'),
  pendingReceiptTransactions: z.array(z.any()).optional().describe('Các giao dịch vừa quét từ hóa đơn, chờ xác nhận để lưu'),
});

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function categoryName(id) {
  return CATEGORIES[id] || 'Khác';
}

function summarizeTransactions(transactions) {
  return transactions.reduce(
    (acc, tx) => {
      if (tx.type === 'expense') {
        acc.totalExpense += tx.amount;
        const cat = categoryName(tx.categoryId);
        acc.byCategory[cat] = (acc.byCategory[cat] || 0) + tx.amount;
      } else if (tx.type === 'income') {
        acc.totalIncome += tx.amount;
      }
      acc.count += 1;
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, byCategory: {}, count: 0 }
  );
}

function computeBudgetProgress(budget, transactions, now) {
  const start = new Date(budget.startDate);
  const end = new Date(budget.endDate);
  const isActive = now >= start && now <= end;

  const spent =
    typeof budget.spent === 'number'
      ? budget.spent
      : transactions
          .filter(
            (tx) =>
              tx.categoryId === budget.categoryId &&
              tx.type === 'expense' &&
              new Date(tx.date) >= start &&
              new Date(tx.date) <= end &&
              (!budget.walletId || tx.walletId === budget.walletId)
          )
          .reduce((sum, tx) => sum + tx.amount, 0);

  const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return { spent, pct: Math.round(pct * 10) / 10, daysLeft, isActive };
}

// ─── Business Logic Extract (Clean Code) ──────────────────────────────────────

async function generateFinancialStatusReport(userId) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const currentMonthStart = new Date(currentYear, currentMonth, 1).toISOString();
  const currentMonthEnd = new Date(currentYear, currentMonth, daysInMonth, 23, 59, 59, 999).toISOString();
  const [wallets, budgets, currentMonthTxs, recentTxs] = await Promise.all([
    listWallets(userId),
    listBudgets(userId),
    listTransactions(userId, { startDate: currentMonthStart, endDate: currentMonthEnd }),
    listTransactions(userId, { limit: 10 }),
  ]);

  const txMap = new Map();
  recentTxs.forEach((tx) => txMap.set(tx.id, tx));
  currentMonthTxs.forEach((tx) => txMap.set(tx.id, tx));
  const combinedTxs = Array.from(txMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const monthlyTxs = combinedTxs.filter((tx) => {
    if (!tx.date) return false;
    const d = new Date(tx.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const summary = summarizeTransactions(monthlyTxs);
  const burnRate = currentDay > 0 ? summary.totalExpense / currentDay : 0;
  const projectedExpense = Math.round(burnRate * daysInMonth);

  const budgetProgress = budgets.map((budget) => {
    const progress = computeBudgetProgress(budget, combinedTxs, now);
    return {
      category: categoryName(budget.categoryId),
      amount: budget.amount,
      spent: progress.spent,
      pct: progress.pct,
      daysLeft: progress.daysLeft,
      isActive: progress.isActive,
      status: progress.pct >= 100 ? 'exceeded' : progress.pct >= 80 ? 'warning' : 'ok',
    };
  });

  return JSON.stringify({
    today: now.toLocaleDateString('vi-VN'),
    currentDay,
    daysInMonth,
    wallets: wallets.map((w) => ({ name: w.name, balance: w.balance, includeInTotal: w.includeInTotal })),
    totalBalance: wallets.filter((w) => w.includeInTotal).reduce((sum, w) => sum + w.balance, 0),
    month: currentMonth + 1,
    year: currentYear,
    transactionCount: summary.count,
    totalIncome: summary.totalIncome,
    totalExpense: summary.totalExpense,
    netSaving: summary.totalIncome - summary.totalExpense,
    expenseByCategory: Object.entries(summary.byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({ cat, amount })),
    burnRatePerDay: Math.round(burnRate),
    projectedMonthExpense: projectedExpense,
    budgets: budgetProgress,
    recentTransactions: combinedTxs.slice(0, 10).map((tx) => ({
      type: tx.type,
      amount: tx.amount,
      category: categoryName(tx.categoryId),
      note: tx.note,
      date: tx.date,
    })),
  });
}

async function generateTrendReport(userId, args) {
  const now = new Date();
  const result = [];
  let txsFromDb = [];

  if (args.startMonth) {
    const start = new Date(args.startMonth + '-01');
    let end;
    if (args.endMonth) {
       const endD = new Date(args.endMonth + '-01');
       end = new Date(endD.getFullYear(), endD.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
       end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const startDate = start.toISOString();
    const endDate = end.toISOString();
    txsFromDb = await listTransactions(userId, { startDate, endDate });

    let currentYear = start.getFullYear();
    let currentMonth = start.getMonth();
    const endYear = end.getFullYear();
    const endMonthNum = end.getMonth();

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonthNum)) {
      const m = currentMonth;
      const y = currentYear;

      const txs = txsFromDb.filter((tx) => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        return d.getMonth() === m && d.getFullYear() === y;
      });

      const summary = summarizeTransactions(txs);
      result.push({
        period: `${m + 1}/${y}`,
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        netSaving: summary.totalIncome - summary.totalExpense,
        transactionCount: summary.count,
        topCategories: Object.entries(summary.byCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat, amount]) => ({ cat, amount })),
      });

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
  } else {
    const months = Math.min(Math.max(args.months ?? 3, 1), 6);
    const oldestMonthDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const startDate = oldestMonthDate.toISOString();

    txsFromDb = await listTransactions(userId, { startDate });

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = date.getMonth();
      const y = date.getFullYear();

      const txs = txsFromDb.filter((tx) => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        return d.getMonth() === m && d.getFullYear() === y;
      });

      const summary = summarizeTransactions(txs);
      result.push({
        period: `${m + 1}/${y}`,
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        netSaving: summary.totalIncome - summary.totalExpense,
        transactionCount: summary.count,
        topCategories: Object.entries(summary.byCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat, amount]) => ({ cat, amount })),
      });
    }
  }

  return JSON.stringify({
    months: result,
    avgMonthlyExpense: Math.round(result.reduce((s, r) => s + r.totalExpense, 0) / (result.length || 1)),
    avgMonthlyIncome: Math.round(result.reduce((s, r) => s + r.totalIncome, 0) / (result.length || 1)),
  });
}

// ─── Agent Tools ──────────────────────────────────────────────────────────────

const getFinancialStatusTool = tool(
  async (_, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return 'Không tìm thấy userId trong context.';
      return await generateFinancialStatusReport(userId);
    } catch (error) {
      return `Lỗi khi lấy trạng thái tài chính: ${error.message}`;
    }
  },
  {
    name: 'get_financial_status',
    description: 'Lấy báo cáo/thống kê tài chính chi tiết của tháng hiện tại (số dư, tổng thu chi, danh mục, ngân sách).',
    schema: z.object({}),
  }
);

const getTrendReportTool = tool(
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return 'Không tìm thấy userId trong context.';
      return await generateTrendReport(userId, args);
    } catch (error) {
      return `Lỗi khi lấy báo cáo xu hướng: ${error.message}`;
    }
  },
  {
    name: 'get_trend_report',
    description: 'Lấy dữ liệu thu chi của các tháng trước hoặc một khoảng thời gian cụ thể trong quá khứ.',
    schema: z.object({
      months: z.number().int().min(1).max(6).optional().describe('Số tháng gần nhất cần lấy báo cáo (1-6).'),
      startMonth: z.string().optional().describe('Tháng bắt đầu (YYYY-MM).'),
      endMonth: z.string().optional().describe('Tháng kết thúc (YYYY-MM).'),
    }),
  }
);

const addTransactionTool = tool(
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return 'Không tìm thấy userId trong context.';

      let walletId = args.walletId;
      if (!walletId) {
        const wallets = await listWallets(userId);
        if (!wallets.length) return 'Không tìm thấy ví nào.';
        walletId = wallets[0].id;
      }

      const transaction = await createTransaction(userId, {
        ...args,
        walletId,
        date: args.date || new Date().toISOString(),
      });

      return `Đã thêm: ${transaction.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'} ${transaction.amount} VND - ${transaction.note}.`;
    } catch (error) {
      return `Lỗi khi thêm giao dịch: ${error.message}`;
    }
  },
  {
    name: 'add_transaction',
    description: 'Thêm một giao dịch mới khi người dùng muốn nhập thủ công hoặc xác nhận lưu giao dịch.',
    schema: z.object({
      type: z.enum(['expense', 'income']).describe('Loại giao dịch'),
      amount: z.number().int().positive().describe('Số tiền VND (phải là số nguyên dương)'),
      categoryId: z.enum([categoryKeys[0], ...categoryKeys.slice(1)]).describe('ID danh mục hợp lệ'),
      walletId: z.string().optional().describe('ID ví, nếu không có sẽ chọn ví đầu tiên'),
      note: z.string().optional().describe('Ghi chú giao dịch'),
      date: z.string().optional().describe('Ngày giao dịch theo ISO 8601'),
    }),
  }
);

const extractReceiptTool = tool(
  async (_, config) => {
    try {
      const imageFilePath = config.configurable?.imageFilePath;
      if (!imageFilePath) return 'Không tìm thấy ảnh hóa đơn trong yêu cầu hiện tại.';

      const transactions = await aiService.scanReceipt(imageFilePath, null, false);
      return JSON.stringify({ draftTransactions: transactions, requiresConfirmation: true });
    } catch (error) {
      return `Lỗi khi quét hóa đơn: ${error.message}`;
    }
  },
  {
    name: 'extract_receipt_transactions',
    description: 'Quét và trích xuất thông tin giao dịch từ ảnh hóa đơn người dùng gửi lên. (Chỉ trích xuất, chưa lưu vào DB)',
    schema: z.object({}),
  }
);

// ─── Agent Factory ────────────────────────────────────────────────────────────

let cachedAgent = null;
let agentPromise = null;

export async function getAgent() {
  if (cachedAgent) return cachedAgent;
  if (agentPromise) return agentPromise;

  agentPromise = (async () => {
    console.log('--- Initializing AI Agent ---');

    if (!env.ai.geminiKey) {
      throw new Error('GEMINI_API_KEY is missing.');
    }

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-3.1-flash-lite',
      apiKey: env.ai.geminiKey.trim(),
      temperature: 0,
      maxRetries: 0,
    });

    console.log('Chatbot configured with Gemini 3.1 Flash-Lite');

    const agentNow = new Date();
    const currentMonthStr = `${agentNow.getMonth() + 1}/${agentNow.getFullYear()}`;
    const prevMonthDate = new Date(agentNow.getFullYear(), agentNow.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonthDate.getMonth() + 1}/${prevMonthDate.getFullYear()}`;

    const systemPrompt = `
Hôm nay là ngày ${agentNow.toLocaleDateString('vi-VN')}. Bạn là trợ lý tài chính thông minh của MoneyManager.

QUY TẮC HOẠT ĐỘNG:
1. Luôn gọi đúng 1 tool phù hợp nhất rồi trả lời ngay — KHÔNG gọi nhiều tool liên tiếp.
2. Tiền tệ luôn là VND (số nguyên, không thập phân). Trả lời bằng tiếng Việt, ngắn gọn súc tích.

HƯỚNG DẪN SỬ DỤNG TOOL:
- [get_financial_status]: CHỈ dùng khi người dùng hỏi về THÁNG HIỆN TẠI (${currentMonthStr}). Phân tích bao gồm burn rate, % ngân sách, dự kiến cuối tháng.
- [get_trend_report]: Dùng khi hỏi về CÁC THÁNG TRƯỚC (${prevMonthStr} trở về trước) hoặc xu hướng. Nếu người dùng chỉ định tháng cụ thể (VD: "tháng 3 năm ngoái"), hãy truyền biến startMonth và endMonth định dạng YYYY-MM.
- [extract_receipt_transactions]: Dùng khi người dùng gửi ảnh hóa đơn. Đây LÀ TOOL CHỈ ĐỌC (không tự động lưu vào database).
- [add_transaction]: Dùng để thêm mới hoặc LƯU các giao dịch từ hóa đơn (nếu người dùng đồng ý).

QUY TRÌNH HÓA ĐƠN:
- Khi người dùng gửi hóa đơn -> gọi extract_receipt_transactions -> Đọc và hỏi người dùng có muốn LƯU VÀO SỔ không.
- Nếu người dùng trả lời "Đồng ý" -> gọi add_transaction với thông tin vừa trích xuất được.
`.trim();

    return createAgent({
      model: llm,
      tools: [getFinancialStatusTool, getTrendReportTool, addTransactionTool, extractReceiptTool],
      stateSchema: agentStateSchema,
      middleware: [
        summarizationMiddleware({
          model: llm,
          trigger: { tokens: 4000, messages: 10 },
          keep: { messages: 5 },
        }),
      ],
      maxIterations: 5,
      systemPrompt,
    });
  })();

  try {
    cachedAgent = await agentPromise;
    return cachedAgent;
  } finally {
    agentPromise = null;
  }
}

/**
 * Sử dụng InferAgentStateSchema (JSDoc Type) để trích xuất cấu trúc state của Agent
 * @typedef {import('langchain').InferAgentStateSchema<Awaited<ReturnType<typeof getAgent>>>} AgentStateSchema
 */

export async function chatWithAI(userId, sessionId, message, extraContext = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s hard cap to allow tool calling

  try {
    const agent = await getAgent();

    const result = await agent.invoke(
      {
        messages: [new HumanMessage(message)],
      },
      {
        configurable: { userId, sessionId, ...extraContext },
        signal: controller.signal,
      }
    );

    // Ghi log state theo yêu cầu
    console.log(`[AI Agent] Final State Log for session ${sessionId}:`, JSON.stringify(result, null, 2));

    const lastMsg = result.messages[result.messages.length - 1];
    const dataModified = result.messages.some(
      (msg) =>
        msg.name === 'add_transaction' ||
        (msg.tool_calls && msg.tool_calls.some((tc) => tc.name === 'add_transaction'))
    );

    return { text: lastMsg.content, dataModified };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('AI Chat request timed out after 45s');
      throw new Error('Yêu cầu AI quá lâu (45 giây) và đã bị ngắt tự động. Vui lòng thử lại.', { cause: error });
    }

    console.error('AI Chat error, resetting cache:', error.message);
    cachedAgent = null;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}