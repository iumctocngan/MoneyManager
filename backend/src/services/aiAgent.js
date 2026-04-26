import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { z } from 'zod';

import { env } from '../config/env.js';
import { aiService } from './aiService.js';
import { getStateSnapshot } from './state.service.js';
import { createTransaction } from './transaction.service.js';
import { listWallets } from './wallet.service.js';

let cachedAgent = null;
let agentPromise = null;

// prettier-ignore
const CATEGORIES = {
  food: 'Ăn uống',     transport: 'Di chuyển',  shopping: 'Mua sắm',      entertainment: 'Giải trí',
  health: 'Sức khỏe',  education: 'Học tập',    housing: 'Nhà cửa',       utilities: 'Tiện ích',
  clothing: 'Quần áo', beauty: 'Làm đẹp',       family: 'Gia đình',       travel: 'Du lịch',
  sports: 'Thể thao',  pet: 'Thú cưng',          gift: 'Quà tặng',         other_expense: 'Khác (Chi)',
  salary: 'Lương',     freelance: 'Freelance',   investment: 'Đầu tư',     bonus: 'Thưởng',
  rental: 'Cho thuê',  business: 'Kinh doanh',  interest: 'Lãi suất',     gift_income: 'Tiền quà',
  other_income: 'Khác (Thu)',
};

const memory = new MemorySaver();

// ─── Shared helpers ────────────────────────────────────────────────────────────

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

/**
 * Compute budget progress for a single budget given the full transaction list.
 * Mirrors the logic in frontend/services/budget-alerts.service.ts.
 */
function computeBudgetProgress(budget, transactions, now) {
  const start = new Date(budget.startDate);
  const end = new Date(budget.endDate);
  const isActive = now >= start && now <= end;

  // Use pre-computed `spent` from DB (via BUDGET_SELECT in budget.service.js)
  // Fall back to in-memory calculation if not present.
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

// ─── Agent factory ─────────────────────────────────────────────────────────────

async function getAgent() {
  if (cachedAgent) return cachedAgent;
  if (agentPromise) return agentPromise;

  agentPromise = (async () => {
    console.log('--- Initializing AI Agent ---');

    if (!env.ai.geminiKey) {
      throw new Error('GEMINI_API_KEY is missing.');
    }

    // ── Tool 1: get_financial_status ──────────────────────────────────────────
    // Returns a rich snapshot: wallets, current-month stats, burn rate,
    // projected month-end spend, and budget progress (spent, pct, daysLeft).
    const getFinancialStatusTool = tool(
      async (_, config) => {
        try {
          const userId = config.configurable?.userId;
          if (!userId) return 'Không tìm thấy userId trong context.';

          const state = await getStateSnapshot(userId);
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          const currentDay = now.getDate();
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

          const monthlyTxs = state.transactions.filter((tx) => {
            if (!tx.date) return false;
            const d = new Date(tx.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          });

          const summary = summarizeTransactions(monthlyTxs);

          // Burn rate & projection
          const burnRate = currentDay > 0 ? summary.totalExpense / currentDay : 0;
          const projectedExpense = Math.round(burnRate * daysInMonth);

          // Budget progress — enrich with spent / pct / daysLeft
          const budgetProgress = state.budgets.map((budget) => {
            const progress = computeBudgetProgress(budget, state.transactions, now);
            return {
              category: categoryName(budget.categoryId),
              amount: budget.amount,
              spent: progress.spent,
              pct: progress.pct,
              daysLeft: progress.daysLeft,
              isActive: progress.isActive,
              status:
                progress.pct >= 100
                  ? 'exceeded'
                  : progress.pct >= 80
                    ? 'warning'
                    : 'ok',
            };
          });

          return JSON.stringify({
            today: now.toLocaleDateString('vi-VN'),
            currentDay,
            daysInMonth,
            wallets: state.wallets.map((w) => ({
              name: w.name,
              balance: w.balance,
              includeInTotal: w.includeInTotal,
            })),
            totalBalance: state.wallets
              .filter((w) => w.includeInTotal)
              .reduce((sum, w) => sum + w.balance, 0),
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
            recentTransactions: state.transactions.slice(0, 10).map((tx) => ({
              type: tx.type,
              amount: tx.amount,
              category: categoryName(tx.categoryId),
              note: tx.note,
              date: tx.date,
            })),
          });
        } catch (error) {
          return `Lỗi khi lấy trạng thái tài chính: ${error.message}`;
        }
      },
      {
        name: 'get_financial_status',
        description:
          'Lấy toàn bộ tình hình tài chính hiện tại: số dư ví, thu/chi tháng này theo danh mục, ' +
          'burn rate chi tiêu mỗi ngày, dự báo chi tiêu cuối tháng, và tiến độ ngân sách (đã chi / % / còn bao nhiêu ngày). ' +
          'Dùng tool này cho mọi câu hỏi về hiện trạng tài chính, phân tích, đánh giá hoặc dự báo tháng hiện tại.',
        schema: z.object({}),
      }
    );

    // ── Tool 2: get_trend_report ───────────────────────────────────────────────
    // Returns summary for multiple past months so the LLM can do trend analysis.
    const getTrendReportTool = tool(
      async (args, config) => {
        try {
          const userId = config.configurable?.userId;
          if (!userId) return 'Không tìm thấy userId trong context.';

          const months = Math.min(Math.max(args.months ?? 3, 1), 6);
          const state = await getStateSnapshot(userId);
          const now = new Date();
          const result = [];

          for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = date.getMonth();
            const y = date.getFullYear();

            const txs = state.transactions.filter((tx) => {
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

          return JSON.stringify({
            months: result,
            avgMonthlyExpense: Math.round(
              result.reduce((s, r) => s + r.totalExpense, 0) / result.length
            ),
            avgMonthlyIncome: Math.round(
              result.reduce((s, r) => s + r.totalIncome, 0) / result.length
            ),
          });
        } catch (error) {
          return `Lỗi khi lấy báo cáo xu hướng: ${error.message}`;
        }
      },
      {
        name: 'get_trend_report',
        description:
          'Lấy báo cáo xu hướng thu chi theo nhiều tháng liên tiếp (mặc định 3 tháng gần nhất, tối đa 6 tháng). ' +
          'Dùng khi người dùng hỏi về so sánh tháng này với tháng trước, xu hướng chi tiêu dài hạn, ' +
          'hoặc muốn biết thu nhập/chi tiêu trung bình.',
        schema: z.object({
          months: z
            .number()
            .int()
            .min(1)
            .max(6)
            .optional()
            .describe('Số tháng cần lấy báo cáo (1-6, mặc định 3).'),
        }),
      }
    );

    // ── Tool 3: add_transaction ────────────────────────────────────────────────
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
        description: 'Thêm một giao dịch mới khi người dùng muốn nhập thủ công.',
        schema: z.object({
          type: z.enum(['expense', 'income']).describe('Loại giao dịch'),
          amount: z.number().describe('Số tiền VND'),
          categoryId: z.string().describe('ID danh mục, ví dụ food hoặc salary'),
          walletId: z.string().optional().describe('ID ví, nếu không có sẽ chọn ví đầu tiên'),
          note: z.string().describe('Ghi chú giao dịch'),
          date: z.string().optional().describe('Ngày giao dịch theo ISO 8601'),
        }),
      }
    );

    // ── Tool 4: scan_receipt_image ─────────────────────────────────────────────
    const scanReceiptTool = tool(
      async (_, config) => {
        try {
          const imageFilePath = config.configurable?.imageFilePath;
          if (!imageFilePath) return 'Không tìm thấy ảnh hóa đơn trong yêu cầu hiện tại.';

          const transactions = await aiService.scanReceipt(imageFilePath, null, false);
          return `Tìm thấy ${transactions.length} giao dịch từ hóa đơn: ${JSON.stringify(transactions)}`;
        } catch (error) {
          return `Lỗi khi quét hóa đơn: ${error.message}`;
        }
      },
      {
        name: 'scan_receipt_image',
        description: 'Quét hóa đơn từ ảnh người dùng gửi lên.',
        schema: z.object({}),
      }
    );

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey: env.ai.geminiKey.trim(),
      temperature: 0,
    });

    console.log('Chatbot configured with Gemini 2.5 Flash');

    return createAgent({
      model: llm,
      tools: [getFinancialStatusTool, getTrendReportTool, addTransactionTool, scanReceiptTool],
      checkpointer: memory,
      maxIterations: 5,
      systemPrompt:
        `Hôm nay là ${new Date().toLocaleDateString('vi-VN')}. ` +
        'Bạn là trợ lý tài chính thông minh của MoneyManager. ' +
        'QUY TẮC QUAN TRỌNG: Luôn gọi đúng 1 tool phù hợp nhất rồi trả lời ngay — KHÔNG gọi nhiều tool liên tiếp cho cùng một câu hỏi. ' +
        'Dùng get_financial_status cho mọi câu hỏi về tháng hiện tại (thống kê, phân tích, đánh giá, dự báo). ' +
        'Dùng get_trend_report CHỈ KHI người dùng hỏi về nhiều tháng hoặc so sánh lịch sử. ' +
        'Khi phân tích: nêu rõ burn rate, % ngân sách đã dùng, và số tiền dự kiến cuối tháng. ' +
        'Khi gợi ý: dựa vào danh mục chi cao nhất, đưa ra 2-3 gợi ý cụ thể và khả thi. ' +
        'Luôn trả lời bằng tiếng Việt, ngắn gọn súc tích. Tiền tệ luôn là VND.',
    });
  })();

  try {
    cachedAgent = await agentPromise;
    return cachedAgent;
  } finally {
    agentPromise = null;
  }
}

// ─── Public export ─────────────────────────────────────────────────────────────

export async function chatWithAI(userId, sessionId, message, extraContext = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 s hard cap

  try {
    const agent = await getAgent();
    const result = await agent.invoke(
      { messages: [new HumanMessage(message)] },
      {
        configurable: { thread_id: sessionId, userId, sessionId, ...extraContext },
        signal: controller.signal,
      }
    );

    const lastMessage = result.messages[result.messages.length - 1];
    return lastMessage.content;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('AI Chat request timed out after 10s');
      throw new Error('Yêu cầu AI quá lâu (10 giây) và đã bị ngắt tự động. Vui lòng thử lại với câu hỏi ngắn hơn.');
    }

    console.error('AI Chat error, resetting cache:', error.message);
    cachedAgent = null;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
