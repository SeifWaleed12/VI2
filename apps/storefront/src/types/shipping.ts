export type ShippingOption = {
  id: string;
  name: string;
  amount: number; // In major currency (e.g. 85 EGP)
  isCalculatedPrice?: boolean;
  data?: Record<string, unknown>;
};
