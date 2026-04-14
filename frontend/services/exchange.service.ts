// Foreign Exchange Service

export interface ExchangeRateData {
  rates: Record<string, number>;
  lastUpdate: string;
}

/**
 * Fetches real-time exchange rates against base USD.
 */
export async function fetchExchangeRates(): Promise<ExchangeRateData> {
  const response = await fetch('https://open.er-api.com/v6/latest/USD');

  if (!response.ok) {
    throw new Error('Lỗi kết nối. Không thể tải tỷ giá lúc này.');
  }

  const data = await response.json();
  if (data.result !== 'success') {
    throw new Error('Dữ liệu tỷ giá từ máy chủ không hợp lệ.');
  }

  const date = new Date(data.time_last_update_unix * 1000);
  return {
    rates: data.rates,
    lastUpdate: date.toLocaleString('vi-VN'),
  };
}

/**
 * Converts 1 unit of `currencyCode` to VND equivalent based on raw USD-indexed rates map.
 */
export function calculateVndEquivalent(currencyCode: string, rates: Record<string, number>): number {
  if (!rates['VND'] || !rates[currencyCode]) return 0;
  return rates['VND'] / rates[currencyCode];
}
