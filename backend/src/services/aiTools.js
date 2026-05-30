import { ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { Command } from '@langchain/langgraph';
import { z } from 'zod';

import { listBudgets, createBudget } from './budget.service.js';
import { createTransaction, listTransactions, updateTransaction, deleteTransaction } from './transaction.service.js';
import { normalizeTransactionPayload, normalizeBudgetPayload } from '../utils/validators.js';
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

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function createConfirmationCommand(action, args, description, toolCallId, toolName) {
  return new Command({
    update: {
      draftTransaction: { action, args, description },
      awaitingConfirmation: true,
      messages: [
        new ToolMessage({
          content: JSON.stringify({ ok: true, awaitingConfirmation: true, description }),
          tool_call_id: toolCallId,
          name: toolName
        })
      ]
    }
  });
}

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

async function resolveWalletByName(userId, walletName) {
  const wallets = await listWallets(userId);
  const targetName = walletName.toLowerCase().trim();
  const matchedWallet = wallets.find(w => w.name.toLowerCase().trim() === targetName);

  if (!matchedWallet) {
    const availableNames = wallets.map(w => `"${w.name}"`).join(', ');
    throw new Error(`Không tìm thấy ví tên "${walletName}". Các ví hiện có: ${availableNames}. BẮT BUỘC HỎI LẠI NGƯỜI DÙNG.`);
  }
  return matchedWallet.id;
}

async function generateFinancialStatusReport(userId, args = {}) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  let rangeStart, rangeEnd;
  if (args.startDate) {
    rangeStart = new Date(args.startDate).toISOString();
    rangeEnd = args.endDate
      ? new Date(args.endDate + 'T23:59:59.999Z').toISOString()
      : new Date(args.startDate + 'T23:59:59.999Z').toISOString();
  } else {
    rangeStart = new Date(currentYear, currentMonth, 1).toISOString();
    rangeEnd = new Date(currentYear, currentMonth, daysInMonth, 23, 59, 59, 999).toISOString();
  }

  const [wallets, budgets, currentMonthTxs, recentTxs] = await Promise.all([
    listWallets(userId),
    listBudgets(userId),
    listTransactions(userId, { startDate: rangeStart, endDate: rangeEnd }),
    listTransactions(userId, { limit: 10 }),
  ]);

  const txMap = new Map();
  recentTxs.forEach((tx) => txMap.set(tx.id, tx));
  currentMonthTxs.forEach((tx) => txMap.set(tx.id, tx));
  const combinedTxs = Array.from(txMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const summary = summarizeTransactions(currentMonthTxs);
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
      id: tx.id,
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

  let startYear, startMonthIdx, endYear, endMonthIdx;
  
  if (args.startMonth) {
    const [yStr, mStr] = args.startMonth.split('-');
    startYear = parseInt(yStr, 10);
    startMonthIdx = parseInt(mStr, 10) - 1;
    
    if (args.endMonth) {
       const [eyStr, emStr] = args.endMonth.split('-');
       endYear = parseInt(eyStr, 10);
       endMonthIdx = parseInt(emStr, 10) - 1;
    } else {
       endYear = startYear;
       endMonthIdx = startMonthIdx;
    }
  } else {
    const totalMonths = Math.min(Math.max(args.months ?? 3, 1), 6);
    endYear = now.getFullYear();
    endMonthIdx = now.getMonth();
    
    const tempDate = new Date(endYear, endMonthIdx - totalMonths + 1, 1);
    startYear = tempDate.getFullYear();
    startMonthIdx = tempDate.getMonth();
  }
  
  const startDate = new Date(startYear, startMonthIdx, 1, 0, 0, 0).toISOString();
  const endDate = new Date(endYear, endMonthIdx + 1, 0, 23, 59, 59, 999).toISOString();
  
  const txsFromDb = await listTransactions(userId, { startDate, endDate });
  
  // Áp dụng Hash Map để gom nhóm giao dịch 1 lần duy nhất O(N)
  const groupedTxs = {};
  txsFromDb.forEach(tx => {
    if (!tx.date) return;
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groupedTxs[key]) groupedTxs[key] = [];
    groupedTxs[key].push(tx);
  });
  
  let currentY = startYear;
  let currentM = startMonthIdx;
  
  while (currentY < endYear || (currentY === endYear && currentM <= endMonthIdx)) {
    const key = `${currentY}-${String(currentM + 1).padStart(2, '0')}`;
    const txs = groupedTxs[key] || [];
    
    const summary = summarizeTransactions(txs);
    result.push({
      period: `${currentM + 1}/${currentY}`,
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      netSaving: summary.totalIncome - summary.totalExpense,
      transactionCount: summary.count,
      topCategories: Object.entries(summary.byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amount]) => ({ cat, amount })),
    });
    
    currentM++;
    if (currentM > 11) {
      currentM = 0;
      currentY++;
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
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return 'Không tìm thấy userId trong context.';
      return await generateFinancialStatusReport(userId, args);
    } catch (error) {
      return `Lỗi khi lấy trạng thái tài chính: ${error.message}`;
    }
  },
  {
    name: 'get_financial_status',
    description: 'Lấy báo cáo/thống kê tài chính. Nếu có ngày cụ thể, truyền startDate/endDate. Nếu không, mặc định lấy toàn bộ tháng hiện tại.',
    schema: z.object({
      startDate: z.string().optional().describe('Ngày bắt đầu (YYYY-MM-DD).'),
      endDate: z.string().optional().describe('Ngày kết thúc (YYYY-MM-DD).'),
    }),
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
      if (!userId) return JSON.stringify({ ok: false, message: 'Không tìm thấy userId trong context.' });

      let walletId;
      try {
        walletId = await resolveWalletByName(userId, args.walletName);
      } catch (err) {
        return JSON.stringify({ ok: false, message: err.message });
      }

      const skipConf = config.configurable?.skipConfirmation || args.confirm;
      if (!skipConf) {
        const categoryName = CATEGORIES[args.categoryId] || args.categoryId;
        const description = `Thêm giao dịch ${args.type === 'expense' ? 'chi tiêu' : 'thu nhập'} ${args.amount.toLocaleString('vi-VN')} VND từ ví "${args.walletName}" cho danh mục "${categoryName}"${args.note ? ` với ghi chú "${args.note}"` : ''}`;

        return createConfirmationCommand(
          'add_transaction',
          {
            type: args.type,
            amount: args.amount,
            categoryId: args.categoryId,
            walletId,
            note: args.note,
            date: args.date || new Date().toISOString(),
          },
          description,
          config.toolCallId,
          'add_transaction'
        );
      }

      const txData = { ...args };
      delete txData.walletName;
      delete txData.confirm;
      const transaction = await createTransaction(userId, {
        ...txData,
        walletId,
        date: args.date || new Date().toISOString(),
      });

      return JSON.stringify({ ok: true, message: `Đã thêm: ${transaction.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'} ${transaction.amount} VND - ${transaction.note || ''}.` });
    } catch (error) {
      return JSON.stringify({ ok: false, message: `Lỗi khi thêm giao dịch: ${error.message}` });
    }
  },
  {
    name: 'add_transaction',
    description: 'Thêm một giao dịch mới. BẮT BUỘC HỎI NGƯỜI DÙNG TÊN VÍ NẾU HỌ CHƯA CUNG CẤP.',
    schema: z.object({
      type: z.enum(['expense', 'income']).describe('Loại giao dịch'),
      amount: z.number().int().min(1).describe('Số tiền VND (phải là số nguyên dương)'),
      categoryId: z.enum([categoryKeys[0], ...categoryKeys.slice(1)]).describe('ID danh mục hợp lệ'),
      walletName: z.string().describe('Tên ví. HỎI NGƯỜI DÙNG nếu họ chưa cung cấp (VD: Tiền mặt, Thẻ...). KHÔNG TỰ ĐOÁN.'),
      note: z.string().optional().describe('Ghi chú giao dịch'),
      date: z.string().optional().describe('Ngày giao dịch theo ISO 8601'),
      confirm: z.boolean().optional().describe('Nếu true, thực thi trực tiếp không qua bước nháp (như khi chạy test hoặc khi người dùng yêu cầu làm ngay). Mặc định là false (phải xác nhận).'),
    }),
  }
);

const updateTransactionTool = tool(
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return JSON.stringify({ ok: false, message: 'Không tìm thấy userId trong context.' });

      let walletId;
      if (args.walletName) {
        try {
          walletId = await resolveWalletByName(userId, args.walletName);
        } catch (err) {
          return JSON.stringify({ ok: false, message: err.message });
        }
      }

      const id = args.id;
      const skipConf = config.configurable?.skipConfirmation || args.confirm;
      if (!skipConf) {
        const updates = [];
        if (args.type) updates.push(`loại: ${args.type === 'expense' ? 'chi chi tiêu' : 'thu nhập'}`);
        if (args.amount) updates.push(`số tiền: ${args.amount.toLocaleString('vi-VN')} VND`);
        if (args.categoryId) updates.push(`danh mục: ${CATEGORIES[args.categoryId] || args.categoryId}`);
        if (args.walletName) updates.push(`ví: "${args.walletName}"`);
        if (args.note) updates.push(`ghi chú: "${args.note}"`);
        if (args.date) updates.push(`ngày: ${args.date}`);

        const description = `Cập nhật giao dịch ID ${id} với các thay đổi: ${updates.join(', ')}`;

        return createConfirmationCommand(
          'update_transaction',
          {
            id,
            type: args.type,
            amount: args.amount,
            categoryId: args.categoryId,
            walletId,
            note: args.note,
            date: args.date,
          },
          description,
          config.toolCallId,
          'update_transaction'
        );
      }

      const txData = { ...args };
      delete txData.id;
      delete txData.walletName;
      delete txData.confirm;
      const payload = { ...txData };
      if (walletId) payload.walletId = walletId;
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      await updateTransaction(userId, id, payload, normalizeTransactionPayload);
      return JSON.stringify({ ok: true, message: `Đã cập nhật giao dịch ID ${id} thành công.` });
    } catch (error) {
      return JSON.stringify({ ok: false, message: `Lỗi khi sửa giao dịch: ${error.message}` });
    }
  },
  {
    name: 'update_transaction',
    description: 'Sửa một giao dịch CÓ SẴN. BẮT BUỘC phải gọi get_financial_status để tìm ID giao dịch trước khi sửa.',
    schema: z.object({
      id: z.union([z.number(), z.string()]).describe('ID của giao dịch cần sửa'),
      type: z.enum(['expense', 'income']).optional(),
      amount: z.number().int().min(1).optional(),
      categoryId: z.enum([categoryKeys[0], ...categoryKeys.slice(1)]).optional(),
      walletName: z.string().optional(),
      note: z.string().optional(),
      date: z.string().optional(),
      confirm: z.boolean().optional().describe('Nếu true, thực thi trực tiếp không qua bước nháp (như khi chạy test hoặc khi người dùng yêu cầu làm ngay). Mặc định là false (phải xác nhận).'),
    }),
  }
);

const deleteTransactionTool = tool(
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return JSON.stringify({ ok: false, message: 'Không tìm thấy userId trong context.' });

      const skipConf = config.configurable?.skipConfirmation || args.confirm;
      if (!skipConf) {
        const description = `Xóa giao dịch ID ${args.id}`;

        return createConfirmationCommand(
          'delete_transaction',
          { id: args.id },
          description,
          config.toolCallId,
          'delete_transaction'
        );
      }

      await deleteTransaction(userId, args.id);
      return JSON.stringify({ ok: true, message: `Đã xóa giao dịch ID ${args.id} thành công.` });
    } catch (error) {
      return JSON.stringify({ ok: false, message: `Lỗi khi xóa giao dịch: ${error.message}` });
    }
  },
  {
    name: 'delete_transaction',
    description: 'Xóa một giao dịch. BẮT BUỘC phải gọi get_financial_status để lấy ID giao dịch trước.',
    schema: z.object({
      id: z.union([z.number(), z.string()]).describe('ID của giao dịch cần xóa'),
      confirm: z.boolean().optional().describe('Nếu true, thực thi trực tiếp không qua bước nháp (như khi chạy test hoặc khi người dùng yêu cầu làm ngay). Mặc định là false (phải xác nhận).'),
    }),
  }
);

const setBudgetTool = tool(
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return JSON.stringify({ ok: false, message: 'Không tìm thấy userId trong context.' });

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      
      const startDate = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

      const payload = {
        categoryId: args.categoryId,
        amount: args.amount,
        period: 'monthly',
        startDate: startDate,
        endDate: endDate,
      };

      await createBudget(userId, normalizeBudgetPayload(payload));
      return JSON.stringify({ ok: true, message: `Đã tạo ngân sách cho danh mục ${args.categoryId} thành công.` });
    } catch (error) {
      return JSON.stringify({ ok: false, message: `Lỗi khi tạo ngân sách: ${error.message}` });
    }
  },
  {
    name: 'set_budget',
    description: 'Tạo hoặc thiết lập ngân sách cho tháng hiện tại.',
    schema: z.object({
      categoryId: z.enum([categoryKeys[0], ...categoryKeys.slice(1)]).describe('ID danh mục cần set ngân sách'),
      amount: z.number().int().min(1).describe('Số tiền ngân sách (VND)'),
    }),
  }
);

const transferFundsTool = tool(
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return JSON.stringify({ ok: false, message: 'Không tìm thấy userId trong context.' });

      let walletId, toWalletId;
      try {
        walletId = await resolveWalletByName(userId, args.fromWalletName);
        toWalletId = await resolveWalletByName(userId, args.toWalletName);
      } catch (err) {
        return JSON.stringify({ ok: false, message: err.message });
      }

      const skipConf = config.configurable?.skipConfirmation || args.confirm;
      if (!skipConf) {
        const description = `Chuyển khoản ${args.amount.toLocaleString('vi-VN')} VND từ ví "${args.fromWalletName}" sang ví "${args.toWalletName}"${args.note ? ` với ghi chú "${args.note}"` : ''}`;

        return createConfirmationCommand(
          'transfer_funds',
          {
            amount: args.amount,
            fromWalletId: walletId,
            toWalletId,
            fromWalletName: args.fromWalletName,
            toWalletName: args.toWalletName,
            note: args.note,
            date: args.date || new Date().toISOString(),
          },
          description,
          config.toolCallId,
          'transfer_funds'
        );
      }

      const transaction = await createTransaction(userId, {
        type: 'transfer',
        amount: args.amount,
        walletId,
        toWalletId,
        categoryId: 'transfer',
        note: args.note || `Chuyển tiền từ ${args.fromWalletName} sang ${args.toWalletName}`,
        date: args.date || new Date().toISOString(),
      });

      return JSON.stringify({
        ok: true,
        message: `Đã chuyển: ${transaction.amount} VND từ ${args.fromWalletName} sang ${args.toWalletName}.`,
      });
    } catch (error) {
      return JSON.stringify({ ok: false, message: `Lỗi khi chuyển khoản: ${error.message}` });
    }
  },
  {
    name: 'transfer_funds',
    description: 'Chuyển tiền qua lại giữa 2 ví khác nhau. BẮT BUỘC HỎI NGƯỜI DÙNG TÊN VÍ NGUỒN VÀ VÍ ĐÍCH NẾU CHƯA CUNG CẤP.',
    schema: z.object({
      fromWalletName: z.string().describe('Tên ví nguồn (nơi chuyển tiền đi). BẮT BUỘC HỎI NGƯỜI DÙNG nếu chưa cung cấp.'),
      toWalletName: z.string().describe('Tên ví đích (nơi nhận tiền đến). BẮT BUỘC HỎI NGƯỜI DÙNG nếu chưa cung cấp.'),
      amount: z.number().int().min(1).describe('Số tiền VND cần chuyển (phải là số nguyên dương)'),
      note: z.string().optional().describe('Ghi chú giao dịch chuyển khoản'),
      date: z.string().optional().describe('Ngày giao dịch theo ISO 8601'),
      confirm: z.boolean().optional().describe('Nếu true, thực thi trực tiếp không qua bước nháp (như khi chạy test hoặc khi người dùng yêu cầu làm ngay). Mặc định là false (phải xác nhận).'),
    }),
  }
);

const confirmDraftTransactionTool = tool(
  async (args, config) => {
    try {
      const state = config.state;
      if (!state || !state.draftTransaction) {
        return JSON.stringify({ ok: false, message: 'Không có giao dịch nháp nào đang chờ xác nhận.' });
      }

      const userId = config.configurable?.userId;
      if (!userId) return JSON.stringify({ ok: false, message: 'Không tìm thấy userId trong context.' });

      const draft = state.draftTransaction;
      let msg = '';

      if (draft.action === 'add_transaction') {
        const transaction = await createTransaction(userId, draft.args);
        msg = `Đã thêm thành công: ${transaction.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'} ${transaction.amount} VND - ${transaction.note || ''}.`;
      } else if (draft.action === 'transfer_funds') {
        const transaction = await createTransaction(userId, {
          type: 'transfer',
          amount: draft.args.amount,
          walletId: draft.args.fromWalletId,
          toWalletId: draft.args.toWalletId,
          categoryId: 'transfer',
          note: draft.args.note || `Chuyển tiền từ ${draft.args.fromWalletName} sang ${draft.args.toWalletName}`,
          date: draft.args.date,
        });
        msg = `Đã chuyển khoản thành công ${transaction.amount} VND từ ${draft.args.fromWalletName} sang ${draft.args.toWalletName}.`;
      } else if (draft.action === 'update_transaction') {
        const payload = { ...draft.args };
        const id = payload.id;
        delete payload.id;
        // Clean undefined/null fields
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        await updateTransaction(userId, id, payload, normalizeTransactionPayload);
        msg = `Đã cập nhật giao dịch ID ${id} thành công.`;
      } else if (draft.action === 'delete_transaction') {
        await deleteTransaction(userId, draft.args.id);
        msg = `Đã xóa giao dịch ID ${draft.args.id} thành công.`;
      } else {
        return JSON.stringify({ ok: false, message: `Hành động nháp không hợp lệ: ${draft.action}` });
      }

      return new Command({
        update: {
          draftTransaction: null,
          awaitingConfirmation: false,
          lastUsedWalletId: draft.args.walletId || draft.args.fromWalletId,
          messages: [
            new ToolMessage({
              content: JSON.stringify({ ok: true, message: msg }),
              tool_call_id: config.toolCallId,
              name: 'confirm_draft_transaction'
            })
          ]
        }
      });
    } catch (err) {
      return JSON.stringify({ ok: false, message: `Lỗi khi thực thi giao dịch nháp: ${err.message}` });
    }
  },
  {
    name: 'confirm_draft_transaction',
    description: 'Xác nhận và thực thi giao dịch nháp đang lưu trong bộ nhớ (State). Gọi khi người dùng đồng ý/xác nhận hành động.',
    schema: z.object({})
  }
);

const cancelDraftTransactionTool = tool(
  async (args, config) => {
    return new Command({
      update: {
        draftTransaction: null,
        awaitingConfirmation: false,
        messages: [
          new ToolMessage({
            content: JSON.stringify({ ok: true, message: 'Đã hủy bỏ giao dịch nháp thành công.' }),
            tool_call_id: config.toolCallId,
            name: 'cancel_draft_transaction'
          })
        ]
      }
    });
  },
  {
    name: 'cancel_draft_transaction',
    description: 'Hủy bỏ và xóa giao dịch nháp đang lưu trong bộ nhớ (State). Gọi khi người dùng từ chối/hủy bỏ hành động.',
    schema: z.object({})
  }
);

export const tools = [
  getFinancialStatusTool,
  getTrendReportTool,
  addTransactionTool,
  updateTransactionTool,
  deleteTransactionTool,
  setBudgetTool,
  transferFundsTool,
  confirmDraftTransactionTool,
  cancelDraftTransactionTool
];
