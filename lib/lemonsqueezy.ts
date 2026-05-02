export interface BillingProviderStatus {
  provider: "stripe";
  message: string;
}

export function getBillingProviderStatus(): BillingProviderStatus {
  return {
    provider: "stripe",
    message: "Lemon Squeezy is disabled for this project. Stripe Payment Link is active."
  };
}
