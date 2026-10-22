import type { MessageKey } from "./i18n";

// Each health goal is a Medusa product tag with this exact value, created by
// apps/backend/src/scripts/setup-merchandising-tags.ts and set on products in Admin.
export const HEALTH_GOALS = [
  "immune-support",
  "gut-health",
  "energy-fitness",
  "muscle-recovery",
  "heart-health",
  "stress-sleep",
] as const;

export type HealthGoal = (typeof HEALTH_GOALS)[number];

export const BUNDLE_TAG = "bundle";

export const isHealthGoal = (value: string): value is HealthGoal =>
  (HEALTH_GOALS as readonly string[]).includes(value);

export const goalLabelKey = (goal: HealthGoal) => `goal.${goal}` as MessageKey;
