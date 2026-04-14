import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const categoryIcons: Record<string, IoniconName> = {
  food: 'restaurant-outline',
  transport: 'car-sport-outline',
  shopping: 'bag-handle-outline',
  entertainment: 'film-outline',
  health: 'heart-circle-outline',
  education: 'school-outline',
  housing: 'home-outline',
  utilities: 'bulb-outline',
  clothing: 'shirt-outline',
  beauty: 'flower-outline',
  family: 'people-outline',
  travel: 'airplane-outline',
  sports: 'football-outline',
  pet: 'paw-outline',
  gift: 'gift-outline',
  other_expense: 'apps-outline',
  salary: 'cash-outline',
  freelance: 'laptop-outline',
  investment: 'trending-up-outline',
  bonus: 'sparkles-outline',
  rental: 'business-outline',
  business: 'briefcase-outline',
  interest: 'stats-chart-outline',
  gift_income: 'gift-outline',
  other_income: 'wallet-outline',
  transfer: 'swap-horizontal-outline',
};


export function getCategoryIconName(categoryId?: string, fallback: IoniconName = 'apps-outline') {
  if (!categoryId) {
    return fallback;
  }

  return categoryIcons[categoryId] ?? fallback;
}

export function getWalletIconName(icon?: string, fallback: IoniconName = 'wallet-outline'): IoniconName {
  return (icon as IoniconName) || fallback;
}
