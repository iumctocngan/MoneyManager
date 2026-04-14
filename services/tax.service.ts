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
  const pDeduction = 15500000;
  const dDeduction = dependentsCount * 6200000;

  let taxableInfo = incomeTotal - pDeduction - dDeduction;
  if (taxableInfo < 0) taxableInfo = 0;

  let tax = 0;
  let bracket = '';

  if (taxableInfo > 0) {
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
    netIncome: incomeTotal - tax,
    bracketText: bracket,
  };
}
