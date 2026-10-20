export const ACCOUNT_ROUTES = {
  dashboard: "/account",
  information: "/account/information",
  orders: "/account/orders",
  points: "/account/points",
} as const;

export type AccountSection = keyof typeof ACCOUNT_ROUTES;
