// Business Logic for Vietnam Personal Income Tax (2025 Standard)

export interface TaxCalculationResult {
  inputIncome: number;
  personalDeduction: number;
  dependentDeduction: number;
  taxableIncome: number;
  taxAmount: number;
  netIncome: number;
  bracketText: string;
}

/**
 * Calculates progressive tax based on 5-tier mechanism.
 * @param incomeTotal Gross/Input Income in VND
 * @param dependentsCount Number of recognized dependents
 * @returns Object containing exact breakdowns and bracket string
 */
export function calculatePersonalTax(
  incomeTotal: number,
  dependentsCount: number
): TaxCalculationResult {
  // Giảm trừ bản thân: 15.5 triệu/tháng (theo Nghị quyết 954/2020)
  const pDeduction = 15500000;
  // Giảm trừ người phụ thuộc: 6.2 triệu/người/tháng
  const dDeduction = dependentsCount * 6200000;

  let taxableInfo = incomeTotal - pDeduction - dDeduction;
  // Thu nhập tính thuế không âm — nếu tổng giảm trừ lớn hơn thu nhập thì không phải nộp thuế
  if (taxableInfo < 0) taxableInfo = 0;

  let tax = 0;
  let bracket = '';

  if (taxableInfo > 0) {
    // Biểu thuế lũy tiến 5 bậc theo Điều 22 Luật Thuế TNCN — dùng công thức rút gọn
    // Công thức rút gọn: thuế = TNTT × thuế suất - số tiền giảm trừ của bậc
    if (taxableInfo <= 10000000) {
      tax = taxableInfo * 0.05;
      bracket = '5%';
    } else if (taxableInfo <= 30000000) {
      tax = taxableInfo * 0.1 - 500000;
      bracket = '10% TNTT - 0.5 trđ';
    } else if (taxableInfo <= 60000000) {
      tax = taxableInfo * 0.2 - 3500000;
      bracket = '20% TNTT - 3.5 trđ';
    } else if (taxableInfo <= 100000000) {
      tax = taxableInfo * 0.3 - 9500000;
      bracket = '30% TNTT - 9.5 trđ';
    } else {
      // Bậc 5: trên 100 triệu — mức cao nhất 35%
      tax = taxableInfo * 0.35 - 14500000;
      bracket = '35% TNTT - 14.5 trđ';
    }
  }

  return {
    inputIncome: incomeTotal,
    personalDeduction: pDeduction,
    dependentDeduction: dDeduction,
    taxableIncome: taxableInfo,
    taxAmount: tax,
    // Thu nhập thực nhận = tổng thu nhập - thuế (chưa trừ BHXH/BHYT vì nằm ngoài scope)
    netIncome: incomeTotal - tax,
    bracketText: bracket,
  };
}
