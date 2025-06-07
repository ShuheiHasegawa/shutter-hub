import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// サーバーサイド用Stripe設定（サーバーサイドでのみ実行）
export const stripe =
  typeof window === 'undefined' && process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-04-30.basil',
        typescript: true,
      })
    : null;

// クライアントサイド用Stripe設定
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// プラットフォーム設定
export const PLATFORM_CONFIG = {
  feeRate: parseFloat(process.env.PLATFORM_FEE_RATE || '0.10'), // 10%
  minimumPayoutAmount: parseInt(process.env.MINIMUM_PAYOUT_AMOUNT || '1000'), // 1000円
  currency: 'jpy' as const,
  supportedPaymentMethods: ['card', 'apple_pay', 'google_pay'] as const,
};

// 料金計算ヘルパー
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_CONFIG.feeRate);
}

export function calculateOrganizerPayout(amount: number): number {
  const platformFee = calculatePlatformFee(amount);
  return amount - platformFee;
}

// Stripe手数料計算（概算）
export function calculateStripeFee(amount: number): number {
  // 日本のStripe手数料: 3.6%
  return Math.round(amount * 0.036);
}

export function calculateTotalFees(amount: number): {
  platformFee: number;
  stripeFee: number;
  organizerPayout: number;
  totalFees: number;
} {
  const platformFee = calculatePlatformFee(amount);
  const stripeFee = calculateStripeFee(amount);
  const organizerPayout = amount - platformFee;
  const totalFees = platformFee + stripeFee;

  return {
    platformFee,
    stripeFee,
    organizerPayout,
    totalFees,
  };
}
