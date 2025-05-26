'use client';

import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe/config';

interface StripeProviderProps {
  children: React.ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const stripePromise = getStripe();

  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0070f3',
            colorBackground: '#ffffff',
            colorText: '#30313d',
            colorDanger: '#df1b41',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '6px',
          },
        },
        locale: 'ja',
      }}
    >
      {children}
    </Elements>
  );
}
