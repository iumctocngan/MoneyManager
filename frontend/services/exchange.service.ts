// Foreign Exchange Service

export interface ExchangeRateData {
  rates: Record<string, number>;
  lastUpdate: string;
}

/**
 * Fetches real-time exchange rates against base USD.
 */
export async function fetchExchangeRates(): Promise<ExchangeRateData> {
  // Dùng open.er-api.com — miễn phí, không cần API key cho tỷ giá cơ bản
  const response = await fetch('https://open.er-api.com/v6/latest/USD');

  if (!response.ok) {
    throw new Error('Lỗi kết nối. Không thể tải tỷ giá lúc này.');
  }

  const data = await response.json();
  // API trả về field `result: "success"` khi hợp lệ — kiểm tra để bắt lỗi logic từ phía server
  if (data.result !== 'success') {
    throw new Error('Dữ liệu tỷ giá từ máy chủ không hợp lệ.');
  }

  // `time_last_update_unix` là Unix timestamp (giây) — nhân 1000 để chuyển sang ms cho Date()
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
  // Vì rates đều là tỷ giá so với USD, công thức chuyển đổi là: VND/USD ÷ X/USD = VND/X
  if (!rates['VND'] || !rates[currencyCode]) return 0;
  return rates['VND'] / rates[currencyCode];
}
