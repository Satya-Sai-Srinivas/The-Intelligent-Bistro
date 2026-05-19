import React, { type ReactNode } from 'react';

const WEB_PAYMENT_MESSAGE = 'Payments not supported on web preview.';

type StripeProviderProps = {
  children: ReactNode;
  publishableKey?: string;
  merchantIdentifier?: string;
};

export function StripeProvider({ children }: StripeProviderProps) {
  return React.createElement(React.Fragment, null, children);
}

export function useStripe() {
  const notSupported = async () => ({
    error: { message: WEB_PAYMENT_MESSAGE },
  });

  return {
    initPaymentSheet: notSupported,
    presentPaymentSheet: notSupported,
  };
}
