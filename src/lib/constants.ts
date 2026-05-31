export type SaleChannel = 'card' | 'cash' | 'cash_receipt' | 'transfer' | 'delivery' | 'other';
export type ExpenseCategory =
  | 'material'
  | 'labor'
  | 'rent'
  | 'utility'
  | 'communication'
  | 'marketing'
  | 'tax'
  | 'etc';

export const SALE_CHANNEL_LABEL: Record<SaleChannel, string> = {
  card: '카드',
  cash: '현금',
  cash_receipt: '현금영수증',
  transfer: '계좌이체',
  delivery: '배달앱',
  other: '기타',
};

export const SALE_CHANNEL_ICON: Record<SaleChannel, string> = {
  card: '💳',
  cash: '💵',
  cash_receipt: '🧾',
  transfer: '🏦',
  delivery: '🛵',
  other: '📦',
};

// 입력 순서 = 표시 순서 (사장님이 자주 쓰는 순)
export const SALE_CHANNELS: SaleChannel[] = [
  'card',
  'cash',
  'cash_receipt',
  'transfer',
  'delivery',
  'other',
];

export const SALE_CHANNEL_COLOR: Record<SaleChannel, string> = {
  card: '#7177EE',
  cash: '#10b981',
  cash_receipt: '#0ea5e9',
  transfer: '#6366f1',
  delivery: '#f43f5e',
  other: '#8b5cf6',
};

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  material: '원재료비',
  labor: '인건비',
  rent: '임대료',
  utility: '공과금',
  communication: '통신비',
  marketing: '마케팅비',
  tax: '세금',
  etc: '기타',
};

export const EXPENSE_CATEGORY_ICON: Record<ExpenseCategory, string> = {
  material: '🥬',
  labor: '👥',
  rent: '🏠',
  utility: '⚡',
  communication: '📞',
  marketing: '📢',
  tax: '🧾',
  etc: '📦',
};

// lucide-react 아이콘 매핑 — 시각적으로 일관된 UI를 위해 신규 화면은 이쪽 사용 권장.
// import { EXPENSE_CATEGORY_LUCIDE } from '@/lib/constants';
// const Icon = EXPENSE_CATEGORY_LUCIDE[cat];
// <Icon className="h-4 w-4" />
import {
  Apple,
  Users as LucideUsers,
  Home,
  Zap,
  Phone,
  Megaphone,
  FileText,
  Package,
  type LucideIcon,
} from 'lucide-react';

export const EXPENSE_CATEGORY_LUCIDE: Record<ExpenseCategory, LucideIcon> = {
  material: Apple,
  labor: LucideUsers,
  rent: Home,
  utility: Zap,
  communication: Phone,
  marketing: Megaphone,
  tax: FileText,
  etc: Package,
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'material',
  'labor',
  'rent',
  'utility',
  'communication',
  'marketing',
  'tax',
  'etc',
];

export const EXPENSE_CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  material: '#7177EE',
  labor: '#059669',
  rent: '#f59e0b',
  utility: '#ef4444',
  communication: '#8b5cf6',
  marketing: '#ec4899',
  tax: '#0ea5e9',
  etc: '#64748b',
};
