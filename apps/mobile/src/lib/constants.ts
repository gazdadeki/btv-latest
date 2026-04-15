/**
 * Application constants — messages, limits, and configuration values.
 *
 * Naming convention:
 *   - MESSAGES.*  — user-facing strings (banners, toasts, dialogs)
 *   - LIMITS.*    — business rule numbers (max reservations, gaps, etc.)
 *
 * Future sections (add as we refactor):
 *   - LABELS.*    — static UI labels
 *   - ERRORS.*    — error display strings
 *   - CONFIG.*    — app configuration values (timeouts, intervals, etc.)
 */

// ─── Business rule limits ─────────────────────────────────────────────────────

export const LIMITS = {
  /** Max active reservations per stream for free users */
  FREE_MAX_RESERVATIONS: 1,
  /** Max active reservations per stream for gold users */
  GOLD_MAX_RESERVATIONS: 2,
  /** Minimum game gap between gold reservations in the same stream */
  GOLD_MIN_GAME_GAP: 2,
} as const;

// ─── User-facing messages ─────────────────────────────────────────────────────

export const MESSAGES = {
  reservation: {
    /** Banner: gold user's game is too close to existing reservation */
    tooClose:
      "This game is too close to your other reservation. Gold members must reserve at least 2 games apart.",
    /** Banner: gold user reached 2-reservation limit */
    goldAtLimit: "You've reached your limit of 2 reservations for this stream.",
    /** Banner: free user already has a reservation */
    freeAtLimit: "You already have an active reservation for this stream.",
    /** Banner: generic fallback */
    cannotReserve: "You cannot reserve a slot in this game.",
    /** Toast: gold adjacency violation */
    toastTooClose: "This game is too close to your other reservation",
    /** Toast: reservation limit reached */
    toastAtLimit: "You've reached your reservation limit for this stream",
    /** Toast: already has a slot in this game */
    toastAlreadyInGame: "You already have a slot in this game",
  },
} as const;
