/**
 * Email service interface defining all email operations.
 * Implementations can use different providers (console, Mailtrap, SendGrid, etc.)
 */
export interface IEmailService {
  /**
   * Sends a verification code to the user's email.
   * Used during email verification flow after registration.
   *
   * @param email - Recipient email address
   * @param code - The verification code (typically 6 digits)
   */
  sendVerificationCode(email: string, code: string): Promise<void>;

  /**
   * Sends a password reset email with a reset token/link.
   * Used when user requests to reset their forgotten password.
   *
   * @param email - Recipient email address
   * @param resetToken - The unique token for password reset
   */
  sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;

  /**
   * Sends a welcome email to newly registered users.
   * Should include a warm welcome message, quick start guide, and verification code.
   *
   * @param email - Recipient email address
   * @param username - The user's display name
   * @param verificationCode - The verification code for email verification
   */
  sendWelcomeEmail(
    email: string,
    username: string,
    verificationCode: string,
  ): Promise<void>;

  /**
   * Sends a subscription confirmation email when subscription becomes active.
   * Includes tier information, billing period, and subscription benefits.
   *
   * @param email - Recipient email address
   * @param username - The user's display name
   * @param tier - The subscription tier (e.g., 'Gold')
   * @param periodEnd - The end date of the current billing period
   */
  sendSubscriptionConfirmedEmail(
    email: string,
    username: string,
    tier: string,
    periodEnd: Date,
  ): Promise<void>;

  /**
   * Sends a subscription cancellation confirmation email.
   * Informs user about what happens next and when access expires.
   *
   * @param email - Recipient email address
   * @param username - The user's display name
   * @param expiresAt - The date when the subscription access will end
   */
  sendSubscriptionCancelledEmail(
    email: string,
    username: string,
    expiresAt: Date,
  ): Promise<void>;

  /**
   * Sends a payment receipt email after successful payment.
   * Includes payment amount, currency, and description.
   *
   * @param email - Recipient email address
   * @param username - The user's display name
   * @param amount - The payment amount (in the smallest currency unit, e.g., cents)
   * @param currency - The currency code (e.g., 'USD', 'EUR')
   * @param description - Description of what the payment was for
   */
  sendPaymentReceiptEmail(
    email: string,
    username: string,
    amount: number,
    currency: string,
    description: string,
  ): Promise<void>;
}
