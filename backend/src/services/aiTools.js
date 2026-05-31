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
// Map categoryId → tên hiển thị tiếng Việt; dùng cho cả validation schema (enum) và hiển thị trong báo cáo
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

/**
 * Tạo một LangGraph Command để lưu giao dịch nháp vào State và báo hiệu đang chờ xác nhận.
 * Thay vì thực thi ngay, tool trả về Command này để agent hỏi user trước — tránh thao tác nhầm.
 * ToolMessage được đính kèm để LangGraph ghi nhận tool đã trả về phản hồi (tránh "hanging tool call").
 */
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

/** Tra tên hiển thị danh mục, fallback 'Khác' nếu không tìm thấy. */
function categoryName(id) {
  return CATEGORIES[id] || 'Khác';
}

/**
 * Tính tổng thu, tổng chi và chi tiêu theo danh mục từ danh sách giao dịch.
 * Dùng reduce single-pass để tránh duyệt mảng nhiều lần — giữ O(N).
 */
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
 * Tính tiến độ sử dụng ngân sách: số tiền đã chi, phần trăm, số ngày còn lại.
 * Nếu budget.spent đã có sẵn (từ DB), dùng luôn; nếu không, tự tính từ danh sách giao dịch.
 */
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

/**
 * Tìm walletId từ tên ví (case-insensitive exact match).
 * Ném lỗi kèm danh sách ví hiện có nếu không tìm thấy — giúp agent hỏi lại người dùng đúng tên.
 */
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

/**
 * Tổng hợp toàn bộ dữ liệu tài chính tháng hiện tại thành một JSON report.
 * Dữ liệu bao gồm: số dư ví, thu/chi tháng, tốc độ chi tiêu mỗi ngày,
 * dự báo chi tiêu cuối tháng, tiến độ ngân sách và 10 giao dịch gần nhất.
 * Được dùng bởi get_financial_status tool và là nguồn dữ liệu chính để agent phân tích.
 */
async function generateFinancialStatusReport(userId, args = {}) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Nếu truyền startDate/endDate cụ thể, dùng khoảng đó; nếu không, mặc định lấy toàn bộ tháng hiện tại
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

  // Fetch song song 4 nguồn dữ liệu để giảm latency tổng thể
  const [wallets, budgets, currentMonthTxs, recentTxs] = await Promise.all([
    listWallets(userId),
    listBudgets(userId),
    listTransactions(userId, { startDate: rangeStart, endDate: rangeEnd }),
    listTransactions(userId, { limit: 10 }),
  ]);

  // Dùng Map để merge và dedup giao dịch tháng + giao dịch gần nhất — tránh trùng lặp khi hiển thị
  const txMap = new Map();
  recentTxs.forEach((tx) => txMap.set(tx.id, tx));
  currentMonthTxs.forEach((tx) => txMap.set(tx.id, tx));
  const combinedTxs = Array.from(txMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const summary = summarizeTransactions(currentMonthTxs);
  // burnRate = chi tiêu bình quân mỗi ngày đã qua, dùng để dự báo tổng chi tiêu cả tháng
  const burnRate = currentDay > 0 ? summary.totalExpense / currentDay : 0;
  const projectedExpense = Math.round(burnRate * daysInMonth);

  // Tính % sử dụng ngân sách và gán trạng thái: 'ok' / 'warning' (≥80%) / 'exceeded' (≥100%)
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
    // includeInTotal phân biệt ví tính vào tổng tài sản (vd: tiết kiệm) vs ví không tính (vd: quỹ dự phòng)
    wallets: wallets.map((w) => ({ name: w.name, balance: w.balance, includeInTotal: w.includeInTotal })),
    totalBalance: wallets.filter((w) => w.includeInTotal).reduce((sum, w) => sum + w.balance, 0),
    month: currentMonth + 1,
    year: currentYear,
    transactionCount: summary.count,
    totalIncome: summary.totalIncome,
    totalExpense: summary.totalExpense,
    netSaving: summary.totalIncome - summary.totalExpense,
    // Sắp xếp danh mục theo chi tiêu giảm dần để agent nhận diện dễ danh mục tốn kém nhất
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

/**
 * Tạo báo cáo xu hướng thu chi theo từng tháng trong khoảng thời gian chỉ định.
 * Hỗ trợ 2 cách gọi: truyền startMonth/endMonth (YYYY-MM) hoặc số tháng gần nhất (mặc định 3).
 */
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
    // Giới hạn tối đa 6 tháng để tránh query quá lớn và context window LLM tràn
    const totalMonths = Math.min(Math.max(args.months ?? 3, 1), 6);
    endYear = now.getFullYear();
    endMonthIdx = now.getMonth();
    
    const tempDate = new Date(endYear, endMonthIdx - totalMonths + 1, 1);
    startYear = tempDate.getFullYear();
    startMonthIdx = tempDate.getMonth();
  }
  
  const startDate = new Date(startYear, startMonthIdx, 1, 0, 0, 0).toISOString();
  const endDate = new Date(endYear, endMonthIdx + 1, 0, 23, 59, 59, 999).toISOString();
  
  // Fetch toàn bộ dữ liệu trong khoảng thời gian chỉ định chỉ bằng 1 query DB
  const txsFromDb = await listTransactions(userId, { startDate, endDate });
  
  // Áp dụng Hash Map để gom nhóm giao dịch 1 lần duy nhất O(N)
  // thay vì query DB riêng cho mỗi tháng — giảm đáng kể số lần round-trip DB
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
  
  // Duyệt tuần tự từng tháng, tra groupedTxs thay vì query DB — O(tháng) thay vì O(tháng × N)
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
      // Chỉ lấy top 5 danh mục chi tiêu nhiều nhất để giảm kích thước context truyền cho LLM
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
// Mỗi tool được định nghĩa bằng hàm `tool()` từ LangChain, bao gồm:
// - implementation function (nhận args + config)
// - metadata: name, description, schema (Zod) — LLM dùng để chọn tool phù hợp và điền đúng tham số

/**
 * Tool đọc dữ liệu: lấy báo cáo tài chính tháng hiện tại (hoặc khoảng ngày cụ thể).
 * Đây còn là bước bắt buộc trước khi update/delete để lấy ID giao dịch.
 */
const getFinancialStatusTool = tool(
  async (args, config) => {
    try {
      // userId được lấy từ config.configurable — do chatWithAI truyền vào, không phải từ LLM tự điền
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

/**
 * Tool đọc dữ liệu: lấy xu hướng thu chi nhiều tháng trong quá khứ.
 * Dùng khi user hỏi về các tháng trước hoặc muốn so sánh xu hướng.
 */
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

/**
 * Tool ghi: thêm giao dịch mới.
 * Luôn yêu cầu tên ví (không tự đoán), và mặc định đi qua bước xác nhận nháp
 * trước khi ghi vào DB — trừ khi confirm=true hoặc skipConfirmation=true.
 */
const addTransactionTool = tool(
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return JSON.stringify({ ok: false, message: 'Không tìm thấy userId trong context.' });

      // Resolve tên ví → ID; ném lỗi rõ ràng nếu không tìm thấy để agent hỏi lại user
      let walletId;
      try {
        walletId = await resolveWalletByName(userId, args.walletName);
      } catch (err) {
        return JSON.stringify({ ok: false, message: err.message });
      }

      // skipConfirmation cho phép bỏ qua bước nháp (dùng trong test hoặc khi user yêu cầu làm ngay)
      const skipConf = config.configurable?.skipConfirmation || args.confirm;
      if (!skipConf) {
        const categoryName = CATEGORIES[args.categoryId] || args.categoryId;
        const description = `Thêm giao dịch ${args.type === 'expense' ? 'chi tiêu' : 'thu nhập'} ${args.amount.toLocaleString('vi-VN')} VND từ ví "${args.walletName}" cho danh mục "${categoryName}"${args.note ? ` với ghi chú "${args.note}"` : ''}`;

        // Lưu vào State làm "giao dịch nháp", agent sẽ hỏi user xác nhận ở lượt tiếp theo
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

      // Thực thi trực tiếp khi đã có xác nhận
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

/**
 * Tool ghi: cập nhật giao dịch hiện có theo ID.
 * Chỉ cập nhật các trường được truyền vào (partial update) — xóa key undefined trước khi gọi service.
 */
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
        // Tóm tắt danh sách trường sẽ thay đổi để hiển thị rõ ràng trong description xác nhận
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

      // Xóa các field không thuộc payload update trước khi truyền vào service
      const txData = { ...args };
      delete txData.id;
      delete txData.walletName;
      delete txData.confirm;
      const payload = { ...txData };
      if (walletId) payload.walletId = walletId;
      // Loại bỏ key undefined để tránh ghi đè giá trị cũ bằng null trong DB
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

/**
 * Tool ghi: xóa giao dịch theo ID.
 * Luôn qua bước xác nhận nháp trước khi xóa — thao tác không thể hoàn tác.
 */
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

/**
 * Tool ghi: tạo hoặc ghi đè ngân sách cho tháng hiện tại.
 * startDate/endDate luôn được tính tự động theo tháng hiện tại — agent không cần truyền.
 */
const setBudgetTool = tool(
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return JSON.stringify({ ok: false, message: 'Không tìm thấy userId trong context.' });

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Tính ngày đầu và cuối tháng để gắn vào payload ngân sách
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

/**
 * Tool ghi: chuyển tiền giữa 2 ví của cùng một user.
 * Tạo một giao dịch type='transfer' — transaction.service xử lý cộng/trừ số dư cả 2 ví atomically.
 */
const transferFundsTool = tool(
  async (args, config) => {
    try {
      const userId = config.configurable?.userId;
      if (!userId) return JSON.stringify({ ok: false, message: 'Không tìm thấy userId trong context.' });

      // Cần resolve cả 2 ví trước khi vào bước xác nhận để đảm bảo tên ví hợp lệ
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

/**
 * Tool điều phối: thực thi giao dịch nháp đang lưu trong State sau khi user xác nhận.
 * Đọc draftTransaction từ state, dispatch đúng service call theo draft.action,
 * sau đó reset State (draftTransaction=null, awaitingConfirmation=false) và cập nhật lastUsedWalletId.
 */
const confirmDraftTransactionTool = tool(
  async (args, config) => {
    try {
      // state được inject bởi LangGraph — chứa các trường của agentStateSchema
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

      // Trả về Command để cập nhật State: xóa nháp, lưu ví đã dùng gần nhất vào lastUsedWalletId
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

/**
 * Tool điều phối: hủy bỏ giao dịch nháp đang chờ xác nhận.
 * Reset State về trạng thái bình thường mà không ghi gì vào DB.
 */
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

// Danh sách tất cả tools export sang aiAgent.js để đăng ký với LangGraph agent
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
