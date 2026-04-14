export const formatCurrency = (
  amount: number,
  showSign: boolean = false
): string => {
  const sign = showSign ? (amount >= 0 ? '+' : '') : '';

  return (
    sign +
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount)
  );
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('vi-VN').format(num);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hôm nay';
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateFull = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const formatMonthYear = (year: number, month: number): string => {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};
