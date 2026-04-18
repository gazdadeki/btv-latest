/**
 * Feature flags for the admin dashboard.
 *
 * Flip to `true` to re-enable. Underlying code/routes remain intact; these
 * only gate UI entry points (nav links, buttons, widgets).
 */
export const FEATURES = {
  /** Admin ↔ player messaging. Disabled for MVP. */
  MESSAGES: false,
} as const;
