export const VERIFICATION_CODE_LENGTH = 6;

// Inclusive lower bound (100_000 for 6-digit codes) — smallest value that
// renders as a VERIFICATION_CODE_LENGTH-digit string with no leading zeros.
export const VERIFICATION_CODE_MIN = 10 ** (VERIFICATION_CODE_LENGTH - 1);

// Exclusive upper bound (1_000_000 for 6-digit codes) — paired with
// crypto.randomInt(min, max), which excludes the upper bound.
export const VERIFICATION_CODE_MAX_EXCLUSIVE = 10 ** VERIFICATION_CODE_LENGTH;
